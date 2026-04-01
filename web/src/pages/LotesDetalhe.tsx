import { useState, useEffect, useRef } from 'react';
import { db } from '../lib/firebase';
import { 
  collection, addDoc, onSnapshot, query, where, 
  deleteDoc, doc, orderBy, writeBatch 
} from 'firebase/firestore';
import { 
  Users, Plus, Trash2, 
  UploadCloud, FileSpreadsheet, FileText, RotateCcw, Square, CheckSquare 
} from 'lucide-react';

import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export default function LotesDetalhePage() {
  const [animais, setAnimais] = useState<any[]>([]);
  const [lotes, setLotes] = useState<any[]>([]);
  const [selectedLote, setSelectedLote] = useState<string>('');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const initialForm = {
    brinco: '',
    raca: '',
    sexo: 'Macho',
    pesoEntrada: '',
    dataEntrada: new Date().toISOString().split('T')[0]
  };

  const [formData, setFormData] = useState(initialForm);

  // --- CARREGAMENTO DE DADOS ---
  useEffect(() => {
    const unsubLotes = onSnapshot(collection(db, 'lotes'), (snap) => {
      setLotes(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });
    return () => unsubLotes();
  }, []);

  useEffect(() => {
    let q = query(collection(db, 'animais'), orderBy('brinco', 'asc'));
    if (selectedLote) {
      q = query(collection(db, 'animais'), where('loteId', '==', selectedLote));
    }
    const unsubAnimais = onSnapshot(q, (snap) => {
      setAnimais(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      setSelectedIds([]); 
    });
    return () => unsubAnimais();
  }, [selectedLote]);

  // --- FUNÇÕES ---
  const toggleSelect = (id: string) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  };

  const toggleSelectAll = () => {
    setSelectedIds(selectedIds.length === animais.length && animais.length > 0 ? [] : animais.map(a => a.id));
  };

  const handleBulkDelete = async () => {
    if (!confirm(`Eliminar ${selectedIds.length} animais?`)) return;
    const batch = writeBatch(db);
    selectedIds.forEach(id => batch.delete(doc(db, 'animais', id)));
    await batch.commit();
    setSelectedIds([]);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedLote) return alert("Selecione um lote!");
    await addDoc(collection(db, 'animais'), {
      ...formData,
      loteId: selectedLote,
      pesoEntrada: parseFloat(formData.pesoEntrada) || 0,
      createdAt: new Date().toISOString()
    });
    setFormData(initialForm);
  };

  const exportToPDF = () => {
    const docPDF = new jsPDF('l', 'mm', 'a4');
    autoTable(docPDF, {
      head: [["BRINCO", "LOTE", "RAÇA", "SEXO", "PESO (KG)"]],
      body: animais.map(a => [a.brinco, a.loteId, a.raca, a.sexo, `${a.pesoEntrada} Kg`]),
      headStyles: { fillColor: [0, 157, 196] }
    });
    docPDF.save("Relatorio_Animais.pdf");
  };

  const totalCabecas = animais.length;
  const mediaPeso = animais.length > 0 
    ? (animais.reduce((acc, a) => acc + (Number(a.pesoEntrada) || 0), 0) / animais.length).toFixed(1) 
    : "0.0";

  return (
    // h-screen e overflow-hidden eliminam o scroll da página inteira
    <div className="h-[calc(100vh-100px)] flex flex-col space-y-6 overflow-hidden p-2">
      
      {/* HEADER - FIXO */}
      <header className="flex justify-between items-center shrink-0">
        <div className="flex items-center gap-3">
          <Users className="text-white" size={28} />
          <h1 className="text-3xl font-black text-white uppercase tracking-tight">ANIMAIS (ID)</h1>
        </div>

        <div className="flex gap-2">
          <input type="file" ref={fileInputRef} className="hidden" />
          <button onClick={() => fileInputRef.current?.click()} className="bg-[#1a202e] border border-slate-800 px-4 py-2 rounded-lg text-[10px] font-black text-slate-300 flex items-center gap-2 hover:bg-slate-800 transition-colors">
            <UploadCloud size={14} className="text-cyan-500" /> IMPORTAR
          </button>
          <button className="bg-[#1a202e] border border-slate-800 px-4 py-2 rounded-lg text-[10px] font-black text-slate-300 flex items-center gap-2 hover:bg-slate-800 transition-colors">
            <FileSpreadsheet size={14} className="text-emerald-500" /> EXCEL
          </button>
          <button onClick={exportToPDF} className="bg-[#1a202e] border border-slate-800 px-4 py-2 rounded-lg text-[10px] font-black text-slate-300 flex items-center gap-2 hover:bg-slate-800 transition-colors">
            <FileText size={14} className="text-red-500" /> PDF
          </button>
        </div>
      </header>

      {/* REGISTO - FIXO */}
      <div className="bg-[#161922] rounded-2xl border border-slate-800/50 p-6 shrink-0">
        <form onSubmit={handleSubmit} className="flex flex-wrap md:flex-nowrap gap-4 items-end">
          <div className="flex-1 min-w-[150px] space-y-2">
            <label className="text-[9px] font-black text-slate-500 uppercase px-1">Lote ID</label>
            <select 
              className="w-full bg-[#0d0f14] border border-slate-800 p-3 rounded-lg text-white text-xs font-bold outline-none uppercase focus:border-cyan-500 cursor-pointer"
              value={selectedLote}
              onChange={(e) => setSelectedLote(e.target.value)}
            >
              <option value="">SELECIONE O LOTE</option>
              {lotes.map(l => <option key={l.id} value={l.loteId}>{l.loteId}</option>)}
            </select>
          </div>

          <div className="flex-1 min-w-[120px] space-y-2">
            <label className="text-[9px] font-black text-slate-500 uppercase px-1">Brinco</label>
            <input required className="w-full bg-[#0d0f14] border border-slate-800 p-3 rounded-lg text-white text-xs font-bold outline-none uppercase focus:border-cyan-500" value={formData.brinco} onChange={e => setFormData({...formData, brinco: e.target.value.toUpperCase()})} />
          </div>

          <div className="flex-1 min-w-[120px] space-y-2">
            <label className="text-[9px] font-black text-slate-500 uppercase px-1">Peso (Kg)</label>
            <input type="number" step="0.1" required className="w-full bg-[#0d0f14] border border-slate-800 p-3 rounded-lg text-white text-xs font-bold outline-none focus:border-cyan-500" value={formData.pesoEntrada} onChange={e => setFormData({...formData, pesoEntrada: e.target.value})} />
          </div>

          <div className="flex-[2] min-w-[200px] space-y-2">
            <label className="text-[9px] font-black text-slate-500 uppercase px-1">Raça / Notas</label>
            <input className="w-full bg-[#0d0f14] border border-slate-800 p-3 rounded-lg text-white text-xs font-bold outline-none uppercase focus:border-cyan-500" value={formData.raca} placeholder="EX: LANDRACE" onChange={e => setFormData({...formData, raca: e.target.value.toUpperCase()})} />
          </div>

          <button type="submit" className="bg-[#009dc4] hover:bg-cyan-500 text-white font-black text-[11px] px-8 py-3.5 rounded-xl uppercase transition-all flex items-center gap-2 shadow-lg shadow-cyan-500/20">
            <Plus size={18} /> Gravar
          </button>
        </form>
      </div>

      {/* TABELA COM SCROLL INTERNO - FLEX-1 ocupa o resto do ecrã */}
      <div className="bg-[#161922] rounded-2xl border border-slate-800/50 shadow-2xl flex flex-col overflow-hidden flex-1 min-h-0">
        
        {/* Scroll apenas aqui */}
        <div className="overflow-y-auto overflow-x-auto flex-1 custom-scrollbar"> 
          <table className="w-full text-left text-[11px] border-separate border-spacing-0">
            <thead className="bg-[#11141d] text-slate-500 font-black uppercase text-[9px] sticky top-0 z-10">
              <tr>
                <th className="p-4 w-10 text-center border-b border-slate-800/50">
                  <button onClick={toggleSelectAll}>
                    {selectedIds.length === animais.length && animais.length > 0 ? <CheckSquare size={16} className="text-cyan-500"/> : <Square size={16}/>}
                  </button>
                </th>
                <th className="p-4 border-b border-slate-800/50">LOTE ID</th>
                <th className="p-4 border-b border-slate-800/50">BRINCO</th>
                <th className="p-4 text-center border-b border-slate-800/50">PESO VIVO</th>
                <th className="p-4 border-b border-slate-800/50">RAÇA / ESPECIFICAÇÃO</th>
                <th className="p-4 text-center border-b border-slate-800/50">AÇÕES</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/20">
              {animais.map((a) => (
                <tr key={a.id} className="hover:bg-white/[0.01] transition-colors group">
                  <td className="p-4 text-center">
                    <button onClick={() => toggleSelect(a.id)}>
                      {selectedIds.includes(a.id) ? <CheckSquare size={16} className="text-cyan-400"/> : <Square size={16} className="text-slate-700"/>}
                    </button>
                  </td>
                  <td className="p-4 font-black text-cyan-500 uppercase">{a.loteId}</td>
                  <td className="p-4 text-white font-bold">{a.brinco}</td>
                  <td className="p-4 text-center font-black text-white">{a.pesoEntrada} Kg</td>
                  <td className="p-4 text-slate-500 font-bold uppercase">{a.raca || 'FAZENDA KWANZA'}</td>
                  <td className="p-4 text-center">
                    <div className="flex justify-center gap-2">
                      <button onClick={() => setFormData({...a})} className="text-slate-600 hover:text-white p-1 transition-colors"><RotateCcw size={14}/></button>
                      <button onClick={() => deleteDoc(doc(db, 'animais', a.id))} className="text-slate-600 hover:text-red-500 p-1 transition-colors">
                        <Trash2 size={14}/>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        
        {/* RESUMO - FIXO NO RODAPÉ DA TABELA */}
        <div className="p-5 bg-[#0d0f14] border-t border-slate-800/50 flex justify-between items-center px-6 shrink-0">
          <div className="flex gap-10">
            <div className="flex flex-col">
              <span className="text-[8px] font-black text-slate-500 uppercase tracking-widest">Total Cabeças</span>
              <span className="text-sm font-black text-white">{totalCabecas} <span className="text-slate-500 text-[10px]">UN.</span></span>
            </div>
            <div className="flex flex-col">
              <span className="text-[8px] font-black text-slate-500 uppercase tracking-widest">Média Peso</span>
              <span className="text-sm font-black text-cyan-500">{mediaPeso} <span className="text-cyan-900 text-[10px]">KG</span></span>
            </div>
          </div>
          
          {selectedIds.length > 0 && (
            <button onClick={handleBulkDelete} className="bg-red-600/20 hover:bg-red-600 text-red-500 hover:text-white text-[9px] font-black px-4 py-2 rounded-lg uppercase transition-all border border-red-500/20">
              Eliminar ({selectedIds.length})
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

