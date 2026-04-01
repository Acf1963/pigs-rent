import { useState, useEffect, useRef } from 'react';
import { db } from '../lib/firebase';
import { collection, addDoc, onSnapshot, query, orderBy, deleteDoc, doc, updateDoc } from 'firebase/firestore';
import { 
  Activity, FileSpreadsheet, FileText, UploadCloud, Check, Trash2, Edit3, RotateCcw, ShieldAlert, Syringe, UserCheck, Calendar, Plus
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

  // --- LISTENERS ---
  useEffect(() => {
    const q = query(collection(db, 'saude'), orderBy('data', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setRegistos(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });
    return () => unsubscribe();
  }, []);

  // --- EXPORTS ---
  const exportToExcel = () => {
    const ws = XLSX.utils.json_to_sheet(registos.map(r => ({
      Lote: r.loteId,
      Data: r.data,
      Tipo: r.tipo,
      Medicamento: r.medicamento,
      Custo: r.custoMedicamento,
      Carencia: r.periodoCarenciaDias,
      Veterinario: r.veterinarioResponsavel
    })));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Saude_Kwanza");
    XLSX.writeFile(wb, `Maneio_Sanitario_Kwanza_${new Date().getFullYear()}.xlsx`);
  };

  const exportToPDF = () => {
    const docPDF = new jsPDF('l', 'mm', 'a4');
    docPDF.setFontSize(16);
    docPDF.text("FAZENDA KWANZA - RELATÓRIO SANITÁRIO", 14, 15);
    autoTable(docPDF, {
      head: [["LOTE", "DATA", "TIPO", "MEDICAMENTO", "CARÊNCIA", "CUSTO (KZ)", "VETERINÁRIO"]],
      body: registos.map(r => [
        r.loteId, 
        r.data?.split('-').reverse().join('/') || '---', 
        r.tipo, 
        r.medicamento, 
        `${r.periodoCarenciaDias} DIAS`, 
        Number(r.custoMedicamento || 0).toLocaleString(),
        r.veterinarioResponsavel || '---'
      ]),
      startY: 22,
      headStyles: { fillColor: [239, 68, 68] }
    });
    docPDF.save("Relatorio_Sanitario_Kwanza.pdf");
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
    <div className="space-y-4 md:space-y-6 pb-24 lg:pb-0">
      
      {/* HEADER */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-slate-800/50 pb-6">
        <div className="flex items-center gap-4">
          <div className="bg-red-500/10 p-3 rounded-2xl border border-red-500/20 shadow-inner">
            <Activity className="text-red-500" size={32} />
          </div>
          <div>
            <h1 className="text-2xl md:text-3xl font-black text-white uppercase tracking-tighter leading-none">Saúde</h1>
            <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest italic mt-1">Maneio Sanitário</p>
          </div>
        </div>

        <div className="flex flex-wrap gap-2 w-full md:w-auto bg-[#161922] p-1.5 rounded-2xl border border-slate-800 shadow-xl">
          <input type="file" ref={fileInputRef} className="hidden" accept=".xlsx, .xls" />
          <button onClick={() => fileInputRef.current?.click()} className="flex-1 md:flex-none bg-[#1e293b] text-slate-300 px-4 py-2.5 rounded-xl text-[10px] font-black uppercase flex items-center justify-center gap-2 hover:bg-slate-800 border border-slate-700/50 transition-all">
            <UploadCloud size={14} className="text-cyan-500" /> Importar
          </button>
          <button onClick={exportToExcel} className="flex-1 md:flex-none bg-[#1e293b] text-slate-300 px-4 py-2.5 rounded-xl text-[10px] font-black uppercase flex items-center justify-center gap-2 hover:bg-slate-800 border border-slate-700/50 transition-all">
            <FileSpreadsheet size={14} className="text-emerald-400" /> Excel
          </button>
          <button onClick={exportToPDF} className="flex-1 md:flex-none bg-[#1e293b] text-slate-300 px-4 py-2.5 rounded-xl text-[10px] font-black uppercase flex items-center justify-center gap-2 hover:bg-slate-800 border border-slate-700/50 transition-all">
            <FileText size={14} className="text-red-400" /> PDF
          </button>
        </div>
      </div>

      {/* FORMULÁRIO */}
      <div className="bg-[#161922] rounded-3xl md:rounded-[2rem] border border-slate-800/50 p-4 md:p-6 shadow-2xl">
        <form onSubmit={handleSubmit} className="flex flex-col md:grid md:grid-cols-12 gap-4">
          
          <div className="md:col-span-2 space-y-1 w-full">
            <label className="text-[8px] font-black text-slate-500 uppercase px-1">Lote</label>
            <input required className="w-full bg-[#0f121a] border border-slate-800 p-3 rounded-xl text-cyan-400 font-bold outline-none text-xs uppercase" placeholder="LOTE ID" value={formData.loteId} onChange={e => setFormData({...formData, loteId: e.target.value.toUpperCase()})} />
          </div>

          <div className="md:col-span-3 space-y-1 w-full">
            <label className="text-[8px] font-black text-slate-500 uppercase px-1">Medicamento</label>
            <div className="relative">
              <Syringe className="absolute left-3 top-3 text-slate-700" size={14} />
              <input required className="w-full bg-[#0f121a] border border-slate-800 p-3 pl-10 rounded-xl text-white font-bold outline-none text-xs uppercase" placeholder="PRODUTO" value={formData.medicamento} onChange={e => setFormData({...formData, medicamento: e.target.value.toUpperCase()})} />
            </div>
          </div>

          <div className="md:col-span-3 space-y-1 w-full">
            <label className="text-[8px] font-black text-slate-500 uppercase px-1">Tipo & Via</label>
            <div className="flex gap-2">
              <select className="bg-[#0f121a] border border-slate-800 p-3 rounded-xl text-white font-bold outline-none text-xs" value={formData.tipo} onChange={e => setFormData({...formData, tipo: e.target.value})}>
                <option value="VACINA">VACINA</option>
                <option value="TRATAMENTO">TRATAMENTO</option>
                <option value="VERMÍFUGO">VERMÍFUGO</option>
              </select>
              <select className="flex-1 bg-[#0f121a] border border-slate-800 p-3 rounded-xl text-white font-bold outline-none text-xs" value={formData.viaAplicacao} onChange={e => setFormData({...formData, viaAplicacao: e.target.value})}>
                <option value="INTRAMUSCULAR">INTRA-M</option>
                <option value="ORAL">ORAL</option>
                <option value="SUBCUTÂNEA">S-CUT</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 md:col-span-4 gap-4 w-full">
            <div className="space-y-1">
              <label className="text-[8px] font-black text-red-500 uppercase px-1">Carência (Dias)</label>
              <div className="relative">
                <ShieldAlert className="absolute left-3 top-3 text-red-900" size={14} />
                <input type="number" required className="w-full bg-[#0f121a] border border-red-900/30 p-3 pl-10 rounded-xl text-red-500 font-black outline-none text-xs" value={formData.periodoCarenciaDias} onChange={e => setFormData({...formData, periodoCarenciaDias: e.target.value})} />
              </div>
            </div>
            <div className="space-y-1">
              <label className="text-[8px] font-black text-emerald-500 uppercase px-1">Custo (Kz)</label>
              <input type="number" className="w-full bg-[#0f121a] border border-slate-800 p-3 rounded-xl text-emerald-500 font-black outline-none text-xs" value={formData.custoMedicamento} onChange={e => setFormData({...formData, custoMedicamento: e.target.value})} />
            </div>
          </div>

          <div className="md:col-span-4 space-y-1 w-full">
            <label className="text-[8px] font-black text-slate-500 uppercase px-1">Veterinário</label>
            <div className="relative">
              <UserCheck className="absolute left-3 top-3 text-slate-700" size={14} />
              <input className="w-full bg-[#0f121a] border border-slate-800 p-3 pl-10 rounded-xl text-white font-bold outline-none text-xs uppercase" placeholder="TÉCNICO" value={formData.veterinarioResponsavel} onChange={e => setFormData({...formData, veterinarioResponsavel: e.target.value.toUpperCase()})} />
            </div>
          </div>

          <div className="md:col-span-3 space-y-1 w-full">
            <label className="text-[8px] font-black text-slate-500 uppercase px-1">Data</label>
            <div className="relative">
              <Calendar className="absolute left-3 top-3 text-slate-700" size={14} />
              <input type="date" required className="w-full bg-[#0f121a] border border-slate-800 p-3 pl-10 rounded-xl text-white font-bold outline-none text-xs" value={formData.data} onChange={e => setFormData({...formData, data: e.target.value})} />
            </div>
          </div>

          <div className="md:col-span-5 flex gap-2 w-full pt-2">
            <button type="submit" className="flex-1 bg-red-600 hover:bg-red-500 text-white font-black text-[10px] py-4 rounded-xl transition-all shadow-lg uppercase flex items-center justify-center gap-2 active:scale-95">
              {editingId ? <Check size={16} /> : <Plus size={16} />} 
              {editingId ? 'Atualizar' : 'Confirmar'}
            </button>
            <button type="button" onClick={() => { setEditingId(null); setFormData(initialForm); }} className="bg-slate-800 p-4 rounded-xl text-slate-500 hover:text-white transition-all">
              <RotateCcw size={16}/>
            </button>
          </div>
        </form>
      </div>

      {/* TABELA */}
      <div className="bg-[#161922] rounded-3xl md:rounded-[2rem] border border-slate-800/50 shadow-2xl overflow-hidden flex flex-col">
        <div className="overflow-x-auto custom-scrollbar flex-1"> 
          <table className="w-full text-left text-[10px] min-w-[1100px]">
            <thead className="bg-black/30 text-slate-500 font-black uppercase text-[8px] border-b border-slate-800/50 sticky top-0 z-10 backdrop-blur-md">
              <tr>
                <th className="p-4">LOTE</th>
                <th className="p-4">DATA</th>
                <th className="p-4">MEDICAMENTO</th>
                <th className="p-4">TIPO / VIA</th>
                <th className="p-4 text-center">CARÊNCIA</th>
                <th className="p-4 text-right">CUSTO (KZ)</th>
                <th className="p-4">VETERINÁRIO</th>
                <th className="p-4 text-center">AÇÕES</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/20">
              {registos.map((r) => (
                <tr key={r.id} className="hover:bg-red-500/[0.02] transition-colors group">
                  <td className="p-4 font-black text-cyan-500 uppercase text-xs">{r.loteId}</td>
                  <td className="p-4 text-slate-400 font-bold">{r.data?.split('-').reverse().join('/')}</td>
                  <td className="p-4 text-white font-black uppercase text-[10px] tracking-tight">{r.medicamento}</td>
                  <td className="p-4">
                    <div className="text-white font-black uppercase text-[9px]">{r.tipo}</div>
                    <div className="text-slate-500 uppercase text-[7px] font-bold">{r.viaAplicacao}</div>
                  </td>
                  <td className="p-4 text-center">
                    <span className={`px-3 py-1 rounded-lg font-black text-[10px] border ${Number(r.periodoCarenciaDias) > 0 ? 'bg-red-500/10 text-red-500 border-red-500/20' : 'bg-slate-800 text-slate-400 border-slate-700'}`}>
                      {r.periodoCarenciaDias} DIAS
                    </span>
                  </td>
                  <td className="p-4 text-right font-black text-emerald-500 text-sm">{Number(r.custoMedicamento || 0).toLocaleString()} Kz</td>
                  <td className="p-4 text-slate-400 font-bold uppercase text-[9px] italic">{r.veterinarioResponsavel || 'TÉCNICO GERAL'}</td>
                  <td className="p-4 text-center">
                    <div className="flex justify-center gap-2">
                      <button onClick={() => { setEditingId(r.id); setFormData({...r}); }} className="p-2 bg-slate-800/40 rounded-lg text-slate-500 hover:text-cyan-400 transition-all"><Edit3 size={16}/></button>
                      <button onClick={() => { if(confirm('Eliminar registo?')) deleteDoc(doc(db, 'saude', r.id)) }} className="p-2 bg-slate-800/40 rounded-lg text-slate-600 hover:text-red-500 transition-all"><Trash2 size={16}/></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        
        <div className="p-4 bg-black/40 border-t border-slate-800/50 flex justify-between items-center px-10">
          <div className="flex flex-col">
            <span className="text-[8px] font-black text-slate-500 uppercase tracking-widest">Investimento Saúde Total</span>
            <span className="text-base font-black text-emerald-500">
              {registos.reduce((acc, r) => acc + (Number(r.custoMedicamento) || 0), 0).toLocaleString()} Kz
            </span>
          </div>
          <Activity size={20} className="text-red-500 opacity-20" />
        </div>
      </div>
    </div>
  );
}
