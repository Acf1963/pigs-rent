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
    raca: '',
    sexo: 'Macho',
    pesoEntrada: '',
    dataEntrada: new Date().toISOString().split('T')[0]
  };

  const [formData, setFormData] = useState(initialForm);

  // 1. Carregar lotes
  useEffect(() => {
    const unsubLotes = onSnapshot(collection(db, 'lotes'), (snap) => {
      setLotes(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });
    return () => unsubLotes();
  }, []);

  // 2. Carregar animais (Filtro reativo)
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

  // --- SELEÇÃO ---
  const toggleSelect = (id: string) => {
    setSelectedIds(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const toggleSelectAll = () => {
    if (selectedIds.length === animais.length && animais.length > 0) {
      setSelectedIds([]);
    } else {
      setSelectedIds(animais.map(a => a.id));
    }
  };

  const handleBulkDelete = async () => {
    if (!confirm(`Eliminar ${selectedIds.length} registos?`)) return;
    const batch = writeBatch(db);
    selectedIds.forEach(id => batch.delete(doc(db, 'animais', id)));
    await batch.commit();
    setSelectedIds([]);
  };

  // --- IMPORT/EXPORT ---
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (evt) => {
      const bstr = evt.target?.result;
      const wb = XLSX.read(bstr, { type: 'binary', cellDates: true });
      const dataRaw = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]]);
      
      for (const item of dataRaw as any[]) {
        const peso = parseFloat(item.pesoAtual || item.pesoEntrada || 0);
        const dataOriginal = item.dataNascimento || item.dataEntrada || new Date().toISOString().split('T')[0];
        
        await addDoc(collection(db, 'animais'), { 
          loteId: (item.loteId || selectedLote || 'N/A').toString().toUpperCase(),
          brinco: (item.brinco || 'N/A').toString().toUpperCase(),
          raca: (item.raca || 'N/A').toString().toUpperCase(),
          sexo: item.sexo || 'Macho',
          pesoEntrada: isNaN(peso) ? 0 : peso,
          dataEntrada: String(dataOriginal).split('T')[0],
          createdAt: new Date().toISOString() 
        });
      }
    };
    reader.readAsBinaryString(file);
  };

  const exportToExcel = () => {
    const ws = XLSX.utils.json_to_sheet(animais.map(a => ({
      Brinco: a.brinco, 
      Lote: a.loteId, 
      Raça: a.raca, 
      Sexo: a.sexo, 
      Peso: a.pesoEntrada,
      Data: a.dataEntrada 
    })));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Animais");
    XLSX.writeFile(wb, `Fazenda_Kwanza_Inventario.xlsx`);
  };

  const exportToPDF = () => {
    const docPDF = new jsPDF('l', 'mm', 'a4');
    docPDF.setFontSize(18);
    docPDF.text(`Fazenda Kwanza - Rastreio Individual`, 14, 15);
    docPDF.setFontSize(10);
    docPDF.text(`Relatório gerado em: ${new Date().toLocaleDateString()}`, 14, 20);

    autoTable(docPDF, {
      head: [["BRINCO", "LOTE", "RAÇA", "SEXO", "PESO (KG)", "DATA ENTRADA"]],
      body: animais.map(a => [
        a.brinco, 
        a.loteId, 
        a.raca, 
        a.sexo, 
        `${a.pesoEntrada} Kg`,
        // Proteção contra erro de split: converte para string e formata para PT-AO
        a.dataEntrada ? String(a.dataEntrada).split('T')[0].split('-').reverse().join('/') : '---'
      ]),
      startY: 25,
      theme: 'striped',
      headStyles: { fillColor: [6, 182, 212], fontStyle: 'bold' },
      styles: { fontSize: 9 }
    });
    
    docPDF.save(`Relatorio_Kwanza_${selectedLote || 'Geral'}.pdf`);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedLote) return alert("Selecione um lote primeiro!");
    await addDoc(collection(db, 'animais'), {
      ...formData,
      loteId: selectedLote,
      pesoEntrada: parseFloat(formData.pesoEntrada) || 0,
      createdAt: new Date().toISOString()
    });
    setFormData(initialForm);
  };

  // CÁLCULOS
  const pesoTotalLote = animais.reduce((acc, a) => acc + (Number(a.pesoEntrada) || 0), 0);
  const mediaPesoLote = animais.length > 0 ? (pesoTotalLote / animais.length).toFixed(1) : "0";

  return (
    <div className="h-full flex flex-col space-y-4 pb-6 overflow-hidden">
      
      {/* HEADER */}
      <header className="flex flex-col md:flex-row justify-between items-center gap-4 shrink-0 border-b border-slate-800/50 pb-6">
        <div className="flex items-center gap-4">
          <div className="bg-cyan-500/10 p-3 rounded-2xl border border-cyan-500/20">
            <Users className="text-cyan-500" size={28} />
          </div>
          <div>
            <h1 className="text-2xl font-black text-white uppercase tracking-tighter">Identificação Individual</h1>
            <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest italic">Fazenda Kwanza</p>
          </div>
        </div>

        <div className="flex flex-wrap justify-center gap-2 bg-[#161922] p-2 rounded-2xl border border-slate-800">
          {selectedIds.length > 0 && (
            <button onClick={handleBulkDelete} className="bg-red-500/10 text-red-500 px-4 py-2 rounded-xl text-[10px] font-black uppercase border border-red-500/20 hover:bg-red-500/20 transition-all">
              <Trash2 size={14} className="inline mr-2"/> Eliminar ({selectedIds.length})
            </button>
          )}
          <div className="flex items-center gap-3 px-4 border-r border-slate-800/50">
            <Filter size={16} className="text-cyan-500" />
            <select className="bg-transparent text-white font-black text-xs outline-none uppercase cursor-pointer" value={selectedLote} onChange={(e) => setSelectedLote(e.target.value)}>
              <option value="">TODOS OS LOTES</option>
              {lotes.map(l => <option key={l.id} className="bg-[#161922]" value={l.loteId}>{l.loteId}</option>)}
            </select>
          </div>
          <div className="flex gap-1">
            <input type="file" ref={fileInputRef} className="hidden" onChange={handleFileUpload} />
            <button title="Importar Excel" onClick={() => fileInputRef.current?.click()} className="p-2.5 bg-slate-800 rounded-xl text-cyan-400 hover:bg-slate-700 transition-colors"><UploadCloud size={18} /></button>
            <button title="Exportar Excel" onClick={exportToExcel} className="p-2.5 bg-slate-800 rounded-xl text-emerald-400 hover:bg-slate-700 transition-colors"><FileSpreadsheet size={18} /></button>
            <button title="Gerar PDF" onClick={exportToPDF} className="p-2.5 bg-slate-800 rounded-xl text-red-400 hover:bg-slate-700 transition-colors"><FileText size={18} /></button>
          </div>
        </div>
      </header>

      {/* FORMULÁRIO */}
      <div className="bg-[#161922] rounded-[2rem] border border-slate-800/50 p-6 shadow-2xl">
        <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-12 gap-5 items-end">
          <div className="md:col-span-2 space-y-1">
            <label className="text-[9px] font-black text-slate-500 uppercase px-1">Nº Brinco</label>
            <div className="relative">
              <Tag className="absolute left-4 top-3.5 text-slate-600" size={16} />
              <input required className="w-full bg-[#0f121a] border border-slate-800 p-3.5 pl-12 rounded-xl text-white outline-none text-xs font-black uppercase focus:border-cyan-500 transition-all" value={formData.brinco} onChange={e => setFormData({...formData, brinco: e.target.value.toUpperCase()})} />
            </div>
          </div>
          <div className="md:col-span-3 space-y-1">
            <label className="text-[9px] font-black text-slate-500 uppercase px-1">Raça</label>
            <div className="relative">
              <Dna className="absolute left-4 top-3.5 text-slate-600" size={16} />
              <input required className="w-full bg-[#0f121a] border border-slate-800 p-3.5 pl-12 rounded-xl text-white outline-none text-xs font-black uppercase focus:border-cyan-500 transition-all" value={formData.raca} onChange={e => setFormData({...formData, raca: e.target.value.toUpperCase()})} />
            </div>
          </div>
          <div className="md:col-span-2 space-y-1">
            <label className="text-[9px] font-black text-slate-500 uppercase px-1">Sexo</label>
            <select className="w-full bg-[#0f121a] border border-slate-800 p-3.5 rounded-xl text-white outline-none text-xs font-black cursor-pointer focus:border-cyan-500" value={formData.sexo} onChange={e => setFormData({...formData, sexo: e.target.value})}>
              <option value="Macho">MACHO</option>
              <option value="Fêmea">FÊMEA</option>
            </select>
          </div>
          <div className="md:col-span-2 space-y-1">
            <label className="text-[9px] font-black text-emerald-500 uppercase px-1">Peso (Kg)</label>
            <div className="relative">
              <Scale className="absolute left-4 top-3.5 text-emerald-900" size={16} />
              <input type="number" step="0.1" required className="w-full bg-[#0f121a] border border-slate-800 p-3.5 pl-12 rounded-xl text-emerald-500 outline-none text-xs font-black focus:border-emerald-500 transition-all" value={formData.pesoEntrada} onChange={e => setFormData({...formData, pesoEntrada: e.target.value})} />
            </div>
          </div>
          <div className="md:col-span-3 flex gap-2">
            <button type="submit" className="flex-1 bg-cyan-600 hover:bg-cyan-500 text-white font-black text-xs py-4 rounded-xl uppercase flex items-center justify-center gap-2 transition-all shadow-lg shadow-cyan-900/20"><Plus size={18} /> Adicionar</button>
            <button type="button" onClick={() => setFormData(initialForm)} className="bg-slate-800 p-4 rounded-xl text-slate-500 hover:text-white transition-all"><RotateCcw size={18}/></button>
          </div>
        </form>
      </div>

      {/* TABELA */}
      <div className="flex-1 min-h-0 bg-[#161922] rounded-[2.5rem] border border-slate-800/50 shadow-2xl overflow-hidden flex flex-col">
        <div className="overflow-auto flex-1 custom-scrollbar"> 
          <table className="w-full text-left text-[10px] min-w-[800px]">
            <thead className="bg-black/40 text-slate-500 font-black uppercase text-[9px] sticky top-0 z-20 backdrop-blur-md">
              <tr>
                <th className="p-5 w-10 text-center"><button onClick={toggleSelectAll}>{selectedIds.length === animais.length ? <CheckSquare size={18} className="text-cyan-500"/> : <Square size={18}/>}</button></th>
                <th className="p-5">BRINCO / ID</th>
                <th className="p-5">LOTE</th>
                <th className="p-5">RAÇA</th>
                <th className="p-5">SEXO</th>
                <th className="p-5 text-center">PESO</th>
                <th className="p-5 text-center">AÇÕES</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/10">
              {animais.map((a) => (
                <tr key={a.id} className={`transition-colors ${selectedIds.includes(a.id) ? 'bg-cyan-500/5' : 'hover:bg-slate-800/10'}`}>
                  <td className="p-5 text-center"><button onClick={() => toggleSelect(a.id)} className={selectedIds.includes(a.id) ? 'text-cyan-400' : 'text-slate-700'}>{selectedIds.includes(a.id) ? <CheckSquare size={18}/> : <Square size={18}/>}</button></td>
                  <td className="p-5"><span className="px-4 py-2 bg-slate-900 border border-slate-800 rounded-xl font-black text-white">{a.brinco}</span></td>
                  <td className="p-5 font-black text-cyan-500">{a.loteId}</td>
                  <td className="p-5 text-slate-300 font-bold uppercase">{a.raca}</td>
                  <td className="p-5"><span className={`text-[10px] font-black px-3 py-1 rounded-full border ${a.sexo === 'Macho' ? 'text-blue-400 border-blue-400/20' : 'text-pink-400 border-pink-400/20'}`}>{a.sexo.toUpperCase()}</span></td>
                  <td className="p-5 text-emerald-400 font-black text-center">{a.pesoEntrada} Kg</td>
                  <td className="p-5 text-center"><button onClick={() => deleteDoc(doc(db, 'animais', a.id))} className="text-slate-600 hover:text-red-500 transition-colors"><Trash2 size={16}/></button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        
        {/* RODAPÉ ESTATÍSTICO */}
        <div className="p-5 bg-black/40 border-t border-slate-800/50 flex flex-col md:flex-row justify-between items-center px-10 gap-4">
          <div className="flex gap-12">
            <div className="flex flex-col"><span className="text-[9px] font-black text-slate-500 uppercase">Efetivo</span><span className="text-base font-black text-white">{animais.length} Cabeças</span></div>
            <div className="flex flex-col"><span className="text-[9px] font-black text-slate-500 uppercase">Média de Peso</span><span className="text-base font-black text-emerald-400">{mediaPesoLote} Kg</span></div>
            <div className="flex flex-col"><span className="text-[9px] font-black text-slate-500 uppercase">Biomassa Total</span><span className="text-base font-black text-cyan-500">{pesoTotalLote.toFixed(1)} Kg</span></div>
          </div>
          <p className="text-[9px] font-black text-slate-600 uppercase tracking-widest italic">Pigs-Rent Pro • Sistema de Gestão Suína</p>
        </div>
      </div>
    </div>
  );
}
