import { useState, useEffect } from 'react';
import { db } from '../lib/firebase';
import { collection, addDoc, onSnapshot, query, orderBy, deleteDoc, doc, updateDoc } from 'firebase/firestore';
import { 
  Activity, FileSpreadsheet, FileText, UploadCloud, Check, Trash2, Edit3, RotateCcw, Syringe, Plus
} from 'lucide-react';

import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export default function SaudePage() {
  const [registos, setRegistos] = useState<any[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);

  const initialForm = {
    loteId: '',
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

  // --- FUNÇÕES DE EXPORTAÇÃO (Para resolver os avisos de 'never read') ---
  const exportToExcel = () => {
    const ws = XLSX.utils.json_to_sheet(registos.map(r => ({
      Lote: r.loteId,
      Data: r.data,
      Tipo: r.tipo,
      Medicamento: r.medicamento,
      Custo: r.custoMedicamento,
      Carencia: r.periodoCarenciaDias
    })));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Saude");
    XLSX.writeFile(wb, "Maneio_Sanitario.xlsx");
  };

  const exportToPDF = () => {
    const docPDF = new jsPDF('l', 'mm', 'a4');
    autoTable(docPDF, {
      head: [["LOTE", "DATA", "TIPO", "MEDICAMENTO", "CUSTO"]],
      body: registos.map(r => [r.loteId, r.data, r.tipo, r.medicamento, r.custoMedicamento]),
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
    <div className="flex flex-col space-y-4 md:space-y-6 pb-24 lg:pb-6">
      
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-800/50 pb-6">
        <div className="flex items-center gap-3">
          <div className="bg-red-500/10 p-2.5 rounded-2xl border border-red-500/20">
            <Activity className="text-red-500 w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl md:text-3xl font-black text-white uppercase tracking-tighter">Saúde</h1>
            <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest italic">Maneio Sanitário</p>
          </div>
        </div>

        <div className="grid grid-cols-3 md:flex gap-2 w-full md:w-auto bg-[#161922] p-1.5 rounded-2xl border border-slate-800 shadow-xl">
          <button className="bg-[#1e293b] text-slate-300 p-2 rounded-xl text-[9px] font-black uppercase flex items-center justify-center gap-2">
            <UploadCloud size={12} className="text-cyan-500" />
          </button>
          <button onClick={exportToExcel} className="bg-[#1e293b] text-slate-300 p-2 rounded-xl text-[9px] font-black uppercase flex items-center justify-center gap-2">
            <FileSpreadsheet size={12} className="text-emerald-400" />
          </button>
          <button onClick={exportToPDF} className="bg-[#1e293b] text-slate-300 p-2 rounded-xl text-[9px] font-black uppercase flex items-center justify-center gap-2">
            <FileText size={12} className="text-red-400" />
          </button>
        </div>
      </div>

      {/* FORMULÁRIO RESPONSIVO */}
      <div className="bg-[#161922] rounded-[2rem] border border-slate-800/50 p-5 shadow-2xl">
        <form onSubmit={handleSubmit} className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-12 gap-4">
          <div className="md:col-span-2 space-y-1">
            <label className="text-[8px] font-black text-slate-500 uppercase px-1">Lote</label>
            <input required className="w-full bg-[#0f121a] border border-slate-800 p-3 rounded-xl text-cyan-400 font-bold outline-none text-xs uppercase" value={formData.loteId} onChange={e => setFormData({...formData, loteId: e.target.value.toUpperCase()})} />
          </div>

          <div className="md:col-span-4 space-y-1">
            <label className="text-[8px] font-black text-slate-500 uppercase px-1">Medicamento</label>
            <div className="relative">
              <Syringe className="absolute left-3 top-3 text-slate-700" size={14} />
              <input required className="w-full bg-[#0f121a] border border-slate-800 p-3 pl-10 rounded-xl text-white font-bold outline-none text-xs uppercase" value={formData.medicamento} onChange={e => setFormData({...formData, medicamento: e.target.value.toUpperCase()})} />
            </div>
          </div>

          <div className="md:col-span-3 grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <label className="text-[8px] font-black text-slate-500 uppercase px-1">Tipo</label>
              <select className="w-full bg-[#0f121a] border border-slate-800 p-3 rounded-xl text-white font-bold outline-none text-xs" value={formData.tipo} onChange={e => setFormData({...formData, tipo: e.target.value})}>
                <option value="VACINA">VACINA</option>
                <option value="TRATAMENTO">TRAT.</option>
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-[8px] font-black text-red-500 uppercase px-1">Carência</label>
              <input type="number" className="w-full bg-[#0f121a] border border-red-900/30 p-3 rounded-xl text-red-500 font-black outline-none text-xs" value={formData.periodoCarenciaDias} onChange={e => setFormData({...formData, periodoCarenciaDias: e.target.value})} />
            </div>
          </div>

          <div className="md:col-span-3 space-y-1">
            <label className="text-[8px] font-black text-slate-500 uppercase px-1">Data</label>
            <input type="date" className="w-full bg-[#0f121a] border border-slate-800 p-3 rounded-xl text-white font-bold outline-none text-xs" value={formData.data} onChange={e => setFormData({...formData, data: e.target.value})} />
          </div>

          <div className="md:col-span-12 flex gap-2 pt-2">
            <button type="submit" className="flex-1 bg-red-600 hover:bg-red-500 text-white font-black text-[10px] py-4 rounded-xl shadow-lg uppercase flex items-center justify-center gap-2">
              {editingId ? <Check size={16} /> : <Plus size={16} />} 
              {editingId ? 'Atualizar' : 'Registar'}
            </button>
            <button type="button" onClick={() => { setEditingId(null); setFormData(initialForm); }} className="bg-slate-800 p-4 rounded-xl text-slate-500 hover:text-white transition-all">
              <RotateCcw size={16}/>
            </button>
          </div>
        </form>
      </div>

      {/* TABELA COM SCROLL HORIZONTAL */}
      <div className="bg-[#161922] rounded-[2rem] border border-slate-800/50 shadow-2xl overflow-hidden flex flex-col">
        <div className="overflow-x-auto custom-scrollbar"> 
          <table className="w-full text-left text-[10px] min-w-[800px]">
            <thead className="bg-black/30 text-slate-500 font-black uppercase text-[8px] border-b border-slate-800/50 sticky top-0 z-10 backdrop-blur-md">
              <tr>
                <th className="p-4">LOTE</th>
                <th className="p-4">DATA</th>
                <th className="p-4">MEDICAMENTO</th>
                <th className="p-4 text-center">CARÊNCIA</th>
                <th className="p-4 text-right">CUSTO (KZ)</th>
                <th className="p-4 text-center">AÇÕES</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/20">
              {registos.map((r) => (
                <tr key={r.id} className="hover:bg-red-500/[0.02] transition-colors">
                  <td className="p-4 font-black text-cyan-500 uppercase text-xs">{r.loteId}</td>
                  <td className="p-4 text-slate-400 font-bold">{r.data?.split('-').reverse().join('/')}</td>
                  <td className="p-4 text-white font-black uppercase text-[9px]">{r.medicamento}</td>
                  <td className="p-4 text-center">
                    <span className={`px-2 py-1 rounded-lg font-black text-[9px] border ${Number(r.periodoCarenciaDias) > 0 ? 'bg-red-500/10 text-red-500 border-red-500/20' : 'bg-slate-800 text-slate-500 border-slate-700'}`}>
                      {r.periodoCarenciaDias}D
                    </span>
                  </td>
                  <td className="p-4 text-right font-black text-emerald-500">{Number(r.custoMedicamento || 0).toLocaleString()}</td>
                  <td className="p-4 text-center flex justify-center gap-2">
                    <button onClick={() => { setEditingId(r.id); setFormData({...r}); }} className="p-2 text-slate-500 hover:text-cyan-400"><Edit3 size={14}/></button>
                    <button onClick={() => { if(confirm('Eliminar?')) deleteDoc(doc(db, 'saude', r.id)) }} className="p-2 text-slate-600 hover:text-red-500"><Trash2 size={14}/></button>
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
