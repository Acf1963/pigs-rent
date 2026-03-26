import { useState } from 'react';
import { db } from '../lib/firebase';
import { collection, addDoc, writeBatch, doc } from 'firebase/firestore';
// Removido o Calendar que não estava a ser usado
import { Scale, Save, FileSpreadsheet, Upload, ClipboardCheck, ShoppingBag, Utensils } from 'lucide-react';
import * as XLSX from 'xlsx';

interface RegistroAbate {
  id?: string;
  loteId: string;
  animalId?: string;
  dataAbate: string;
  pesoVivoKg: number;
  pesoCarcaçaKg: number;
  rendimentoPercentual: number;
  classificacaoGordura: '1' | '2' | '3' | '4' | '5';
  destino: 'VENDA_DIRETA' | 'PROCESSAMENTO' | 'CONSUMO';
  custoAbateKz: number;
  observacoes?: string;
}

export default function AbatesPage() {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState<Omit<RegistroAbate, 'id' | 'rendimentoPercentual'>>({
    loteId: '',
    animalId: '',
    dataAbate: new Date().toISOString().split('T')[0],
    pesoVivoKg: 0,
    pesoCarcaçaKg: 0,
    classificacaoGordura: '3',
    destino: 'VENDA_DIRETA',
    custoAbateKz: 0,
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
          const rendimento = ((item.pesoCarcaçaKg / item.pesoVivoKg) * 100).toFixed(2);
          const newDocRef = doc(collection(db, 'abates'));
          batch.set(newDocRef, { ...item, rendimentoPercentual: Number(rendimento) });
        });

        await batch.commit();
        alert(`${data.length} abates importados para a Fazenda Quanza!`);
      } catch (err) {
        alert("Erro no ficheiro Excel.");
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
      const rendimento = ((formData.pesoCarcaçaKg / formData.pesoVivoKg) * 100).toFixed(2);
      await addDoc(collection(db, 'abates'), {
        ...formData,
        rendimentoPercentual: Number(rendimento)
      });
      alert('Abate registado com sucesso!');
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto p-4 md:p-6 font-sans text-slate-900">
      
      {/* Ações Excel */}
      <div className="mb-6 flex flex-wrap gap-4">
        <label className="flex items-center gap-3 bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-3 rounded-2xl cursor-pointer transition-all shadow-lg font-black text-xs uppercase tracking-widest">
          <FileSpreadsheet size={18} />
          Importar Abates
          <input type="file" accept=".xlsx, .xls" className="hidden" onChange={handleExcelImport} />
        </label>
        <button className="flex items-center gap-3 bg-slate-800 text-slate-300 px-6 py-3 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-slate-700 border border-slate-700">
          <Upload size={18} />
          Modelo XLSX
        </button>
      </div>

      <div className="bg-white rounded-[2.5rem] shadow-xl overflow-hidden border border-slate-100">
        <div className="bg-slate-900 p-8 text-white flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-black italic flex items-center gap-3 tracking-tighter text-cyan-400">
              <Utensils /> <span className="text-white uppercase">Registo de Abate</span>
            </h2>
            <p className="text-slate-400 text-[10px] uppercase tracking-[0.2em] mt-1 font-bold">Fazenda Quanza — Luanda</p>
          </div>
          <ClipboardCheck className="text-emerald-500/30" size={32} />
        </div>

        <form onSubmit={handleSubmit} className="p-8 grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="space-y-1">
            <label className="text-[10px] font-black uppercase text-slate-400 ml-2">ID Lote</label>
            <input required className="w-full bg-slate-50 border-none rounded-2xl p-4 focus:ring-2 focus:ring-cyan-500 font-bold"
              onChange={e => setFormData({...formData, loteId: e.target.value})} />
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-black uppercase text-slate-400 ml-2">Brinco</label>
            <input className="w-full bg-slate-50 border-none rounded-2xl p-4 focus:ring-2 focus:ring-cyan-500 font-bold text-slate-700"
              onChange={e => setFormData({...formData, animalId: e.target.value})} />
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-black uppercase text-slate-400 ml-2">Data do Abate</label>
            <input type="date" value={formData.dataAbate} className="w-full bg-slate-50 border-none rounded-2xl p-4 font-bold text-slate-700"
              onChange={e => setFormData({...formData, dataAbate: e.target.value})} />
          </div>

          <div className="bg-slate-50 p-6 rounded-[2rem] border border-slate-200">
            <label className="text-[10px] font-black uppercase text-slate-500 mb-2 flex items-center gap-2">
              <Scale size={14} className="text-cyan-500" /> Peso Vivo (kg)
            </label>
            <input type="number" step="0.1" required className="w-full bg-white border-none rounded-xl p-3 font-black text-slate-700 focus:ring-2 focus:ring-cyan-500"
              onChange={e => setFormData({...formData, pesoVivoKg: Number(e.target.value)})} />
          </div>

          <div className="bg-cyan-50 p-6 rounded-[2rem] border border-cyan-100">
            <label className="text-[10px] font-black uppercase text-cyan-700 mb-2 flex items-center gap-2">
              <Scale size={14} /> Peso Carcaça (kg)
            </label>
            <input type="number" step="0.1" required className="w-full bg-white border-none rounded-xl p-3 font-black text-cyan-700 focus:ring-2 focus:ring-cyan-500"
              onChange={e => setFormData({...formData, pesoCarcaçaKg: Number(e.target.value)})} />
          </div>

          <div className="bg-emerald-50 p-6 rounded-[2rem] border border-emerald-100">
            <label className="text-[10px] font-black uppercase text-emerald-600 mb-2 block">Custo Abate (Kz)</label>
            <input type="number" required className="w-full bg-white border-none rounded-xl p-3 font-black text-emerald-700 focus:ring-2 focus:ring-emerald-500"
              onChange={e => setFormData({...formData, custoAbateKz: Number(e.target.value)})} />
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-black uppercase text-slate-400 ml-2 block">Acabamento</label>
            <select className="w-full bg-slate-50 border-none rounded-2xl p-4 focus:ring-2 focus:ring-cyan-500 font-bold text-slate-700"
              value={formData.classificacaoGordura}
              onChange={e => setFormData({...formData, classificacaoGordura: e.target.value as any})}>
              <option value="3">3 - Ideal</option>
              <option value="1">1 - Magro</option>
              <option value="5">5 - Gordo</option>
            </select>
          </div>

          <div className="md:col-span-2 space-y-1">
            <label className="text-[10px] font-black uppercase text-slate-400 ml-2 flex items-center gap-2">
              <ShoppingBag size={12} /> Destino da Carne
            </label>
            <div className="grid grid-cols-3 gap-2">
              {(['VENDA_DIRETA', 'PROCESSAMENTO', 'CONSUMO'] as const).map((dest) => (
                <button
                  key={dest}
                  type="button"
                  onClick={() => setFormData({...formData, destino: dest})}
                  className={`p-3 rounded-xl font-black text-[9px] tracking-widest transition-all ${
                    formData.destino === dest ? 'bg-slate-900 text-cyan-400 shadow-md' : 'bg-slate-100 text-slate-400 hover:bg-slate-200'
                  }`}
                >
                  {dest.replace('_', ' ')}
                </button>
              ))}
            </div>
          </div>

          <button type="submit" disabled={loading}
            className="md:col-span-3 bg-cyan-500 hover:bg-cyan-600 text-white font-black py-6 rounded-3xl transition-all shadow-xl shadow-cyan-900/10 flex items-center justify-center gap-3 uppercase text-xs tracking-widest mt-4">
            {loading ? 'A Gravar...' : <><Save size={20} /> Finalizar Abate</>}
          </button>
        </form>
      </div>
    </div>
  );
}
