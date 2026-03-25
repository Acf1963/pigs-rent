import { useState } from 'react';
import { db } from '../lib/firebase';
import { collection, addDoc } from 'firebase/firestore';
import { Syringe, Calendar, AlertCircle, Save, UserCheck, Beaker } from 'lucide-react';

// DEFINIÇÃO DE TIPOS LOCAL - Resolve definitivamente o erro 2305
type TipoIntervencao = 'VACINA' | 'VERMIFUGO' | 'TRATAMENTO' | 'SUPLEMENTO';

interface RegistroSaude {
  id?: string;
  animalId?: string;
  loteId: string;
  data: string;
  tipo: TipoIntervencao;
  medicamento: string;
  loteMedicamento: string;
  dosagem: string;
  viaAplicacao: 'ORAL' | 'SUBCUTANEA' | 'INTRAMUSCULAR';
  periodoCarenciaDias: number; 
  dataLiberacaoAbate: string;
  custoMedicamento: number;
  veterinarioResponsavel: string;
  observacoes?: string;
}

export default function SaudePage() {
  const [loading, setLoading] = useState(false);
  
  const [formData, setFormData] = useState<Omit<RegistroSaude, 'dataLiberacaoAbate'>>({
    loteId: '',
    animalId: '',
    data: new Date().toISOString().split('T')[0],
    tipo: 'VACINA',
    medicamento: '',
    loteMedicamento: '',
    dosagem: '',
    viaAplicacao: 'SUBCUTANEA',
    periodoCarenciaDias: 0,
    custoMedicamento: 0,
    veterinarioResponsavel: '',
    observacoes: ''
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const dataAplicacao = new Date(formData.data);
      const dataLibertacao = new Date(dataAplicacao);
      dataLibertacao.setDate(dataLibertacao.getDate() + (formData.periodoCarenciaDias || 0));

      await addDoc(collection(db, 'saude'), {
        ...formData,
        dataLiberacaoAbate: dataLibertacao.toISOString().split('T')[0]
      });
      
      alert('Intervenção sanitária registada com sucesso na Fazenda Quanza!');
    } catch (error) {
      console.error("Erro ao gravar registo:", error);
      alert('Erro ao ligar ao Firebase. Verifica a tua ligação.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto p-4 md:p-6 font-sans">
      <div className="bg-white rounded-[2.5rem] shadow-xl overflow-hidden border border-slate-100">
        
        {/* Header - Identidade Visual Fazenda Quanza */}
        <div className="bg-slate-900 p-8 text-white flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-black italic flex items-center gap-3 tracking-tighter">
              <Syringe className="text-cyan-400" />
              Maneio Sanitário
            </h2>
            <p className="text-slate-400 text-[10px] uppercase tracking-[0.2em] mt-1 font-bold">
              Gestão de Sanidade e Segurança Alimentar
            </p>
          </div>
          <div className="bg-amber-500/10 p-3 rounded-2xl border border-amber-500/20">
            <AlertCircle className="text-amber-500" size={24} />
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-8 grid grid-cols-1 md:grid-cols-3 gap-6">
          
          {/* Identificação do Lote/Animal */}
          <div className="space-y-1">
            <label className="text-[10px] font-black uppercase text-slate-400 ml-2">ID do Lote</label>
            <input 
              required 
              className="w-full bg-slate-50 border-none rounded-2xl p-4 focus:ring-2 focus:ring-cyan-500 font-medium"
              placeholder="Ex: FQ-2026-BOV01"
              onChange={e => setFormData({...formData, loteId: e.target.value})} 
            />
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-black uppercase text-slate-400 ml-2">Brinco Individual</label>
            <input 
              className="w-full bg-slate-50 border-none rounded-2xl p-4 focus:ring-2 focus:ring-cyan-500"
              placeholder="Opcional"
              onChange={e => setFormData({...formData, animalId: e.target.value})} 
            />
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-black uppercase text-slate-400 ml-2">Tipo de Intervenção</label>
            <select 
              className="w-full bg-slate-50 border-none rounded-2xl p-4 focus:ring-2 focus:ring-cyan-500 font-bold text-slate-700"
              value={formData.tipo}
              onChange={e => setFormData({...formData, tipo: e.target.value as TipoIntervencao})}
            >
              <option value="VACINA">Vacinação</option>
              <option value="VERMIFUGO">Vermífugo</option>
              <option value="TRATAMENTO">Tratamento Clínico</option>
              <option value="SUPLEMENTO">Suplemento</option>
            </select>
          </div>

          {/* Dados Técnicos da Aplicação */}
          <div className="space-y-1">
            <label className="text-[10px] font-black uppercase text-slate-400 ml-2 flex items-center gap-2">
              <Calendar size={12} className="text-cyan-500" /> Data da Aplicação
            </label>
            <input 
              type="date" 
              value={formData.data} 
              className="w-full bg-slate-50 border-none rounded-2xl p-4 font-bold"
              onChange={e => setFormData({...formData, data: e.target.value})} 
            />
          </div>

          <div className="md:col-span-2 space-y-1">
            <label className="text-[10px] font-black uppercase text-slate-400 ml-2 flex items-center gap-2">
              <Beaker size={12} className="text-cyan-500" /> Nome do Medicamento
            </label>
            <input 
              required 
              className="w-full bg-slate-50 border-none rounded-2xl p-4 font-bold"
              placeholder="Ex: Ivermectina 1% / Febre Aftosa"
              onChange={e => setFormData({...formData, medicamento: e.target.value})} 
            />
          </div>

          {/* Segurança Alimentar e Custos (Zonas de Alerta) */}
          <div className="bg-red-50 p-6 rounded-[2rem] border border-red-100 shadow-inner">
            <label className="text-[10px] font-black uppercase text-red-600 mb-2 block">
              Dias de Carência
            </label>
            <input 
              type="number" 
              required 
              className="w-full bg-white border-none rounded-xl p-3 font-black text-red-600 focus:ring-2 focus:ring-red-500"
              onChange={e => setFormData({...formData, periodoCarenciaDias: Number(e.target.value)})} 
            />
          </div>

          <div className="bg-emerald-50 p-6 rounded-[2rem] border border-emerald-100 shadow-inner">
            <label className="text-[10px] font-black uppercase text-emerald-600 mb-2 block">
              Custo do Produto (Kz)
            </label>
            <input 
              type="number" 
              className="w-full bg-white border-none rounded-xl p-3 font-black text-emerald-700 focus:ring-2 focus:ring-emerald-500"
              onChange={e => setFormData({...formData, custoMedicamento: Number(e.target.value)})} 
            />
          </div>

          <div className="bg-slate-50 p-6 rounded-[2rem] border border-slate-200">
            <label className="text-[10px] font-black uppercase text-slate-500 mb-2 flex items-center gap-2">
              <UserCheck size={14} /> Veterinário Responsável
            </label>
            <input 
              className="w-full bg-white border-none rounded-xl p-3 text-sm font-bold text-slate-700"
              onChange={e => setFormData({...formData, veterinarioResponsavel: e.target.value})} 
            />
          </div>

          <div className="md:col-span-3 space-y-1">
            <label className="text-[10px] font-black uppercase text-slate-400 ml-2">Observações Técnicas</label>
            <textarea 
              rows={2}
              className="w-full bg-slate-50 border-none rounded-2xl p-4 focus:ring-2 focus:ring-cyan-500"
              placeholder="Ex: Reação alérgica leve ou necessidade de reforço..."
              onChange={e => setFormData({...formData, observacoes: e.target.value})}
            ></textarea>
          </div>

          <button 
            type="submit" 
            disabled={loading}
            className="md:col-span-3 bg-cyan-500 hover:bg-cyan-600 text-white font-black py-6 rounded-3xl transition-all shadow-xl shadow-cyan-900/10 flex items-center justify-center gap-3 uppercase text-xs tracking-[0.3em]"
          >
            {loading ? 'A Gravar Dados...' : <><Save size={20} /> Confirmar Registo Sanitário</>}
          </button>
        </form>
      </div>
    </div>
  );
}
