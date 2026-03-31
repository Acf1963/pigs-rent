import { useState, useEffect, useRef } from 'react';
import { db } from '../lib/firebase';
import { collection, addDoc, onSnapshot, query, orderBy, deleteDoc, doc, updateDoc } from 'firebase/firestore';
import { 
  Activity, FileSpreadsheet, FileText, UploadCloud, Check, Trash2, Edit3, RotateCcw 
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
    periodoCarenciaDias: '',
    custoMedicamento: '',
    veterinarioResponsavel: ''
  };

  const [formData, setFormData] = useState(initialForm);

  // FUNÇÕES DE DATA
  const formatarDataInput = (valor: any) => {
    if (!valor) return '';
    if (typeof valor === 'number') {
      const data = new Date((valor - 25569) * 86400 * 1000);
      return data.toISOString().split('T')[0];
    }
    if (typeof valor === 'string' && valor.includes('/')) {
        return valor.split('/').reverse().join('-');
    }
    return String(valor).split('T')[0];
  };

  const formatarDataTabela = (valor: any) => {
    if (!valor) return '---';
    const dataIso = formatarDataInput(valor);
    return dataIso.split('-').reverse().join('/');
  };

  useEffect(() => {
    const q = query(collection(db, 'saude'), orderBy('data', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setRegistos(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });
    return () => unsubscribe();
  }, []);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const data = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]]);
        for (const item of data as any[]) {
          const dataFormatada = formatarDataInput(item.data);
          await addDoc(collection(db, 'saude'), { 
            ...item, 
            data: dataFormatada,
            createdAt: new Date().toISOString() 
          });
        }
      } catch (err) { console.error("Erro na importação"); }
    };
    reader.readAsBinaryString(file);
  };

  const exportToExcel = () => {
    const ws = XLSX.utils.json_to_sheet(registos);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Saude");
    XLSX.writeFile(wb, "Maneio_Sanitario.xlsx");
  };

  const exportToPDF = () => {
    const doc = new jsPDF('l', 'mm', 'a4');
    doc.text("AgroRent - Maneio Sanitário", 14, 15);
    autoTable(doc, {
      head: [["LOTE", "DATA", "TIPO", "MEDICAMENTO", "DOSE", "VIA", "CARÊNCIA", "CUSTO", "VETERINÁRIO"]],
      body: registos.map(r => [r.loteId, formatarDataTabela(r.data), r.tipo, r.medicamento, r.dosagem, r.viaAplicacao, r.periodoCarenciaDias, r.custoMedicamento, r.veterinarioResponsavel]),
      startY: 20,
      styles: { fontSize: 8 },
      headStyles: { fillColor: [8, 145, 178] }
    });
    doc.save("Maneio_Sanitario.pdf");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (editingId) {
      await updateDoc(doc(db, 'saude', editingId), { ...formData });
      setEditingId(null);
    } else {
      await addDoc(collection(db, 'saude'), { ...formData, createdAt: new Date().toISOString() });
    }
    setFormData(initialForm);
  };

  return (
    <div className="h-full flex flex-col space-y-4 overflow-hidden">
      {/* HEADER: shrink-0 */}
      <div className="flex justify-between items-center shrink-0">
        <h1 className="text-3xl font-black text-white flex items-center gap-3 tracking-tighter">
          <Activity className="text-cyan-500" size={32} /> MANEIO SANITÁRIO
        </h1>

        <div className="flex gap-2 bg-[#161922] p-1.5 rounded-2xl border border-slate-800 shadow-xl">
          <input type="file" ref={fileInputRef} className="hidden" accept=".xlsx, .xls" onChange={handleFileUpload} />
          <button onClick={() => fileInputRef.current?.click()} className="bg-[#1e293b] text-slate-300 px-4 py-2 rounded-xl text-[10px] font-black uppercase flex items-center gap-2 hover:bg-slate-800 transition-all border border-slate-700/50">
            <UploadCloud size={14} className="text-emerald-500" /> Importar
          </button>
          <button onClick={exportToExcel} className="bg-[#1e293b] text-slate-300 px-4 py-2 rounded-xl text-[10px] font-black uppercase flex items-center gap-2 hover:bg-slate-800 transition-all border border-slate-700/50">
            <FileSpreadsheet size={14} className="text-emerald-400" /> Excel
          </button>
          <button onClick={exportToPDF} className="bg-[#1e293b] text-slate-300 px-4 py-2 rounded-xl text-[10px] font-black uppercase flex items-center gap-2 hover:bg-slate-800 transition-all border border-slate-700/50">
            <FileText size={14} className="text-red-400" /> PDF
          </button>
        </div>
      </div>

      {/* FORMULÁRIO: shrink-0 */}
      <div className="bg-[#161922] rounded-[2rem] border border-slate-800/50 p-6 shadow-2xl shrink-0">
        <form onSubmit={handleSubmit} className="grid grid-cols-12 gap-3 items-end">
          <div className="col-span-1 space-y-1">
            <label className="text-[8px] font-black text-slate-500 uppercase px-1">Lote</label>
            <input required className="w-full bg-[#0f121a] border border-slate-800 p-2.5 rounded-xl text-cyan-500 font-bold outline-none uppercase text-[10px]" value={formData.loteId} onChange={e => setFormData({...formData, loteId: e.target.value.toUpperCase()})} />
          </div>
          <div className="col-span-1 space-y-1">
            <label className="text-[8px] font-black text-slate-500 uppercase px-1">Data</label>
            <input type="date" className="w-full bg-[#0f121a] border border-slate-800 p-2.5 rounded-xl text-white font-bold outline-none text-[10px]" value={formData.data} onChange={e => setFormData({...formData, data: e.target.value})} />
          </div>
          <div className="col-span-2 space-y-1">
            <label className="text-[8px] font-black text-slate-500 uppercase px-1">Tipo</label>
            <select className="w-full bg-[#0f121a] border border-slate-800 p-2.5 rounded-xl text-white font-bold outline-none text-[10px]" value={formData.tipo} onChange={e => setFormData({...formData, tipo: e.target.value})}>
              <option value="VACINA">VACINA</option>
              <option value="TRATAMENTO">TRATAMENTO</option>
              <option value="VERMIFUGO">VERMIFUGO</option>
            </select>
          </div>
          <div className="col-span-2 space-y-1">
            <label className="text-[8px] font-black text-slate-500 uppercase px-1">Medicamento</label>
            <input className="w-full bg-[#0f121a] border border-slate-800 p-2.5 rounded-xl text-slate-300 font-bold outline-none text-[10px] uppercase" value={formData.medicamento} onChange={e => setFormData({...formData, medicamento: e.target.value.toUpperCase()})} />
          </div>
          <div className="col-span-1 space-y-1">
            <label className="text-[8px] font-black text-slate-500 uppercase px-1">Dose</label>
            <input className="w-full bg-[#0f121a] border border-slate-800 p-2.5 rounded-xl text-white font-bold outline-none text-[10px] uppercase" value={formData.dosagem} onChange={e => setFormData({...formData, dosagem: e.target.value.toUpperCase()})} />
          </div>
          <div className="col-span-1 space-y-1">
            <label className="text-[8px] font-black text-slate-500 uppercase px-1">Custo</label>
            <input type="number" className="w-full bg-[#0f121a] border border-slate-800 p-2.5 rounded-xl text-emerald-500 font-bold outline-none text-[10px]" value={formData.custoMedicamento} onChange={e => setFormData({...formData, custoMedicamento: e.target.value})} />
          </div>
          <div className="col-span-2 space-y-1">
            <label className="text-[8px] font-black text-slate-500 uppercase px-1">Veterinário</label>
            <input className="w-full bg-[#0f121a] border border-slate-800 p-2.5 rounded-xl text-slate-300 font-bold outline-none text-[10px] uppercase" value={formData.veterinarioResponsavel} onChange={e => setFormData({...formData, veterinarioResponsavel: e.target.value.toUpperCase()})} />
          </div>
          <div className="col-span-2 flex gap-2">
            <button type="submit" className="flex-1 bg-cyan-600 hover:bg-cyan-500 text-white font-black text-[10px] py-3 rounded-xl transition-all shadow-lg uppercase flex items-center justify-center gap-2">
              <Check size={14} /> {editingId ? 'OK' : 'Gravar'}
            </button>
            <button type="button" onClick={() => { setEditingId(null); setFormData(initialForm); }} className="bg-slate-800 text-slate-400 p-3 rounded-xl hover:text-white transition-all">
              <RotateCcw size={14} />
            </button>
          </div>
        </form>
      </div>

      {/* TABELA: flex-1 e min-h-0 para scroll interno */}
      <div className="flex-1 min-h-0 bg-[#161922] rounded-[2rem] border border-slate-800/50 shadow-2xl overflow-hidden flex flex-col">
        <div className="overflow-x-auto overflow-y-auto flex-1 custom-scrollbar"> 
          <table className="w-full text-left text-[10px] min-w-[1000px] border-collapse">
            <thead className="bg-[#1e293b] text-slate-400 font-black uppercase text-[8px] sticky top-0 z-20">
              <tr>
                <th className="p-4 border-b border-slate-700/50">LOTE ID</th>
                <th className="p-4 border-b border-slate-700/50">DATA</th>
                <th className="p-4 border-b border-slate-700/50">TIPO</th>
                <th className="p-4 border-b border-slate-700/50">MEDICAMENTO</th>
                <th className="p-4 border-b border-slate-700/50">DOSE</th>
                <th className="p-4 border-b border-slate-700/50">VIA</th>
                <th className="p-4 border-b border-slate-700/50 text-center">CARÊNCIA</th>
                <th className="p-4 border-b border-slate-700/50">CUSTO (KZ)</th>
                <th className="p-4 border-b border-slate-700/50">VETERINÁRIO</th>
                <th className="p-4 border-b border-slate-700/50 text-center">AÇÕES</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/30">
              {registos.map((r) => (
                <tr key={r.id} className="hover:bg-slate-800/20 transition-colors h-[50px]">
                  <td className="p-4 font-black text-cyan-500 uppercase">{r.loteId}</td>
                  <td className="p-4 text-slate-500 font-bold">{formatarDataTabela(r.data)}</td>
                  <td className="p-4 text-white font-bold">{r.tipo}</td>
                  <td className="p-4 text-slate-300 uppercase">{r.medicamento}</td>
                  <td className="p-4 text-white font-bold uppercase">{r.dosagem}</td>
                  <td className="p-4 text-slate-500 text-[9px] uppercase">{r.viaAplicacao}</td>
                  <td className="p-4 text-center text-red-400 font-bold">{r.periodoCarenciaDias}</td>
                  <td className="p-4 text-emerald-500 font-bold">{Number(r.custoMedicamento).toLocaleString()}</td>
                  <td className="p-4 text-slate-400 uppercase">{r.veterinarioResponsavel}</td>
                  <td className="p-4 text-center">
                    <div className="flex justify-center gap-3">
                      <button onClick={() => { setEditingId(r.id); setFormData({...r, data: formatarDataInput(r.data)}); }} className="text-slate-600 hover:text-cyan-400 transition-colors"><Edit3 size={14}/></button>
                      <button onClick={() => { if(confirm('Eliminar?')) deleteDoc(doc(db, 'saude', r.id)) }} className="text-slate-600 hover:text-red-500 transition-colors"><Trash2 size={14}/></button>
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
