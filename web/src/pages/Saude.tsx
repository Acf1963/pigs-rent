import { useState, useEffect } from 'react';
import { db } from '../lib/firebase';
import { collection, addDoc, writeBatch, doc, onSnapshot, query, updateDoc, deleteDoc, orderBy } from 'firebase/firestore';
import { ShieldCheck, FileSpreadsheet, Trash2, Edit3, X, Check, Search, AlertCircle, Calendar, Syringe } from 'lucide-react';
import * as XLSX from 'xlsx';

export default function SaudePage() {
  const [loading, setLoading] = useState(false);
  const [registos, setRegistos] = useState<any[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    loteId: '',
    data: new Date().toISOString().split('T')[0],
    tipo: 'Vacina',
    medicamento: '',
    dosagem: '',
    viaAplicacao: 'Intramuscular',
    periodoCarenciaDias: 0,
    custoMedicamento: 0,
    veterinarioResponsavel: ''
  });

  useEffect(() => {
    // Adicionei ordenação por data para facilitar a leitura
    const q = query(collection(db, 'saude'), orderBy('data', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setRegistos(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
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
        const workbook = XLSX.read(evt.target?.result, { type: 'array' });
        const json = XLSX.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]]) as any[];
        const batch = writeBatch(db);

        json.forEach((row: any) => {
          const newDocRef = doc(collection(db, 'saude'));
          const custoRaw = String(row.custoMedicamento || '0');
          const custoNum = Number(custoRaw.replace(/\s/g, '').replace('AOA', '').replace(',', '.'));

          batch.set(newDocRef, {
            loteId: String(row.loteId || ''),
            data: row.data || new Date().toISOString().split('T')[0],
            tipo: String(row.tipo || 'Tratamento').toUpperCase(),
            medicamento: String(row.medicamento || ''),
            dosagem: String(row.dosagem || ''),
            viaAplicacao: String(row.viaAplicacao || '').toUpperCase(),
            periodoCarenciaDias: Number(row.periodoCarenciaDias || 0),
            custoMedicamento: isNaN(custoNum) ? 0 : custoNum,
            veterinarioResponsavel: String(row.veterinarioResponsavel || ''),
            createdAt: new Date().toISOString()
          });
        });
        await batch.commit();
        alert("Histórico sanitário importado com sucesso!");
      } catch (err) {
        alert("Erro ao processar ficheiro Excel.");
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
        await updateDoc(doc(db, 'saude', editingId), formData);
        setEditingId(null);
      } else {
        await addDoc(collection(db, 'saude'), { ...formData, createdAt: new Date().toISOString() });
      }
      setFormData({ loteId: '', data: new Date().toISOString().split('T')[0], tipo: 'Vacina', medicamento: '', dosagem: '', viaAplicacao: 'Intramuscular', periodoCarenciaDias: 0, custoMedicamento: 0, veterinarioResponsavel: '' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8 animate-in fade-in duration-500 bg-[#0f1117] min-h-screen text-slate-100">
      
      {/* HEADER */}
      <div className="flex justify-between items-end border-b border-slate-800 pb-6">
        <div>
          <h1 className="text-3xl font-black text-white uppercase tracking-tighter flex items-center gap-3">
            <ShieldCheck className="text-cyan-500" size={32} />
            Maneio Sanitário
          </h1>
          <p className="text-slate-400 text-sm mt-1 uppercase tracking-widest font-bold italic">
            Controlo Clínico e Biossegurança
          </p>
        </div>
        <label className="bg-slate-800 hover:bg-slate-700 text-cyan-400 border border-cyan-500/30 px-6 py-2 rounded-xl cursor-pointer font-black text-xs uppercase tracking-widest transition-all flex items-center gap-2 shadow-lg shadow-cyan-900/10">
          <FileSpreadsheet size={18} /> {loading ? 'A PROCESSAR...' : 'IMPORTAR EXCEL'}
          <input type="file" accept=".xlsx, .xls" className="hidden" onChange={handleExcelImport} disabled={loading} />
        </label>
      </div>

      {/* FORMULÁRIO DARK/CYAN */}
      <div className="bg-[#1a1d26] rounded-3xl border border-slate-800 overflow-hidden shadow-2xl">
        <div className="bg-slate-800/50 p-4 border-b border-slate-800 flex justify-between items-center">
          <h2 className="text-xs font-black uppercase tracking-[0.2em] text-cyan-500 flex items-center gap-2">
            <Syringe size={16} /> {editingId ? 'Editar Registo' : 'Novo Tratamento'}
          </h2>
          {editingId && (
            <button onClick={() => { setEditingId(null); setFormData({ loteId: '', data: new Date().toISOString().split('T')[0], tipo: 'Vacina', medicamento: '', dosagem: '', viaAplicacao: 'Intramuscular', periodoCarenciaDias: 0, custoMedicamento: 0, veterinarioResponsavel: '' }); }} className="text-slate-400 hover:text-white transition-colors">
              <X size={20}/>
            </button>
          )}
        </div>
        
        <form onSubmit={handleSubmit} className="p-6 grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-6">
          <div className="space-y-1">
            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Lote</label>
            <input required className="w-full bg-slate-900 border border-slate-700 p-3 rounded-xl text-sm font-bold text-white focus:border-cyan-500 outline-none transition-all" value={formData.loteId} onChange={e => setFormData({...formData, loteId: e.target.value})} />
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Data</label>
            <input type="date" className="w-full bg-slate-900 border border-slate-700 p-3 rounded-xl text-sm font-bold text-white focus:border-cyan-500 outline-none" value={formData.data} onChange={e => setFormData({...formData, data: e.target.value})} />
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Medicamento</label>
            <input required className="w-full bg-slate-900 border border-slate-700 p-3 rounded-xl text-sm font-bold text-white focus:border-cyan-500 outline-none" value={formData.medicamento} onChange={e => setFormData({...formData, medicamento: e.target.value})} />
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Tipo</label>
            <select className="w-full bg-slate-900 border border-slate-700 p-3 rounded-xl text-sm font-bold text-white focus:border-cyan-500 outline-none cursor-pointer" value={formData.tipo} onChange={e => setFormData({...formData, tipo: e.target.value})}>
              <option value="Vacina">Vacina</option>
              <option value="Tratamento">Tratamento</option>
              <option value="Vermífugo">Vermífugo</option>
              <option value="Suplemento">Suplemento</option>
            </select>
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Custo (Kz)</label>
            <input type="number" className="w-full bg-slate-900 border border-slate-700 p-3 rounded-xl text-sm font-bold text-white focus:border-cyan-500 outline-none" value={formData.custoMedicamento} onChange={e => setFormData({...formData, custoMedicamento: Number(e.target.value)})} />
          </div>
          <button type="submit" className="bg-cyan-600 text-white font-black rounded-xl uppercase text-xs tracking-widest hover:bg-cyan-500 transition-all flex items-center justify-center gap-2 h-[46px] mt-auto shadow-lg shadow-cyan-900/20">
            <Check size={18} /> {editingId ? 'ATUALIZAR' : 'GRAVAR'}
          </button>
        </form>
      </div>

      {/* TABELA DARK/CYAN */}
      <div className="bg-[#1a1d26] rounded-3xl border border-slate-800 overflow-hidden shadow-2xl">
        <div className="p-6 border-b border-slate-800 bg-slate-800/20 flex justify-between items-center">
          <h3 className="font-black uppercase text-xs text-slate-400 tracking-widest flex items-center gap-2">
            <Search size={16} className="text-cyan-500" /> Histórico Clínico do Plantel
          </h3>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="text-[10px] font-black uppercase text-slate-500 tracking-[0.15em] border-b border-slate-800 bg-slate-800/10">
                <th className="p-6">Lote</th>
                <th className="p-6">Data</th>
                <th className="p-6">Medicamento</th>
                <th className="p-6">Tipo</th>
                <th className="p-6 text-center">Carência</th>
                <th className="p-6 text-right">Investimento</th>
                <th className="p-6 text-center">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/50">
              {registos.map((item) => (
                <tr key={item.id} className="hover:bg-slate-800/30 transition-colors group">
                  <td className="p-6 font-black text-cyan-500 uppercase">{item.loteId}</td>
                  <td className="p-6 text-xs font-bold text-slate-400">{item.data}</td>
                  <td className="p-6 font-bold text-white uppercase text-xs">{item.medicamento}</td>
                  <td className="p-6">
                    <span className="bg-cyan-500/10 text-cyan-400 px-3 py-1 rounded-full text-[9px] font-black uppercase border border-cyan-500/20 tracking-tighter">
                      {item.tipo}
                    </span>
                  </td>
                  <td className="p-6 text-center">
                    <span className="flex items-center justify-center gap-1 text-orange-500 font-black text-xs">
                      <Calendar size={12} /> {item.periodoCarenciaDias}d
                    </span>
                  </td>
                  <td className="p-6 text-right font-mono font-bold text-white text-xs">
                    {Number(item.custoMedicamento || 0).toLocaleString('pt-AO')} <span className="text-cyan-600 text-[10px]">Kz</span>
                  </td>
                  <td className="p-6">
                    <div className="flex justify-center gap-3">
                      <button onClick={() => { setEditingId(item.id); setFormData({...item}); }} className="text-slate-500 hover:text-cyan-400 transition-colors"><Edit3 size={18}/></button>
                      <button onClick={async () => { if(confirm("Eliminar registo clínico?")) await deleteDoc(doc(db, 'saude', item.id)) }} className="text-slate-500 hover:text-red-500 transition-colors"><Trash2 size={18}/></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          
          {registos.length === 0 && (
            <div className="flex flex-col items-center justify-center py-20 opacity-20">
              <AlertCircle size={48} className="text-slate-400" />
              <p className="font-black uppercase tracking-widest text-xs mt-2 text-slate-400">Sem registos clínicos</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}