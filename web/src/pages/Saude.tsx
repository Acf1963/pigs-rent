import { useState, useEffect } from 'react';
import { db } from '../lib/firebase';
import { collection, addDoc, writeBatch, doc, onSnapshot, query, updateDoc, deleteDoc } from 'firebase/firestore';
import { ShieldCheck, Save, FileSpreadsheet, Trash2, Edit3, X, Check, Search, AlertCircle } from 'lucide-react';
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
    dosagem: '',
    viaAplicacao: '',
    periodoCarenciaDias: 0,
    custoMedicamento: 0,
    veterinarioResponsavel: ''
  });

  const formatExcelDate = (value: any): string => {
    if (!value) return new Date().toISOString().split('T')[0];
    if (typeof value === 'string' && value.includes('-')) return value;
    if (!isNaN(value)) {
      const date = new Date(Math.round((value - 25569) * 86400 * 1000));
      return date.toISOString().split('T')[0];
    }
    return String(value);
  };

  useEffect(() => {
    const q = query(collection(db, 'maneio_sanitario'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setRegistos(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }, (error) => console.error("Erro ao carregar dados:", error));
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

        json.forEach((row) => {
          const newDocRef = doc(collection(db, 'maneio_sanitario'));
          batch.set(newDocRef, {
            loteId: String(row.loteId || ''),
            data: formatExcelDate(row.data),
            tipo: String(row.tipo || 'VACINA').toUpperCase(),
            medicamento: String(row.medicamento || ''),
            dosagem: String(row.dosagem || ''),
            viaAplicacao: String(row.viaAplicacao || ''),
            periodoCarenciaDias: Number(row.periodoCarenciaDias || 0),
            custoMedicamento: Number(row.custoMedicamento || 0),
            veterinarioResponsavel: String(row.veterinarioResponsavel || ''),
            createdAt: new Date().toISOString()
          });
        });
        await batch.commit();
        alert("Sincronização Fazenda Quanza concluída!");
      } catch (err) { alert("Erro na importação."); }
      finally { setLoading(false); e.target.value = ''; }
    };
    reader.readAsArrayBuffer(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (editingId) {
        await updateDoc(doc(db, 'maneio_sanitario', editingId), formData);
        setEditingId(null);
      } else {
        await addDoc(collection(db, 'maneio_sanitario'), { ...formData, createdAt: new Date().toISOString() });
      }
      setFormData({ loteId: '', data: new Date().toISOString().split('T')[0], tipo: 'VACINA', medicamento: '', dosagem: '', viaAplicacao: '', periodoCarenciaDias: 0, custoMedicamento: 0, veterinarioResponsavel: '' });
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  return (
    <div className="h-[calc(100vh-100px)] flex flex-col p-4 md:p-6 text-slate-900 overflow-hidden">
      
      <div className="flex justify-between items-center mb-4 shrink-0">
        <h1 className="text-xl font-black uppercase tracking-tighter flex items-center gap-2">
          <ShieldCheck className="text-emerald-600" /> Maneio Sanitário
        </h1>
        <label className={`flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-xl cursor-pointer font-bold text-xs uppercase active:scale-95 transition-all ${loading ? 'opacity-50' : ''}`}>
          <FileSpreadsheet size={16} /> {loading ? 'A processar...' : 'IMPORTAR EXCEL'}
          <input type="file" accept=".xlsx, .xls" className="hidden" onChange={handleExcelImport} disabled={loading} />
        </label>
      </div>

      {/* FORMULÁRIO COM CABEÇALHO COMPLETO */}
      <div className="bg-white rounded-3xl shadow-lg border border-slate-200 mb-4 shrink-0 overflow-hidden">
        <div className="bg-slate-800 p-3 text-white flex justify-between items-center">
          <h2 className="text-[10px] font-black uppercase tracking-widest flex items-center gap-2">
            <Save size={14} /> REGISTO DE TRATAMENTO
          </h2>
          {editingId && <button onClick={() => setEditingId(null)} className="hover:text-red-400"><X size={16}/></button>}
        </div>
        <form onSubmit={handleSubmit} className="p-4 grid grid-cols-2 md:grid-cols-5 gap-3 bg-slate-50/50">
          <div className="flex flex-col gap-1">
            <label className="text-[9px] font-black text-slate-400 uppercase px-1">loteId</label>
            <input required className="bg-white border border-slate-200 p-2 rounded-lg text-sm font-bold" value={formData.loteId} onChange={e => setFormData({...formData, loteId: e.target.value})} />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-[9px] font-black text-slate-400 uppercase px-1">data</label>
            <input type="date" className="bg-white border border-slate-200 p-2 rounded-lg text-sm font-bold" value={formData.data} onChange={e => setFormData({...formData, data: e.target.value})} />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-[9px] font-black text-slate-400 uppercase px-1">tipo</label>
            <select className="bg-white border border-slate-200 p-2 rounded-lg text-sm font-bold uppercase" value={formData.tipo} onChange={e => setFormData({...formData, tipo: e.target.value})}>
              <option value="VACINA">VACINA</option>
              <option value="VERMIFUGO">VERMIFUGO</option>
              <option value="TRATAMENTO">TRATAMENTO</option>
            </select>
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-[9px] font-black text-slate-400 uppercase px-1">medicamento</label>
            <input className="bg-white border border-slate-200 p-2 rounded-lg text-sm font-bold" value={formData.medicamento} onChange={e => setFormData({...formData, medicamento: e.target.value})} />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-[9px] font-black text-slate-400 uppercase px-1">dosagem</label>
            <input className="bg-white border border-slate-200 p-2 rounded-lg text-sm font-bold" value={formData.dosagem} onChange={e => setFormData({...formData, dosagem: e.target.value})} />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-[9px] font-black text-slate-400 uppercase px-1">viaAplicacao</label>
            <input className="bg-white border border-slate-200 p-2 rounded-lg text-sm font-bold" value={formData.viaAplicacao} onChange={e => setFormData({...formData, viaAplicacao: e.target.value})} />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-[9px] font-black text-slate-400 uppercase px-1">carência (Dias)</label>
            <input type="number" className="bg-white border border-slate-200 p-2 rounded-lg text-sm font-bold" value={formData.periodoCarenciaDias} onChange={e => setFormData({...formData, periodoCarenciaDias: Number(e.target.value)})} />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-[9px] font-black text-slate-400 uppercase px-1">custo (Kz)</label>
            <input type="number" className="bg-white border border-slate-200 p-2 rounded-lg text-sm font-bold text-indigo-600" value={formData.custoMedicamento} onChange={e => setFormData({...formData, custoMedicamento: Number(e.target.value)})} />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-[9px] font-black text-slate-400 uppercase px-1">veterinário</label>
            <input className="bg-white border border-slate-200 p-2 rounded-lg text-sm font-bold" value={formData.veterinarioResponsavel} onChange={e => setFormData({...formData, veterinarioResponsavel: e.target.value})} />
          </div>

          {/* CHECK INSERIDO AQUI PARA LIMPAR O ERRO TS */}
          <button type="submit" disabled={loading} className="mt-auto bg-indigo-600 text-white font-black h-[40px] rounded-lg uppercase text-[10px] tracking-widest hover:bg-indigo-700 transition-all flex items-center justify-center gap-2">
             {editingId ? <><Check size={14} /> ATUALIZAR</> : 'GRAVAR'}
          </button>
        </form>
      </div>

      <div className="bg-white rounded-3xl shadow-lg border border-slate-200 flex-1 flex flex-col overflow-hidden">
        <div className="p-3 bg-slate-50 border-b border-slate-200 flex justify-between items-center shrink-0">
          <h3 className="font-bold uppercase text-[10px] text-slate-500 flex items-center gap-2"><Search size={14} /> HISTÓRICO SINCRO</h3>
        </div>
        
        <div className="flex-1 overflow-auto">
          <table className="w-full text-left border-collapse min-w-[1400px]">
            <thead className="sticky top-0 bg-white z-10 border-b border-slate-200 shadow-sm">
              <tr className="text-[10px] font-black uppercase text-slate-400 italic">
                <th className="p-4">loteId</th>
                <th className="p-4">data</th>
                <th className="p-4">tipo</th>
                <th className="p-4">medicamento</th>
                <th className="p-4">dosagem</th>
                <th className="p-4">via</th>
                <th className="p-4 text-center">carência</th>
                <th className="p-4 text-right">custo (Kz)</th>
                <th className="p-4">veterinário</th>
                <th className="p-4 text-center">Ações</th>
              </tr>
            </thead>
            <tbody className="text-sm">
              {registos.map((v) => (
                <tr key={v.id} className="border-b border-slate-50 hover:bg-slate-50 transition-colors">
                  <td className="p-4 font-black text-indigo-600">{v.loteId}</td>
                  <td className="p-4">{v.data}</td>
                  <td className="p-4">
                    <span className="bg-emerald-50 text-emerald-700 px-2 py-1 rounded-md text-[10px] font-black uppercase border border-emerald-100">
                      {v.tipo}
                    </span>
                  </td>
                  <td className="p-4 font-bold">{v.medicamento}</td>
                  <td className="p-4">{v.dosagem}</td>
                  <td className="p-4 text-xs italic uppercase">{v.viaAplicacao}</td>
                  <td className="p-4 text-center font-bold text-orange-600">{v.periodoCarenciaDias} d</td>
                  <td className="p-4 text-right font-black">{Number(v.custoMedicamento).toLocaleString()}</td>
                  <td className="p-4 text-slate-500 text-xs">{v.veterinarioResponsavel}</td>
                  <td className="p-4 flex justify-center gap-2">
                    <button onClick={() => { setEditingId(v.id); setFormData({...v}); }} className="p-1 text-slate-400 hover:text-indigo-600"><Edit3 size={16}/></button>
                    <button onClick={async () => { if(confirm("Apagar?")) await deleteDoc(doc(db, 'maneio_sanitario', v.id)) }} className="p-1 text-slate-400 hover:text-red-600"><Trash2 size={16}/></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {registos.length === 0 && (
            <div className="flex-1 flex flex-col items-center justify-center text-slate-300 p-10">
              <AlertCircle size={40} className="opacity-20 mb-2" />
              <span className="text-xs font-bold uppercase italic">Sem dados</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
