import { useState } from 'react';
import { Save, Loader2, ClipboardCheck } from 'lucide-react';
// Caminho atualizado para dentro da src/types
import { Abate } from '../types/comercial'; 
import { dataService } from '../lib/dataService';

export function AbateForm() {
  const [loading, setLoading] = useState(false);
  const [sucesso, setSucesso] = useState(false);

  // Usamos o tipo Abate para garantir que os campos batem com a BD
  const [formData, setFormData] = useState<Partial<Abate>>({
    lote_id: '',
    data_abate: new Date().toISOString().split('T')[0],
    quantidade: 0,
    peso_carcaca_total: 0,
    observacoes: ''
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await dataService.saveSingle('abates', formData);
      setSucesso(true);
      setFormData({ 
        lote_id: '', 
        data_abate: new Date().toISOString().split('T')[0], 
        quantidade: 0, 
        peso_carcaca_total: 0, 
        observacoes: '' 
      });
      setTimeout(() => setSucesso(false), 3000);
    } catch (error) {
      console.error("Erro ao gravar abate:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="bg-white p-8 rounded-3xl shadow-xl border border-slate-100">
      <h3 className="text-xl font-bold text-slate-800 mb-6 flex items-center gap-2">
        <ClipboardCheck className="text-emerald-500" /> Registo de Abate
      </h3>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="md:col-span-2">
          <label className="block text-xs font-bold text-slate-400 uppercase mb-2">ID do Lote</label>
          <input 
            required
            type="text" 
            placeholder="Ex: LOTE-2026-001"
            className="w-full p-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-emerald-500 outline-none"
            value={formData.lote_id}
            onChange={(e) => setFormData({...formData, lote_id: e.target.value})}
          />
        </div>
        
        <div>
          <label className="block text-xs font-bold text-slate-400 uppercase mb-2">Data</label>
          <input 
            type="date" 
            className="w-full p-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-emerald-500 outline-none"
            value={formData.data_abate}
            onChange={(e) => setFormData({...formData, data_abate: e.target.value})}
          />
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-400 uppercase mb-2">Peso Carcaça Total (kg)</label>
          <input 
            required
            type="number" 
            step="0.01"
            className="w-full p-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-emerald-500 outline-none"
            value={formData.peso_carcaca_total}
            onChange={(e) => setFormData({...formData, peso_carcaca_total: Number(e.target.value)})}
          />
        </div>
      </div>

      <button 
        type="submit" 
        disabled={loading}
        className="mt-8 w-full bg-emerald-600 text-white p-4 rounded-2xl font-bold hover:bg-emerald-700 transition-all flex items-center justify-center gap-3 disabled:opacity-50"
      >
        {loading ? <Loader2 className="animate-spin" /> : <Save size={20} />}
        {sucesso ? "Gravado com Sucesso!" : "Confirmar Abate"}
      </button>
    </form>
  );
}
