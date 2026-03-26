import { useState, useEffect } from 'react';
import { db } from '../lib/firebase';
import { collection, addDoc, writeBatch, doc, onSnapshot, query, updateDoc, deleteDoc } from 'firebase/firestore';
import { ShoppingCart, Save, FileSpreadsheet, Trash2, Edit3, X, Check, Search, AlertCircle, DollarSign } from 'lucide-react';
import * as XLSX from 'xlsx';

export default function VendasPage() {
  const [loading, setLoading] = useState(false);
  const [vendas, setVendas] = useState<any[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    loteId: '',
    dataVenda: new Date().toISOString().split('T')[0],
    cliente: '',
    produto: 'CARCAÇA',
    pesoKg: 0,
    precoKz: 0,
    valorTotal: 0
  });

  // Cálculo automático do valor total em tempo real
  useEffect(() => {
    setFormData(prev => ({ ...prev, valorTotal: prev.pesoKg * prev.precoKz }));
  }, [formData.pesoKg, formData.precoKz]);

  // Escuta em tempo real os dados do Firebase
  useEffect(() => {
    const q = query(collection(db, 'vendas'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setVendas(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });
    return () => unsubscribe();
  }, []);

  // Lógica de importação via Excel (Padrão Fazenda Quanza)
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
          const newDocRef = doc(collection(db, 'vendas'));
          const peso = Number(row.pesoKg || 0);
          const preco = Number(row.precoKz || 0);
          
          batch.set(newDocRef, {
            loteId: String(row.loteId || ''),
            dataVenda: row.dataVenda || new Date().toISOString().split('T')[0],
            cliente: String(row.cliente || ''),
            produto: String(row.produto || 'CARCAÇA').toUpperCase(),
            pesoKg: peso,
            precoKz: preco,
            valorTotal: peso * preco,
            createdAt: new Date().toISOString()
          });
        });
        await batch.commit();
        alert("Importação de vendas concluída!");
      } catch (err) {
        alert("Erro ao processar o ficheiro Excel.");
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
      if (editingId) {
        await updateDoc(doc(db, 'vendas', editingId), formData);
        setEditingId(null);
      } else {
        await addDoc(collection(db, 'vendas'), { ...formData, createdAt: new Date().toISOString() });
      }
      setFormData({ loteId: '', dataVenda: new Date().toISOString().split('T')[0], cliente: '', produto: 'CARCAÇA', pesoKg: 0, precoKz: 0, valorTotal: 0 });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="h-[calc(100vh-100px)] flex flex-col p-6 text-slate-900 overflow-hidden bg-slate-50">
      
      {/* HEADER DA PÁGINA */}
      <div className="flex justify-between items-center mb-6 shrink-0">
        <h1 className="text-2xl font-black uppercase tracking-tighter flex items-center gap-2">
          <ShoppingCart className="text-blue-600" size={28} /> Gestão de Vendas
        </h1>
        <label className={`flex items-center gap-2 bg-blue-600 text-white px-6 py-3 rounded-2xl cursor-pointer font-bold text-xs uppercase hover:bg-blue-700 transition-all shadow-lg shadow-blue-200 ${loading ? 'opacity-50' : ''}`}>
          <FileSpreadsheet size={18} /> {loading ? 'A PROCESSAR...' : 'IMPORTAR EXCEL'}
          <input type="file" accept=".xlsx, .xls" className="hidden" onChange={handleExcelImport} disabled={loading} />
        </label>
      </div>

      {/* FORMULÁRIO DE REGISTO */}
      <div className="bg-white rounded-[2rem] shadow-xl border border-slate-200 mb-6 shrink-0 overflow-hidden">
        <div className="bg-slate-900 p-4 text-white flex justify-between items-center">
          <h2 className="text-xs font-black uppercase tracking-[0.2em] flex items-center gap-2">
            <Save size={16} /> {editingId ? 'EDITAR REGISTO' : 'NOVA VENDA'}
          </h2>
          {editingId && (
            <button onClick={() => setEditingId(null)} className="hover:text-red-400 transition-colors">
              <X size={20} />
            </button>
          )}
        </div>
        <form onSubmit={handleSubmit} className="p-6 grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4 bg-slate-50/30">
          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-black text-slate-400 uppercase italic ml-1">Lote</label>
            <input required className="bg-white border border-slate-200 p-3 rounded-xl text-sm font-bold" value={formData.loteId} onChange={e => setFormData({...formData, loteId: e.target.value})} />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-black text-slate-400 uppercase italic ml-1">Data</label>
            <input type="date" className="bg-white border border-slate-200 p-3 rounded-xl text-sm font-bold" value={formData.dataVenda} onChange={e => setFormData({...formData, dataVenda: e.target.value})} />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-black text-slate-400 uppercase italic ml-1">Cliente</label>
            <input className="bg-white border border-slate-200 p-3 rounded-xl text-sm font-bold" value={formData.cliente} onChange={e => setFormData({...formData, cliente: e.target.value})} />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-black text-slate-400 uppercase italic ml-1">Produto</label>
            <select className="bg-white border border-slate-200 p-3 rounded-xl text-sm font-bold" value={formData.produto} onChange={e => setFormData({...formData, produto: e.target.value})}>
              <option value="CARCAÇA">CARCAÇA</option>
              <option value="LEITÃO VIVO">LEITÃO VIVO</option>
              <option value="CORTES">CORTES</option>
            </select>
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-black text-slate-400 uppercase italic ml-1">Peso (Kg)</label>
            <input type="number" className="bg-white border border-slate-200 p-3 rounded-xl text-sm font-bold text-blue-600" value={formData.pesoKg} onChange={e => setFormData({...formData, pesoKg: Number(e.target.value)})} />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-black text-slate-400 uppercase italic ml-1">Preço/Kg (Kz)</label>
            <input type="number" className="bg-white border border-slate-200 p-3 rounded-xl text-sm font-bold" value={formData.precoKz} onChange={e => setFormData({...formData, precoKz: Number(e.target.value)})} />
          </div>
          <button type="submit" disabled={loading} className="mt-auto bg-blue-600 text-white font-black h-[46px] rounded-xl uppercase text-xs tracking-widest hover:bg-blue-700 transition-all flex items-center justify-center gap-2 shadow-lg shadow-blue-100">
             {editingId ? <><Check size={18}/> ATUALIZAR</> : <><ShoppingCart size={18}/> GRAVAR</>}
          </button>
        </form>
      </div>

      {/* LISTAGEM E RESUMO */}
      <div className="bg-white rounded-[2rem] shadow-xl border border-slate-200 flex-1 flex flex-col overflow-hidden">
        <div className="p-4 bg-slate-50 border-b border-slate-200 flex justify-between items-center shrink-0">
          <h3 className="font-bold uppercase text-xs text-slate-500 flex items-center gap-2">
            <Search size={16} /> Histórico de Vendas
          </h3>
          
          {/* Card de Faturamento com DollarSign integrado */}
          <div className="bg-blue-50 px-4 py-2 rounded-2xl border border-blue-100 flex items-center gap-4">
            <div className="bg-blue-600 p-2 rounded-xl text-white shadow-md shadow-blue-200">
              <DollarSign size={20} />
            </div>
            <div>
              <p className="text-[9px] font-black text-blue-400 uppercase leading-none mb-1">Faturamento Total</p>
              <p className="text-lg font-black text-blue-700 leading-none tracking-tighter">
                {vendas.reduce((acc, curr) => acc + curr.valorTotal, 0).toLocaleString()} <span className="text-[10px]">Kz</span>
              </p>
            </div>
          </div>
        </div>
        
        <div className="flex-1 overflow-auto px-4">
          <table className="w-full text-left border-separate border-spacing-y-2 min-w-[1000px]">
            <thead>
              <tr className="text-[10px] font-black uppercase text-slate-400 italic">
                <th className="p-4">Lote</th>
                <th className="p-4">Data Saída</th>
                <th className="p-4">Cliente</th>
                <th className="p-4">Produto</th>
                <th className="p-4 text-center">Peso</th>
                <th className="p-4 text-right">Preço/Kg</th>
                <th className="p-4 text-right">Total (Kz)</th>
                <th className="p-4 text-center">Ações</th>
              </tr>
            </thead>
            <tbody>
              {vendas.map((v) => (
                <tr key={v.id} className="bg-white border border-slate-50 shadow-sm hover:shadow-md transition-all rounded-xl group">
                  <td className="p-4 font-black text-blue-600">{v.loteId}</td>
                  <td className="p-4 text-sm font-medium text-slate-600">{v.dataVenda}</td>
                  <td className="p-4 font-bold text-slate-800">{v.cliente}</td>
                  <td className="p-4"><span className="bg-blue-50 text-blue-700 px-3 py-1 rounded-lg text-[10px] font-black uppercase border border-blue-100">{v.produto}</span></td>
                  <td className="p-4 text-center font-bold">{v.pesoKg} Kg</td>
                  <td className="p-4 text-right font-medium">{Number(v.precoKz).toLocaleString()}</td>
                  <td className="p-4 text-right font-black text-blue-700 bg-blue-50/30 rounded-r-xl">{Number(v.valorTotal).toLocaleString()}</td>
                  <td className="p-4">
                    <div className="flex justify-center gap-2">
                      <button onClick={() => { setEditingId(v.id); setFormData({...v}); }} className="p-2 text-slate-300 hover:text-blue-600 transition-colors bg-slate-50 rounded-lg group-hover:bg-white"><Edit3 size={18}/></button>
                      <button onClick={async () => { if(confirm("Anular venda?")) await deleteDoc(doc(db, 'vendas', v.id)) }} className="p-2 text-slate-300 hover:text-red-600 transition-colors bg-slate-50 rounded-lg group-hover:bg-white"><Trash2 size={18}/></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {vendas.length === 0 && (
            <div className="flex flex-col items-center justify-center p-20 text-slate-300">
              <AlertCircle size={48} className="opacity-20 mb-2" />
              <p className="font-black uppercase tracking-widest text-[10px]">Aguardando primeiros registos</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
