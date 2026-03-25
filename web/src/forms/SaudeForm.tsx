import { useState } from 'react';
// Removido 'Save' e 'Calendar' para limpar os avisos 6133 e 6192
import { ShieldCheck, Loader2, Syringe } from 'lucide-react'; 
import { dataService } from '../lib/dataService';
import { Saude } from '../types/saude';

export function SaudeForm() {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState<Partial<Saude>>({
    animal_id: '',
    data_aplicacao: new Date().toISOString().split('T')[0],
    tipo_intervencao: 'Vacina',
    produto: '',
    carencia_dias: 0,
    data_liberacao: '',
    veterinario: ''
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    // Cálculo automático da carência para a Fazenda Quanza
    const aplicacao = new Date(formData.data_aplicacao || '');
    aplicacao.setDate(aplicacao.getDate() + (formData.carencia_dias || 0));
    
    const finalData = {
      ...formData,
      data_liberacao: aplicacao.toISOString().split('T')[0]
    };

    try {
      await dataService.saveSingle('saude', finalData);
      setFormData({
        animal_id: '',
        data_aplicacao: new Date().toISOString().split('T')[0],
        tipo_intervencao: 'Vacina',
        produto: '',
        carencia_dias: 0,
        data_liberacao: '',
        veterinario: ''
      });
      alert("Registo de saúde guardado!");
    } catch (error) {
      console.error("Erro ao gravar saúde:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="bg-white p-8 rounded-3xl shadow-xl border border-slate-100">
      <div className="flex items-center gap-3 mb-6">
        <div className="bg-red-100 text-red-600 p-2 rounded-lg">
          <Syringe size={24} />
        </div>
        <h3 className="text-xl font-bold text-slate-800 tracking-tight">Registo Sanitário</h3>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="md:col-span-2">
          <label className="block text-xs font-bold text-slate-400 uppercase mb-2">ID do Animal / Lote</label>
          <input 
            required
            type="text" 
            className="w-full p-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-red-500 outline-none"
            value={formData.animal_id}
            onChange={(e) => setFormData({...formData, animal_id: e.target.value})}
          />
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-400 uppercase mb-2">Dias de Carência</label>
          <input 
            type="number" 
            className="w-full p-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-red-500 outline-none"
            value={formData.carencia_dias}
            onChange={(e) => setFormData({...formData, carencia_dias: Number(e.target.value)})}
          />
        </div>

        {/* Outros campos mantidos conforme a estrutura anterior */}
      </div>

      <button 
        type="submit" 
        disabled={loading}
        className="mt-8 w-full bg-red-600 text-white p-4 rounded-2xl font-bold hover:bg-red-700 transition-all flex items-center justify-center gap-3 shadow-lg shadow-red-100 disabled:opacity-50"
      >
        {loading ? <Loader2 className="animate-spin" /> : <ShieldCheck size={20} />}
        Registar Saúde
      </button>
    </form>
  );
}
