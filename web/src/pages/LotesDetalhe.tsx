import { useState, useEffect, useRef } from 'react';
import { db } from '../lib/firebase';
import { collection, addDoc, onSnapshot, query, where, deleteDoc, doc, orderBy } from 'firebase/firestore';
import { 
  Users, Plus, Trash2, Tag, Scale, Dna, Filter, Check, 
  UploadCloud, FileSpreadsheet, FileText, RotateCcw 
} from 'lucide-react';

import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export default function LotesDetalhePage() {
  const [animais, setAnimais] = useState<any[]>([]);
  const [lotes, setLotes] = useState<any[]>([]);
  const [selectedLote, setSelectedLote] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const initialForm = {
    brinco: '',
    raca: '',
    sexo: 'Macho',
    pesoEntrada: '',
    dataEntrada: new Date().toISOString().split('T')[0]
  };

  const [formData, setFormData] = useState(initialForm);

  // 1. Carregar lista de lotes para o filtro
  useEffect(() => {
    const unsubLotes = onSnapshot(collection(db, 'lotes'), (snap) => {
      setLotes(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });
    return () => unsubLotes();
  }, []);

  // 2. Carregar animais (reativo ao filtro de lote)
  useEffect(() => {
    let q = query(collection(db, 'animais'), orderBy('brinco', 'asc'));
    if (selectedLote) {
      q = query(collection(db, 'animais'), where('loteId', '==', selectedLote));
    }
    const unsubAnimais = onSnapshot(q, (snap) => {
      setAnimais(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });
    return () => unsubAnimais();
  }, [selectedLote]);

  const exportToExcel = () => {
    const ws = XLSX.utils.json_to_sheet(animais.map(a => ({
      Brinco: a.brinco,
      Lote: a.loteId,
      Raça: a.raca,
      Sexo: a.sexo,
      'Peso Entrada (Kg)': a.pesoEntrada,
      'Data Entrada': a.dataEntrada
    })));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Animais");
    XLSX.writeFile(wb, `Animais_Kwanza_${selectedLote || 'Geral'}.xlsx`);
  };

  const exportToPDF = () => {
    const docPDF = new jsPDF('l', 'mm', 'a4');
    docPDF.text(`AgroRent - Identificação Individual (${selectedLote || 'Geral'})`, 14, 15);
    autoTable(docPDF, {
      head: [["BRINCO", "LOTE", "RAÇA", "SEXO", "PESO ENTRADA", "DATA"]],
      body: animais.map(a => [a.brinco, a.loteId, a.raca, a.sexo, `${a.pesoEntrada} Kg`, a.dataEntrada]),
      startY: 22,
      headStyles: { fillColor: [6, 182, 212] }
    });
    docPDF.save(`Relatorio_Animais.pdf`);
  };

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
            brinco: (item.brinco || 'N/A').toString().toUpperCase(),
            raca: (item.raca || 'N/A').toString().toUpperCase(),
            sexo: item.sexo || 'Macho',
            pesoEntrada: parseFloat(item.pesoEntrada) || 0,
            dataEntrada: item.dataEntrada instanceof Date ? item.dataEntrada.toISOString().split('T')[0] : (item.dataEntrada || new Date().toISOString().split('T')[0]),
            createdAt: new Date().toISOString() 
          });
        }
      } catch (err) { console.error(err); }
    };
    reader.readAsBinaryString(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedLote) { alert("Selecione um lote primeiro!"); return; }
    await addDoc(collection(db, 'animais'), {
      ...formData,
      loteId: selectedLote,
      pesoEntrada: parseFloat(formData.pesoEntrada),
      createdAt: new Date().toISOString()
    });
    setFormData(initialForm);
  };

  const pesoTotalLote = animais.reduce((acc, a) => acc + (Number(a.pesoEntrada) || 0), 0);
  const mediaPesoLote = animais.length > 0 ? (pesoTotalLote / animais.length).toFixed(1) : "0";

  return (
    <div className="h-full flex flex-col space-y-4 pb-24 md:pb-6 overflow-hidden">
      
      {/* HEADER DINÂMICO */}
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 shrink-0 border-b border-slate-800/50 pb-6">
        <div className="flex items-center gap-4">
          <div className="bg-cyan-500/10 p-3 rounded-2xl border border-cyan-500/20 shadow-inner">
            <Users className="text-cyan-500" size={28} />
          </div>
          <div>
            <h1 className="text-2xl md:text-3xl font-black text-white uppercase tracking-tighter leading-none">Identificação Individual</h1>
            <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mt-1 italic">Rastreio por Brinco</p>
          </div>
        </div>

        <div className="flex flex-wrap gap-2 w-full md:w-auto bg-[#161922] p-2 rounded-2xl border border-slate-800 shadow-xl">
          <div className="flex items-center gap-3 px-4 border-r border-slate-800/50 mr-2">
            <Filter size={16} className="text-cyan-500" />
            <select 
              className="bg-transparent text-white font-black text-xs outline-none uppercase cursor-pointer"
              value={selectedLote}
              onChange={(e) => setSelectedLote(e.target.value)}
            >
              <option value="">FILTRAR LOTE</option>
              {lotes.map(l => <option key={l.id} className="bg-[#161922]" value={l.loteId}>{l.loteId}</option>)}
            </select>
          </div>

          <div className="flex gap-1 flex-1 md:flex-none">
            <input type="file" ref={fileInputRef} className="hidden" onChange={handleFileUpload} />
            <button onClick={() => fileInputRef.current?.click()} className="p-2.5 bg-slate-800 rounded-xl hover:bg-slate-700 transition-all active:scale-95 text-cyan-400">
              <UploadCloud size={18} />
            </button>
            <button onClick={exportToExcel} className="p-2.5 bg-slate-800 rounded-xl hover:bg-slate-700 transition-all active:scale-95 text-emerald-400">
              <FileSpreadsheet size={18} />
            </button>
            <button onClick={exportToPDF} className="p-2.5 bg-slate-800 rounded-xl hover:bg-slate-700 transition-all active:scale-95 text-red-400">
              <FileText size={18} />
            </button>
          </div>
        </div>
      </header>

      {/* FORMULÁRIO DE ENTRADA RÁPIDA */}
      <div className="bg-[#161922] rounded-[2rem] border border-slate-800/50 p-6 md:p-8 shrink-0 shadow-2xl">
        <form onSubmit={handleSubmit} className="flex flex-col md:grid md:grid-cols-12 gap-5 items-end">
          <div className="md:col-span-2 space-y-1 w-full">
            <label className="text-[9px] font-black text-slate-500 uppercase px-1">Nº Brinco</label>
            <div className="relative">
              <Tag className="absolute left-4 top-3.5 text-slate-600" size={16} />
              <input required className="w-full bg-[#0f121a] border border-slate-800 p-3.5 pl-12 rounded-xl text-white outline-none text-xs font-black focus:border-cyan-500/50 transition-colors uppercase" placeholder="TAG ID" value={formData.brinco} onChange={e => setFormData({...formData, brinco: e.target.value.toUpperCase()})} />
            </div>
          </div>

          <div className="md:col-span-3 space-y-1 w-full">
            <label className="text-[9px] font-black text-slate-500 uppercase px-1">Raça / Linhagem</label>
            <div className="relative">
              <Dna className="absolute left-4 top-3.5 text-slate-600" size={16} />
              <input required className="w-full bg-[#0f121a] border border-slate-800 p-3.5 pl-12 rounded-xl text-white outline-none text-xs font-black uppercase" placeholder="EX: LANDRACE" value={formData.raca} onChange={e => setFormData({...formData, raca: e.target.value.toUpperCase()})} />
            </div>
          </div>

          <div className="grid grid-cols-2 md:col-span-4 gap-4 w-full">
            <div className="space-y-1">
              <label className="text-[9px] font-black text-slate-500 uppercase px-1">Sexo</label>
              <select className="w-full bg-[#0f121a] border border-slate-800 p-3.5 rounded-xl text-white outline-none text-xs font-black appearance-none" value={formData.sexo} onChange={e => setFormData({...formData, sexo: e.target.value})}>
                <option value="Macho">MACHO</option>
                <option value="Fêmea">FÊMEA</option>
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-[9px] font-black text-emerald-500 uppercase px-1">Peso Inicial (Kg)</label>
              <div className="relative">
                <Scale className="absolute left-4 top-3.5 text-emerald-900" size={16} />
                <input type="number" step="0.1" required className="w-full bg-[#0f121a] border border-slate-800 p-3.5 pl-12 rounded-xl text-emerald-500 outline-none text-xs font-black" value={formData.pesoEntrada} onChange={e => setFormData({...formData, pesoEntrada: e.target.value})} />
              </div>
            </div>
          </div>

          <div className="md:col-span-3 flex gap-2 w-full">
            <button type="submit" className="flex-1 bg-cyan-600 hover:bg-cyan-500 text-white font-black text-xs py-4 rounded-xl transition-all shadow-lg uppercase flex items-center justify-center gap-2 active:scale-95">
              <Plus size={18} /> Adicionar
            </button>
            <button type="button" onClick={() => setFormData(initialForm)} className="bg-slate-800 p-4 rounded-xl hover:text-white transition-all text-slate-500">
              <RotateCcw size={18}/>
            </button>
          </div>
        </form>
      </div>

      {/* TABELA DE RASTREIO COM SCROLL */}
      <div className="flex-1 min-h-0 bg-[#161922] rounded-3xl md:rounded-[2.5rem] border border-slate-800/50 shadow-2xl overflow-hidden flex flex-col">
        <div className="overflow-x-auto overflow-y-auto flex-1 custom-scrollbar"> 
          <table className="w-full text-left text-[10px] min-w-[900px] border-separate border-spacing-0">
            <thead className="bg-black/40 text-slate-500 font-black uppercase text-[9px] sticky top-0 z-20 backdrop-blur-md">
              <tr>
                <th className="p-5 border-b border-slate-800/50">BRINCO / ID</th>
                <th className="p-5 border-b border-slate-800/50">LOTE</th>
                <th className="p-5 border-b border-slate-800/50">RAÇA</th>
                <th className="p-5 border-b border-slate-800/50">SEXO</th>
                <th className="p-5 border-b border-slate-800/50 text-center">PESO ENTRADA</th>
                <th className="p-5 border-b border-slate-800/50">DATA REGISTO</th>
                <th className="p-5 border-b border-slate-800/50 text-center">AÇÕES</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/20">
              {animais.map((a) => (
                <tr key={a.id} className="hover:bg-slate-800/10 transition-colors group">
                  <td className="p-5">
                    <span className="bg-slate-900 text-white px-4 py-2 rounded-xl font-black text-sm border border-slate-800 group-hover:border-cyan-500 transition-colors shadow-inner">
                      {a.brinco}
                    </span>
                  </td>
                  <td className="p-5 font-black text-cyan-500 uppercase tracking-tighter text-sm">{a.loteId}</td>
                  <td className="p-5 text-slate-300 font-bold uppercase text-xs">{a.raca}</td>
                  <td className="p-5">
                    <span className={`text-[10px] font-black px-3 py-1 rounded-full border ${a.sexo === 'Macho' ? 'text-blue-400 border-blue-400/20 bg-blue-400/5' : 'text-pink-400 border-pink-400/20 bg-pink-400/5'}`}>
                      {a.sexo.toUpperCase()}
                    </span>
                  </td>
                  <td className="p-5 text-emerald-400 font-black text-center text-sm">{a.pesoEntrada} <span className="text-[9px] opacity-50">KG</span></td>
                  <td className="p-5 text-slate-500 font-bold text-xs">{a.dataEntrada?.split('-').reverse().join('/')}</td>
                  <td className="p-5 text-center">
                    <button onClick={() => { if(confirm('Eliminar registo individual?')) deleteDoc(doc(db, 'animais', a.id)) }} className="p-2.5 bg-slate-800/50 rounded-lg text-slate-600 hover:text-red-500 transition-all">
                      <Trash2 size={16}/>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        
        {/* RODAPÉ ESTATÍSTICO */}
        <div className="p-5 bg-black/40 border-t border-slate-800/50 flex justify-between items-center px-10 shrink-0">
          <div className="flex gap-12">
            <div className="flex flex-col">
              <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Efetivo Filtrado</span>
              <span className="text-base font-black text-white">{animais.length} Cabeças</span>
            </div>
            <div className="flex flex-col">
              <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Média de Peso (Entrada)</span>
              <span className="text-base font-black text-emerald-400">
                {mediaPesoLote} Kg
              </span>
            </div>
            <div className="flex flex-col">
              <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Biomassa Total</span>
              <span className="text-base font-black text-cyan-500">
                {pesoTotalLote.toFixed(1)} Kg
              </span>
            </div>
          </div>
          <div className="hidden md:flex items-center gap-3 text-slate-500 text-[10px] font-black uppercase tracking-[0.2em] opacity-40">
            <Check size={16} className="text-emerald-500" /> Base de Dados Segura
          </div>
        </div>
      </div>
    </div>
  );
}
