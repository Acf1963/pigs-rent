import { useState, useEffect } from 'react';
import { db } from '../lib/firebase';
import { collection, addDoc, writeBatch, doc, onSnapshot, query, orderBy, deleteDoc, updateDoc } from 'firebase/firestore';
import { FileSpreadsheet, Trash2, Edit3, Search, Activity, Download, Plus, Save, X } from 'lucide-react';
import * as XLSX from 'xlsx';

export default function SaudePage() {
  const [loading, setLoading] = useState(false);
  const [registos, setRegistos] = useState<any[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  
  // Estado completo baseado no seu Excel
  const [formData, setFormData] = useState({
    loteId: '',
    data: new Date().toISOString().split('T')[0],
    tipo: 'TRATAMENTO', //
    medicamento: '',
    dosagem: '',
    viaAplicacao: '',
    periodoCarenciaDias: '0',
    custoMedicamento: 0,
    veterinarioResponsavel: ''
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
    if (!valor) return 0;
    if (typeof valor === 'number') return valor;
    const limpo = String(valor).replace(/\s/g, '').replace(',', '.').replace(/[^0-9.]/g, '');
    const num = parseFloat(limpo);
    return isNaN(num) ? 0 : num;
  };

  useEffect(() => {
    const q = query(collection(db, 'sanitario'), orderBy('data', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setRegistos(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });
    return () => unsubscribe();
  }, []);

  const handleSubmitManual = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const payload = {
        ...formData,
        loteId: formData.loteId.toUpperCase(),
        updatedAt: new Date().toISOString()
      };

      if (editingId) {
        await updateDoc(doc(db, 'sanitario', editingId), payload);
        setEditingId(null);
      } else {
        await addDoc(collection(db, 'sanitario'), { ...payload, createdAt: new Date().toISOString() });
      }
      resetForm();
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      loteId: '', data: new Date().toISOString().split('T')[0], tipo: 'TRATAMENTO',
      medicamento: '', dosagem: '', viaAplicacao: '', periodoCarenciaDias: '0',
      custoMedicamento: 0, veterinarioResponsavel: ''
    });
    setEditingId(null);
  };

  const handleEdit = (r: any) => {
    setEditingId(r.id);
    setFormData({
      loteId: r.loteId, data: r.data, tipo: r.tipo, medicamento: r.medicamento,
      dosagem: r.dosagem, viaAplicacao: r.viaAplicacao, 
      periodoCarenciaDias: r.periodoCarenciaDias, custoMedicamento: r.custoMedicamento,
      veterinarioResponsavel: r.veterinarioResponsavel
    });
  };

  const handleExportarExcel = () => {
    const ws = XLSX.utils.json_to_sheet(registos.map(({ id, createdAt, updatedAt, ...r }) => r));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Maneio_Sanitario");
    XLSX.writeFile(wb, `Sanitario_Fazenda_Quanza.xlsx`);
  };

  const handleExcelImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setLoading(true);
    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const workbook = XLSX.read(evt.target?.result, { type: 'array', cellDates: true });
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        const json = XLSX.utils.sheet_to_json(sheet) as any[];
        const batch = writeBatch(db);
        json.forEach((row: any) => {
          const newDocRef = doc(collection(db, 'sanitario'));
          batch.set(newDocRef, {
            loteId: String(row.loteId || row.Lote || 'SEM LOTE').toUpperCase(),
            data: formatarDataExcel(row.data || row.Data),
            tipo: String(row.tipo || 'TRATAMENTO').toUpperCase(),
            medicamento: String(row.medicamento || 'N/A'),
            dosagem: String(row.dosagem || ''),
            viaAplicacao: String(row.viaAplicacao || ''),
            periodoCarenciaDias: String(row.periodoCarenciaDias || '0'),
            custoMedicamento: parseNumeroSeguro(row.custoMedicamento || row.Custo),
            veterinarioResponsavel: String(row.veterinarioResponsavel || row.Veterinario || ''),
            createdAt: new Date().toISOString()
          });
        });
        await batch.commit();
        alert("Importação concluída com sucesso!");
      } catch (err) { alert("Erro ao importar Excel."); } finally { setLoading(false); e.target.value = ''; }
    };
    reader.readAsArrayBuffer(file);
  };

  return (
    <div className="h-[calc(100vh-100px)] flex flex-col p-6 text-slate-100 overflow-hidden bg-[#0f1117] font-sans">
      <div className="flex justify-between items-center mb-6 shrink-0">
        <h1 className="text-2xl font-black uppercase tracking-tighter flex items-center gap-2 text-white">
          <Activity className="text-red-600" size={28} /> Maneio Sanitário
        </h1>
        <div className="flex gap-3">
          <button onClick={handleExportarExcel} className="flex items-center gap-2 bg-[#1a1d26] text-slate-300 border border-slate-700 px-6 py-3 rounded-2xl font-bold text-xs uppercase hover:bg-slate-800 transition-all shadow-sm">
            <Download size={18} /> Exportar
          </button>
          <label className={`flex items-center gap-2 bg-red-700 text-white px-6 py-3 rounded-2xl cursor-pointer font-bold text-xs uppercase hover:bg-red-800 transition-all shadow-lg ${loading ? 'opacity-50' : ''}`}>
            <FileSpreadsheet size={18} /> {loading ? 'A PROCESSAR...' : 'IMPORTAR EXCEL'}
            <input type="file" accept=".xlsx, .xls" className="hidden" onChange={handleExcelImport} disabled={loading} />
          </label>
        </div>
      </div>

      {/* FORMULÁRIO MANUAL - TODAS AS COLUNAS DO EXCEL */}
      <div className="bg-[#1a1d26] rounded-[2rem] shadow-xl border border-slate-800 mb-6 shrink-0 p-6">
        <form onSubmit={handleSubmitManual} className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-black text-slate-500 uppercase italic ml-1">Lote / Data</label>
            <div className="flex gap-2">
              <input required className="w-1/2 bg-[#0f1117] border border-slate-700 p-3 rounded-xl text-sm font-bold uppercase text-red-500" value={formData.loteId} onChange={e => setFormData({...formData, loteId: e.target.value})} placeholder="LOTE" />
              <input type="date" className="w-1/2 bg-[#0f1117] border border-slate-700 p-3 rounded-xl text-xs font-bold text-slate-300" value={formData.data} onChange={e => setFormData({...formData, data: e.target.value})} />
            </div>
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-black text-slate-500 uppercase italic ml-1">Medicamento / Tipo</label>
            <div className="flex gap-2">
              <input required className="w-1/2 bg-[#0f1117] border border-slate-700 p-3 rounded-xl text-sm font-bold text-slate-200" value={formData.medicamento} onChange={e => setFormData({...formData, medicamento: e.target.value})} placeholder="NOME" />
              <select className="w-1/2 bg-[#0f1117] border border-slate-700 p-3 rounded-xl text-xs font-bold text-slate-400" value={formData.tipo} onChange={e => setFormData({...formData, tipo: e.target.value})}>
                <option value="TRATAMENTO">TRATAMENTO</option>
                <option value="VACINA">VACINA</option>
                <option value="VERMIFUGO">VERMIFUGO</option>
              </select>
            </div>
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-black text-slate-500 uppercase italic ml-1">Dosagem / Via</label>
            <div className="flex gap-2">
              <input className="w-1/2 bg-[#0f1117] border border-slate-700 p-3 rounded-xl text-sm font-bold text-slate-300" value={formData.dosagem} onChange={e => setFormData({...formData, dosagem: e.target.value})} placeholder="2ml" />
              <input className="w-1/2 bg-[#0f1117] border border-slate-700 p-3 rounded-xl text-sm font-bold text-slate-300" value={formData.viaAplicacao} onChange={e => setFormData({...formData, viaAplicacao: e.target.value})} placeholder="VIA" />
            </div>
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-black text-slate-500 uppercase italic ml-1">Custo / Carencia (Dias)</label>
            <div className="flex gap-2">
              <input type="number" className="w-2/3 bg-[#0f1117] border border-slate-700 p-3 rounded-xl text-sm font-bold text-slate-200" value={formData.custoMedicamento} onChange={e => setFormData({...formData, custoMedicamento: Number(e.target.value)})} />
              <input type="number" className="w-1/3 bg-[#0f1117] border border-slate-700 p-3 rounded-xl text-sm font-bold text-slate-400" value={formData.periodoCarenciaDias} onChange={e => setFormData({...formData, periodoCarenciaDias: e.target.value})} />
            </div>
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-black text-slate-500 uppercase italic ml-1">Veterinário Responsável</label>
            <div className="flex gap-2">
              <input className="flex-1 bg-[#0f1117] border border-slate-700 p-3 rounded-xl text-sm font-bold text-slate-300 uppercase" value={formData.veterinarioResponsavel} onChange={e => setFormData({...formData, veterinarioResponsavel: e.target.value})} />
              <button type="submit" className="bg-red-700 text-white p-3 rounded-xl hover:bg-red-800 transition-all">
                {editingId ? <Save size={20} /> : <Plus size={20} />}
              </button>
              {editingId && <button type="button" onClick={resetForm} className="bg-slate-700 p-3 rounded-xl"><X size={20}/></button>}
            </div>
          </div>
        </form>
      </div>

      <div className="bg-[#1a1d26] rounded-[2rem] shadow-xl border border-slate-800 flex-1 flex flex-col overflow-hidden">
        <div className="p-4 bg-[#14171f] border-b border-slate-800 flex items-center gap-2 shrink-0 italic text-slate-500 font-bold text-xs uppercase">
          <Search size={16} /> Registo de Tratamentos - Listagem Completa
        </div>
        
        <div className="flex-1 overflow-auto">
          <table className="w-full text-left border-separate border-spacing-0">
            <thead className="sticky top-0 z-10">
              <tr className="bg-[#14171f] text-[10px] font-black uppercase text-slate-500 italic text-center shadow-sm">
                <th className="p-4 text-left border-b border-slate-800">Lote</th>
                <th className="p-4 border-b border-slate-800">Data</th>
                <th className="p-4 border-b border-slate-800">Tipo</th>
                <th className="p-4 border-b border-slate-800">Medicamento</th>
                <th className="p-4 border-b border-slate-800">Dosagem/Via</th>
                <th className="p-4 border-b border-slate-800">Custo (Kz)</th>
                <th className="p-4 border-b border-slate-800">Carencia</th>
                <th className="p-4 border-b border-slate-800">Responsável</th>
                <th className="p-4 border-b border-slate-800">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {registos.map((r) => (
                <tr key={r.id} className="hover:bg-[#1e222d] transition-all text-center">
                  <td className="p-4 font-black text-red-500 text-left uppercase">{r.loteId}</td>
                  <td className="p-4 text-xs font-bold text-slate-400">{r.data}</td>
                  <td className="p-4">
                    <span className="bg-slate-800 text-[9px] px-2 py-1 rounded-md text-slate-300 font-black">{r.tipo}</span>
                  </td>
                  <td className="p-4 font-bold text-slate-200">{r.medicamento}</td>
                  <td className="p-4 text-xs font-medium text-slate-500 italic">{r.dosagem} {r.viaAplicacao}</td>
                  <td className="p-4 font-black text-white">{(r.custoMedicamento || 0).toLocaleString()} Kz</td>
                  <td className="p-4 text-xs font-bold text-red-400">{r.periodoCarenciaDias} D</td>
                  <td className="p-4 text-[10px] font-bold text-slate-500 uppercase">{r.veterinarioResponsavel}</td>
                  <td className="p-4 flex justify-center gap-2">
                    <button onClick={() => handleEdit(r)} className="p-2 text-slate-600 hover:text-blue-500 transition-colors"><Edit3 size={16}/></button>
                    <button onClick={async () => { if(confirm("Eliminar?")) await deleteDoc(doc(db, 'sanitario', r.id)) }} className="p-2 text-slate-600 hover:text-red-500 transition-colors"><Trash2 size={16}/></button>
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
