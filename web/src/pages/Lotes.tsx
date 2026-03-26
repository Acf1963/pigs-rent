import { useState } from 'react';
import { db } from '../lib/firebase';
import { collection, addDoc, writeBatch, doc } from 'firebase/firestore';
import { Layers, Calendar, Tag, Save, FileSpreadsheet, Upload, Activity, Home } from 'lucide-react';
import * as XLSX from 'xlsx';

// DEFINIÇÃO DE TIPOS LOCAL - Foco em Suínos e Bovinos
type TipoAnimal = 'SUINO' | 'BOVINO';
type Finalidade = 'ENGORDA' | 'REPRODUCAO' | 'MATRIZ';

interface RegistroLote {
  id?: string;
  codigoLote: string; // Ex: FQ-2026-SU01
  tipo: TipoAnimal;
  raca: string;
  quantidade: number;
  dataEntrada: string;
  pesoInicialMedio: number;
  localizacao: string; // Baia ou Pasto
  finalidade: Finalidade;
  fornecedor?: string;
  custoAquisicaoTotal: number;
  status: 'ATIVO' | 'CONCLUIDO';
}

export default function LotesPage() {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState<Omit<RegistroLote, 'id'>>({
    codigoLote: '',
    tipo: 'SUINO',
    raca: '',
    quantidade: 0,
    dataEntrada: new Date().toISOString().split('T')[0],
    pesoInicialMedio: 0,
    localizacao: '',
    finalidade: 'ENGORDA',
    fornecedor: '',
    custoAquisicaoTotal: 0,
    status: 'ATIVO'
  });

  const handleExcelImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (evt) => {
      setLoading(true);
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const data = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]]) as any[];

        const batch = writeBatch(db);
        data.forEach((item) => {
          const newDocRef = doc(collection(db, 'lotes'));
          batch.set(newDocRef, { ...item, status: 'ATIVO' });
        });

        await batch.commit();
        alert(`${data.length} lotes importados com sucesso!`);
      } catch (err) {
        alert("Erro ao importar Excel.");
      } finally {
        setLoading(false);
      }
    };
    reader.readAsBinaryString(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await addDoc(collection(db, 'lotes'), formData);
      alert('Novo lote registado na Fazenda Quanza!');
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto p-4 md:p-6 font-sans">
      
      {/* Ações de Importação */}
      <div className="mb-6 flex flex-wrap gap-4 items-center">
        <label className="flex items-center gap-3 bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-3 rounded-2xl cursor-pointer transition-all shadow-lg shadow-emerald-900/10 font-black text-xs uppercase tracking-widest">
          <FileSpreadsheet size={18} />
          Importar Lotes
          <input type="file" accept=".xlsx, .xls" className="hidden" onChange={handleExcelImport} />
        </label>
        <button className="flex items-center gap-3 bg-slate-800 text-slate-300 px-6 py-3 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-slate-700 border border-slate-700">
          <Upload size={18} />
          Modelo Lotes
        </button>
      </div>

      <div className="bg-white rounded-[2.5rem] shadow-xl overflow-hidden border border-slate-100">
        <div className="bg-slate-900 p-8 text-white flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-black italic flex items-center gap-3 tracking-tighter text-cyan-400">
              <Layers /> <span className="text-white uppercase">Gestão de Lotes</span>
            </h2>
            <p className="text-slate-400 text-[10px] uppercase tracking-[0.2em] mt-1 font-bold">
              Registo de Entrada e Alojamento
            </p>
          </div>
          <Activity className="text-cyan-500/50" size={32} />
        </div>

        <form onSubmit={handleSubmit} className="p-8 grid grid-cols-1 md:grid-cols-3 gap-6">
          
          <div className="space-y-1">
            <label className="text-[10px] font-black uppercase text-slate-400 ml-2">Código do Lote</label>
            <input required className="w-full bg-slate-50 border-none rounded-2xl p-4 focus:ring-2 focus:ring-cyan-500 font-bold"
              placeholder="Ex: FQ-2026-SU01"
              onChange={e => setFormData({...formData, codigoLote: e.target.value})} />
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-black uppercase text-slate-400 ml-2">Espécie</label>
            <select className="w-full bg-slate-50 border-none rounded-2xl p-4 focus:ring-2 focus:ring-cyan-500 font-bold"
              value={formData.tipo}
              onChange={e => setFormData({...formData, tipo: e.target.value as TipoAnimal})}>
              <option value="SUINO">Suínos</option>
              <option value="BOVINO">Bovinos</option>
            </select>
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-black uppercase text-slate-400 ml-2 flex items-center gap-2">
              <Tag size={12} className="text-cyan-500" /> Raça / Cruzamento
            </label>
            <input required className="w-full bg-slate-50 border-none rounded-2xl p-4 font-bold"
              placeholder="Ex: Landrace / Nelore"
              onChange={e => setFormData({...formData, raca: e.target.value})} />
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-black uppercase text-slate-400 ml-2">Quantidade (Cab.)</label>
            <input type="number" required className="w-full bg-slate-50 border-none rounded-2xl p-4 font-black"
              onChange={e => setFormData({...formData, quantidade: Number(e.target.value)})} />
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-black uppercase text-slate-400 ml-2 flex items-center gap-2">
              <Calendar size={12} className="text-cyan-500" /> Data Entrada
            </label>
            <input type="date" value={formData.dataEntrada} className="w-full bg-slate-50 border-none rounded-2xl p-4 font-bold"
              onChange={e => setFormData({...formData, dataEntrada: e.target.value})} />
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-black uppercase text-slate-400 ml-2 flex items-center gap-2">
              <Home size={12} className="text-cyan-500" /> Localização
            </label>
            <input className="w-full bg-slate-50 border-none rounded-2xl p-4 font-bold"
              placeholder="Ex: Baia 04 / Pasto Sul"
              onChange={e => setFormData({...formData, localizacao: e.target.value})} />
          </div>

          {/* Destaque Financeiro e Técnico */}
          <div className="bg-cyan-50 p-6 rounded-[2rem] border border-cyan-100 shadow-inner">
            <label className="text-[10px] font-black uppercase text-cyan-700 mb-2 block">Peso Médio Inicial (kg)</label>
            <input type="number" step="0.01" required className="w-full bg-white border-none rounded-xl p-3 font-black text-cyan-700 focus:ring-2 focus:ring-cyan-500"
              onChange={e => setFormData({...formData, pesoInicialMedio: Number(e.target.value)})} />
          </div>

          <div className="bg-emerald-50 p-6 rounded-[2rem] border border-emerald-100 shadow-inner md:col-span-2">
            <label className="text-[10px] font-black uppercase text-emerald-600 mb-2 block">Custo Total de Aquisição (Kz)</label>
            <input type="number" required className="w-full bg-white border-none rounded-xl p-3 font-black text-emerald-700 focus:ring-2 focus:ring-emerald-500"
              placeholder="Valor total investido no lote"
              onChange={e => setFormData({...formData, custoAquisicaoTotal: Number(e.target.value)})} />
          </div>

          <div className="md:col-span-3">
            <label className="text-[10px] font-black uppercase text-slate-400 ml-2">Finalidade do Lote</label>
            <div className="grid grid-cols-3 gap-4 mt-2">
              {(['ENGORDA', 'REPRODUCAO', 'MATRIZ'] as Finalidade[]).map((fin) => (
                <button
                  key={fin}
                  type="button"
                  onClick={() => setFormData({...formData, finalidade: fin})}
                  className={`p-4 rounded-2xl font-black text-[10px] tracking-widest transition-all ${
                    formData.finalidade === fin 
                    ? 'bg-slate-900 text-cyan-400 shadow-lg' 
                    : 'bg-slate-100 text-slate-400 hover:bg-slate-200'
                  }`}
                >
                  {fin}
                </button>
              ))}
            </div>
          </div>

          <button type="submit" disabled={loading}
            className="md:col-span-3 bg-cyan-500 hover:bg-cyan-600 text-white font-black py-6 rounded-3xl transition-all shadow-xl shadow-cyan-900/10 flex items-center justify-center gap-3 uppercase text-xs tracking-[0.3em] mt-4">
            {loading ? 'A Gravar Lote...' : <><Save size={20} /> Registar Lote na Fazenda</>}
          </button>
        </form>
      </div>
    </div>
  );
}
