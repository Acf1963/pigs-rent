import { useState } from 'react';
import { Save, PlusCircle, ClipboardList, Loader2 } from 'lucide-react'; // Removido Truck
import { dataService } from '../lib/dataService';
import { Lote } from '../types/lote';

export function LoteForm() {
  const [loading, setLoading] = useState(false);
  const [msgSucesso, setMsgSucesso] = useState(false);

  const [formData, setFormData] = useState<Partial<Lote>>({
    codigo: '',
    fornecedor: '',
    especie: 'Suíno',
    raca_predominante: '',
    data_entrada: new Date().toISOString().split('T')[0],
    peso_origem_kg: 0,
    peso_chegada_kg: 0,
    custo_transporte_kz: 0,
    custo_aquisicao_total_kz: 0,
    status: 'Ativo'
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await dataService.saveSingle('lotes', formData);
      setMsgSucesso(true);
      setFormData({
        codigo: '',
        fornecedor: '',
        especie: 'Suíno',
        raca_predominante: '',
        data_entrada: new Date().toISOString().split('T')[0],
        peso_origem_kg: 0,
        peso_chegada_kg: 0,
        custo_transporte_kz: 0,
        custo_aquisicao_total_kz: 0,
        status: 'Ativo'
      });
      setTimeout(() => setMsgSucesso(false), 4000);
    } catch (error) {
      console.error("Erro ao salvar lote:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="bg-white p-8 rounded-3xl shadow-xl border border-slate-100 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex items-center gap-3 mb-8 pb-4 border-b border-slate-50">
        <div className="bg-cyan-100 text-cyan-600 p-2 rounded-lg">
          <PlusCircle size={24} />
        </div>
        <h3 className="text-xl font-bold text-slate-800">Novo Registo de Lote</h3>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-1">
          <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Código do Lote</label>
          <input 
            required
            type="text" 
            className="w-full p-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-cyan-500 outline-none"
            value={formData.codigo}
            onChange={(e) => setFormData({...formData, codigo: e.target.value})}
          />
        </div>

        <div className="md:col-span-2">
          <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Fornecedor / Origem</label>
          <input 
            required
            type="text" 
            className="w-full p-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-cyan-500 outline-none"
            value={formData.fornecedor}
            onChange={(e) => setFormData({...formData, fornecedor: e.target.value})}
          />
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Espécie</label>
          <select 
            className="w-full p-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-cyan-500 outline-none bg-white"
            value={formData.especie}
            onChange={(e) => setFormData({...formData, especie: e.target.value as any})}
          >
            <option value="Suíno">Suíno</option>
            <option value="Bovino">Bovino</option>
          </select>
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Raça</label>
          <input 
            type="text" 
            className="w-full p-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-cyan-500 outline-none"
            value={formData.raca_predominante}
            onChange={(e) => setFormData({...formData, raca_predominante: e.target.value})}
          />
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Data Entrada</label>
          <input 
            type="date" 
            className="w-full p-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-cyan-500 outline-none"
            value={formData.data_entrada}
            onChange={(e) => setFormData({...formData, data_entrada: e.target.value})}
          />
        </div>

        {/* SECÇÃO CORRIGIDA: Removido o conflito flex/grid na linha 121 */}
        <div className="bg-slate-50 p-6 rounded-2xl grid grid-cols-1 md:grid-cols-4 gap-4 md:col-span-3">
           <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Peso Origem (kg)</label>
              <input type="number" step="0.01" className="w-full p-2 rounded-lg border border-slate-200" 
                onChange={(e) => setFormData({...formData, peso_origem_kg: Number(e.target.value)})} />
           </div>
           <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Peso Chegada (kg)</label>
              <input type="number" step="0.01" className="w-full p-2 rounded-lg border border-slate-200"
                onChange={(e) => setFormData({...formData, peso_chegada_kg: Number(e.target.value)})} />
           </div>
           <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Custo Aquisição (Kz)</label>
              <input type="number" className="w-full p-2 rounded-lg border border-slate-200"
                onChange={(e) => setFormData({...formData, custo_aquisicao_total_kz: Number(e.target.value)})} />
           </div>
           <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Transporte (Kz)</label>
              <input type="number" className="w-full p-2 rounded-lg border border-slate-200"
                onChange={(e) => setFormData({...formData, custo_transporte_kz: Number(e.target.value)})} />
           </div>
        </div>
      </div>

      <div className="mt-10 flex items-center justify-between">
        {msgSucesso && (
          <p className="text-emerald-600 font-bold flex items-center gap-2 animate-pulse">
            <ClipboardList size={20} /> Lote registado com sucesso!
          </p>
        )}
        <button 
          type="submit" 
          disabled={loading}
          className="ml-auto bg-slate-800 text-white px-10 py-4 rounded-2xl font-bold hover:bg-slate-900 transition-all flex items-center gap-3 disabled:opacity-50"
        >
          {loading ? <Loader2 className="animate-spin" size={20} /> : <Save size={20} />}
          Gravar Lote
        </button>
      </div>
    </form>
  );
}
