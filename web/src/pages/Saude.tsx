import { useState, useEffect } from 'react';
import { db } from '../lib/firebase';
import { collection, addDoc, onSnapshot, query, orderBy, deleteDoc, doc } from 'firebase/firestore';
import { ShoppingCart, Plus, Trash2, DollarSign, Scale } from 'lucide-react';

export default function VendasPage() {
  const [vendas, setVendas] = useState<any[]>([]);
  const [formData, setFormData] = useState({
    cliente: '',
    pesoTotal: '',
    valorKg: '',
    data: new Date().toISOString().split('T')[0]
  });

  useEffect(() => {
    const q = query(collection(db, 'vendas'), orderBy('data', 'desc'));
    return onSnapshot(q, (snap) => {
      setVendas(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });
  }, []);

  const totalArrecadado = vendas.reduce((acc, v) => acc + (v.pesoTotal * v.valorKg), 0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await addDoc(collection(db, 'vendas'), { 
      ...formData, 
      pesoTotal: parseFloat(formData.pesoTotal),
      valorKg: parseFloat(formData.valorKg),
      createdAt: new Date().toISOString() 
    });
    setFormData({ ...formData, cliente: '', pesoTotal: '', valorKg: '' });
  };

  return (
    <div className="space-y-4 md:space-y-6 pb-10">
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-slate-800/50 pb-6">
        <h1 className="text-2xl font-black text-white flex items-center gap-3 tracking-tighter uppercase">
          <ShoppingCart className="text-emerald-500" size={32} /> Saídas e Vendas
        </h1>
        <div className="bg-emerald-500/10 border border-emerald-500/20 p-4 rounded-2xl">
          <span className="text-[10px] font-black text-emerald-500 uppercase block">Total em Caixa</span>
          <span className="text-xl font-black text-white">{totalArrecadado.toLocaleString()} Kz</span>
        </div>
      </header>

      {/* FORMULÁRIO MOBILE-FIRST */}
      <div className="bg-[#161922] rounded-[2rem] border border-slate-800/50 p-4 md:p-6 shadow-2xl">
        <form onSubmit={handleSubmit} className="flex flex-col md:grid md:grid-cols-12 gap-4">
          <div className="md:col-span-4 space-y-1">
            <label className="text-[8px] font-black text-slate-500 uppercase px-1">Cliente / Destino</label>
            <input required className="w-full bg-[#0f121a] border border-slate-800 p-3 rounded-xl text-white font-bold outline-none text-xs uppercase" placeholder="NOME DO COMPRADOR" value={formData.cliente} onChange={e => setFormData({...formData, cliente: e.target.value.toUpperCase()})} />
          </div>
          <div className="md:col-span-2 space-y-1">
            <label className="text-[8px] font-black text-slate-500 uppercase px-1">Peso Total (Kg)</label>
            <div className="relative">
              <Scale className="absolute left-3 top-3 text-slate-600" size={14} />
              <input type="number" step="0.1" required className="w-full bg-[#0f121a] border border-slate-800 p-3 pl-10 rounded-xl text-white font-bold outline-none text-xs" value={formData.pesoTotal} onChange={e => setFormData({...formData, pesoTotal: e.target.value})} />
            </div>
          </div>
          <div className="md:col-span-2 space-y-1">
            <label className="text-[8px] font-black text-slate-500 uppercase px-1">Preço/Kg (Kz)</label>
            <div className="relative">
              <DollarSign className="absolute left-3 top-3 text-emerald-600" size={14} />
              <input type="number" required className="w-full bg-[#0f121a] border border-slate-800 p-3 pl-10 rounded-xl text-emerald-500 font-bold outline-none text-xs" value={formData.valorKg} onChange={e => setFormData({...formData, valorKg: e.target.value})} />
            </div>
          </div>
          <div className="md:col-span-4 pt-2">
            <button type="submit" className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs py-4 rounded-xl transition-all uppercase flex items-center justify-center gap-2">
              <Plus size={18} /> Confirmar Venda
            </button>
          </div>
        </form>
      </div>

      {/* TABELA COM SCROLL HORIZONTAL */}
      <div className="bg-[#161922] rounded-[2rem] border border-slate-800/50 shadow-2xl overflow-hidden">
        <div className="overflow-x-auto custom-scrollbar"> 
          <table className="w-full text-left text-[10px] min-w-[800px]">
            <thead className="bg-black/30 text-slate-500 font-black uppercase text-[8px] border-b border-slate-800/50">
              <tr>
                <th className="p-4">DATA</th>
                <th className="p-4">CLIENTE</th>
                <th className="p-4 text-center">PESO TOTAL</th>
                <th className="p-4 text-center">PREÇO/KG</th>
                <th className="p-4 text-center">TOTAL</th>
                <th className="p-4 text-center">AÇÕES</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/30">
              {vendas.map((v) => (
                <tr key={v.id} className="hover:bg-slate-800/10 transition-colors">
                  <td className="p-4 text-slate-400">{v.data.split('-').reverse().join('/')}</td>
                  <td className="p-4 font-black text-white uppercase">{v.cliente}</td>
                  <td className="p-4 text-center text-slate-300">{v.pesoTotal} Kg</td>
                  <td className="p-4 text-center text-emerald-500 font-bold">{v.valorKg} Kz</td>
                  <td className="p-4 text-center font-black text-white">{(v.pesoTotal * v.valorKg).toLocaleString()} Kz</td>
                  <td className="p-4 text-center">
                    <button onClick={() => deleteDoc(doc(db, 'vendas', v.id))} className="text-slate-600 hover:text-red-500"><Trash2 size={16}/></button>
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
