import { useState } from 'react';
import { db } from '../lib/firebase';
import { collection, addDoc } from 'firebase/firestore';
import { Syringe, Calendar, AlertCircle, Save, UserCheck, Beaker } from 'lucide-react';
// Importação explícita
import { RegistroSaude, TipoIntervencao } from '../types/saude';

export default function SaudePage() {
  const [loading, setLoading] = useState(false);
  
  const [formData, setFormData] = useState<Omit<RegistroSaude, 'id' | 'dataLiberacaoAbate'>>({
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
      dataLibertacao.setDate(dataLibertacao.getDate() + formData.periodoCarenciaDias);

      await addDoc(collection(db, 'saude'), {
        ...formData,
        dataLiberacaoAbate: dataLibertacao.toISOString().split('T')[0]
      });
      alert('Sucesso: Registo guardado na Fazenda Quanza!');
    } catch (error) {
      console.error("Erro:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto p-6 font-sans">
      <div className="bg-white rounded-[2.5rem] shadow-xl overflow-hidden border border-slate-100">
        <div className="bg-slate-900 p-8 text-white flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-black italic flex items-center gap-3">
              <Syringe className="text-cyan-400" /> Maneio Sanitário
            </h2>
            <p className="text-slate-400 text-[10px] uppercase tracking-[0.2em] mt-1 font-bold">
              Fazenda Quanza — Bovinos & Suínos
            </p>
          </div>
          <AlertCircle className="text-amber-500" size={32} />
        </div>

        <form onSubmit={handleSubmit} className="p-8 grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="space-y-1">
            <label className="text-[10px] font-black uppercase text-slate-400 ml-2">ID Lote</label>
            <input required className="w-full bg-slate-50 border-none rounded-2xl p-4 focus:ring-2 focus:ring-cyan-500 font-medium"
              onChange={e => setFormData({...formData, loteId: e.target.value})} />
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-black uppercase text-slate-400 ml-2">Tipo</label>
            <select className="w-full bg-slate-50 border-none rounded-2xl p-4 focus:ring-2 focus:ring-cyan-500 font-bold"
              value={formData.tipo}
              onChange={e => setFormData({...formData, tipo: e.target.value as TipoIntervencao})}>
              <option value="VACINA">Vacinação</option>
              <option value="VERMIFUGO">Vermífugo</option>
              <option value="TRATAMENTO">Tratamento</option>
              <option value="SUPLEMENTO">Suplemento</option>
            </select>
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-black uppercase text-slate-400 ml-2 flex items-center gap-2">
              <Calendar size={12} /> Data
            </label>
            <input type="date" value={formData.data} className="w-full bg-slate-50 border-none rounded-2xl p-4 font-bold"
              onChange={e => setFormData({...formData, data: e.target.value})} />
          </div>

          <div className="space-y-1 md:col-span-2">
            <label className="text-[10px] font-black uppercase text-slate-400 ml-2 flex items-center gap-2">
              <Beaker size={12} /> Medicamento
            </label>
            <input required className="w-full bg-slate-50 border-none rounded-2xl p-4 font-bold"
              onChange={e => setFormData({...formData, medicamento: e.target.value})} />
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-black uppercase text-slate-400 ml-2">Lote Med.</label>
            <input className="w-full bg-slate-50 border-none rounded-2xl p-4"
              onChange={e => setFormData({...formData, loteMedicamento: e.target.value})} />
          </div>

          <div className="bg-red-50 p-6 rounded-[2rem] border border-red-100">
            <label className="text-[10px] font-black uppercase text-red-600 mb-2 block">Dias Carência</label>
            <input type="number" required className="w-full bg-white border-none rounded-xl p-3 font-black text-red-600 focus:ring-2 focus:ring-red-500"
              onChange={e => setFormData({...formData, periodoCarenciaDias: Number(e.target.value)})} />
          </div>

          <div className="bg-emerald-50 p-6 rounded-[2rem] border border-emerald-100">
            <label className="text-[10px] font-black uppercase text-emerald-600 mb-2 block">Custo (Kz)</label>
            <input type="number" className="w-full bg-white border-none rounded-xl p-3 font-black text-emerald-700"
              onChange={e => setFormData({...formData, custoMedicamento: Number(e.target.value)})} />
          </div>

          <div className="bg-slate-50 p-6 rounded-[2rem] border border-slate-200">
            <label className="text-[10px] font-black uppercase text-slate-500 mb-2 flex items-center gap-2">
              <UserCheck size={14} /> Veterinário
            </label>
            <input className="w-full bg-white border-none rounded-xl p-3 text-sm font-bold"
              onChange={e => setFormData({...formData, veterinarioResponsavel: e.target.value})} />
          </div>

          <button type="submit" disabled={loading}
            className="md:col-span-3 bg-cyan-500 hover:bg-cyan-600 text-white font-black py-6 rounded-3xl transition-all shadow-xl shadow-cyan-900/10 flex items-center justify-center gap-3 uppercase text-xs tracking-widest">
            {loading ? 'A processar...' : <><Save size={20} /> Guardar Registo Sanitário</>}
          </button>
        </form>
      </div>
    </div>
  );
}
