import { useState, useEffect, useRef } from 'react';
import { db } from '../lib/firebase';
import { 
  collection, addDoc, onSnapshot, query, where, 
  deleteDoc, doc, orderBy, writeBatch 
} from 'firebase/firestore';
import { 
  Users, Plus, Trash2, Tag, Scale, Dna, Filter, 
  UploadCloud, FileSpreadsheet, FileText, RotateCcw, Square, CheckSquare 
} from 'lucide-react';

import * as XLSX from 'xlsx';
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
    raca: 'LANDRACE',
    sexo: 'Macho',
    pesoEntrada: '',
    dataEntrada: new Date().toISOString().split('T')[0]
  };

  const [formData, setFormData] = useState(initialForm);

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

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: 'binary', cellDates: true });
        const dataRaw = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]]);
        for (const item of dataRaw as any[]) {
          await addDoc(collection(db, 'animais'), { 
            loteId: (item.loteId || selectedLote || 'N/A').toString().toUpperCase(),
            brinco: (item.brinco || 'S/N').toString().toUpperCase(),
            raca: (item.raca || 'LANDRACE').toString().toUpperCase(),
            sexo: item.sexo || 'Macho',
            pesoEntrada: parseFloat(item.pesoEntrada || 0),
            dataEntrada: item.dataEntrada || new Date().toISOString().split('T')[0],
            createdAt: new Date().toISOString() 
          });
        }
      } catch (err) { console.error("Erro na importação:", err); }
    };
    reader.readAsBinaryString(file);
  };

  const exportToExcel = () => {
    const ws = XLSX.utils.json_to_sheet(animais.map(a => ({
      Brinco: a.brinco, Lote: a.loteId, Raça: a.raca, Sexo: a.sexo, Peso: a.pesoEntrada, Data: a.dataEntrada 
    })));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Animais");
    XLSX.writeFile(wb, "Fazenda_Kwanza_Inventario.xlsx");
  };

  const exportToPDF = () => {
    const docPDF = new jsPDF('l', 'mm', 'a4');
    docPDF.text("Fazenda Kwanza - Inventário de Animais", 14, 15);
    autoTable(docPDF, {
      head: [["BRINCO", "LOTE", "RAÇA", "SEXO", "PESO (KG)", "DATA"]],
      body: animais.map(a => [a.brinco, a.loteId, a.raca, a.sexo, `${a.pesoEntrada} Kg`, a.dataEntrada]),
      startY: 20,
      headStyles: { fillColor: [6, 182, 212] }
    });
    docPDF.save("Relatorio_Kwanza.pdf");
  };

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  };

  const toggleSelectAll = () => {
    setSelectedIds(selectedIds.length === animais.length ? [] : animais.map(a => a.id));
  };

  const handleBulkDelete = async () => {
    if (!confirm(`Eliminar ${selectedIds.length} registos?`)) return;
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

  return (
    <div className="flex flex-col space-y-4 md:space-y-6 pb-24 lg:pb-6">
      <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-800/50 pb-6">
        <div className="flex items-center gap-3">
          <div className="bg-cyan-500/10 p-2.5 rounded-2xl border border-cyan-500/20 shadow-inner">
            <Users className="text-cyan-500 w-6 h-6 md:w-8 md:h-8" />
          </div>
          <div>
            <h1 className="text-xl md:text-3xl font-black text-white uppercase tracking-tighter">Animais</h1>
            <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest italic">Fazenda Kwanza</p>
          </div>
        </div>

        <div className="grid grid-cols-3 md:flex gap-2 w-full md:w-auto bg-[#161922] p-1.5 rounded-2xl border border-slate-800">
          <input type="file" ref={fileInputRef} className="hidden" accept=".xlsx, .xls" onChange={handleFileUpload} />
          <button onClick={() => fileInputRef.current?.click()} className="bg-[#1e293b] text-cyan-400 p-2.5 rounded-xl flex items-center justify-center border border-slate-700/50 hover:bg-slate-800 transition-all">
            <UploadCloud size={16} />
          </button>
          <button onClick={exportToExcel} className="bg-[#1e293b] text-emerald-400 p-2.5 rounded-xl flex items-center justify-center border border-slate-700/50 hover:bg-slate-800 transition-all">
            <FileSpreadsheet size={16} />
          </button>
          <button onClick={exportToPDF} className="bg-[#1e293b] text-red-400 p-2.5 rounded-xl flex items-center justify-center border border-slate-700/50 hover:bg-slate-800 transition-all">
            <FileText size={16} />
          </button>
        </div>
      </header>

      {/* FILTRO E FORMULÁRIO (Mesma lógica das versões anteriores) */}
      <div className="bg-[#161922] rounded-[2rem] border border-slate-800/50 p-5 shadow-2xl space-y-6">
        <div className="flex flex-col md:flex-row gap-3">
          <div className="flex-1 flex items-center gap-3 bg-[#0f121a] p-4 rounded-2xl border border-slate-800">
            <Filter size={16} className="text-cyan-500" />
            <select className="bg-transparent text-white font-black text-[10px] outline-none uppercase w-full cursor-pointer" value={selectedLote} onChange={(e) => setSelectedLote(e.target.value)}>
              <option value="">FILTRAR POR LOTE</option>
              {lotes.map(l => <option key={l.id} className="bg-[#161922]" value={l.loteId}>{l.loteId}</option>)}
            </select>
          </div>
          {selectedIds.length > 0 && (
            <button onClick={handleBulkDelete} className="bg-red-500/10 text-red-500 p-4 rounded-2xl text-[10px] font-black uppercase border border-red-500/20 animate-pulse flex items-center justify-center gap-2">
              <Trash2 size={14}/> Eliminar ({selectedIds.length})
            </button>
          )}
        </div>

        <form onSubmit={handleSubmit} className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-12 gap-4 border-t border-slate-800/50 pt-6">
          <div className="md:col-span-2 space-y-1">
            <label className="text-[8px] font-black text-slate-500 uppercase px-1">Brinco</label>
            <div className="relative">
              <Tag className="absolute left-3 top-3 text-slate-700" size={14} />
              <input required className="w-full bg-[#0f121a] border border-slate-800 p-3 pl-10 rounded-xl text-white font-bold outline-none text-xs uppercase focus:border-cyan-500" value={formData.brinco} onChange={e => setFormData({...formData, brinco: e.target.value.toUpperCase()})} />
            </div>
          </div>
          <div className="md:col-span-3 space-y-1">
            <label className="text-[8px] font-black text-slate-500 uppercase px-1">Raça</label>
            <div className="relative">
              <Dna className="absolute left-3 top-3 text-slate-700" size={14} />
              <input required className="w-full bg-[#0f121a] border border-slate-800 p-3 pl-10 rounded-xl text-white font-bold outline-none text-xs uppercase focus:border-cyan-500" value={formData.raca} onChange={e => setFormData({...formData, raca: e.target.value.toUpperCase()})} />
            </div>
          </div>
          <div className="grid grid-cols-2 md:col-span-4 gap-2">
            <div className="space-y-1">
              <label className="text-[8px] font-black text-slate-500 uppercase px-1">Sexo</label>
              <select className="w-full bg-[#0f121a] border border-slate-800 p-3 rounded-xl text-white font-bold outline-none text-xs" value={formData.sexo} onChange={e => setFormData({...formData, sexo: e.target.value})}>
                <option value="Macho">MACHO</option>
                <option value="Fêmea">FÊMEA</option>
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-[8px] font-black text-emerald-500 uppercase px-1">Peso (Kg)</label>
              <div className="relative">
                <Scale className="absolute left-3 top-3 text-emerald-900" size={14} />
                <input type="number" step="0.1" required className="w-full bg-[#0f121a] border border-emerald-900/10 p-3 pl-10 rounded-xl text-emerald-500 font-black outline-none text-xs focus:border-emerald-500" value={formData.pesoEntrada} onChange={e => setFormData({...formData, pesoEntrada: e.target.value})} />
              </div>
            </div>
          </div>
          <div className="md:col-span-3 flex gap-2 pt-2 md:pt-4">
            <button type="submit" className="flex-1 bg-cyan-600 hover:bg-cyan-500 text-white font-black text-[10px] py-4 rounded-xl shadow-lg uppercase flex items-center justify-center gap-2 active:scale-95 transition-all"><Plus size={16} /> Adicionar</button>
            <button type="button" onClick={() => setFormData(initialForm)} className="bg-slate-800 p-4 rounded-xl text-slate-500 hover:text-white transition-all"><RotateCcw size={16}/></button>
          </div>
        </form>
      </div>

      {/* TABELA */}
      <div className="bg-[#161922] rounded-[2rem] border border-slate-800/50 shadow-2xl overflow-hidden flex flex-col">
        <div className="overflow-x-auto custom-scrollbar"> 
          <table className="w-full text-left text-[10px] min-w-[800px]">
            <thead className="bg-black/30 text-slate-500 font-black uppercase text-[8px] border-b border-slate-800/50 sticky top-0 z-10 backdrop-blur-md">
              <tr>
                <th className="p-4 w-10 text-center"><button onClick={toggleSelectAll}>{selectedIds.length === animais.length && animais.length > 0 ? <CheckSquare size={16} className="text-cyan-500"/> : <Square size={16}/>}</button></th>
                <th className="p-4">BRINCO</th>
                <th className="p-4">LOTE</th>
                <th className="p-4">PESO ENTRADA</th>
                <th className="p-4 text-center">AÇÕES</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/10">
              {animais.map((a) => (
                <tr key={a.id} className={`group transition-colors ${selectedIds.includes(a.id) ? 'bg-cyan-500/5' : 'hover:bg-white/[0.02]'}`}>
                  <td className="p-4 text-center"><button onClick={() => toggleSelect(a.id)}>{selectedIds.includes(a.id) ? <CheckSquare size={16} className="text-cyan-400"/> : <Square size={16} className="text-slate-700"/>}</button></td>
                  <td className="p-4 font-black text-white">{a.brinco}</td>
                  <td className="p-4 font-black text-cyan-500 uppercase">{a.loteId}</td>
                  <td className="p-4 font-black text-emerald-500">{a.pesoEntrada} Kg</td>
                  <td className="p-4 text-center"><button onClick={() => deleteDoc(doc(db, 'animais', a.id))} className="text-slate-600 hover:text-red-500 p-2 opacity-0 group-hover:opacity-100 transition-all"><Trash2 size={14}/></button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
