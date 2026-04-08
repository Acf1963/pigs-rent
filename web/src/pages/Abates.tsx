import { useState, useEffect, useRef } from 'react';
import { db } from '../lib/firebase';
import { 
  collection, addDoc, onSnapshot, query, orderBy, 
  deleteDoc, doc, updateDoc, writeBatch 
} from 'firebase/firestore';
import { 
  Skull, FileSpreadsheet, FileText, UploadCloud, 
  Check, Trash2, Edit3, Plus, Tag, Square, CheckSquare 
} from 'lucide-react';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export default function AbatesPage() {
  const [registos, setRegistos] = useState<any[]>([]);
  const [animais, setAnimais] = useState<any[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const initialForm = {
    loteId: '',
    brinco: '',
    dataAbate: new Date().toISOString().split('T')[0],
    pesoVivoKg: '',
    carcacaKg: '',
    observacoes: ''
  };

  const [formData, setFormData] = useState(initialForm);

  useEffect(() => {
    const qAbates = query(collection(db, 'abates'), orderBy('dataAbate', 'desc'));
    const unsubAbates = onSnapshot(qAbates, (snapshot) => {
      setRegistos(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    const qAnimais = query(collection(db, 'animais'), orderBy('brinco', 'asc'));
    const unsubAnimais = onSnapshot(qAnimais, (snapshot) => {
      setAnimais(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    return () => { unsubAbates(); unsubAnimais(); };
  }, []);

  // --- LÓGICA DE SELEÇÃO ---
  const toggleSelectAll = () => {
    if (selectedIds.length === registos.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(registos.map(r => r.id));
    }
  };

  const toggleSelectOne = (id: string) => {
    setSelectedIds(prev => 
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  const deleteSelected = async () => {
    if (!confirm(`Eliminar ${selectedIds.length} registos?`)) return;
    const batch = writeBatch(db);
    selectedIds.forEach(id => {
      batch.delete(doc(db, 'abates', id));
    });
    await batch.commit();
    setSelectedIds([]);
  };

  // --- IMPORTAÇÃO / EXPORTAÇÃO ---
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: 'binary', cellDates: true });
        const data = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]]);
        const batch = writeBatch(db);
        
        for (const item of data as any[]) {
          const newDoc = doc(collection(db, 'abates'));
          batch.set(newDoc, { 
            loteId: String(item.loteId || 'S/L').toUpperCase(),
            brinco: String(item.brinco || '').toUpperCase(),
            dataAbate: item.dataAbate || new Date().toISOString().split('T')[0],
            pesoVivoKg: parseFloat(item.pesoVivoKg) || 0,
            carcacaKg: parseFloat(item.carcacaKg) || 0,
            observacoes: String(item.observacoes || '').toUpperCase(),
            createdAt: new Date().toISOString() 
          });
        }
        await batch.commit();
        alert("Importação concluída!");
      } catch (err) { console.error(err); }
    };
    reader.readAsBinaryString(file);
  };

  const exportToExcel = () => {
    const ws = XLSX.utils.json_to_sheet(registos.map(r => ({
      Lote: r.loteId,
      Brinco: r.brinco,
      Data: r.dataAbate,
      'Peso Vivo': r.pesoVivoKg,
      Carcaca: r.carcacaKg,
      Rendimento: r.pesoVivoKg > 0 ? ((r.carcacaKg / r.pesoVivoKg) * 100).toFixed(1) + '%' : '0%'
    })));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Abates");
    XLSX.writeFile(wb, "Relatorio_Abates.xlsx");
  };

  const exportToPDF = () => {
    const docPDF = new jsPDF('l', 'mm', 'a4');
    autoTable(docPDF, {
      head: [["LOTE", "BRINCO", "DATA", "P. VIVO", "CARCAÇA", "REND %"]],
      body: registos.map(r => [
        r.loteId, r.brinco, r.dataAbate, 
        `${r.pesoVivoKg}kg`, `${r.carcacaKg}kg`,
        `${r.pesoVivoKg > 0 ? ((r.carcacaKg / r.pesoVivoKg) * 100).toFixed(1) : '0'}%`
      ]),
      headStyles: { fillColor: [6, 182, 212] }
    });
    docPDF.save("Abates.pdf");
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
    <div className="h-[calc(100vh-110px)] flex flex-col space-y-4 overflow-hidden p-2">
      
      {/* HEADER */}
      <header className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 shrink-0">
        <div className="flex items-center gap-3">
          <Skull className="text-cyan-500" size={28} />
          <h1 className="text-2xl md:text-3xl font-black text-white uppercase tracking-tight">ABATES</h1>
        </div>

        <div className="flex flex-wrap gap-2 w-full lg:w-auto">
          <input type="file" ref={fileInputRef} className="hidden" accept=".xlsx, .xls" onChange={handleFileUpload} />
          <button onClick={() => fileInputRef.current?.click()} className="flex-1 lg:flex-none bg-[#1a202e] border border-slate-800 px-4 py-2 rounded-lg text-[10px] font-black text-slate-300 flex items-center justify-center gap-2 hover:bg-slate-800 transition-colors">
            <UploadCloud size={14} className="text-emerald-500" /> IMPORTAR
          </button>
          <button onClick={exportToExcel} className="flex-1 lg:flex-none bg-[#1a202e] border border-slate-800 px-4 py-2 rounded-lg text-[10px] font-black text-slate-300 flex items-center justify-center gap-2 hover:bg-slate-800 transition-colors">
            <FileSpreadsheet size={14} className="text-cyan-400" /> EXCEL
          </button>
          <button onClick={exportToPDF} className="flex-1 lg:flex-none bg-[#1a202e] border border-slate-800 px-4 py-2 rounded-lg text-[10px] font-black text-slate-300 flex items-center justify-center gap-2 hover:bg-slate-800 transition-colors">
            <FileText size={14} className="text-red-400" /> PDF
          </button>
          
          {selectedIds.length > 0 && (
            <button onClick={deleteSelected} className="flex-1 lg:flex-none bg-red-600/20 border border-red-500/50 px-4 py-2 rounded-lg text-[10px] font-black text-red-500 flex items-center justify-center gap-2 hover:bg-red-600 hover:text-white transition-all">
              <Trash2 size={14} /> ELIMINAR ({selectedIds.length})
            </button>
          )}
        </div>
      </header>

      {/* FORMULÁRIO */}
      <div className="bg-[#161922] rounded-2xl border border-slate-800/50 p-4 shrink-0">
        <form onSubmit={handleSubmit} className="grid grid-cols-2 md:flex md:flex-nowrap gap-4 items-end">
          <div className="space-y-1 flex-1">
            <label className="text-[9px] font-black text-slate-500 uppercase px-1">Lote</label>
            <input required className="w-full bg-[#0d0f14] border border-slate-800 p-3 rounded-lg text-white text-xs font-bold outline-none uppercase focus:border-cyan-500" value={formData.loteId} onChange={e => setFormData({...formData, loteId: e.target.value.toUpperCase()})} />
          </div>

          <div className="space-y-1 flex-1">
            <label className="text-[9px] font-black text-slate-500 uppercase px-1">Brinco</label>
            <select required className="w-full bg-[#0d0f14] border border-slate-800 p-3 rounded-lg text-white text-xs font-bold outline-none uppercase focus:border-cyan-500" value={formData.brinco} onChange={e => setFormData({...formData, brinco: e.target.value})}>
              <option value="">SELECIONAR</option>
              {animais.map(a => <option key={a.id} value={a.brinco}>{a.brinco}</option>)}
            </select>
          </div>

          <div className="space-y-1 flex-1 text-center">
            <label className="text-[9px] font-black text-slate-500 uppercase px-1">P. Vivo (kg)</label>
            <input type="number" step="0.1" required className="w-full bg-[#0d0f14] border border-slate-800 p-3 rounded-lg text-white text-xs font-bold outline-none" value={formData.pesoVivoKg} onChange={e => setFormData({...formData, pesoVivoKg: e.target.value})} />
          </div>

          <div className="space-y-1 flex-1 text-center">
            <label className="text-[9px] font-black text-slate-500 uppercase px-1">Carcaça (kg)</label>
            <input type="number" step="0.1" required className="w-full bg-[#0d0f14] border border-slate-800 p-3 rounded-lg text-white text-xs font-bold outline-none" value={formData.carcacaKg} onChange={e => setFormData({...formData, carcacaKg: e.target.value})} />
          </div>

          <button type="submit" className="col-span-2 md:w-auto bg-cyan-600 hover:bg-cyan-500 text-white font-black text-[11px] px-8 py-3.5 rounded-xl uppercase flex items-center justify-center gap-2 shadow-lg transition-all shrink-0">
            {editingId ? <Check size={18} /> : <Plus size={18} />} {editingId ? 'Atualizar' : 'Gravar'}
          </button>
        </form>
      </div>

      {/* TABELA COM MULTI-SELEÇÃO */}
      <div className="bg-[#161922] rounded-2xl border border-slate-800/50 shadow-2xl flex flex-col flex-1 min-h-0 overflow-hidden">
        <div className="overflow-y-auto flex-1 custom-scrollbar overflow-x-auto"> 
          <table className="w-full text-left text-[11px] border-separate border-spacing-0 min-w-[900px]">
            <thead className="bg-[#11141d] text-slate-500 font-black uppercase text-[9px] sticky top-0 z-10">
              <tr>
                <th className="p-4 border-b border-slate-800/50 w-10">
                  <button onClick={toggleSelectAll} className="text-slate-500 hover:text-cyan-500 transition-colors">
                    {selectedIds.length === registos.length && registos.length > 0 ? <CheckSquare size={16}/> : <Square size={16}/>}
                  </button>
                </th>
                <th className="p-4 border-b border-slate-800/50">LOTE</th>
                <th className="p-4 border-b border-slate-800/50">BRINCO</th>
                <th className="p-4 border-b border-slate-800/50 text-center">P. VIVO</th>
                <th className="p-4 border-b border-slate-800/50 text-center">CARCAÇA</th>
                <th className="p-4 border-b border-slate-800/50 text-center">REND. %</th>
                <th className="p-4 border-b border-slate-800/50 text-center">AÇÕES</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/20">
              {registos.map((r) => {
                const rend = r.pesoVivoKg > 0 ? ((r.carcacaKg / r.pesoVivoKg) * 100).toFixed(1) : '0.0';
                const isSelected = selectedIds.includes(r.id);
                return (
                  <tr key={r.id} className={`${isSelected ? 'bg-cyan-500/5' : ''} hover:bg-cyan-500/[0.02] transition-colors`}>
                    <td className="p-4">
                      <button onClick={() => toggleSelectOne(r.id)} className={`${isSelected ? 'text-cyan-500' : 'text-slate-700'} transition-colors`}>
                        {isSelected ? <CheckSquare size={16}/> : <Square size={16}/>}
                      </button>
                    </td>
                    <td className="p-4 font-black text-cyan-500">{r.loteId}</td>
                    <td className="p-4 text-white font-bold uppercase"><Tag size={10} className="inline mr-1 text-slate-500" />{r.brinco}</td>
                    <td className="p-4 text-center text-white font-bold">{r.pesoVivoKg} kg</td>
                    <td className="p-4 text-center text-white font-bold">{r.carcacaKg} kg</td>
                    <td className="p-4 text-center">
                      <span className="text-emerald-500 font-black bg-emerald-500/10 px-2 py-1 rounded-lg border border-emerald-500/20">{rend}%</span>
                    </td>
                    <td className="p-4 text-center">
                      <div className="flex justify-center gap-1">
                        <button onClick={() => { setEditingId(r.id); setFormData({...r}); }} className="p-2 text-slate-500 hover:text-cyan-400 transition-colors"><Edit3 size={14}/></button>
                        <button onClick={() => { if(confirm('Eliminar?')) deleteDoc(doc(db, 'abates', r.id)) }} className="p-2 text-slate-600 hover:text-red-500 transition-colors"><Trash2 size={14}/></button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
