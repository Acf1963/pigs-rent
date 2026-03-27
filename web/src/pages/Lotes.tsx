import { useState, useEffect } from 'react';
import { db } from '../lib/firebase';
import { collection, addDoc, writeBatch, doc, onSnapshot, query, orderBy, deleteDoc, updateDoc } from 'firebase/firestore';
import { FileSpreadsheet, Trash2, Edit3, Plus, Check, Package, RotateCcw } from 'lucide-react';
import * as XLSX from 'xlsx';

export default function LotesPage() {
  const [lotes, setLotes] = useState<any[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [quebraRealTime, setQuebraRealTime] = useState(0);
  
  const [formData, setFormData] = useState({
    codigoLote: '',
    tipo: 'SUINO',
    raca: '',
    quantidade: 0,
    fornecedor: '',
    dataEntrada: new Date().toISOString().split('T')[0],
    pesoInicialMedio: 0,
    pesoFinalTransporte: 0,
    custoTransporte: 0,
    custoAquisicao: 0
  });

  const resetForm = () => {
    setFormData({
      codigoLote: '', tipo: 'SUINO', raca: '', quantidade: 0, fornecedor: '',
      dataEntrada: new Date().toISOString().split('T')[0],
      pesoInicialMedio: 0, pesoFinalTransporte: 0, custoTransporte: 0, custoAquisicao: 0
    });
    setEditingId(null);
    setQuebraRealTime(0);
  };

  useEffect(() => {
    const inicial = Number(formData.pesoInicialMedio);
    const final = Number(formData.pesoFinalTransporte);
    if (inicial > 0 && final > 0) {
      setQuebraRealTime(Number((((inicial - final) / inicial) * 100).toFixed(2)));
    } else {
      setQuebraRealTime(0);
    }
  }, [formData.pesoInicialMedio, formData.pesoFinalTransporte]);

  useEffect(() => {
    const q = query(collection(db, 'lotes'), orderBy('dataEntrada', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setLotes(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });
    return () => unsubscribe();
  }, []);

  const handleExcelImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const workbook = XLSX.read(evt.target?.result, { type: 'array' });
        const json = XLSX.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]]) as any[];
        const batch = writeBatch(db);
        json.forEach((row: any) => {
          const docRef = doc(collection(db, 'lotes'));
          const pI = Number(row.pesoInicialMedio || 0);
          const pF = Number(row.pesoFinalTransporte || 0);
          batch.set(docRef, {
            codigoLote: String(row.codigoLote || '').toUpperCase(),
            tipo: String(row.tipo || 'SUINO').toUpperCase(),
            raca: String(row.raca || ''),
            quantidade: Number(row.quantidade || 0),
            fornecedor: String(row.fornecedor || ''),
            dataEntrada: row.dataEntrada || new Date().toISOString().split('T')[0],
            pesoInicialMedio: pI,
            pesoFinalTransporte: pF,
            quebraTransporte: pI > 0 ? Number((((pI - pF) / pI) * 100).toFixed(2)) : 0,
            createdAt: new Date().toISOString()
          });
        });
        await batch.commit();
        alert("Importação concluída!");
      } catch (err) { alert("Erro no Excel"); }
      finally { e.target.value = ''; }
    };
    reader.readAsArrayBuffer(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload = { ...formData, quebraTransporte: quebraRealTime, updatedAt: new Date().toISOString() };
      if (editingId) { await updateDoc(doc(db, 'lotes', editingId), payload); }
      else { await addDoc(collection(db, 'lotes'), { ...payload, createdAt: new Date().toISOString() }); }
      resetForm();
    } catch (err) { alert("Erro ao salvar"); }
  };

  return (
    <div className="p-8 max-w-[1600px] mx-auto space-y-6 bg-[#0f1117] min-h-screen text-slate-100 font-sans">
      <div className="flex justify-between items-end border-b border-slate-800 pb-4">
        <h1 className="text-3xl font-black text-white uppercase tracking-tighter flex items-center gap-3">
          <Package className="text-cyan-500" size={32} /> Gestão de Lotes
        </h1>
        <label className="bg-slate-800 hover:bg-slate-700 text-cyan-400 border border-cyan-500/30 px-6 py-2 rounded-xl cursor-pointer font-black text-[10px] uppercase tracking-widest transition-all">
          <FileSpreadsheet size={18} className="inline mr-2" /> IMPORTAR EXCEL
          <input type="file" accept=".xlsx, .xls" className="hidden" onChange={handleExcelImport} />
        </label>
      </div>

      <div className="bg-[#1a1d26] rounded-3xl border border-slate-800 p-6 shadow-2xl">
        <form onSubmit={handleSubmit} className="grid grid-cols-2 md:grid-cols-5 lg:grid-cols-11 gap-3 items-end">
          <div className="flex flex-col gap-1">
            <label className="text-[9px] font-black text-slate-500 uppercase">Lote</label>
            <input required className="bg-slate-900 border border-slate-700 p-2 rounded-lg text-sm font-bold text-cyan-500 outline-none" value={formData.codigoLote} onChange={e => setFormData({...formData, codigoLote: e.target.value.toUpperCase()})} />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-[9px] font-black text-slate-500 uppercase">Tipo</label>
            <select className="bg-slate-900 border border-slate-700 p-2 rounded-lg text-xs font-bold text-slate-300" value={formData.tipo} onChange={e => setFormData({...formData, tipo: e.target.value})}>
              <option value="SUINO">SUINO</option>
              <option value="BOVINO">BOVINO</option>
            </select>
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-[9px] font-black text-slate-500 uppercase">Raça</label>
            <input className="bg-slate-900 border border-slate-700 p-2 rounded-lg text-sm font-bold" value={formData.raca} onChange={e => setFormData({...formData, raca: e.target.value})} />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-[9px] font-black text-slate-500 uppercase">Qtd</label>
            <input type="number" className="bg-slate-900 border border-slate-700 p-2 rounded-lg text-sm font-bold" value={formData.quantidade} onChange={e => setFormData({...formData, quantidade: Number(e.target.value)})} />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-[9px] font-black text-slate-500 uppercase">Fornecedor</label>
            <input className="bg-slate-900 border border-slate-700 p-2 rounded-lg text-sm font-bold" value={formData.fornecedor} onChange={e => setFormData({...formData, fornecedor: e.target.value})} />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-[9px] font-black text-slate-500 uppercase">Data</label>
            <input type="date" className="bg-slate-900 border border-slate-700 p-2 rounded-lg text-[10px] font-bold" value={formData.dataEntrada} onChange={e => setFormData({...formData, dataEntrada: e.target.value})} />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-[9px] font-black text-slate-500 uppercase">Peso Inic.</label>
            <input type="number" step="0.01" className="bg-slate-900 border border-slate-700 p-2 rounded-lg text-sm font-bold" value={formData.pesoInicialMedio} onChange={e => setFormData({...formData, pesoInicialMedio: Number(e.target.value)})} />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-[9px] font-black text-slate-500 uppercase">Peso Fin.</label>
            <input type="number" step="0.01" className="bg-slate-900 border border-slate-700 p-2 rounded-lg text-sm font-bold text-cyan-400" value={formData.pesoFinalTransporte} onChange={e => setFormData({...formData, pesoFinalTransporte: Number(e.target.value)})} />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-[9px] font-black text-slate-500 uppercase italic">Quebra %</label>
            <div className="bg-slate-800 p-2 rounded-lg text-sm font-black text-center text-cyan-500 border border-cyan-500/20">{quebraRealTime}%</div>
          </div>
          <div className="flex gap-2">
            <button type="submit" className="bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg w-10 h-[38px] flex items-center justify-center transition-all">
              {editingId ? <Check size={20}/> : <Plus size={20}/>}
            </button>
            {editingId && (
              <button type="button" onClick={resetForm} className="bg-slate-700 text-slate-300 rounded-lg w-10 h-[38px] flex items-center justify-center">
                <RotateCcw size={18}/>
              </button>
            )}
          </div>
        </form>
      </div>

      <div className="bg-[#1a1d26] rounded-3xl border border-slate-800 overflow-hidden shadow-2xl">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="text-[10px] font-black uppercase text-slate-500 tracking-widest border-b border-slate-800 bg-slate-800/10">
              <th className="p-4">codigoLote</th>
              <th className="p-4">tipo</th>
              <th className="p-4">raca</th>
              <th className="p-4 text-center">quantidade</th>
              <th className="p-4">fornecedor</th>
              <th className="p-4 text-right">p.Inic</th>
              <th className="p-4 text-right border-r border-slate-800/50">p.Fin</th>
              <th className="p-4 text-center">quebra %</th>
              <th className="p-4 text-center">Ações</th>
            </tr>
          </thead>
          <tbody>
            {lotes.map((l) => (
              <tr key={l.id} className="hover:bg-slate-800/30 transition-colors border-b border-slate-800/50">
                <td className="p-4 font-black text-cyan-500">{l.codigoLote}</td>
                <td className="p-4 text-[9px] font-bold text-slate-400 uppercase">{l.tipo}</td>
                <td className="p-4 font-bold text-slate-200">{l.raca}</td>
                <td className="p-4 text-center font-bold text-white">{l.quantidade}</td>
                <td className="p-4 text-[10px] text-slate-400 uppercase">{l.fornecedor}</td>
                <td className="p-4 text-right font-mono text-white">{l.pesoInicialMedio}</td>
                <td className="p-4 text-right font-mono text-cyan-400 border-r border-slate-800/50">{l.pesoFinalTransporte}</td>
                <td className="p-4 text-center">
                  <span className={`px-2 py-1 rounded-full text-[10px] font-black border ${(l.quebraTransporte || 0) > 5 ? 'bg-red-500/10 text-red-500 border-red-500/20' : 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20'}`}>
                    {l.quebraTransporte || 0}%
                  </span>
                </td>
                <td className="p-4 flex justify-center gap-3">
                  <button onClick={() => { setEditingId(l.id); setFormData({...l}); }} className="text-slate-500 hover:text-cyan-400"><Edit3 size={16}/></button>
                  <button onClick={() => deleteDoc(doc(db, 'lotes', l.id))} className="text-slate-500 hover:text-red-500"><Trash2 size={16}/></button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
