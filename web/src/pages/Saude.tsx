import { useState, useEffect } from 'react';
import { db } from '../lib/firebase';
import { collection, addDoc, onSnapshot, query, doc, deleteDoc, orderBy, updateDoc, writeBatch } from 'firebase/firestore';
import { Activity, Trash2, Edit3, Check, FileSpreadsheet, Search } from 'lucide-react';
import * as XLSX from 'xlsx';

export default function SaudePage() {
  const [loading, setLoading] = useState(false);
  const [registos, setRegistos] = useState<any[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    loteId: '',
    data: new Date().toISOString().split('T')[0],
    tipo: 'VACINA',
    medicamento: '',
    dosagem: '', // NOVO CAMPO ADICIONADO
    viaAplicacao: 'INTRAMUSCULAR',
    periodoCarenciaDias: 0,
    custoMedicamento: 0,
    veterinarioResponsavel: ''
  });

  useEffect(() => {
    const q = query(collection(db, 'maneio_sanitario'), orderBy('data', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setRegistos(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });
    return () => unsubscribe();
  }, []);

  // Importação de Excel atualizada para incluir a Dosagem
  const handleExcelImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setLoading(true);
    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const workbook = XLSX.read(evt.target?.result, { type: 'array' });
        const json = XLSX.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]]) as any[];
        const batch = writeBatch(db);

        json.forEach((row: any) => {
          const newDocRef = doc(collection(db, 'maneio_sanitario'));
          batch.set(newDocRef, {
            loteId: String(row.loteId || ''),
            data: row.data || new Date().toISOString().split('T')[0],
            tipo: String(row.tipo || 'VACINA').toUpperCase(),
            medicamento: String(row.medicamento || ''),
            dosagem: String(row.dosagem || ''), // CAPTURA DO EXCEL
            viaAplicacao: String(row.viaAplicacao || 'INTRAMUSCULAR').toUpperCase(),
            periodoCarenciaDias: Number(row.periodoCarenciaDias || 0),
            custoMedicamento: Number(row.custoMedicamento || 0),
            veterinarioResponsavel: String(row.veterinarioResponsavel || ''),
            createdAt: new Date().toISOString()
          });
        });
        await batch.commit();
        alert("Maneio Sanitário importado com sucesso!");
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
    try {
      if (editingId) {
        await updateDoc(doc(db, 'maneio_sanitario', editingId), { ...formData });
        setEditingId(null);
      } else {
        await addDoc(collection(db, 'maneio_sanitario'), { ...formData, createdAt: new Date().toISOString() });
      }
      setFormData({ loteId: '', data: new Date().toISOString().split('T')[0], tipo: 'VACINA', medicamento: '', dosagem: '', viaAplicacao: 'INTRAMUSCULAR', periodoCarenciaDias: 0, custoMedicamento: 0, veterinarioResponsavel: '' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8 bg-[#0f1117] min-h-screen text-slate-100 font-sans">
      
      <div className="flex justify-between items-end border-b border-slate-800 pb-6">
        <div>
          <h1 className="text-3xl font-black text-white uppercase tracking-tighter flex items-center gap-3">
            <Activity className="text-cyan-500" size={32} /> Maneio Sanitário
          </h1>
        </div>
        <label className="bg-slate-800 hover:bg-slate-700 text-cyan-400 border border-cyan-500/30 px-6 py-2 rounded-xl cursor-pointer font-black text-[10px] uppercase tracking-widest transition-all flex items-center gap-2 shadow-lg shadow-cyan-900/10">
          <FileSpreadsheet size={18} /> {loading ? 'A PROCESSAR...' : 'IMPORTAR EXCEL'}
          <input type="file" accept=".xlsx, .xls" className="hidden" onChange={handleExcelImport} disabled={loading} />
        </label>
      </div>

      {/* FORMULÁRIO COM O NOVO CAMPO DOSAGEM */}
      <div className="bg-[#1a1d26] rounded-3xl border border-slate-800 p-6 shadow-2xl">
        <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-6">
          <div className="space-y-1">
            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Lote</label>
            <input required className="w-full bg-slate-900 border border-slate-700 p-3 rounded-xl text-sm font-bold text-white focus:border-cyan-500 outline-none" value={formData.loteId} onChange={e => setFormData({...formData, loteId: e.target.value.toUpperCase()})} />
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Data</label>
            <input type="date" className="w-full bg-slate-900 border border-slate-700 p-3 rounded-xl text-sm font-bold text-white focus:border-cyan-500 outline-none" value={formData.data} onChange={e => setFormData({...formData, data: e.target.value})} />
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Tipo</label>
            <select className="w-full bg-slate-900 border border-slate-700 p-3 rounded-xl text-sm font-bold text-white focus:border-cyan-500 outline-none" value={formData.tipo} onChange={e => setFormData({...formData, tipo: e.target.value})}>
              <option value="VACINA">VACINA</option>
              <option value="VERMIFUGO">VERMIFUGO</option>
              <option value="TRATAMENTO">TRATAMENTO</option>
            </select>
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Medicamento</label>
            <input className="w-full bg-slate-900 border border-slate-700 p-3 rounded-xl text-sm font-bold text-white focus:border-cyan-500 outline-none" value={formData.medicamento} onChange={e => setFormData({...formData, medicamento: e.target.value})} />
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Dosagem</label>
            <input placeholder="ex: 2ml" className="w-full bg-slate-900 border border-slate-700 p-3 rounded-xl text-sm font-bold text-white focus:border-cyan-500 outline-none" value={formData.dosagem} onChange={e => setFormData({...formData, dosagem: e.target.value})} />
          </div>
          <button type="submit" className="lg:col-span-5 bg-cyan-600 text-white font-black rounded-xl uppercase text-xs tracking-widest h-[46px] hover:bg-cyan-500 transition-all flex items-center justify-center gap-2 shadow-lg shadow-cyan-900/20">
            <Check size={18} /> {editingId ? 'ATUALIZAR REGISTO' : 'GRAVAR NO MANEIO'}
          </button>
        </form>
      </div>

      {/* LISTAGEM ATUALIZADA */}
      <div className="bg-[#1a1d26] rounded-3xl border border-slate-800 overflow-hidden shadow-2xl">
        <div className="p-6 border-b border-slate-800 bg-slate-800/20 flex items-center gap-2 font-black text-xs uppercase text-slate-400 tracking-widest">
          <Search size={16} className="text-cyan-500" /> Histórico Clínico
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="text-[10px] font-black uppercase text-slate-500 tracking-widest border-b border-slate-800 bg-slate-800/10">
                <th className="p-6">Lote</th>
                <th className="p-6">Data</th>
                <th className="p-6">Tipo</th>
                <th className="p-6">Medicamento</th>
                <th className="p-6">Dosagem</th> {/* NOVA COLUNA */}
                <th className="p-6">Veterinário</th>
                <th className="p-6 text-center">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/50">
              {registos.map((item) => (
                <tr key={item.id} className="hover:bg-slate-800/30 transition-colors">
                  <td className="p-6 font-black text-cyan-500 uppercase text-xs">{item.loteId}</td>
                  <td className="p-6 text-xs text-slate-400 font-bold">{item.data}</td>
                  <td className="p-6">
                    <span className="bg-slate-800 text-slate-300 px-3 py-1 rounded-full text-[9px] font-black border border-slate-700">
                      {item.tipo}
                    </span>
                  </td>
                  <td className="p-6 text-xs text-white font-bold uppercase">{item.medicamento}</td>
                  <td className="p-6 text-xs text-cyan-400 font-mono italic">{item.dosagem}</td>
                  <td className="p-6 text-xs text-slate-400">{item.veterinarioResponsavel}</td>
                  <td className="p-6 flex justify-center gap-4">
                    <button onClick={() => { setEditingId(item.id); setFormData({...item}); }} className="text-slate-500 hover:text-cyan-400"><Edit3 size={18}/></button>
                    <button onClick={() => deleteDoc(doc(db, 'maneio_sanitario', item.id))} className="text-slate-500 hover:text-red-500"><Trash2 size={18}/></button>
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
