import { useState } from 'react';
import { db } from '../lib/firebase';
import { collection, addDoc } from 'firebase/firestore';
import { Save, Scale, Truck, ClipboardList } from 'lucide-react';

export default function LotesPage() {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    codigo_id: '',
    especie: 'Suíno',
    raca_predominante: '',
    quantidade: 0,
    peso_origem_kg: 0,
    peso_chegada_kg: 0,
    custo_transporte_kz: 0,
    data_entrada: new Date().toISOString().split('T')[0]
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await addDoc(collection(db, 'lotes'), {
        ...formData,
        // Cálculos automáticos antes de enviar ao Firebase
        quebra_transporte: formData.peso_origem_kg - formData.peso_chegada_kg,
        rendimento_viagem: (formData.peso_chegada_kg / formData.peso_origem_kg) * 100
      });
      alert('Lote registado com sucesso na Fazenda Quanza!');
    } catch (error) {
      console.error("Erro ao salvar:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="bg-white rounded-[2.5rem] shadow-xl overflow-hidden border border-slate-100">
        <div className="bg-slate-900 p-8 text-white">
          <h2 className="text-2xl font-black italic flex items-center gap-3">
            <ClipboardList className="text-cyan-400" />
            Novo Registo de Entrada
          </h2>
          <p className="text-slate-400 text-xs uppercase tracking-widest mt-1">Pigs Rent — Unidade Luanda</p>
        </div>

        <form onSubmit={handleSubmit} className="p-8 grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Identificação */}
          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase text-slate-400 ml-2">Código do Lote</label>
            <input 
              required
              className="w-full bg-slate-50 border-none rounded-2xl p-4 focus:ring-2 focus:ring-cyan-500"
              placeholder="Ex: LOTE-2026-003"
              onChange={e => setFormData({...formData, codigo_id: e.target.value})}
            />
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase text-slate-400 ml-2">Espécie</label>
            <select 
              className="w-full bg-slate-50 border-none rounded-2xl p-4 focus:ring-2 focus:ring-cyan-500 font-bold"
              onChange={e => setFormData({...formData, especie: e.target.value})}
            >
              <option value="Suíno">Suíno (Porco)</option>
              <option value="Bovino">Bovino (Gado)</option>
            </select>
          </div>

          {/* Dados Técnicos */}
          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase text-slate-400 ml-2">Raça Predominante</label>
            <input 
              className="w-full bg-slate-50 border-none rounded-2xl p-4 focus:ring-2 focus:ring-cyan-500"
              placeholder="Ex: Nelore ou Large White"
              onChange={e => setFormData({...formData, raca_predominante: e.target.value})}
            />
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase text-slate-400 ml-2">Data de Entrada</label>
            <input 
              type="date"
              className="w-full bg-slate-50 border-none rounded-2xl p-4 focus:ring-2 focus:ring-cyan-500"
              value={formData.data_entrada}
              onChange={e => setFormData({...formData, data_entrada: e.target.value})}
            />
          </div>

          {/* Pesagem e Custos */}
          <div className="bg-cyan-50/50 p-6 rounded-[2rem] space-y-4">
            <h4 className="text-cyan-700 font-black text-[10px] uppercase flex items-center gap-2">
              <Scale size={14} /> Pesagem (kg)
            </h4>
            <div className="grid grid-cols-2 gap-4">
              <input 
                type="number" placeholder="Peso Origem" 
                className="w-full bg-white rounded-xl p-3 text-sm"
                onChange={e => setFormData({...formData, peso_origem_kg: Number(e.target.value)})}
              />
              <input 
                type="number" placeholder="Peso Chegada" 
                className="w-full bg-white rounded-xl p-3 text-sm"
                onChange={e => setFormData({...formData, peso_chegada_kg: Number(e.target.value)})}
              />
            </div>
          </div>

          <div className="bg-emerald-50/50 p-6 rounded-[2rem] space-y-4">
            <h4 className="text-emerald-700 font-black text-[10px] uppercase flex items-center gap-2">
              <Truck size={14} /> Logística (Kz)
            </h4>
            <input 
              type="number" placeholder="Custo de Transporte" 
              className="w-full bg-white rounded-xl p-3 text-sm"
              onChange={e => setFormData({...formData, custo_transporte_kz: Number(e.target.value)})}
            />
          </div>

          <button 
            type="submit" 
            disabled={loading}
            className="md:col-span-2 bg-cyan-500 hover:bg-cyan-600 text-white font-black py-5 rounded-2xl shadow-lg shadow-cyan-200 transition-all flex items-center justify-center gap-3 uppercase text-xs tracking-[0.2em]"
          >
            {loading ? 'A processar...' : <><Save size={20} /> Guardar Lote na Fazenda Quanza</>}
          </button>
        </form>
      </div>
    </div>
  );
}
