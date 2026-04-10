import React, { useState, useEffect, useRef } from 'react';
import { db } from '../lib/firebase';
import { 
  collection, addDoc, onSnapshot, query, orderBy, 
  deleteDoc, doc, updateDoc, writeBatch 
} from 'firebase/firestore';
import { 
  Skull, FileSpreadsheet, FileText, UploadCloud, 
  Check, Trash2, Edit3, Plus, Tag, Square, CheckSquare, Calendar, Scale
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
    pesoAbate: '', 
    carcaca: '',   
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

  // --- EXPORTAÇÕES ---
  const exportToExcel = () => {
    const ws = XLSX.utils.json_to_sheet(registos.map(r => ({
      'Data Abate': r.dataAbate,
      Lote: r.loteId,
      Brinco: r.brinco,
      'Peso Abate': r.pesoAbate,
      'Carcaca': r.carcaca,
      'Rendimento %': r.pesoAbate > 0 ? ((r.carcaca / r.pesoAbate) * 100).toFixed(1) + '%' : '0%'
    })));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Abates");
    XLSX.writeFile(wb, "Relatorio_Abates.xlsx");
  };

  const exportToPDF = () => {
    const docPDF = new jsPDF('l', 'mm', 'a4');
    autoTable(docPDF, {
      head: [["DATA ABATE", "LOTE", "BRINCO", "P. ABATE", "CARCAÇA", "REND %"]],
      body: registos.map(r => [
        r.dataAbate, r.loteId, r.brinco, 
        `${r.pesoAbate}kg`, `${r.carcaca}kg`,
        `${r.pesoAbate > 0 ? ((r.carcaca / r.pesoAbate) * 100).toFixed(1) : '0'}%`
      ]),
      headStyles: { fillColor: [6, 182, 212] }
    });
    docPDF.save("Relatorio_Abates.pdf");
  };

  // --- IMPORTAÇÃO ---
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
            loteId: String(item.loteId || '').toUpperCase(),
            brinco: String(item.brinco || '').toUpperCase(),
            pesoAbate: parseFloat(item.pesoAbate) || 0,
            carcaca: parseFloat(item.carcaca) || 0,
            dataAbate: item.dataAbate instanceof Date 
              ? item.dataAbate.toISOString().split('T')[0] 
              : String(item.dataAbate || new Date().toISOString().split('T')[0]),
            createdAt: new Date().toISOString() 
          });
        }
        await batch.commit();
        alert("Importação concluída!");
      } catch (err) { console.error(err); }
    };
    reader.readAsBinaryString(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload = { ...formData, pesoAbate: parseFloat(formData.pesoAbate as string) || 0, carcaca: parseFloat(formData.carcaca as string) || 0 };
    if (editingId) { await updateDoc(doc(db, 'abates', editingId), payload); setEditingId(null); }
    else { await addDoc(collection(db, 'abates'), { ...payload, createdAt: new Date().toISOString() }); }
    setFormData(initialForm);
  };

  // --- LÓGICA DE RESUMO SEPARADO ---
  const getResumo = (tipo: 'B' | 'S') => {
    const filtrados = registos.filter(r => r.loteId.includes(`-${tipo}`));
    const total = filtrados.length;
    const somaPeso = filtrados.reduce((acc, r) => acc + (Number(r.pesoAbate) || 0), 0);
    const somaCarcaca = filtrados.reduce((acc, r) => acc + (Number(r.carcaca) || 0), 0);
    return {
      total,
      mediaPeso: total > 0 ? (somaPeso / total).toFixed(1) : "0.0",
      mediaCarcaca: total > 0 ? (somaCarcaca / total).toFixed(1) : "0.0"
    };
  };

  const resumoB = getResumo('B');
  const resumoS = getResumo('S');

  return (
    <div className="h-[calc(100vh-110px)] flex flex-col space-y-4 overflow-hidden p-2">
      <header className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 shrink-0">
        <div className="flex items-center gap-3">
          <Skull className="text-cyan-500" size={28} />
          <h1 className="text-2xl font-black text-white uppercase tracking-tight">ABATES</h1>
        </div>
        <div className="flex gap-2 w-full lg:w-auto">
          <input type="file" ref={fileInputRef} className="hidden" onChange={handleFileUpload} />
          <button onClick={() => fileInputRef.current?.click()} className="flex-1 bg-[#1a202e] border border-slate-800 px-4 py-2 rounded-lg text-[10px] font-black text-slate-300 flex items-center justify-center gap-2 hover:bg-slate-800"><UploadCloud size={14} className="text-emerald-500" /> IMPORTAR</button>
          <button onClick={exportToExcel} className="flex-1 bg-[#1a202e] border border-slate-800 px-4 py-2 rounded-lg text-[10px] font-black text-slate-300 flex items-center justify-center gap-2 hover:bg-slate-800"><FileSpreadsheet size={14} className="text-cyan-400" /> EXCEL</button>
          <button onClick={exportToPDF} className="flex-1 bg-[#1a202e] border border-slate-800 px-4 py-2 rounded-lg text-[10px] font-black text-slate-300 flex items-center justify-center gap-2 hover:bg-slate-800"><FileText size={14} className="text-red-400" /> PDF</button>
        </div>
      </header>

      <div className="bg-[#161922] rounded-2xl border border-slate-800/50 p-4 shrink-0 shadow-lg">
        <form onSubmit={handleSubmit} className="grid grid-cols-2 md:flex md:flex-nowrap gap-3 items-end">
          <div className="space-y-1 flex-1">
            <label className="text-[9px] font-black text-slate-500 uppercase px-1">Data Abate</label>
            <input type="date" required className="w-full bg-[#0d0f14] border border-slate-800 p-2.5 rounded-lg text-white text-xs font-bold outline-none focus:border-cyan-500" value={formData.dataAbate} onChange={e => setFormData({...formData, dataAbate: e.target.value})} />
          </div>
          <div className="space-y-1 flex-[1.5]">
            <label className="text-[9px] font-black text-slate-500 uppercase px-1">Brinco</label>
            <select required className="w-full bg-[#0d0f14] border border-slate-800 p-2.5 rounded-lg text-white text-xs font-bold outline-none uppercase focus:border-cyan-500" value={formData.brinco} onChange={e => {
              const animal = animais.find(a => a.brinco === e.target.value);
              setFormData({...formData, brinco: e.target.value, loteId: animal?.loteId || ''});
            }}>
              <option value="">SELECIONAR ANIMAL</option>
              {animais.map(a => <option key={a.id} value={a.brinco}>{a.brinco} ({a.loteId})</option>)}
            </select>
          </div>
          <div className="space-y-1 w-24 text-center">
            <label className="text-[9px] font-black text-slate-500 uppercase block">P. Abate</label>
            <input type="number" step="0.1" required className="w-full bg-[#0d0f14] border border-slate-800 p-2.5 rounded-lg text-white text-xs font-bold outline-none text-center" value={formData.pesoAbate} onChange={e => setFormData({...formData, pesoAbate: e.target.value})} />
          </div>
          <div className="space-y-1 w-24 text-center">
            <label className="text-[9px] font-black text-slate-500 uppercase block">Carcaça</label>
            <input type="number" step="0.1" required className="w-full bg-[#0d0f14] border border-slate-800 p-2.5 rounded-lg text-white text-xs font-bold outline-none text-center" value={formData.carcaca} onChange={e => setFormData({...formData, carcaca: e.target.value})} />
          </div>
          <button type="submit" className="bg-cyan-600 hover:bg-cyan-500 text-white font-black text-[10px] px-6 py-3 rounded-lg uppercase flex items-center gap-2">
            {editingId ? <Check size={16} /> : <Plus size={16} />} {editingId ? 'Atualizar' : 'Gravar'}
          </button>
        </form>
      </div>

      <div className="bg-[#161922] rounded-2xl border border-slate-800/50 shadow-2xl flex flex-col flex-1 min-h-0 overflow-hidden">
        <div className="overflow-y-auto flex-1 custom-scrollbar overflow-x-auto"> 
          <table className="w-full text-left text-[11px] border-separate border-spacing-0 min-w-[1000px]">
            <thead className="bg-[#11141d] text-slate-500 font-black uppercase text-[9px] sticky top-0 z-10">
              <tr>
                <th className="p-4 border-b border-slate-800/50 w-10 text-center">
                   <button onClick={() => setSelectedIds(selectedIds.length === registos.length ? [] : registos.map(r => r.id))}>
                    {selectedIds.length === registos.length && registos.length > 0 ? <CheckSquare size={16} className="text-cyan-500"/> : <Square size={16}/>}
                   </button>
                </th>
                <th className="p-4 border-b border-slate-800/50">DATA ENTRADA</th>
                <th className="p-4 border-b border-slate-800/50 text-cyan-500"><Calendar size={12} className="inline mr-1" /> DATA ABATE</th>
                <th className="p-4 border-b border-slate-800/50">LOTE</th>
                <th className="p-4 border-b border-slate-800/50">BRINCO</th>
                <th className="p-4 border-b border-slate-800/50 text-center">PESO ABATE</th>
                <th className="p-4 border-b border-slate-800/50 text-center">CARCAÇA</th>
                <th className="p-4 border-b border-slate-800/50 text-center">REND. %</th>
                <th className="p-4 border-b border-slate-800/50 text-center">AÇÕES</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/20">
              {registos.map((r) => {
                const animalInfo = animais.find(a => a.brinco === r.brinco);
                const rend = r.pesoAbate > 0 ? ((r.carcaca / r.pesoAbate) * 100).toFixed(1) : '0.0';
                const isSelected = selectedIds.includes(r.id);
                return (
                  <tr key={r.id} className={`${isSelected ? 'bg-cyan-500/5' : ''} hover:bg-cyan-500/[0.02] transition-colors group`}>
                    <td className="p-4 text-center">
                      <button onClick={() => setSelectedIds(prev => prev.includes(r.id) ? prev.filter(id => id !== r.id) : [...prev, r.id])}>
                        {isSelected ? <CheckSquare size={16} className="text-cyan-500"/> : <Square size={16} className="text-slate-700"/>}
                      </button>
                    </td>
                    <td className="p-4 text-slate-500 font-bold italic">{animalInfo?.dataNascimento || '---'}</td>
                    <td className="p-4 text-cyan-500 font-bold">{r.dataAbate}</td>
                    <td className="p-4 font-black text-slate-400">{r.loteId}</td>
                    <td className="p-4 text-white font-bold uppercase"><Tag size={10} className="inline mr-1 text-cyan-500" />{r.brinco}</td>
                    <td className="p-4 text-center text-white font-black">{r.pesoAbate} kg</td>
                    <td className="p-4 text-center text-white font-black">{r.carcaca} kg</td>
                    <td className="p-4 text-center"><span className="text-emerald-500 font-black bg-emerald-500/10 px-2 py-1 rounded border border-emerald-500/20">{rend}%</span></td>
                    <td className="p-4 text-center flex justify-center gap-2">
                        <button onClick={() => { setEditingId(r.id); setFormData({...r}); }} className="p-2 text-slate-500 hover:text-cyan-400"><Edit3 size={14}/></button>
                        <button onClick={() => deleteDoc(doc(db, 'abates', r.id))} className="p-2 text-slate-600 hover:text-red-500"><Trash2 size={14}/></button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* RODAPÉ COM RESUMO SEPARADO */}
        <div className="p-4 bg-[#0d0f14] border-t border-slate-800/50 flex flex-col md:flex-row gap-6 px-6 items-center shrink-0">
          <div className="flex-1 flex items-center gap-6 border-r border-slate-800/30">
            <div className="flex flex-col"><span className="text-[10px] font-black text-cyan-500 uppercase tracking-widest">BOVINOS</span><span className="text-sm font-black text-white">{resumoB.total} CAB.</span></div>
            <div className="flex flex-col"><span className="text-[8px] font-bold text-slate-500 uppercase">Média P. Vivo</span><span className="text-xs font-bold text-white">{resumoB.mediaPeso} KG</span></div>
            <div className="flex flex-col"><span className="text-[8px] font-bold text-slate-500 uppercase">Média Carcaça</span><span className="text-xs font-bold text-white">{resumoB.mediaCarcaca} KG</span></div>
          </div>
          <div className="flex-1 flex items-center gap-6 border-r border-slate-800/30">
            <div className="flex flex-col"><span className="text-[10px] font-black text-pink-500 uppercase tracking-widest">SUÍNOS</span><span className="text-sm font-black text-white">{resumoS.total} CAB.</span></div>
            <div className="flex flex-col"><span className="text-[8px] font-bold text-slate-500 uppercase">Média P. Vivo</span><span className="text-xs font-bold text-white">{resumoS.mediaPeso} KG</span></div>
            <div className="flex flex-col"><span className="text-[8px] font-bold text-slate-500 uppercase">Média Carcaça</span><span className="text-xs font-bold text-white">{resumoS.mediaCarcaca} KG</span></div>
          </div>
          <div className="shrink-0 flex items-center gap-3">
            <Scale size={16} className="text-slate-600" />
            {selectedIds.length > 0 && (
              <button onClick={async () => {
                if(!confirm('Eliminar selecionados?')) return;
                const batch = writeBatch(db);
                selectedIds.forEach(id => batch.delete(doc(db, 'abates', id)));
                await batch.commit();
                setSelectedIds([]);
              }} className="bg-red-600/20 border border-red-500/50 text-red-500 text-[9px] font-black px-4 py-2 rounded-lg hover:bg-red-600 hover:text-white">ELIMINAR ({selectedIds.length})</button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
