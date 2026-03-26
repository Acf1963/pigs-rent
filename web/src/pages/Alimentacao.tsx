import { useState } from 'react';
import { db } from '../lib/firebase';
import { collection, addDoc, writeBatch, doc } from 'firebase/firestore';
import { Soup, Calendar, Scale, Save, FileSpreadsheet, Upload, Calculator, Zap } from 'lucide-react';
import * as XLSX from 'xlsx';

// DEFINIÇÃO DE TIPOS LOCAL - Fases da Nutrição Suína/Bovina
type FaseRacao = 'INICIAL' | 'CRESCIMENTO' | 'ENGORDA' | 'REPRODUCAO';

interface RegistroNutricao {
  id?: string;
  loteId: string;
  data: string;
  fase: FaseRacao;
  tipoRacao: string;
  quantidadeKg: number;
  custoPorKgKz: number;
  custoTotalKz: number;
  fornecedor?: string;
  observacoes?: string;
}

export default function NutricaoPage() {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState<Omit<RegistroNutricao, 'id' | 'custoTotalKz'>>({
    loteId: '',
    data: new Date().toISOString().split('T')[0],
    fase: 'ENGORDA',
    tipoRacao: '',
    quantidadeKg: 0,
    custoPorKgKz: 0,
    fornecedor: '',
    observacoes: ''
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
          const custoTotal = (item.quantidadeKg || 0) * (item.custoPorKgKz || 0);
          const newDocRef = doc(collection(db, 'nutricao'));
          batch.set(newDocRef, { ...item, custoTotalKz: custoTotal });
        });

        await batch.commit();
        alert(`${data.length} registos de ração importados!`);
      } catch (err) {
        alert("Erro no Excel de nutrição.");
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
      const custoTotal = formData.quantidadeKg * formData.custoPorKgKz;
      await addDoc(collection(db, 'nutricao'), {
        ...formData,
        custoTotalKz: custoTotal
      });
      alert('Fornecimento de ração registado!');
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto p-4 md:p-6 font-sans text-slate-900">
      
      {/* Ações de Importação */}
      <div className="mb-6 flex flex-wrap gap-4 items-center">
        <label className="flex items-center gap-3 bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-3 rounded-2xl cursor-pointer transition-all shadow-lg font-black text-xs uppercase tracking-widest">
          <FileSpreadsheet size={18} />
          Importar Nutrição
          <input type="file" accept=".xlsx, .xls" className="hidden" onChange={handleExcelImport} />
        </label>
        <button className="flex items-center gap-3 bg-slate-800 text-slate-300 px-6 py-3 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-slate-700 border border-slate-700">
          <Upload size={18} />
          Modelo Nutrição
        </button>
      </div>

      <div className="bg-white rounded-[2.5rem] shadow-xl overflow-hidden border border-slate-100">
        <div className="bg-slate-900 p-8 text-white flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-black italic flex items-center gap-3 tracking-tighter text-cyan-400">
              <Soup /> <span className="text-white uppercase">Maneio Nutricional</span>
            </h2>
            <p className="text-slate-400 text-[10px] uppercase tracking-[0.2em] mt-1 font-bold">Fazenda Quanza — Controlo de Consumos</p>
          </div>
          <Zap className="text-yellow-500/30" size={32} />
        </div>

        <form onSubmit={handleSubmit} className="p-8 grid grid-cols-1 md:grid-cols-3 gap-6">
          
          <div className="space-y-1">
            <label className="text-[10px] font-black uppercase text-slate-400 ml-2">Lote Destino</label>
            <input required className="w-full bg-slate-50 border-none rounded-2xl p-4 focus:ring-2 focus:ring-cyan-500 font-bold text-slate-700"
              placeholder="Ex: FQ-2026-SU01"
              onChange={e => setFormData({...formData, loteId: e.target.value})} />
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-black uppercase text-slate-400 ml-2">Fase</label>
            <select className="w-full bg-slate-50 border-none rounded-2xl p-4 focus:ring-2 focus:ring-cyan-500 font-bold text-slate-700"
              value={formData.fase}
              onChange={e => setFormData({...formData, fase: e.target.value as FaseRacao})}>
              <option value="INICIAL">Inicial / Pré-Desmame</option>
              <option value="CRESCIMENTO">Crescimento</option>
              <option value="ENGORDA">Engorda / Terminação</option>
              <option value="REPRODUCAO">Reprodução / Gestação</option>
            </select>
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-black uppercase text-slate-400 ml-2 flex items-center gap-2">
              <Calendar size={12} className="text-cyan-500" /> Data Fornecimento
            </label>
            <input type="date" value={formData.data} className="w-full bg-slate-50 border-none rounded-2xl p-4 font-bold text-slate-700"
              onChange={e => setFormData({...formData, data: e.target.value})} />
          </div>

          <div className="md:col-span-3 space-y-1">
            <label className="text-[10px] font-black uppercase text-slate-400 ml-2">Composição / Nome da Ração</label>
            <input required className="w-full bg-slate-50 border-none rounded-2xl p-4 font-bold text-slate-700"
              placeholder="Ex: Farelo de Milho + Soja (20% Proteína)"
              onChange={e => setFormData({...formData, tipoRacao: e.target.value})} />
          </div>

          <div className="bg-slate-50 p-6 rounded-[2rem] border border-slate-200 shadow-inner">
            <label className="text-[10px] font-black uppercase text-slate-500 mb-2 flex items-center gap-2">
              <Scale size={14} className="text-cyan-500" /> Quantidade (Kg)
            </label>
            <input type="number" step="0.1" required className="w-full bg-white border-none rounded-xl p-3 font-black text-slate-700 focus:ring-2 focus:ring-cyan-500"
              onChange={e => setFormData({...formData, quantidadeKg: Number(e.target.value)})} />
          </div>

          <div className="bg-emerald-50 p-6 rounded-[2rem] border border-emerald-100 shadow-inner">
            <label className="text-[10px] font-black uppercase text-emerald-600 mb-2 flex items-center gap-2">
              <Calculator size={14} /> Custo por Kg (Kz)
            </label>
            <input type="number" step="0.01" required className="w-full bg-white border-none rounded-xl p-3 font-black text-emerald-700 focus:ring-2 focus:ring-emerald-500"
              onChange={e => setFormData({...formData, custoPorKgKz: Number(e.target.value)})} />
          </div>

          <div className="bg-slate-50 p-6 rounded-[2rem] border border-slate-200">
            <label className="text-[10px] font-black uppercase text-slate-500 mb-2">Fornecedor</label>
            <input className="w-full bg-white border-none rounded-xl p-3 font-bold text-slate-700 text-sm"
              placeholder="Ex: Moagens de Luanda"
              onChange={e => setFormData({...formData, fornecedor: e.target.value})} />
          </div>

          <button type="submit" disabled={loading}
            className="md:col-span-3 bg-cyan-500 hover:bg-cyan-600 text-white font-black py-6 rounded-3xl transition-all shadow-xl shadow-cyan-900/10 flex items-center justify-center gap-3 uppercase text-xs tracking-[0.3em] mt-4">
            {loading ? 'A Gravar...' : <><Save size={20} /> Registar Consumo de Ração</>}
          </button>
        </form>
      </div>
    </div>
  );
}
