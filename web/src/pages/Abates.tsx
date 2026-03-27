import { useState, useEffect } from 'react';
import { db } from '../lib/firebase';
import { collection, addDoc, writeBatch, doc, onSnapshot, query, updateDoc, deleteDoc, orderBy } from 'firebase/firestore';
import { FileSpreadsheet, Trash2, Edit3, Search, Check, Activity } from 'lucide-react';
import * as XLSX from 'xlsx';

export default function AbatesPage() {
  const [loading, setLoading] = useState(false);
  const [abates, setAbates] = useState<any[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    loteId: '',
    dataAbate: new Date().toISOString().split('T')[0],
    pesoVivo: 0,
    pesoCarcaca: 0,
    rendimento: 0
  });

  const formatarDataExcel = (celula: any) => {
    if (!celula) return new Date().toISOString().split('T')[0];
    if (celula instanceof Date) return celula.toISOString().split('T')[0];
    if (typeof celula === 'number') {
      const date = XLSX.SSF.parse_date_code(celula);
      const pad = (n: number) => n < 10 ? `0${n}` : n;
      return `${date.y}-${pad(date.m)}-${pad(date.d)}`;
    }
    return String(celula);
  };

  const parseNumeroSeguro = (valor: any): number => {
    if (valor === null || valor === undefined || valor === '') return 0;
    if (typeof valor === 'number') return valor;
    const limpo = String(valor).replace(/\s/g, '').replace(/[a-zA-Z]/g, '').replace(',', '.');
    const num = parseFloat(limpo);
    return isNaN(num) ? 0 : num;
  };

  useEffect(() => {
    const q = query(collection(db, 'abates'), orderBy('dataAbate', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setAbates(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });
    return () => unsubscribe();
  }, []);

  const handleExcelImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setLoading(true);
    const reader = new FileReader();

    reader.onload = async (evt) => {
      try {
        const workbook = XLSX.read(evt.target?.result, { type: 'array', cellDates: true });
        const json = XLSX.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]]) as any[];
        const batch = writeBatch(db);

        json.forEach((row: any) => {
          const newDocRef = doc(collection(db, 'abates'));
          const pVivo = parseNumeroSeguro(row['pesoVivoK'] || row.pesoVivo || row.Peso);
          const pCarcaca = parseNumeroSeguro(row['CarcacaKg'] || row.pesoCarcaca || row.Carcaca);
          
          batch.set(newDocRef, {
            loteId: String(row.loteId || row.Lote || 'SEM LOTE').trim().toUpperCase(),
            dataAbate: formatarDataExcel(row.dataAbate || row.data || row.Data),
            pesoVivo: pVivo,
            pesoCarcaca: pCarcaca,
            rendimento: pVivo > 0 ? (pCarcaca / pVivo) * 100 : 0,
            createdAt: new Date().toISOString()
          });
        });
        await batch.commit();
        alert("Importação concluída!");
      } catch (err) {
        alert("Erro ao ler o Excel.");
      } finally {
        setLoading(false);
        e.target.value = '';
      }
    };
    reader.readAsArrayBuffer(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const rendimentoCalculado = formData.pesoVivo > 0 ? (formData.pesoCarcaca / formData.pesoVivo) * 100 : 0;
    try {
      if (editingId) {
        await updateDoc(doc(db, 'abates', editingId), { ...formData, rendimento: rendimentoCalculado });
        setEditingId(null);
      } else {
        await addDoc(collection(db, 'abates'), { ...formData, rendimento: rendimentoCalculado, createdAt: new Date().toISOString() });
      }
      setFormData({ loteId: '', dataAbate: new Date().toISOString().split('T')[0], pesoVivo: 0, pesoCarcaca: 0, rendimento: 0 });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8 bg-[#0f1117] min-h-screen text-slate-100">
      
      {/* HEADER */}
      <div className="flex justify-between items-end border-b border-slate-800 pb-6">
        <div>
          <h1 className="text-3xl font-black text-white uppercase tracking-tighter flex items-center gap-3">
            <Activity className="text-cyan-500" size={32} /> Registo de Abates
          </h1>
          <p className="text-slate-400 text-sm mt-1 uppercase tracking-widest font-bold italic">Rendimento de Carcaça e Performance</p>
        </div>
        <label className="bg-slate-800 hover:bg-slate-700 text-cyan-400 border border-cyan-500/30 px-6 py-2 rounded-xl cursor-pointer font-black text-[10px] uppercase tracking-widest transition-all flex items-center gap-2 shadow-lg shadow-cyan-900/10">
          <FileSpreadsheet size={18} /> {loading ? 'A PROCESSAR...' : 'IMPORTAR EXCEL'}
          <input type="file" accept=".xlsx, .xls" className="hidden" onChange={handleExcelImport} disabled={loading} />
        </label>
      </div>

      {/* FORMULÁRIO CYAN */}
      <div className="bg-[#1a1d26] rounded-3xl border border-slate-800 p-6 shadow-2xl overflow-hidden relative group">
        <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-4 gap-6 relative z-10">
          <div className="space-y-1">
            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Lote</label>
            <input required className="w-full bg-slate-900 border border-slate-700 p-3 rounded-xl text-sm font-bold text-white focus:border-cyan-500 outline-none transition-all" value={formData.loteId} onChange={e => setFormData({...formData, loteId: e.target.value.toUpperCase()})} />
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Peso Vivo (kg)</label>
            <input type="number" step="0.01" className="w-full bg-slate-900 border border-slate-700 p-3 rounded-xl text-sm font-bold text-white focus:border-cyan-500 outline-none" value={formData.pesoVivo} onChange={e => setFormData({...formData, pesoVivo: Number(e.target.value)})} />
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Peso Carcaça (kg)</label>
            <input type="number" step="0.01" className="w-full bg-slate-900 border border-slate-700 p-3 rounded-xl text-sm font-bold text-white focus:border-cyan-500 outline-none" value={formData.pesoCarcaca} onChange={e => setFormData({...formData, pesoCarcaca: Number(e.target.value)})} />
          </div>
          <button type="submit" className="bg-cyan-600 text-white font-black rounded-xl uppercase text-xs tracking-widest h-[46px] mt-auto hover:bg-cyan-500 transition-all flex items-center justify-center gap-2 shadow-lg shadow-cyan-900/20">
            <Check size={18} /> {editingId ? 'ATUALIZAR' : 'GRAVAR'}
          </button>
        </form>
      </div>

      {/* TABELA DARK */}
      <div className="bg-[#1a1d26] rounded-3xl border border-slate-800 overflow-hidden shadow-2xl">
        <div className="p-6 border-b border-slate-800 bg-slate-800/20 flex items-center gap-2 font-black text-xs uppercase text-slate-400 tracking-widest">
          <Search size={16} className="text-cyan-500" /> Histórico de Rendimento
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="text-[10px] font-black uppercase text-slate-500 tracking-widest border-b border-slate-800 bg-slate-800/10">
                <th className="p-6">Lote</th>
                <th className="p-6">Data</th>
                <th className="p-6 text-right">Peso Vivo</th>
                <th className="p-6 text-right">Carcaça</th>
                <th className="p-6 text-center">Rendimento</th>
                <th className="p-6 text-center">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/50">
              {abates.map((a) => (
                <tr key={a.id} className="hover:bg-slate-800/30 transition-colors">
                  <td className="p-6 font-black text-cyan-500 uppercase text-xs">{a.loteId}</td>
                  <td className="p-6 text-xs text-slate-400 font-bold">{a.dataAbate}</td>
                  <td className="p-6 text-right font-mono text-white text-xs">{a.pesoVivo.toFixed(1)} kg</td>
                  <td className="p-6 text-right font-mono text-white text-xs">{a.pesoCarcaca.toFixed(1)} kg</td>
                  <td className="p-6 text-center">
                    <span className="bg-cyan-500/10 text-cyan-400 px-3 py-1 rounded-full text-[10px] font-black border border-cyan-500/20">
                      {(a.rendimento || 0).toFixed(1)}%
                    </span>
                  </td>
                  <td className="p-6 flex justify-center gap-4">
                    <button onClick={() => { setEditingId(a.id); setFormData({...a}); }} className="text-slate-500 hover:text-cyan-400 transition-colors"><Edit3 size={18}/></button>
                    <button onClick={async () => { if(confirm("Eliminar registo?")) await deleteDoc(doc(db, 'abates', a.id)) }} className="text-slate-500 hover:text-red-500 transition-colors"><Trash2 size={18}/></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
