import { useState, useEffect, useRef } from 'react';
import { db } from '../lib/firebase';
import { 
  collection, addDoc, onSnapshot, query, orderBy, 
  deleteDoc, doc, updateDoc, writeBatch 
} from 'firebase/firestore';
import { 
  Activity, FileSpreadsheet, FileText, UploadCloud, 
  Check, Trash2, Edit3, Plus 
} from 'lucide-react';

import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export default function SaudePage() {
  const [registos, setRegistos] = useState<any[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const initialForm = {
    loteId: '',
    brinco: '',
    data: new Date().toISOString().split('T')[0],
    tipo: 'VACINA',
    medicamento: '',
    dosagem: '',
    viaAplicacao: 'INTRAMUSCULAR',
    periodoCarenciaDias: '0',
    custoMedicamento: '',
    veterinarioResponsavel: ''
  };

  const [formData, setFormData] = useState(initialForm);

  useEffect(() => {
    const q = query(collection(db, 'saude'), orderBy('data', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setRegistos(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });
    return () => unsubscribe();
  }, []);

  // --- LÓGICA DE IMPORTAÇÃO EXCEL CORRIGIDA ---
  const handleImportExcel = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const data: any[] = XLSX.utils.sheet_to_json(ws);

        const batch = writeBatch(db);
        data.forEach((item) => {
          const newDocRef = doc(collection(db, 'saude'));
          batch.set(newDocRef, {
            loteId: String(item.loteId || '').toUpperCase(),
            brinco: String(item.brinco || '').toUpperCase(),
            data: item.data || new Date().toISOString().split('T')[0],
            tipo: String(item.tipo || 'VACINA').toUpperCase(),
            medicamento: String(item.medicamento || '').toUpperCase(),
            dosagem: String(item.dosagem || ''),
            viaAplicacao: String(item.viaAplicacao || ''),
            periodoCarenciaDias: parseInt(item.periodoCarenciaDias) || 0,
            custoMedicamento: parseFloat(item.custoMedicamento) || 0,
            veterinarioResponsavel: String(item.veterinarioResponsavel || ''),
            createdAt: new Date().toISOString()
          });
        });

        await batch.commit();
        alert(`${data.length} registos importados com sucesso!`);
      } catch (error) {
        console.error("Erro na importação:", error);
        alert("Erro ao importar ficheiro. Verifica os nomes das colunas.");
      }
    };
    reader.readAsBinaryString(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const exportToExcel = () => {
    const ws = XLSX.utils.json_to_sheet(registos.map(r => ({
      loteId: r.loteId,
      brinco: r.brinco,
      data: r.data,
      tipo: r.tipo,
      medicamento: r.medicamento,
      custoMedicamento: r.custoMedicamento,
      periodoCarenciaDias: r.periodoCarenciaDias
    })));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Saude");
    XLSX.writeFile(wb, "Maneio_Sanitario.xlsx");
  };

  const exportToPDF = () => {
    const docPDF = new jsPDF('l', 'mm', 'a4');
    autoTable(docPDF, {
      head: [["LOTE", "BRINCO", "DATA", "TIPO", "MEDICAMENTO", "CUSTO"]],
      body: registos.map(r => [r.loteId, r.brinco || '---', r.data, r.tipo, r.medicamento, r.custoMedicamento]),
      headStyles: { fillColor: [220, 38, 38] }
    });
    docPDF.save("Relatorio_Saude.pdf");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload = {
      ...formData,
      periodoCarenciaDias: parseInt(formData.periodoCarenciaDias) || 0,
      custoMedicamento: parseFloat(formData.custoMedicamento) || 0,
    };

    if (editingId) {
      await updateDoc(doc(db, 'saude', editingId), payload);
      setEditingId(null);
    } else {
      await addDoc(collection(db, 'saude'), { ...payload, createdAt: new Date().toISOString() });
    }
    setFormData(initialForm);
  };

  return (
    <div className="h-[calc(100vh-110px)] flex flex-col space-y-4 overflow-hidden p-2">
      
      {/* HEADER */}
      <header className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 shrink-0">
        <div className="flex items-center gap-3">
          <Activity className="text-red-500" size={28} />
          <h1 className="text-2xl md:text-3xl font-black text-white uppercase tracking-tight">SAÚDE</h1>
        </div>

        <div className="flex flex-wrap gap-2 w-full lg:w-auto">
          <input type="file" ref={fileInputRef} className="hidden" onChange={handleImportExcel} accept=".xlsx, .xls" />
          <button onClick={() => fileInputRef.current?.click()} className="flex-1 lg:flex-none bg-[#1a202e] border border-slate-800 px-4 py-2 rounded-lg text-[10px] font-black text-slate-300 flex items-center justify-center gap-2 hover:bg-slate-800 transition-colors">
            <UploadCloud size={14} className="text-cyan-500" /> IMPORTAR
          </button>
          <button onClick={exportToExcel} className="flex-1 lg:flex-none bg-[#1a202e] border border-slate-800 px-4 py-2 rounded-lg text-[10px] font-black text-slate-300 flex items-center justify-center gap-2 hover:bg-slate-800 transition-colors">
            <FileSpreadsheet size={14} className="text-emerald-500" /> EXCEL
          </button>
          <button onClick={exportToPDF} className="flex-1 lg:flex-none bg-[#1a202e] border border-slate-800 px-4 py-2 rounded-lg text-[10px] font-black text-slate-300 flex items-center justify-center gap-2 hover:bg-slate-800 transition-colors">
            <FileText size={14} className="text-red-500" /> PDF
          </button>
        </div>
      </header>

      {/* FORMULÁRIO */}
      <div className="bg-[#161922] rounded-2xl border border-slate-800/50 p-4 md:p-6 shrink-0">
        <form onSubmit={handleSubmit} className="grid grid-cols-2 md:flex md:flex-nowrap gap-4 items-end">
          <div className="space-y-1 flex-1">
            <label className="text-[9px] font-black text-slate-500 uppercase px-1">Lote</label>
            <input required className="w-full bg-[#0d0f14] border border-slate-800 p-3 rounded-lg text-white text-xs font-bold outline-none uppercase focus:border-red-500" value={formData.loteId} onChange={e => setFormData({...formData, loteId: e.target.value.toUpperCase()})} />
          </div>

          <div className="space-y-1 flex-1">
            <label className="text-[9px] font-black text-slate-500 uppercase px-1">Brinco</label>
            <input className="w-full bg-[#0d0f14] border border-slate-800 p-3 rounded-lg text-white text-xs font-bold outline-none uppercase focus:border-red-500" placeholder="OPCIONAL" value={formData.brinco} onChange={e => setFormData({...formData, brinco: e.target.value.toUpperCase()})} />
          </div>

          <div className="space-y-1 flex-[2]">
            <label className="text-[9px] font-black text-slate-500 uppercase px-1">Medicamento</label>
            <input required className="w-full bg-[#0d0f14] border border-slate-800 p-3 rounded-lg text-white text-xs font-bold outline-none uppercase focus:border-red-500" value={formData.medicamento} onChange={e => setFormData({...formData, medicamento: e.target.value.toUpperCase()})} />
          </div>

          <div className="space-y-1 flex-1">
            <label className="text-[9px] font-black text-red-500 uppercase px-1">Carência</label>
            <input type="number" className="w-full bg-[#0d0f14] border border-red-900/30 p-3 rounded-lg text-red-500 font-black outline-none text-xs" value={formData.periodoCarenciaDias} onChange={e => setFormData({...formData, periodoCarenciaDias: e.target.value})} />
          </div>

          <button type="submit" className="col-span-2 md:w-auto bg-red-600 hover:bg-red-500 text-white font-black text-[11px] px-8 py-3.5 rounded-xl uppercase flex items-center justify-center gap-2 shadow-lg transition-all shrink-0">
            {editingId ? <Check size={18} /> : <Plus size={18} />} {editingId ? 'Atualizar' : 'Registar'}
          </button>
        </form>
      </div>

      {/* TABELA AUTO-FIT */}
      <div className="bg-[#161922] rounded-2xl border border-slate-800/50 shadow-2xl flex flex-col flex-1 min-h-0 overflow-hidden">
        <div className="overflow-y-auto flex-1 custom-scrollbar overflow-x-auto"> 
          <table className="w-full text-left text-[11px] border-separate border-spacing-0 min-w-[800px]">
            <thead className="bg-[#11141d] text-slate-500 font-black uppercase text-[9px] sticky top-0 z-10">
              <tr>
                <th className="p-4 border-b border-slate-800/50">LOTE</th>
                <th className="p-4 border-b border-slate-800/50">BRINCO</th>
                <th className="p-4 border-b border-slate-800/50">DATA</th>
                <th className="p-4 border-b border-slate-800/50">MEDICAMENTO</th>
                <th className="p-4 text-center border-b border-slate-800/50">CARÊNCIA</th>
                <th className="p-4 text-right border-b border-slate-800/50">CUSTO</th>
                <th className="p-4 text-center border-b border-slate-800/50">AÇÕES</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/20">
              {registos.map((r) => (
                <tr key={r.id} className="hover:bg-red-500/[0.02] transition-colors">
                  <td className="p-4 font-black text-cyan-500 uppercase">{r.loteId}</td>
                  <td className="p-4 text-white font-bold uppercase">{r.brinco || <span className="text-slate-700 italic text-[9px]">LOTE</span>}</td>
                  <td className="p-4 text-slate-400 font-bold">{r.data?.split('-').reverse().join('/')}</td>
                  <td className="p-4 text-white font-black uppercase text-[10px]">{r.medicamento}</td>
                  <td className="p-4 text-center">
                    <span className={`px-2 py-1 rounded-lg font-black text-[9px] border ${Number(r.periodoCarenciaDias) > 0 ? 'bg-red-500/10 text-red-500 border-red-500/20' : 'bg-slate-800 text-slate-500 border-slate-700'}`}>
                      {r.periodoCarenciaDias}D
                    </span>
                  </td>
                  <td className="p-4 text-right font-black text-emerald-500">{Number(r.custoMedicamento || 0).toLocaleString()} KZ</td>
                  <td className="p-4 text-center">
                    <div className="flex justify-center gap-1">
                      <button onClick={() => { setEditingId(r.id); setFormData({...r}); }} className="p-2 text-slate-500 hover:text-cyan-400 transition-colors"><Edit3 size={14}/></button>
                      <button onClick={() => { if(confirm('Eliminar?')) deleteDoc(doc(db, 'saude', r.id)) }} className="p-2 text-slate-600 hover:text-red-500 transition-colors"><Trash2 size={14}/></button>
                    </div>
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
