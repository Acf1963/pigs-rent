import { useState, useEffect } from 'react';
import { db } from '../lib/firebase';
import { collection, addDoc, writeBatch, doc, onSnapshot, query, updateDoc, deleteDoc } from 'firebase/firestore';
import { ShieldCheck, Save, FileSpreadsheet, Trash2, Edit3, X, Check, Search, AlertCircle, Calendar } from 'lucide-react';
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
    const q = query(collection(db, 'saude'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setRegistos(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });
    return () => unsubscribe();
  }, []);

  // Lógica de importação robusta para tratar moedas e strings do Excel
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
          
          // Tratamento do Custo: Remove espaços, "AOA" e normaliza separadores decimais
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
    <div className="h-[calc(100vh-100px)] flex flex-col p-6 text-slate-900 overflow-hidden bg-slate-50">
      
      <div className="flex justify-between items-center mb-6 shrink-0">
        <h1 className="text-2xl font-black uppercase tracking-tighter flex items-center gap-2">
          <ShieldCheck className="text-emerald-600" size={28} /> Maneio Sanitário
        </h1>
        <label className="flex items-center gap-2 bg-indigo-700 text-white px-6 py-3 rounded-2xl cursor-pointer font-bold text-xs uppercase hover:bg-indigo-800 transition-all shadow-lg">
          <FileSpreadsheet size={18} /> {loading ? 'A PROCESSAR...' : 'IMPORTAR EXCEL'}
          <input type="file" accept=".xlsx, .xls" className="hidden" onChange={handleExcelImport} disabled={loading} />
        </label>
      </div>

      <div className="bg-white rounded-[2rem] shadow-xl border border-slate-200 mb-6 shrink-0 overflow-hidden">
        <div className="bg-slate-900 p-4 text-white flex justify-between items-center">
          <h2 className="text-xs font-black uppercase tracking-[0.2em] flex items-center gap-2">
            <Save size={16} /> Registo de Tratamento
          </h2>
          {editingId && <button onClick={() => setEditingId(null)}><X size={20}/></button>}
        </div>
        <form onSubmit={handleSubmit} className="p-6 grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-black text-slate-400 uppercase italic ml-1">Lote</label>
            <input required className="bg-slate-50 border border-slate-200 p-3 rounded-xl text-sm font-bold" value={formData.loteId} onChange={e => setFormData({...formData, loteId: e.target.value})} />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-black text-slate-400 uppercase italic ml-1">Data</label>
            <input type="date" className="bg-slate-50 border border-slate-200 p-3 rounded-xl text-sm font-bold" value={formData.data} onChange={e => setFormData({...formData, data: e.target.value})} />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-black text-slate-400 uppercase italic ml-1">Medicamento</label>
            <input required className="bg-slate-50 border border-slate-200 p-3 rounded-xl text-sm font-bold" value={formData.medicamento} onChange={e => setFormData({...formData, medicamento: e.target.value})} />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-black text-slate-400 uppercase italic ml-1">Tipo</label>
            <select className="bg-slate-50 border border-slate-200 p-3 rounded-xl text-sm font-bold" value={formData.tipo} onChange={e => setFormData({...formData, tipo: e.target.value})}>
              <option value="Vacina">Vacina</option>
              <option value="Tratamento">Tratamento</option>
              <option value="Vermífugo">Vermífugo</option>
              <option value="Suplemento">Suplemento</option>
            </select>
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-black text-slate-400 uppercase italic ml-1">Custo (Kz)</label>
            <input type="number" className="bg-slate-50 border border-slate-200 p-3 rounded-xl text-sm font-bold" value={formData.custoMedicamento} onChange={e => setFormData({...formData, custoMedicamento: Number(e.target.value)})} />
          </div>
          <button type="submit" className="bg-indigo-600 text-white font-black rounded-xl uppercase text-xs tracking-widest hover:bg-indigo-700 transition-all flex items-center justify-center gap-2 h-[52px] mt-auto shadow-lg shadow-indigo-100">
            <Check size={18} /> {editingId ? 'ATUALIZAR' : 'GRAVAR'}
          </button>
        </form>
      </div>

      <div className="bg-white rounded-[2rem] shadow-xl border border-slate-200 flex-1 flex flex-col overflow-hidden">
        <div className="p-4 bg-slate-50 border-b border-slate-200 flex justify-between items-center shrink-0">
          <h3 className="font-bold uppercase text-xs text-slate-500 flex items-center gap-2"><Search size={16} /> Histórico Sanitário</h3>
        </div>
        
        <div className="flex-1 overflow-auto px-4">
          <table className="w-full text-left border-separate border-spacing-y-2 min-w-[1000px]">
            <thead>
              <tr className="text-[10px] font-black uppercase text-slate-400 italic">
                <th className="p-4">Lote</th>
                <th className="p-4">Data Aplicação</th>
                <th className="p-4">Medicamento</th>
                <th className="p-4">Tipo</th>
                <th className="p-4">Dose/Via</th>
                <th className="p-4 text-center">Carência</th>
                <th className="p-4 text-right">Custo (Kz)</th>
                <th className="p-4 text-center">Ações</th>
              </tr>
            </thead>
            <tbody>
              {registos.map((item) => (
                <tr key={item.id} className="bg-white border border-slate-50 shadow-sm hover:shadow-md transition-all rounded-xl">
                  <td className="p-4 font-black text-indigo-600">{item.loteId}</td>
                  <td className="p-4 text-sm font-medium text-slate-600">{item.data}</td>
                  <td className="p-4 font-bold text-slate-800">{item.medicamento}</td>
                  <td className="p-4">
                    <span className="bg-emerald-50 text-emerald-700 px-3 py-1 rounded-lg text-[10px] font-black uppercase border border-emerald-100">
                      {item.tipo}
                    </span>
                  </td>
                  <td className="p-4 text-xs font-bold text-slate-500 italic">
                    {item.dosagem} - {item.viaAplicacao}
                  </td>
                  <td className="p-4 text-center">
                    <span className="flex items-center justify-center gap-1 text-orange-600 font-black text-xs">
                      <Calendar size={12} /> {item.periodoCarenciaDias}d
                    </span>
                  </td>
                  <td className="p-4 text-right font-black text-slate-800">
                    {/* Formatação corrigida para exibir milhares e sufixo Kz */}
                    {Number(item.custoMedicamento || 0).toLocaleString('pt-AO')} Kz
                  </td>
                  <td className="p-4">
                    <div className="flex justify-center gap-2">
                      <button onClick={() => { setEditingId(item.id); setFormData({...item}); }} className="p-2 text-slate-300 hover:text-indigo-600 transition-colors"><Edit3 size={18}/></button>
                      <button onClick={async () => { if(confirm("Eliminar registo sanitário?")) await deleteDoc(doc(db, 'saude', item.id)) }} className="p-2 text-slate-300 hover:text-red-600 transition-colors"><Trash2 size={18}/></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {registos.length === 0 && (
            <div className="flex flex-col items-center justify-center p-20 opacity-20">
              <AlertCircle size={48} />
              <p className="font-black uppercase tracking-widest text-xs mt-2">Sem registos clínicos</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
