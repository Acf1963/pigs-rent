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

  // --- EXPORTAÇÃO EXCEL ---
  const exportToExcel = () => {
    const dataToExport = animais.map(a => ({
      Brinco: a.brinco,
      Lote: a.loteId,
      Raça: a.raca,
      Sexo: a.sexo,
      'Peso Entrada (Kg)': a.pesoEntrada,
      'Data Entrada': a.dataEntrada
    }));
    const ws = XLSX.utils.json_to_sheet(dataToExport);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Animais");
    XLSX.writeFile(wb, `Inventario_Animais_${selectedLote || 'Geral'}.xlsx`);
  };

  // --- EXPORTAÇÃO PDF COM RESUMO ---
  const exportToPDF = () => {
    const docPDF = new jsPDF('l', 'mm', 'a4');
    const totalAnimais = animais.length;
    const pesoTotal = animais.reduce((acc, a) => acc + (a.pesoEntrada || 0), 0);
    const mediaPeso = totalAnimais > 0 ? (pesoTotal / totalAnimais).toFixed(1) : 0;

    docPDF.setFontSize(18);
    docPDF.setTextColor(15, 23, 42);
    docPDF.text("AGRORENT - GESTÃO FAZENDA KWANZA", 14, 15);
    
    docPDF.setFontSize(10);
    docPDF.setTextColor(100, 100, 100);
    docPDF.text(`Identificação Individual | Lote: ${selectedLote || 'TODOS'}`, 14, 22);
    docPDF.text(`Data: ${new Date().toLocaleDateString('pt-AO')}`, 250, 22);

    autoTable(docPDF, {
      head: [["BRINCO", "LOTE", "RAÇA", "SEXO", "PESO ENTRADA", "DATA ENTRADA"]],
      body: animais.map(a => [
        a.brinco, 
        a.loteId, 
        a.raca, 
        a.sexo.toUpperCase(), 
        `${a.pesoEntrada} Kg`, 
        a.dataEntrada?.split('-').reverse().join('/')
      ]),
      startY: 30,
      headStyles: { fillColor: [6, 182, 212], textColor: [255, 255, 255] },
      alternateRowStyles: { fillColor: [245, 247, 250] }
    });

    // Inclusão do Resumo no Final do PDF
    const finalY = (docPDF as any).lastAutoTable.finalY + 15;
    docPDF.setFillColor(240, 253, 250);
    docPDF.rect(14, finalY, 269, 15, 'F');
    docPDF.setFont("helvetica", "bold");
    docPDF.setTextColor(15, 23, 42);
    docPDF.text(`TOTAL: ${totalAnimais} CABEÇAS   |   PESO ACUMULADO: ${pesoTotal.toFixed(1)} KG   |   MÉDIA: ${mediaPeso} KG`, 20, finalY + 9);

    docPDF.save(`Relatorio_Animais_${selectedLote || 'Geral'}.pdf`);
  };

  // --- IMPORTAÇÃO EXCEL ---
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
            dataEntrada: item.dataEntrada instanceof Date ? 
                         item.dataEntrada.toISOString().split('T')[0] : 
                         (item.dataEntrada || new Date().toISOString().split('T')[0]),
            createdAt: new Date().toISOString() 
          });
        }
      } catch (err) { console.error("Erro no processamento:", err); }
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

  return (
    <div className="h-full flex flex-col space-y-4 overflow-hidden text-white">
      {/* HEADER: Fixo */}
      <header className="flex justify-between items-center shrink-0">
        <div className="flex items-center gap-3">
          <div className="bg-cyan-500/20 p-2 rounded-lg border border-cyan-500/30">
            <Users className="text-cyan-400" size={32} />
          </div>
          <div>
            <h1 className="text-3xl font-black uppercase tracking-tighter">Identificação</h1>
            <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Controlo Individual de Animais</p>
          </div>
        </div>

        <div className="flex gap-2 bg-[#161922] p-1.5 rounded-2xl border border-slate-800 shadow-xl">
          <div className="flex items-center gap-2 px-3 border-r border-slate-800 mr-2">
            <Filter size={14} className="text-slate-500" />
            <select 
              className="bg-transparent text-cyan-400 font-black text-[10px] outline-none uppercase cursor-pointer"
              value={selectedLote}
              onChange={(e) => setSelectedLote(e.target.value)}
            >
              <option value="">TODOS OS LOTES</option>
              {lotes.map(l => <option key={l.id} value={l.loteId}>{l.loteId}</option>)}
            </select>
          </div>

          <input type="file" ref={fileInputRef} className="hidden" onChange={handleFileUpload} />
          <button onClick={() => fileInputRef.current?.click()} className="bg-[#1e293b] text-slate-300 px-4 py-2 rounded-xl text-[10px] font-black uppercase flex items-center gap-2 hover:bg-slate-800 border border-slate-700/50 transition-all">
            <UploadCloud size={14} className="text-cyan-500" /> Importar
          </button>
          <button onClick={exportToExcel} className="bg-[#1e293b] text-slate-300 px-4 py-2 rounded-xl text-[10px] font-black uppercase flex items-center gap-2 hover:bg-slate-800 border border-slate-700/50 transition-all">
            <FileSpreadsheet size={14} className="text-emerald-400" /> Excel
          </button>
          <button onClick={exportToPDF} className="bg-[#1e293b] text-slate-300 px-4 py-2 rounded-xl text-[10px] font-black uppercase flex items-center gap-2 hover:bg-slate-800 border border-slate-700/50 transition-all">
            <FileText size={14} className="text-red-400" /> PDF
          </button>
        </div>
      </header>

      {/* FORMULÁRIO: Fixo */}
      <div className="bg-[#161922] rounded-[2rem] border border-slate-800/50 p-6 shrink-0 shadow-2xl">
        <form onSubmit={handleSubmit} className="grid grid-cols-12 gap-4 items-end">
          <div className="col-span-2 space-y-1">
            <label className="text-[8px] font-black text-slate-500 uppercase px-1">Nº Brinco</label>
            <div className="relative">
              <Tag className="absolute left-3 top-3 text-slate-600" size={14} />
              <input required className="w-full bg-[#0f121a] border border-slate-800 p-2.5 pl-9 rounded-xl text-white outline-none text-[10px] font-bold" placeholder="EX: 1024" value={formData.brinco} onChange={e => setFormData({...formData, brinco: e.target.value.toUpperCase()})} />
            </div>
          </div>
          <div className="col-span-3 space-y-1">
            <label className="text-[8px] font-black text-slate-500 uppercase px-1">Raça / Linhagem</label>
            <div className="relative">
              <Dna className="absolute left-3 top-3 text-slate-600" size={14} />
              <input required className="w-full bg-[#0f121a] border border-slate-800 p-2.5 pl-9 rounded-xl text-white outline-none text-[10px] font-bold uppercase" placeholder="EX: NELORE" value={formData.raca} onChange={e => setFormData({...formData, raca: e.target.value.toUpperCase()})} />
            </div>
          </div>
          <div className="col-span-2 space-y-1">
            <label className="text-[8px] font-black text-slate-500 uppercase px-1">Sexo</label>
            <select className="w-full bg-[#0f121a] border border-slate-800 p-2.5 rounded-xl text-white outline-none text-[10px] font-bold" value={formData.sexo} onChange={e => setFormData({...formData, sexo: e.target.value})}>
              <option value="Macho">MACHO</option>
              <option value="Fêmea">FÊMEA</option>
            </select>
          </div>
          <div className="col-span-2 space-y-1">
            <label className="text-[8px] font-black text-emerald-500 uppercase px-1">Peso Entrada (Kg)</label>
            <div className="relative">
              <Scale className="absolute left-3 top-3 text-emerald-900" size={14} />
              <input type="number" step="0.1" required className="w-full bg-[#0f121a] border border-slate-800 p-2.5 pl-9 rounded-xl text-emerald-500 outline-none text-[10px] font-bold" value={formData.pesoEntrada} onChange={e => setFormData({...formData, pesoEntrada: e.target.value})} />
            </div>
          </div>
          <div className="col-span-3 flex gap-2">
            <button type="submit" className="flex-1 bg-cyan-600 hover:bg-cyan-500 text-white font-black text-[10px] py-3 rounded-xl transition-all shadow-lg uppercase flex items-center justify-center gap-2">
              <Plus size={16} /> Adicionar
            </button>
            <button type="button" onClick={() => setFormData(initialForm)} className="bg-slate-800 p-3 rounded-xl hover:text-white transition-all text-slate-400">
              <RotateCcw size={16}/>
            </button>
          </div>
        </form>
      </div>

      {/* TABELA COM SCROLL INTERNO */}
      <div className="flex-1 min-h-0 bg-[#161922] rounded-[2rem] border border-slate-800/50 shadow-2xl overflow-hidden flex flex-col">
        <div className="overflow-x-auto overflow-y-auto flex-1 custom-scrollbar"> 
          <table className="w-full text-left text-[10px] min-w-[900px] border-collapse">
            <thead className="bg-[#1e293b] text-slate-400 font-black uppercase text-[8px] sticky top-0 z-20">
              <tr>
                <th className="p-4 border-b border-slate-700/50">BRINCO</th>
                <th className="p-4 border-b border-slate-700/50">LOTE ATUAL</th>
                <th className="p-4 border-b border-slate-700/50">RAÇA</th>
                <th className="p-4 border-b border-slate-700/50">SEXO</th>
                <th className="p-4 border-b border-slate-700/50 text-center">PESO INICIAL</th>
                <th className="p-4 border-b border-slate-700/50">DATA ENTRADA</th>
                <th className="p-4 border-b border-slate-700/50 text-center">AÇÕES</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/30">
              {animais.map((a) => (
                <tr key={a.id} className="hover:bg-slate-800/20 h-[55px] transition-colors group">
                  <td className="p-4"><span className="bg-slate-800 text-white px-3 py-1.5 rounded-lg font-black text-xs border border-slate-700 group-hover:border-cyan-500 transition-colors">{a.brinco}</span></td>
                  <td className="p-4 font-black text-cyan-500 uppercase">{a.loteId}</td>
                  <td className="p-4 text-slate-300 font-medium uppercase">{a.raca}</td>
                  <td className="p-4">
                    <span className={`text-[9px] font-black px-2 py-1 rounded-full border ${a.sexo === 'Macho' ? 'text-blue-400 border-blue-400/20 bg-blue-400/5' : 'text-pink-400 border-pink-400/20 bg-pink-400/5'}`}>
                      {a.sexo.toUpperCase()}
                    </span>
                  </td>
                  <td className="p-4 text-emerald-400 font-black text-center text-[11px]">{a.pesoEntrada} Kg</td>
                  <td className="p-4 text-slate-500 font-bold">{a.dataEntrada?.split('-').reverse().join('/')}</td>
                  <td className="p-4 text-center">
                    <button onClick={() => { if(confirm('Remover?')) deleteDoc(doc(db, 'animais', a.id)) }} className="text-slate-600 hover:text-red-500 p-2 transition-colors">
                      <Trash2 size={16}/>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        
        {/* RESUMO FIXO NO RODAPÉ */}
        <div className="p-4 bg-black/40 border-t border-slate-800/50 flex justify-between items-center shrink-0">
          <div className="flex gap-10">
            <div className="flex flex-col">
              <span className="text-[8px] font-black text-slate-500 uppercase tracking-widest">Total Animais</span>
              <span className="text-sm font-black text-white">{animais.length} Cabeças</span>
            </div>
            <div className="flex flex-col">
              <span className="text-[8px] font-black text-slate-500 uppercase tracking-widest">Média Peso Entrada</span>
              <span className="text-sm font-black text-emerald-400">
                {animais.length > 0 ? (animais.reduce((acc, a) => acc + (a.pesoEntrada || 0), 0) / animais.length).toFixed(1) : 0} Kg
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2 text-slate-500 text-[10px] font-black uppercase tracking-widest opacity-50">
            <Check size={14} className="text-emerald-500" /> Sincronizado
          </div>
        </div>
      </div>
    </div>
  );
}
