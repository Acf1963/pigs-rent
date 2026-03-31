import { useState, useEffect, useRef } from 'react';
import { db } from '../lib/firebase';
import { collection, addDoc, onSnapshot, query, orderBy, deleteDoc, doc, updateDoc } from 'firebase/firestore';
import { 
  Skull, FileSpreadsheet, FileText, UploadCloud, 
  Check, Trash2, Edit3, Plus 
} from 'lucide-react';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export default function AbatesPage() {
  const [registos, setRegistos] = useState<any[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const initialForm = {
    loteId: '',
    dataAbate: new Date().toISOString().split('T')[0],
    pesoVivoKg: '',
    carcacaKg: '',
    observacoes: ''
  };

  const [formData, setFormData] = useState(initialForm);

  // 1. Listeners do Firebase
  useEffect(() => {
    const q = query(collection(db, 'abates'), orderBy('dataAbate', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setRegistos(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });
    return () => unsubscribe();
  }, []);

  // 2. Importação Excel
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: 'binary', cellDates: true });
        const data = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]]);
        
        for (const item of data as any[]) {
          let dataFinal = item.dataAbate || item.data;
          if (dataFinal instanceof Date) dataFinal = dataFinal.toISOString().split('T')[0];

          const vivo = item.pesoVivoKg || item.pesoVivoK || item.peso_vivo || 0;
          const carcaca = item.carcacaKg || item.CarcacaKg || item.carcaca || 0;

          await addDoc(collection(db, 'abates'), { 
            loteId: (item.loteId || item.loteID || 'S/L').toString(),
            dataAbate: dataFinal || new Date().toISOString().split('T')[0],
            pesoVivoKg: parseFloat(vivo),
            carcacaKg: parseFloat(carcaca),
            observacoes: (item.observacoes || item.obs || '').toString().toUpperCase(),
            createdAt: new Date().toISOString() 
          });
        }
      } catch (err) { console.error("Erro na importação:", err); }
    };
    reader.readAsBinaryString(file);
  };

  // 3. Exportação Excel
  const exportToExcel = () => {
    const dataToExport = registos.map(r => ({
      'Lote ID': r.loteId,
      'Data Abate': r.dataAbate,
      'Peso Vivo (Kg)': Number(r.pesoVivoKg).toFixed(1),
      'Carcaça (Kg)': Number(r.carcacaKg).toFixed(1),
      'Rendimento (%)': r.pesoVivoKg > 0 ? ((r.carcacaKg / r.pesoVivoKg) * 100).toFixed(1) + '%' : '0%',
      'Observações': r.observacoes
    }));

    const worksheet = XLSX.utils.json_to_sheet(dataToExport);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Abates");
    XLSX.writeFile(workbook, `Abates_Kwanza_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  // 4. Exportação PDF
  const exportToPDF = () => {
    const doc = new jsPDF('l', 'mm', 'a4');
    doc.text("AgroRent - Fazenda Kwanza: Registo de Abates", 14, 15);
    autoTable(doc, {
      head: [["LOTE ID", "DATA ABATE", "PESO VIVO", "CARCAÇA", "REND. %", "OBSERVAÇÕES"]],
      body: registos.map(r => [
        r.loteId, 
        r.dataAbate, 
        `${Number(r.pesoVivoKg).toFixed(1)} Kg`, 
        `${Number(r.carcacaKg).toFixed(1)} Kg`,
        `${r.pesoVivoKg > 0 ? ((r.carcacaKg / r.pesoVivoKg) * 100).toFixed(1) : '0.0'}%`,
        r.observacoes
      ]),
      startY: 20,
      headStyles: { fillColor: [8, 145, 178] }
    });
    doc.save("Registos_Abate_Kwanza.pdf");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload = {
      ...formData,
      pesoVivoKg: parseFloat(formData.pesoVivoKg as string) || 0,
      carcacaKg: parseFloat(formData.carcacaKg as string) || 0,
    };

    if (editingId) {
      await updateDoc(doc(db, 'abates', editingId), payload);
      setEditingId(null);
    } else {
      await addDoc(collection(db, 'abates'), { ...payload, createdAt: new Date().toISOString() });
    }
    setFormData(initialForm);
  };

  return (
    <div className="space-y-4 md:space-y-6 pb-24 lg:pb-0">
      
      {/* HEADER ADAPTATIVO */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-slate-800/50 pb-6">
        <h1 className="text-2xl md:text-3xl font-black text-white flex items-center gap-3 tracking-tighter uppercase">
          <Skull className="text-cyan-500" size={32} /> Abates
        </h1>

        <div className="flex flex-wrap gap-2 w-full md:w-auto bg-[#161922] p-1.5 rounded-2xl border border-slate-800 shadow-xl">
          <input type="file" ref={fileInputRef} className="hidden" accept=".xlsx, .xls" onChange={handleFileUpload} />
          
          <button onClick={() => fileInputRef.current?.click()} className="flex-1 md:flex-none bg-[#1e293b] text-slate-300 px-4 py-2.5 rounded-xl text-[10px] font-black uppercase flex items-center justify-center gap-2 hover:bg-slate-800 border border-slate-700/50 transition-all active:scale-95">
            <UploadCloud size={14} className="text-emerald-500" /> Importar
          </button>

          <button onClick={exportToExcel} className="flex-1 md:flex-none bg-[#1e293b] text-slate-300 px-4 py-2.5 rounded-xl text-[10px] font-black uppercase flex items-center justify-center gap-2 hover:bg-slate-800 border border-slate-700/50 transition-all active:scale-95">
            <FileSpreadsheet size={14} className="text-emerald-400" /> Excel
          </button>

          <button onClick={exportToPDF} className="flex-1 md:flex-none bg-[#1e293b] text-slate-300 px-4 py-2.5 rounded-xl text-[10px] font-black uppercase flex items-center justify-center gap-2 hover:bg-slate-800 border border-slate-700/50 transition-all active:scale-95">
            <FileText size={14} className="text-red-400" /> PDF
          </button>
        </div>
      </div>

      {/* FORMULÁRIO RESPONSIVO */}
      <div className="bg-[#161922] rounded-3xl md:rounded-[2rem] border border-slate-800/50 p-4 md:p-6 shadow-2xl">
        <form onSubmit={handleSubmit} className="flex flex-col md:grid md:grid-cols-12 gap-4">
          
          <div className="md:col-span-2 space-y-1">
            <label className="text-[8px] font-black text-slate-500 uppercase px-1">Lote ID</label>
            <input required className="w-full bg-[#0f121a] border border-slate-800 p-3 rounded-xl text-cyan-500 font-bold outline-none text-xs uppercase" placeholder="LOTE-01" value={formData.loteId} onChange={e => setFormData({...formData, loteId: e.target.value.toUpperCase()})} />
          </div>

          <div className="md:col-span-2 space-y-1">
            <label className="text-[8px] font-black text-slate-500 uppercase px-1">Data</label>
            <input type="date" className="w-full bg-[#0f121a] border border-slate-800 p-3 rounded-xl text-white font-bold outline-none text-xs" value={formData.dataAbate} onChange={e => setFormData({...formData, dataAbate: e.target.value})} />
          </div>

          <div className="grid grid-cols-2 md:col-span-2 gap-4">
            <div className="space-y-1">
              <label className="text-[8px] font-black text-slate-500 uppercase px-1">P. Vivo</label>
              <input type="number" step="0.1" className="w-full bg-[#0f121a] border border-slate-800 p-3 rounded-xl text-white font-bold outline-none text-xs" value={formData.pesoVivoKg} onChange={e => setFormData({...formData, pesoVivoKg: e.target.value})} />
            </div>
            <div className="space-y-1">
              <label className="text-[8px] font-black text-slate-500 uppercase px-1">Carcaça</label>
              <input type="number" step="0.1" className="w-full bg-[#0f121a] border border-slate-800 p-3 rounded-xl text-white font-bold outline-none text-xs" value={formData.carcacaKg} onChange={e => setFormData({...formData, carcacaKg: e.target.value})} />
            </div>
          </div>

          <div className="md:col-span-4 space-y-1">
            <label className="text-[8px] font-black text-slate-500 uppercase px-1">Observações</label>
            <input className="w-full bg-[#0f121a] border border-slate-800 p-3 rounded-xl text-slate-400 font-bold outline-none text-xs uppercase" placeholder="NOTAS ADICIONAIS" value={formData.observacoes} onChange={e => setFormData({...formData, observacoes: e.target.value.toUpperCase()})} />
          </div>

          <div className="md:col-span-2 pt-2 md:pt-0">
            <button type="submit" className="w-full bg-cyan-600 hover:bg-cyan-500 text-white font-black text-xs py-3.5 rounded-xl transition-all shadow-lg uppercase flex items-center justify-center gap-2 active:scale-95">
              {editingId ? <Check size={16} /> : <Plus size={16} />} 
              {editingId ? 'Atualizar' : 'Gravar'}
            </button>
          </div>
        </form>
      </div>

      {/* TABELA / LISTAGEM */}
      <div className="bg-[#161922] rounded-3xl md:rounded-[2rem] border border-slate-800/50 shadow-2xl overflow-hidden flex flex-col">
        <div className="overflow-x-auto custom-scrollbar flex-1"> 
          <table className="w-full text-left text-[10px] min-w-[850px]">
            <thead className="bg-black/30 text-slate-500 font-black uppercase text-[8px] border-b border-slate-800/50 sticky top-0 z-10 backdrop-blur-md">
              <tr>
                <th className="p-4">LOTE ID</th>
                <th className="p-4">DATA</th>
                <th className="p-4 text-center">PESO VIVO</th>
                <th className="p-4 text-center">CARCAÇA</th>
                <th className="p-4 text-center">REND. (%)</th>
                <th className="p-4">OBSERVAÇÕES</th>
                <th className="p-4 text-center">AÇÕES</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/30">
              {registos.map((r) => {
                const rendimento = (r.pesoVivoKg > 0) ? ((r.carcacaKg / r.pesoVivoKg) * 100).toFixed(1) : '0.0';
                return (
                  <tr key={r.id} className="hover:bg-slate-800/10 transition-colors group">
                    <td className="p-4 font-black text-cyan-500 uppercase">{r.loteId}</td>
                    <td className="p-4 text-slate-500 font-bold">{r.dataAbate.split('-').reverse().join('/')}</td>
                    <td className="p-4 text-center text-white font-bold">{Number(r.pesoVivoKg).toFixed(1)} Kg</td>
                    <td className="p-4 text-center text-white font-bold">{Number(r.carcacaKg).toFixed(1)} Kg</td>
                    <td className="p-4 text-center">
                      <span className="text-emerald-500 font-black bg-emerald-500/10 px-3 py-1 rounded-full border border-emerald-500/20">{rendimento}%</span>
                    </td>
                    <td className="p-4 text-slate-400 uppercase text-[9px] truncate max-w-[200px]">{r.observacoes}</td>
                    <td className="p-4 text-center">
                      <div className="flex justify-center gap-2">
                        <button onClick={() => { setEditingId(r.id); setFormData({...r}); window.scrollTo({top: 0, behavior: 'smooth'}); }} className="p-2 text-slate-600 hover:text-cyan-400 hover:bg-cyan-500/10 rounded-lg transition-all"><Edit3 size={16}/></button>
                        <button onClick={() => { if(confirm('Eliminar registo?')) deleteDoc(doc(db, 'abates', r.id)) }} className="p-2 text-slate-600 hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-all"><Trash2 size={16}/></button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        
        {/* RODAPÉ RESUMO (Muito útil no telemóvel) */}
        <div className="p-4 bg-black/40 border-t border-slate-800/50 flex justify-between items-center shrink-0">
          <div className="flex gap-6">
            <div className="flex flex-col">
              <span className="text-[7px] font-black text-slate-500 uppercase tracking-widest">Total Cabeças</span>
              <span className="text-xs font-black text-white">{registos.length} Un.</span>
            </div>
            <div className="flex flex-col">
              <span className="text-[7px] font-black text-slate-500 uppercase tracking-widest">Média Rendimento</span>
              <span className="text-xs font-black text-emerald-400">
                {registos.length > 0 
                  ? (registos.reduce((acc, r) => acc + (r.pesoVivoKg > 0 ? (r.carcacaKg/r.pesoVivoKg)*100 : 0), 0) / registos.length).toFixed(1)
                  : 0}%
              </span>
            </div>
          </div>
          <Check size={16} className="text-emerald-500 opacity-30" />
        </div>
      </div>
    </div>
  );
}
