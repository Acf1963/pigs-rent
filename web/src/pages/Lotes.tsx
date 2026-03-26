import { useState, useEffect } from 'react';
import { db } from '../lib/firebase';
import { collection, addDoc, writeBatch, doc, onSnapshot, query, updateDoc, deleteDoc } from 'firebase/firestore';
import { LayoutGrid, Save, FileSpreadsheet, Trash2, Edit3, X, Check, Search, AlertCircle } from 'lucide-react';
import * as XLSX from 'xlsx';

export default function LotesPage() {
  const [loading, setLoading] = useState(false);
  const [registos, setRegistos] = useState<any[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    codigoLote: '',
    dataEntrada: new Date().toISOString().split('T')[0],
    fornecedor: '',
    quantidade: 0,
    pesoInicialMedio: 0,
    custoAquisicaoTotal: 0,
    custoTransporte: 0,
    especie: 'Suína',
    raca: '',
    observacoes: ''
  });

  const formatExcelDate = (value: any): string => {
    if (!value) return new Date().toISOString().split('T')[0];
    if (typeof value === 'string' && value.includes('-')) return value;
    if (!isNaN(value)) {
      const date = new Date(Math.round((value - 25569) * 86400 * 1000));
      return date.toISOString().split('T')[0];
    }
    return String(value);
  };

  useEffect(() => {
    const q = query(collection(db, 'lotes'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setRegistos(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }, (error) => console.error("Erro:", error));
    return () => unsubscribe();
  }, []);

  const handleExcelImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setLoading(true);
    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const workbook = XLSX.read(evt.target?.result, { type: 'array' });
        const json = XLSX.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]]) as any[];
        const batch = writeBatch(db);

        json.forEach((row) => {
          const newDocRef = doc(collection(db, 'lotes'));
          batch.set(newDocRef, {
            codigoLote: String(row.codigoLote || ''),
            dataEntrada: formatExcelDate(row.dataEntrada),
            fornecedor: String(row.fornecedor || ''),
            quantidade: Number(row.quantidade || 0),
            pesoInicialMedio: Number(row.pesoInicialMedio || 0),
            custoAquisicaoTotal: Number(row.custoAquisicaoTotal || 0),
            custoTransporte: Number(row.custoTransporte || 0),
            especie: String(row.especie || 'Suína'),
            raca: String(row.raca || ''),
            observacoes: String(row.observacoes || ''),
            createdAt: new Date().toISOString()
          });
        });
        await batch.commit();
        alert("Importação concluída!");
      } catch (err) { alert("Erro na importação."); }
      finally { setLoading(false); e.target.value = ''; }
    };
    reader.readAsArrayBuffer(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (editingId) {
        await updateDoc(doc(db, 'lotes', editingId), formData);
        setEditingId(null);
      } else {
        await addDoc(collection(db, 'lotes'), { ...formData, createdAt: new Date().toISOString() });
      }
      setFormData({ codigoLote: '', dataEntrada: new Date().toISOString().split('T')[0], fornecedor: '', quantidade: 0, pesoInicialMedio: 0, custoAquisicaoTotal: 0, custoTransporte: 0, especie: 'Suína', raca: '', observacoes: '' });
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  return (
    <div className="h-[calc(100vh-100px)] flex flex-col p-4 md:p-6 text-slate-900 overflow-hidden">
      
      {/* HEADER & IMPORT */}
      <div className="flex justify-between items-center mb-4 shrink-0">
        <h1 className="text-xl font-black uppercase tracking-tighter flex items-center gap-2">
          <LayoutGrid className="text-indigo-600" /> Lotes
        </h1>
        <label className={`flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-xl cursor-pointer font-bold text-xs uppercase active:scale-95 transition-all ${loading ? 'opacity-50' : ''}`}>
          <FileSpreadsheet size={16} /> {loading ? 'A ler...' : 'Importar Excel'}
          <input type="file" accept=".xlsx, .xls" className="hidden" onChange={handleExcelImport} disabled={loading} />
        </label>
      </div>

      {/* FORMULÁRIO */}
      <div className="bg-white rounded-3xl shadow-lg border border-slate-200 mb-4 shrink-0">
        <div className="bg-slate-800 p-3 text-white flex justify-between items-center rounded-t-3xl">
          <h2 className="text-[10px] font-black uppercase tracking-widest flex items-center gap-2">
            <Save size={14} /> Dados do Lote
          </h2>
          {editingId && <button onClick={() => setEditingId(null)} className="hover:text-red-400"><X size={16}/></button>}
        </div>
        <form onSubmit={handleSubmit} className="p-4 grid grid-cols-2 md:grid-cols-5 gap-3">
          <input placeholder="codigoLote" required className="bg-slate-100 p-2 rounded-lg text-sm font-bold border-none" value={formData.codigoLote} onChange={e => setFormData({...formData, codigoLote: e.target.value})} />
          <input type="date" className="bg-slate-100 p-2 rounded-lg text-sm font-bold border-none" value={formData.dataEntrada} onChange={e => setFormData({...formData, dataEntrada: e.target.value})} />
          <input placeholder="fornecedor" className="bg-slate-100 p-2 rounded-lg text-sm font-bold border-none" value={formData.fornecedor} onChange={e => setFormData({...formData, fornecedor: e.target.value})} />
          <input type="number" placeholder="quantidade" className="bg-slate-100 p-2 rounded-lg text-sm font-bold border-none" value={formData.quantidade} onChange={e => setFormData({...formData, quantidade: Number(e.target.value)})} />
          <button type="submit" disabled={loading} className="bg-indigo-600 text-white font-black rounded-lg uppercase text-[10px] tracking-widest hover:bg-indigo-700 transition-all flex items-center justify-center gap-2">
             {editingId ? <><Check size={14}/> Atualizar</> : 'Gravar'}
          </button>
        </form>
      </div>

      {/* LISTA AUTOAJUSTÁVEL (Scroll após ~5 linhas) */}
      <div className="bg-white rounded-3xl shadow-lg border border-slate-200 flex-1 flex flex-col overflow-hidden">
        <div className="p-3 bg-slate-50 border-b border-slate-200 flex justify-between items-center shrink-0">
          <h3 className="font-bold uppercase text-[10px] text-slate-500 flex items-center gap-2"><Search size={14} /> Registos</h3>
        </div>
        
        <div className="flex-1 overflow-auto">
          <table className="w-full text-left border-collapse min-w-[1200px]">
            <thead className="sticky top-0 bg-white z-10 border-b border-slate-200 shadow-sm">
              <tr className="text-[10px] font-black uppercase text-slate-400 italic">
                <th className="p-4">codigoLote</th>
                <th className="p-4">dataEntrada</th>
                <th className="p-4">fornecedor</th>
                <th className="p-4 text-center">quantidade</th>
                <th className="p-4 text-center">pesoInicialMedio</th>
                <th className="p-4 text-right">custoAquisicaoTotal</th>
                <th className="p-4 text-right">custoTransporte</th>
                <th className="p-4 text-center">Ações</th>
              </tr>
            </thead>
            <tbody className="text-sm">
              {registos.map((v) => (
                <tr key={v.id} className="border-b border-slate-50 hover:bg-slate-50 transition-colors">
                  <td className="p-4 font-black text-indigo-600">{v.codigoLote}</td>
                  <td className="p-4">{v.dataEntrada}</td>
                  <td className="p-4">{v.fornecedor}</td>
                  <td className="p-4 text-center font-bold">{v.quantidade}</td>
                  <td className="p-4 text-center">{v.pesoInicialMedio} Kg</td>
                  <td className="p-4 text-right font-black">{Number(v.custoAquisicaoTotal).toLocaleString()} Kz</td>
                  <td className="p-4 text-right">{Number(v.custoTransporte).toLocaleString()} Kz</td>
                  <td className="p-4 flex justify-center gap-2">
                    <button onClick={() => { setEditingId(v.id); setFormData({...v}); }} className="p-1 text-slate-400 hover:text-indigo-600"><Edit3 size={16}/></button>
                    <button onClick={async () => { if(confirm("Apagar?")) await deleteDoc(doc(db, 'lotes', v.id)) }} className="p-1 text-slate-400 hover:text-red-600"><Trash2 size={16}/></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {registos.length === 0 && (
            <div className="h-full flex flex-col items-center justify-center text-slate-300 p-10">
              <AlertCircle size={40} className="opacity-20 mb-2" />
              <span className="text-xs font-bold uppercase italic">Vazio</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
