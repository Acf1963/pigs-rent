import { useState } from 'react';
import { Utensils, Save, Loader2 } from 'lucide-react';
import { dataService } from '../lib/dataService';
import { Manejo } from '../types/manejo'; // Importando o tipo que criámos

export function ManejoForm() {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState<Partial<Manejo>>({
    lote_id: '',
    data_trato: new Date().toISOString().split('T')[0],
    tipo_racao: '',
    quantidade_kg: 0,
    custo_por_kg_kz: 0,
    custo_total_kz: 0
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    // Cálculo automático do custo total antes de gravar
    const finalData = {
      ...formData,
      custo_total_kz: (formData.quantidade_kg || 0) * (formData.custo_por_kg_kz || 0)
    };

    try {
      await dataService.saveSingle('manejos', finalData);
      alert("Registo de alimentação guardado!");
      setFormData({
        lote_id: '',
        data_trato: new Date().toISOString().split('T')[0],
        tipo_racao: '',
        quantidade_kg: 0,
        custo_por_kg_kz: 0,
        custo_total_kz: 0
      });
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="bg-white p-8 rounded-3xl shadow-xl border border-slate-100">
      <div className="flex items-center gap-3 mb-6">
        <Utensils className="text-orange-500" />
        <h3 className="text-xl font-bold text-slate-800">Registo de Manejo / Ração</h3>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="md:col-span-2">
          <label className="block text-xs font-bold text-slate-400 uppercase mb-2">ID do Lote</label>
          <input 
            required
            type="text" 
            className="w-full p-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-orange-500 outline-none"
            value={formData.lote_id}
            onChange={(e) => setFormData({...formData, lote_id: e.target.value})}
          />
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-400 uppercase mb-2">Quantidade (Kg)</label>
          <input 
            type="number" 
            className="w-full p-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-orange-500 outline-none"
            onChange={(e) => setFormData({...formData, quantidade_kg: Number(e.target.value)})}
          />
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-400 uppercase mb-2">Preço por Kg (Kz)</label>
          <input 
            type="number" 
            className="w-full p-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-orange-500 outline-none"
            onChange={(e) => setFormData({...formData, custo_por_kg_kz: Number(e.target.value)})}
          />
        </div>
      </div>

      <button 
        type="submit" 
        disabled={loading}
        className="mt-8 w-full bg-orange-600 text-white p-4 rounded-2xl font-bold hover:bg-orange-700 transition-all flex items-center justify-center gap-3"
      >
        {loading ? <Loader2 className="animate-spin" /> : <Save size={20} />}
        Gravar Trato
      </button>
    </form>
  );
}
