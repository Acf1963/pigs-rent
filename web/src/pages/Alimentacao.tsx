import { useState, useEffect } from 'react';
import { db } from '../lib/firebase';
import { collection, addDoc, onSnapshot, query, doc, deleteDoc, orderBy, updateDoc, writeBatch } from 'firebase/firestore';
import { Utensils, Trash2, Edit3, Check, FileSpreadsheet } from 'lucide-react';
import * as XLSX from 'xlsx';

export default function AlimentacaoPage() {
  const [loading, setLoading] = useState(false);
  const [registos, setRegistos] = useState<any[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    loteId: '',
    data: new Date().toISOString().split('T')[0],
    fase: 'CRESCIMENTO',
    tipoRacao: '',
    quantidadeKg: 0,
    custoPorKgKz: 0,
    fornecedor: '',
    observacoes: ''
  });

  useEffect(() => {
    const q = query(collection(db, 'alimentacao'), orderBy('data', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setRegistos(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });
    return () => unsubscribe();
  }, []);

  // Lógica de Importação atualizada para os novos campos do Excel
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

        json.forEach((row: any) => {
          const newDocRef = doc(collection(db, 'alimentacao'));
          const qtd = Number(row.quantidadeKg || 0);
          const custo = Number(row.custoPorKgKz || 0);

          batch.set(newDocRef, {
            loteId: String(row.loteId || ''),
            data: row.data || new Date().toISOString().split('T')[0],
            fase: String(row.fase || 'INICIAL').toUpperCase(),
            tipoRacao: String(row.tipoRacao || ''),
            quantidadeKg: qtd,
            custoPorKgKz: custo,
            totalCustoKz: qtd * custo,
            fornecedor: String(row.fornecedor || ''),
            observacoes: String(row.observacoes || ''),
            createdAt: new Date().toISOString()
          });
        });
        await batch.commit();
        alert("Dados de alimentação importados!");
      } catch (err) {
        alert("Erro ao ler o ficheiro Excel.");
      } finally {
        setLoading(false);
        e.target.value = '';
      }
    };
    reader.readAsArrayBuffer(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const totalCustoKz = formData.quantidadeKg * formData.custoPorKgKz;
      if (editingId) {
        await updateDoc(doc(db, 'alimentacao', editingId), { ...formData, totalCustoKz });
        setEditingId(null);
      } else {
        await addDoc(collection(db, 'alimentacao'), { ...formData, totalCustoKz, createdAt: new Date().toISOString() });
      }
      setFormData({ loteId: '', data: new Date().toISOString().split('T')[0], fase: 'CRESCIMENTO', tipoRacao: '', quantidadeKg: 0, custoPorKgKz: 0, fornecedor: '', observacoes: '' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8 bg-[#0f1117] min-h-screen text-slate-100">
      
      <div className="flex justify-between items-end border-b border-slate-800 pb-6">
        <div>
          <h1 className="text-3xl font-black text-white uppercase tracking-tighter flex items-center gap-3">
            <Utensils className="text-cyan-500" size={32} /> Alimentação
          </h1>
        </div>
        <label className="bg-slate-800 hover:bg-slate-700 text-cyan-400 border border-cyan-500/30 px-6 py-2 rounded-xl cursor-pointer font-black text-xs uppercase transition-all flex items-center gap-2">
          <FileSpreadsheet size={18} /> {loading ? 'A PROCESSAR...' : 'IMPORTAR EXCEL'}
          <input type="file" accept=".xlsx, .xls" className="hidden" onChange={handleExcelImport} disabled={loading} />
        </label>
      </div>

      {/* FORMULÁRIO COM NOVOS CAMPOS */}
      <div className="bg-[#1a1d26] rounded-3xl border border-slate-800 p-6 shadow-2xl">
        <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-6">
          <div className="space-y-1">
            <label className="text-[10px] font-black text-slate-500 uppercase ml-1">Lote</label>
            <input required className="w-full bg-slate-900 border border-slate-700 p-3 rounded-xl text-sm font-bold text-white focus:border-cyan-500 outline-none" value={formData.loteId} onChange={e => setFormData({...formData, loteId: e.target.value})} />
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-black text-slate-500 uppercase ml-1">Data</label>
            <input type="date" className="w-full bg-slate-900 border border-slate-700 p-3 rounded-xl text-sm font-bold text-white focus:border-cyan-500 outline-none" value={formData.data} onChange={e => setFormData({...formData, data: e.target.value})} />
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-black text-slate-500 uppercase ml-1">Fase</label>
            <select className="w-full bg-slate-900 border border-slate-700 p-3 rounded-xl text-sm font-bold text-white focus:border-cyan-500 outline-none" value={formData.fase} onChange={e => setFormData({...formData, fase: e.target.value})}>
              <option value="INICIAL">INICIAL</option>
              <option value="CRESCIMENTO">CRESCIMENTO</option>
              <option value="ENGORDA">ENGORDA</option>
            </select>
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-black text-slate-500 uppercase ml-1">Tipo de Ração</label>
            <input className="w-full bg-slate-900 border border-slate-700 p-3 rounded-xl text-sm font-bold text-white focus:border-cyan-500 outline-none" value={formData.tipoRacao} onChange={e => setFormData({...formData, tipoRacao: e.target.value})} />
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-black text-slate-500 uppercase ml-1">Qtd (kg)</label>
            <input type="number" className="w-full bg-slate-900 border border-slate-700 p-3 rounded-xl text-sm font-bold text-white focus:border-cyan-500 outline-none" value={formData.quantidadeKg} onChange={e => setFormData({...formData, quantidadeKg: Number(e.target.value)})} />
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-black text-slate-500 uppercase ml-1">Custo/kg (Kz)</label>
            <input type="number" className="w-full bg-slate-900 border border-slate-700 p-3 rounded-xl text-sm font-bold text-white focus:border-cyan-500 outline-none" value={formData.custoPorKgKz} onChange={e => setFormData({...formData, custoPorKgKz: Number(e.target.value)})} />
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-black text-slate-500 uppercase ml-1">Fornecedor</label>
            <input className="w-full bg-slate-900 border border-slate-700 p-3 rounded-xl text-sm font-bold text-white focus:border-cyan-500 outline-none" value={formData.fornecedor} onChange={e => setFormData({...formData, fornecedor: e.target.value})} />
          </div>
          <button type="submit" className="bg-cyan-600 text-white font-black rounded-xl uppercase text-xs h-[46px] mt-auto hover:bg-cyan-500 transition-all flex items-center justify-center gap-2 shadow-lg shadow-cyan-900/20">
            <Check size={18} /> {editingId ? 'ATUALIZAR' : 'GRAVAR'}
          </button>
        </form>
      </div>

      {/* TABELA COM COLUNAS DO EXCEL */}
      <div className="bg-[#1a1d26] rounded-3xl border border-slate-800 overflow-hidden shadow-2xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="text-[10px] font-black uppercase text-slate-500 bg-slate-800/10 border-b border-slate-800">
                <th className="p-6">Lote</th>
                <th className="p-6">Data</th>
                <th className="p-6">Fase</th>
                <th className="p-6">Ração</th>
                <th className="p-6 text-right">Qtd (kg)</th>
                <th className="p-6 text-right">Custo/Kg</th>
                <th className="p-6">Fornecedor</th>
                <th className="p-6 text-center">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/50">
              {registos.map((item) => (
                <tr key={item.id} className="hover:bg-slate-800/30 transition-colors">
                  <td className="p-6 font-black text-cyan-500 uppercase text-xs">{item.loteId}</td>
                  <td className="p-6 text-xs text-slate-400">{item.data}</td>
                  <td className="p-6 text-[10px] font-black text-slate-300 uppercase">{item.fase}</td>
                  <td className="p-6 text-xs text-white uppercase">{item.tipoRacao}</td>
                  <td className="p-6 text-right font-mono text-white text-xs">{item.quantidadeKg}</td>
                  <td className="p-6 text-right font-mono text-white text-xs">{Number(item.custoPorKgKz).toLocaleString()} Kz</td>
                  <td className="p-6 text-xs text-slate-400 uppercase">{item.fornecedor}</td>
                  <td className="p-6 flex justify-center gap-3">
                    <button onClick={() => { setEditingId(item.id); setFormData({...item}); }} className="text-slate-500 hover:text-cyan-400"><Edit3 size={16}/></button>
                    <button onClick={() => deleteDoc(doc(db, 'alimentacao', item.id))} className="text-slate-500 hover:text-red-500"><Trash2 size={16}/></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
