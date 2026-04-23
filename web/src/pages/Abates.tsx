import React, { useState, useEffect, useRef } from 'react';
import { db } from '../lib/firebase';
import { 
  collection, addDoc, onSnapshot, query, orderBy, 
  deleteDoc, doc, updateDoc, writeBatch 
} from 'firebase/firestore';
import { 
  Skull, FileSpreadsheet, FileText, UploadCloud, 
  Check, Trash2, Edit3, Plus, Square, CheckSquare,
  TrendingUp,
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

  const getResumo = (tipo: 'B' | 'S') => {
    const filtrados = registos.filter(r => r.loteId.includes(`-${tipo}`));
    const total = filtrados.length;
    const somaPeso = filtrados.reduce((acc, r) => acc + (Number(r.pesoAbate) || 0), 0);
    const somaCarcaca = filtrados.reduce((acc, r) => acc + (Number(r.carcaca) || 0), 0);
    const rendMedio = somaPeso > 0 ? ((somaCarcaca / somaPeso) * 100).toFixed(1) : "0.0";
    
    return {
      total,
      mediaPeso: total > 0 ? (somaPeso / total).toFixed(1) : "0.0",
      mediaCarcaca: total > 0 ? (somaCarcaca / total).toFixed(1) : "0.0",
      rendMedio
    };
  };

  const resumoB = getResumo('B');
  const resumoS = getResumo('S');

  const exportToExcel = () => {
    const ws = XLSX.utils.json_to_sheet(registos.map(r => ({
      'Data Abate': r.dataAbate,
      Lote: r.loteId,
      Brinco: r.brinco,
      'Peso Abate': r.pesoAbate,
      'Carcaca': r.carcaca,
      'Rendimento %': r.pesoAbate > 0 ? ((r.carcaca / r.pesoAbate) * 100).toFixed(1) + '%' : '0%'
    })));
    XLSX.utils.sheet_add_aoa(ws, [
      [], ["RESUMO POR ESPÉCIE"],
      ["BOVINOS", `Total: ${resumoB.total}`, `Média Peso: ${resumoB.mediaPeso}kg`, `Rend. Médio: ${resumoB.rendMedio}%`],
      ["SUÍNOS", `Total: ${resumoS.total}`, `Média Peso: ${resumoS.mediaPeso}kg`, `Rend. Médio: ${resumoS.rendMedio}%`]
    ], { origin: -1 });
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Abates");
    XLSX.writeFile(wb, "Relatorio_Abates_Fazenda_Kwanza.xlsx");
  };

  const exportToPDF = () => {
    const docPDF = new jsPDF('l', 'mm', 'a4');
    docPDF.setFontSize(18);
    docPDF.text("RELATÓRIO DE ABATES - FAZENDA KWANZA", 14, 15);
    autoTable(docPDF, {
      head: [["DATA ABATE", "LOTE", "BRINCO", "P. ABATE", "CARCAÇA", "REND %"]],
      body: registos.map(r => [
        r.dataAbate.split('-').reverse().join('/'), r.loteId, r.brinco, 
        `${r.pesoAbate}kg`, `${r.carcaca}kg`,
        `${r.pesoAbate > 0 ? ((r.carcaca / r.pesoAbate) * 100).toFixed(1) : '0'}%`
      ]),
      startY: 25,
      headStyles: { fillColor: [84, 190, 206] }
    });
    docPDF.save("Relatorio_Abates_Kwanza.pdf");
  };

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

  return (
    <div className="h-full flex flex-col space-y-4 p-2 md:p-4 overflow-hidden bg-[#0a0f18]">
      
      {/* HEADER ADAPTÁVEL */}
      <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 shrink-0 px-2">
        <div className="flex items-center gap-3">
          <div className="bg-[#54bece]/10 p-2 rounded-xl">
            <Skull className="text-[#54bece]" size={28} />
          </div>
          <h1 className="text-xl md:text-2xl font-black text-white uppercase tracking-tight italic">
            Abates <span className="text-[#54bece]">Gest Pro</span>
          </h1>
        </div>
        
        <div className="grid grid-cols-3 gap-2 w-full sm:w-auto">
          <input type="file" ref={fileInputRef} className="hidden" onChange={handleFileUpload} />
          <button onClick={() => fileInputRef.current?.click()} className="bg-[#161922] border border-white/5 p-3 rounded-xl text-[9px] font-black text-slate-300 flex flex-col items-center justify-center gap-1 hover:bg-slate-800 transition-all">
            <UploadCloud size={16} className="text-emerald-500" /> IMP.
          </button>
          <button onClick={exportToExcel} className="bg-[#161922] border border-white/5 p-3 rounded-xl text-[9px] font-black text-slate-300 flex flex-col items-center justify-center gap-1 hover:bg-slate-800 transition-all">
            <FileSpreadsheet size={16} className="text-[#54bece]" /> EXCEL
          </button>
          <button onClick={exportToPDF} className="bg-[#161922] border border-white/5 p-3 rounded-xl text-[9px] font-black text-slate-300 flex flex-col items-center justify-center gap-1 hover:bg-slate-800 transition-all">
            <FileText size={16} className="text-red-400" /> PDF
          </button>
        </div>
      </header>

      {/* FORMULÁRIO RESPONSIVO */}
      <div className="bg-[#111827] rounded-[2rem] border border-white/5 p-5 shrink-0 shadow-2xl">
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="space-y-1">
              <label className="text-[10px] font-black text-slate-500 uppercase px-1 tracking-widest">Data do Abate</label>
              <input type="date" required className="w-full bg-[#0a0f18] border border-white/10 p-4 rounded-2xl text-white text-sm font-bold outline-none focus:border-[#54bece] transition-all" value={formData.dataAbate} onChange={e => setFormData({...formData, dataAbate: e.target.value})} />
            </div>
            
            <div className="space-y-1">
              <label className="text-[10px] font-black text-slate-500 uppercase px-1 tracking-widest">Brinco do Animal</label>
              <select required className="w-full bg-[#0a0f18] border border-white/10 p-4 rounded-2xl text-white text-sm font-bold outline-none uppercase focus:border-[#54bece] transition-all" value={formData.brinco} onChange={e => {
                const animal = animais.find(a => a.brinco === e.target.value);
                setFormData({...formData, brinco: e.target.value, loteId: animal?.loteId || ''});
              }}>
                <option value="">SELECIONAR...</option>
                {animais.map(a => <option key={a.id} value={a.brinco}>{a.brinco} ({a.loteId})</option>)}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1 text-center">
                <label className="text-[10px] font-black text-slate-500 uppercase block tracking-widest">P. Vivo (Kg)</label>
                <input type="number" step="0.1" required className="w-full bg-[#0a0f18] border border-white/10 p-4 rounded-2xl text-white text-sm font-black outline-none text-center focus:border-[#54bece]" value={formData.pesoAbate} onChange={e => setFormData({...formData, pesoAbate: e.target.value})} />
              </div>
              <div className="space-y-1 text-center">
                <label className="text-[10px] font-black text-slate-500 uppercase block tracking-widest">Carcaça (Kg)</label>
                <input type="number" step="0.1" required className="w-full bg-[#0a0f18] border border-white/10 p-4 rounded-2xl text-white text-sm font-black outline-none text-center focus:border-[#54bece]" value={formData.carcaca} onChange={e => setFormData({...formData, carcaca: e.target.value})} />
              </div>
            </div>
            
            <button type="submit" className="md:mt-5 bg-[#54bece] hover:bg-cyan-500 text-[#0a0f18] font-black text-xs p-4 rounded-2xl uppercase flex items-center justify-center gap-2 transition-all shadow-lg active:scale-95">
              {editingId ? <Check size={18} /> : <Plus size={18} />} 
              {editingId ? 'Atualizar Dados' : 'Gravar Abate'}
            </button>
          </div>
        </form>
      </div>

      {/* LISTAGEM COM SCROLL BLINDADO */}
      <div className="bg-[#111827] rounded-[2rem] border border-white/5 flex flex-col flex-1 min-h-0 overflow-hidden shadow-2xl">
        <div className="overflow-auto flex-1 custom-scrollbar"> 
          <table className="w-full text-left border-separate border-spacing-0 min-w-[900px]">
            <thead className="bg-[#111827] text-slate-500 font-black uppercase text-[10px] sticky top-0 z-10">
              <tr>
                <th className="p-5 border-b border-white/5 w-12 text-center bg-[#111827]">
                   <button onClick={() => setSelectedIds(selectedIds.length === registos.length ? [] : registos.map(r => r.id))}>
                    {selectedIds.length === registos.length && registos.length > 0 ? <CheckSquare size={18} className="text-[#54bece]"/> : <Square size={18}/>}
                   </button>
                </th>
                <th className="p-5 border-b border-white/5 bg-[#111827]">DATA ABATE</th>
                <th className="p-5 border-b border-white/5 bg-[#111827]">IDENTIFICAÇÃO</th>
                <th className="p-5 border-b border-white/5 text-center bg-[#111827]">PESO / CARCAÇA</th>
                <th className="p-5 border-b border-white/5 text-center bg-[#111827]">RENDIMENTO</th>
                <th className="p-5 border-b border-white/5 text-center bg-[#111827]">AÇÕES</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {registos.map((r) => {
                const rend = r.pesoAbate > 0 ? ((r.carcaca / r.pesoAbate) * 100).toFixed(1) : '0.0';
                const isSelected = selectedIds.includes(r.id);
                return (
                  <tr key={r.id} className={`${isSelected ? 'bg-[#54bece]/5' : ''} hover:bg-white/[0.02] transition-colors group`}>
                    <td className="p-5 text-center">
                      <button onClick={() => setSelectedIds(prev => prev.includes(r.id) ? prev.filter(id => id !== r.id) : [...prev, r.id])}>
                        {isSelected ? <CheckSquare size={18} className="text-[#54bece]"/> : <Square size={18} className="text-slate-700"/>}
                      </button>
                    </td>
                    <td className="p-5">
                      <div className="flex flex-col">
                        <span className="text-white font-black text-sm">{r.dataAbate.split('-').reverse().join('/')}</span>
                        <span className="text-[10px] text-slate-500 uppercase font-bold italic">Registro Oficial</span>
                      </div>
                    </td>
                    <td className="p-5">
                      <div className="flex flex-col">
                        <span className="text-[#54bece] font-black text-sm uppercase tracking-tighter">{r.brinco}</span>
                        <span className="text-[10px] text-slate-500 font-bold italic">{r.loteId}</span>
                      </div>
                    </td>
                    <td className="p-5 text-center">
                      <div className="inline-flex flex-col bg-[#0a0f18] px-4 py-2 rounded-xl border border-white/5">
                        <span className="text-white font-black text-xs">{r.pesoAbate}kg <span className="text-slate-500 text-[10px]">VIVO</span></span>
                        <span className="text-cyan-400 font-black text-xs">{r.carcaca}kg <span className="text-slate-500 text-[10px]">CARC.</span></span>
                      </div>
                    </td>
                    <td className="p-5 text-center">
                      <span className="text-emerald-500 font-black bg-emerald-500/10 px-4 py-2 rounded-xl border border-emerald-500/20 text-sm">
                        {rend}%
                      </span>
                    </td>
                    <td className="p-5">
                      <div className="flex justify-center gap-1">
                        <button onClick={() => { setEditingId(r.id); setFormData({...r}); }} className="p-3 text-slate-400 hover:text-[#54bece] hover:bg-[#54bece]/10 rounded-xl transition-all"><Edit3 size={18}/></button>
                        <button onClick={() => deleteDoc(doc(db, 'abates', r.id))} className="p-3 text-slate-500 hover:text-red-500 hover:bg-red-500/10 rounded-xl transition-all"><Trash2 size={18}/></button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* RODAPÉ RESPONSIVO */}
        <div className="p-6 bg-[#0a0f18] border-t border-white/5 flex flex-col lg:flex-row gap-6 items-center shrink-0">
          <div className="grid grid-cols-2 gap-4 w-full lg:flex-1">
            <div className="flex items-center gap-4 bg-[#111827] p-4 rounded-2xl border border-white/5">
              <div className="bg-cyan-500/10 p-2 rounded-lg text-cyan-500 hidden sm:block"><TrendingUp size={20}/></div>
              <div className="flex flex-col">
                <span className="text-[10px] font-black text-[#54bece] uppercase tracking-widest">Bovinos</span>
                <span className="text-lg font-black text-white leading-tight">{resumoB.total} <span className="text-[10px] text-slate-500">CAB.</span></span>
                <span className="text-[10px] font-bold text-emerald-500">{resumoB.rendMedio}% REND.</span>
              </div>
            </div>
            <div className="flex items-center gap-4 bg-[#111827] p-4 rounded-2xl border border-white/5">
              <div className="bg-pink-500/10 p-2 rounded-lg text-pink-500 hidden sm:block"><TrendingUp size={20}/></div>
              <div className="flex flex-col">
                <span className="text-[10px] font-black text-pink-500 uppercase tracking-widest">Suínos</span>
                <span className="text-lg font-black text-white leading-tight">{resumoS.total} <span className="text-[10px] text-slate-500">CAB.</span></span>
                <span className="text-[10px] font-bold text-emerald-500">{resumoS.rendMedio}% REND.</span>
              </div>
            </div>
          </div>

          <div className="w-full lg:w-auto flex items-center justify-center gap-4">
            {selectedIds.length > 0 && (
              <button onClick={async () => {
                if(!confirm('Eliminar selecionados?')) return;
                const batch = writeBatch(db);
                selectedIds.forEach(id => batch.delete(doc(db, 'abates', id)));
                await batch.commit();
                setSelectedIds([]);
              }} className="w-full lg:w-auto bg-red-500/10 border border-red-500/20 text-red-500 text-[10px] font-black px-6 py-4 rounded-2xl hover:bg-red-500 hover:text-white transition-all uppercase tracking-widest">
                ELIMINAR ({selectedIds.length})
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}