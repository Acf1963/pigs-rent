import { useState } from 'react';
import { db } from '../lib/firebase';
import { collection, addDoc, writeBatch, doc } from 'firebase/firestore';
import { Syringe, Calendar, AlertCircle, Save, UserCheck, Beaker, FileSpreadsheet, Upload } from 'lucide-react';
import * as XLSX from 'xlsx';

// DEFINIÇÃO DE TIPOS LOCAL - Resolve 2305 definitivamente
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

  const handleExcelImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (evt) => {
      setLoading(true);
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const data = XLSX.utils.sheet_to_json(ws) as any[];

        const batch = writeBatch(db);
        data.forEach((item) => {
          const dataAplicacao = new Date(item.data || new Date());
          const dataLibertacao = new Date(dataAplicacao);
          dataLibertacao.setDate(dataLibertacao.getDate() + (item.periodoCarenciaDias || 0));

          const newDocRef = doc(collection(db, 'saude'));
          batch.set(newDocRef, {
            ...item,
            dataLiberacaoAbate: dataLibertacao.toISOString().split('T')[0]
          });
        });

        await batch.commit();
        alert(`${data.length} registos importados para a Fazenda Quanza!`);
      } catch (err) {
        console.error(err);
        alert("Erro no processamento do Excel.");
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
      const dataAplicacao = new Date(formData.data);
      const dataLibertacao = new Date(dataAplicacao);
      dataLibertacao.setDate(dataLibertacao.getDate() + (formData.periodoCarenciaDias || 0));

      await addDoc(collection(db, 'saude'), {
        ...formData,
        dataLiberacaoAbate: dataLibertacao.toISOString().split('T')[0]
      });
      alert('Registo manual guardado com sucesso!');
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto p-4 md:p-6 font-sans">
      
      {/* Botões Superiores */}
      <div className="mb-6 flex flex-wrap gap-4 items-center">
        <label className="flex items-center gap-3 bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-3 rounded-2xl cursor-pointer transition-all shadow-lg shadow-emerald-900/10 font-black text-xs uppercase tracking-widest">
          <FileSpreadsheet size={18} />
          Importar Excel
          <input type="file" accept=".xlsx, .xls" className="hidden" onChange={handleExcelImport} />
        </label>
        <button className="flex items-center gap-3 bg-slate-800 text-slate-300 px-6 py-3 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-slate-700 transition-all border border-slate-700">
          <Upload size={18} />
          Exportar Modelo
        </button>
      </div>

      <div className="bg-white rounded-[2.5rem] shadow-xl overflow-hidden border border-slate-100">
        <div className="bg-slate-900 p-8 text-white flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-black italic flex items-center gap-3 tracking-tighter text-cyan-400">
              <Syringe /> <span className="text-white uppercase">Maneio Sanitário</span>
            </h2>
            <p className="text-slate-400 text-[10px] uppercase tracking-[0.2em] mt-1 font-bold">
              Fazenda Quanza — Luanda, Angola
            </p>
          </div>
          <AlertCircle className="text-amber-500" size={32} />
        </div>

        <form onSubmit={handleSubmit} className="p-8 grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="space-y-1">
            <label className="text-[10px] font-black uppercase text-slate-400 ml-2">ID Lote</label>
            <input required className="w-full bg-slate-50 border-none rounded-2xl p-4 focus:ring-2 focus:ring-cyan-500 font-medium text-slate-700"
              onChange={e => setFormData({...formData, loteId: e.target.value})} />
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-black uppercase text-slate-400 ml-2">Brinco</label>
            <input className="w-full bg-slate-50 border-none rounded-2xl p-4 focus:ring-2 focus:ring-cyan-500 font-medium text-slate-700"
              onChange={e => setFormData({...formData, animalId: e.target.value})} />
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-black uppercase text-slate-400 ml-2">Tipo</label>
            <select className="w-full bg-slate-50 border-none rounded-2xl p-4 focus:ring-2 focus:ring-cyan-500 font-bold text-slate-700"
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
              <Calendar size={12} className="text-cyan-500" /> Data Aplicação
            </label>
            <input type="date" value={formData.data} className="w-full bg-slate-50 border-none rounded-2xl p-4 font-bold text-slate-700"
              onChange={e => setFormData({...formData, data: e.target.value})} />
          </div>

          <div className="md:col-span-2 space-y-1">
            <label className="text-[10px] font-black uppercase text-slate-400 ml-2 flex items-center gap-2">
              <Beaker size={12} className="text-cyan-500" /> Medicamento / Produto
            </label>
            <input required className="w-full bg-slate-50 border-none rounded-2xl p-4 font-bold text-slate-700"
              placeholder="Ex: Ivermectina 1%"
              onChange={e => setFormData({...formData, medicamento: e.target.value})} />
          </div>

          {/* Secções de Destaque - Removidas redundâncias font-black */}
          <div className="bg-red-50 p-6 rounded-[2rem] border border-red-100 shadow-inner">
            <label className="text-[10px] font-black uppercase text-red-600 mb-2 block">Dias Carência</label>
            <input type="number" required className="w-full bg-white border-none rounded-xl p-3 font-black text-red-600 focus:ring-2 focus:ring-red-500"
              onChange={e => setFormData({...formData, periodoCarenciaDias: Number(e.target.value)})} />
          </div>

          <div className="bg-emerald-50 p-6 rounded-[2rem] border border-emerald-100 shadow-inner">
            <label className="text-[10px] font-black uppercase text-emerald-600 mb-2 block">Custo (Kz)</label>
            <input type="number" className="w-full bg-white border-none rounded-xl p-3 font-black text-emerald-700 focus:ring-2 focus:ring-emerald-500"
              onChange={e => setFormData({...formData, custoMedicamento: Number(e.target.value)})} />
          </div>

          <div className="bg-slate-50 p-6 rounded-[2rem] border border-slate-200">
            <label className="text-[10px] font-black uppercase text-slate-500 mb-2 flex items-center gap-2">
              <UserCheck size={14} /> Veterinário
            </label>
            <input className="w-full bg-white border-none rounded-xl p-3 text-sm font-bold text-slate-700"
              onChange={e => setFormData({...formData, veterinarioResponsavel: e.target.value})} />
          </div>

          <button type="submit" disabled={loading}
            className="md:col-span-3 bg-cyan-500 hover:bg-cyan-600 text-white font-black py-6 rounded-3xl transition-all shadow-xl shadow-cyan-900/10 flex items-center justify-center gap-3 uppercase text-xs tracking-widest mt-4">
            {loading ? 'A Gravar...' : <><Save size={20} /> Guardar Registo no Firebase</>}
          </button>
        </form>
      </div>
    </div>
  );
}
