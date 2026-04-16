import { useState, useEffect, useRef } from 'react';
import { db } from '../lib/firebase';
import { 
  collection, addDoc, onSnapshot, query, 
  deleteDoc, doc, orderBy, writeBatch 
} from 'firebase/firestore';
import { 
  Users, Plus, Trash2, Search,
  UploadCloud, FileSpreadsheet, FileText, Square, CheckSquare, Scale, Tag, Layers
} from 'lucide-react';

import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';

interface Animal {
  id?: string;
  loteId: string;
  brinco: string;
  raca: string;
  sexo: string;
  pesoAtual: number;
  dataNascimento: string;
  createdAt?: string;
}

export default function LotesDetalhePage() {
  const [animais, setAnimais] = useState<Animal[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [importHistory, setImportHistory] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const initialForm: Animal = {
    loteId: '',
    brinco: '',
    raca: '',
    sexo: 'FÊMEA',
    pesoAtual: 0,
    dataNascimento: new Date().toISOString().split('T')[0]
  };

  const [formData, setFormData] = useState(initialForm);

  useEffect(() => {
    const q = query(collection(db, 'animais'), orderBy('brinco', 'asc'));
    const unsubAnimais = onSnapshot(q, (snap) => {
      const data = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Animal));
      setAnimais(data);
      setSelectedIds([]); 
    });
    return () => unsubAnimais();
  }, []);

  const formatExcelDate = (value: any) => {
    if (!value) return '';
    if (typeof value === 'number') {
      const date = new Date((value - 25569) * 86400 * 1000);
      return date.toISOString().split('T')[0];
    }
    return String(value);
  };

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (importHistory.includes(file.name)) {
      alert(`O ficheiro "${file.name}" já foi importado nesta sessão.`);
      return;
    }

    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: 'binary', cellDates: true });
        const data: any[] = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]]);
        const batch = writeBatch(db);
        let countImportados = 0;

        data.forEach((row: any) => {
          const brincoLimpo = String(row.brinco || '').toUpperCase();
          if (!animais.some(a => a.brinco === brincoLimpo) && brincoLimpo !== '') {
            const animalRef = doc(collection(db, 'animais'));
            batch.set(animalRef, {
              loteId: String(row.loteId || '').toUpperCase(),
              brinco: brincoLimpo,
              raca: String(row.raca || '').toUpperCase(),
              sexo: String(row.sexo || 'FÊMEA').toUpperCase(),
              pesoAtual: parseFloat(row.pesoAtual) || 0,
              dataNascimento: formatExcelDate(row.dataNascimento),
              createdAt: new Date().toISOString()
            });
            countImportados++;
          }
        });

        if (countImportados > 0) {
          await batch.commit();
          setImportHistory(prev => [...prev, file.name]);
          alert(`Importação concluída: ${countImportados} animais.`);
        }
      } catch (err) { alert("Erro ao ler o ficheiro."); }
    };
    reader.readAsBinaryString(file);
  };

  const filteredAnimais = animais.filter(a => 
    (a.brinco?.toLowerCase() || '').includes(searchTerm.toLowerCase()) || 
    (a.loteId?.toLowerCase() || '').includes(searchTerm.toLowerCase())
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (animais.some(a => a.brinco === formData.brinco.toUpperCase())) {
      alert("Erro: Este brinco já está registado.");
      return;
    }
    await addDoc(collection(db, 'animais'), {
      ...formData,
      loteId: formData.loteId.toUpperCase(),
      brinco: formData.brinco.toUpperCase(),
      pesoAtual: Number(formData.pesoAtual) || 0,
      createdAt: new Date().toISOString()
    });
    setFormData(initialForm);
  };

  const exportToExcel = () => {
    const ws = XLSX.utils.json_to_sheet(filteredAnimais.map(a => ({
      Lote: a.loteId, Brinco: a.brinco, Raca: a.raca, 
      Sexo: a.sexo, Peso: a.pesoAtual, Nascimento: a.dataNascimento
    })));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Animais");
    XLSX.writeFile(wb, "Efetivo_Fazenda.xlsx");
  };

  const exportToPDF = () => {
    const docPDF = new jsPDF('l', 'mm', 'a4');
    autoTable(docPDF, {
      head: [["LOTE ID", "BRINCO", "RAÇA", "SEXO", "PESO", "DATA NASC."]],
      body: filteredAnimais.map(a => [a.loteId, a.brinco, a.raca, a.sexo, `${a.pesoAtual} Kg`, a.dataNascimento]),
      headStyles: { fillColor: [6, 182, 212] }
    });
    docPDF.save("Relatorio_Animais.pdf");
  };

  // CÁLCULOS
  const bovinos = animais.filter(a => a.loteId?.toUpperCase().includes('-B'));
  const suinos = animais.filter(a => a.loteId?.toUpperCase().includes('-S'));
  const lotesUnicosBovinos = new Set(bovinos.map(a => a.loteId)).size;
  const lotesUnicosSuinos = new Set(suinos.map(a => a.loteId)).size;

  const calcularMedia = (lista: Animal[]) => 
    lista.length > 0 ? (lista.reduce((acc, a) => acc + (a.pesoAtual || 0), 0) / lista.length).toFixed(1) : "0.0";

  return (
    <div className="h-[calc(100vh-110px)] flex flex-col space-y-4 overflow-hidden p-2">
      <header className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 shrink-0">
        <div className="flex items-center gap-3">
          <Users className="text-cyan-500" size={28} />
          <h1 className="text-2xl font-black text-white uppercase tracking-tight">GESTÃO DE EFETIVO</h1>
        </div>

        <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto">
          <div className="relative flex-1 lg:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
            <input 
              placeholder="PESQUISAR BRINCO OU LOTE..." 
              className="w-full bg-[#161922] border border-slate-800 pl-10 pr-4 py-2 rounded-xl text-[10px] font-bold text-white outline-none focus:border-cyan-500"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="flex gap-2 w-full sm:w-auto">
            <input type="file" ref={fileInputRef} className="hidden" accept=".xlsx, .xls" onChange={handleImport} />
            <button onClick={() => fileInputRef.current?.click()} className="flex-1 bg-[#1a202e] border border-slate-800 px-4 py-2 rounded-lg text-[10px] font-black text-slate-300 flex items-center justify-center gap-2 hover:bg-slate-800 transition-colors">
              <UploadCloud size={14} className="text-emerald-500" /> IMPORTAR
            </button>
            <button onClick={exportToExcel} className="flex-1 bg-[#1a202e] border border-slate-800 px-4 py-2 rounded-lg text-[10px] font-black text-slate-300 flex items-center justify-center gap-2 hover:bg-slate-800 transition-colors">
              <FileSpreadsheet size={14} className="text-cyan-400" /> EXCEL
            </button>
            <button onClick={exportToPDF} className="flex-1 bg-[#1a202e] border border-slate-800 px-4 py-2 rounded-lg text-[10px] font-black text-slate-300 flex items-center justify-center gap-2 hover:bg-slate-800 transition-colors">
              <FileText size={14} className="text-red-400" /> PDF
            </button>
          </div>
        </div>
      </header>

      {/* FORMULÁRIO */}
      <div className="bg-[#161922] rounded-2xl border border-slate-800/50 p-4 shrink-0 shadow-lg">
        <form onSubmit={handleSubmit} className="grid grid-cols-2 md:flex md:flex-nowrap gap-3 items-end">
          <div className="space-y-1 flex-1">
            <label className="text-[9px] font-black text-slate-500 uppercase px-1">Lote ID</label>
            <input required placeholder="EX: FQ-2026-S01" className="w-full bg-[#0d0f14] border border-slate-800 p-2.5 rounded-lg text-white text-xs font-bold outline-none uppercase focus:border-cyan-500" value={formData.loteId} onChange={e => setFormData({...formData, loteId: e.target.value.toUpperCase()})} />
          </div>
          <div className="space-y-1 flex-1">
            <label className="text-[9px] font-black text-slate-500 uppercase px-1">Brinco</label>
            <input required className="w-full bg-[#0d0f14] border border-slate-800 p-2.5 rounded-lg text-white text-xs font-bold outline-none uppercase focus:border-cyan-500" value={formData.brinco} onChange={e => setFormData({...formData, brinco: e.target.value.toUpperCase()})} />
          </div>
          <div className="space-y-1 flex-1">
            <label className="text-[9px] font-black text-slate-500 uppercase px-1">Raça</label>
            <input required className="w-full bg-[#0d0f14] border border-slate-800 p-2.5 rounded-lg text-white text-xs font-bold outline-none uppercase focus:border-cyan-500" value={formData.raca} onChange={e => setFormData({...formData, raca: e.target.value.toUpperCase()})} />
          </div>
          <div className="space-y-1 w-24">
            <label className="text-[9px] font-black text-slate-500 uppercase px-1 text-center block">Peso (Kg)</label>
            <input type="number" step="0.1" required className="w-full bg-[#0d0f14] border border-slate-800 p-2.5 rounded-lg text-white text-xs font-bold outline-none text-center" value={formData.pesoAtual || ''} onChange={e => setFormData({...formData, pesoAtual: Number(e.target.value)})} />
          </div>
          <div className="space-y-1 flex-1">
            <label className="text-[9px] font-black text-slate-500 uppercase px-1">Nascimento</label>
            <input type="date" required className="w-full bg-[#0d0f14] border border-slate-800 p-2.5 rounded-lg text-white text-xs font-bold outline-none focus:border-cyan-500" value={formData.dataNascimento} onChange={e => setFormData({...formData, dataNascimento: e.target.value})} />
          </div>
          <button type="submit" className="bg-cyan-600 hover:bg-cyan-500 text-white font-black text-[10px] px-6 py-3 rounded-lg uppercase flex items-center gap-2 transition-all">
            <Plus size={16} /> Gravar
          </button>
        </form>
      </div>

      {/* TABELA */}
      <div className="bg-[#161922] rounded-2xl border border-slate-800/50 shadow-2xl flex flex-col flex-1 min-h-0 overflow-hidden">
        <div className="overflow-y-auto flex-1 custom-scrollbar overflow-x-auto"> 
          <table className="w-full text-left text-[11px] border-separate border-spacing-0 min-w-[1000px]">
            <thead className="bg-[#11141d] text-slate-500 font-black uppercase text-[9px] sticky top-0 z-10">
              <tr>
                <th className="p-4 border-b border-slate-800/50 w-10 text-center">
                   <button onClick={() => setSelectedIds(selectedIds.length === filteredAnimais.length ? [] : filteredAnimais.map(a => a.id!))}>
                    {selectedIds.length === filteredAnimais.length && filteredAnimais.length > 0 ? <CheckSquare size={16} className="text-cyan-500"/> : <Square size={16}/>}
                   </button>
                </th>
                <th className="p-4 border-b border-slate-800/50">LOTE ID</th>
                <th className="p-4 border-b border-slate-800/50">BRINCO</th>
                <th className="p-4 border-b border-slate-800/50">RAÇA</th>
                <th className="p-4 border-b border-slate-800/50">SEXO</th>
                <th className="p-4 border-b border-slate-800/50 text-center">PESO ATUAL</th>
                <th className="p-4 border-b border-slate-800/50">NASCIMENTO</th>
                <th className="p-4 border-b border-slate-800/50 text-center">AÇÕES</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/20">
              {filteredAnimais.map((a) => {
                const isSelected = selectedIds.includes(a.id!);
                return (
                  <tr key={a.id} className={`${isSelected ? 'bg-cyan-500/5' : ''} hover:bg-cyan-500/[0.02] transition-colors group`}>
                    <td className="p-4 text-center">
                      <button onClick={() => setSelectedIds(prev => prev.includes(a.id!) ? prev.filter(id => id !== a.id) : [...prev, a.id!])}>
                        {isSelected ? <CheckSquare size={16} className="text-cyan-500"/> : <Square size={16} className="text-slate-700"/>}
                      </button>
                    </td>
                    <td className="p-4 font-black text-cyan-500 uppercase">{a.loteId}</td>
                    <td className="p-4 text-white font-bold uppercase"><Tag size={10} className="inline mr-1 text-slate-500" />{a.brinco}</td>
                    <td className="p-4 text-slate-400 font-bold uppercase">{a.raca}</td>
                    <td className="p-4 text-slate-500 font-bold uppercase">{a.sexo}</td>
                    <td className="p-4 text-center text-white font-black">{a.pesoAtual} Kg</td>
                    <td className="p-4 text-slate-500 font-bold uppercase">{a.dataNascimento}</td>
                    <td className="p-4 text-center">
                      <button onClick={() => { if(confirm('Eliminar registo?')) deleteDoc(doc(db, 'animais', a.id!)) }} className="text-slate-600 hover:text-red-500 transition-colors">
                        <Trash2 size={16}/>
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* RODAPÉ COM TEXTO AUMENTADO */}
        <div className="p-6 bg-[#0d0f14] border-t border-slate-800/50 flex flex-col md:flex-row gap-8 px-8 items-center shrink-0">
          
          {/* TOTAL GERAL */}
          <div className="flex items-center gap-5 pr-8 border-r border-slate-800/30">
            <div className="bg-cyan-500/10 p-3 rounded-xl text-cyan-500">
               <Users size={24} />
            </div>
            <div className="flex flex-col">
              <span className="text-xs font-black text-slate-500 uppercase tracking-widest">EFETIVO TOTAL</span>
              <span className="text-2xl font-black text-white">{animais.length} <span className="text-xs text-slate-400">CAB.</span></span>
            </div>
          </div>
          
          {/* BOVINOS */}
          <div className="flex-1 flex items-center gap-6 border-r border-slate-800/30">
            <div className="flex flex-col">
              <div className="flex items-center gap-2 text-emerald-500 mb-1">
                <Scale size={14} /><span className="text-xs font-black uppercase">BOVINOS</span>
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-xl font-black text-white">{calcularMedia(bovinos)} <span className="text-xs text-slate-500">KG (MÉDIA)</span></span>
              </div>
              <div className="flex gap-4 mt-1">
                <span className="text-xs text-slate-400 font-bold uppercase">{bovinos.length} CAB.</span>
                <span className="text-xs text-emerald-500 font-black uppercase flex items-center gap-1"><Layers size={12}/> {lotesUnicosBovinos} LOTES</span>
              </div>
            </div>
          </div>

          {/* SUÍNOS */}
          <div className="flex-1 flex items-center gap-6 border-r border-slate-800/30">
            <div className="flex flex-col">
              <div className="flex items-center gap-2 text-pink-500 mb-1">
                <Scale size={14} /><span className="text-xs font-black uppercase">SUÍNOS</span>
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-xl font-black text-white">{calcularMedia(suinos)} <span className="text-xs text-slate-500">KG (MÉDIA)</span></span>
              </div>
              <div className="flex gap-4 mt-1">
                <span className="text-xs text-slate-400 font-bold uppercase">{suinos.length} CAB.</span>
                <span className="text-xs text-pink-500 font-black uppercase flex items-center gap-1"><Layers size={12}/> {lotesUnicosSuinos} LOTES</span>
              </div>
            </div>
          </div>

          {/* BOTÃO ELIMINAR SELECIONADOS */}
          <div className="shrink-0 min-w-[180px] flex justify-end">
            {selectedIds.length > 0 && (
              <button 
                onClick={async () => {
                  if(!confirm(`Eliminar ${selectedIds.length} selecionados?`)) return;
                  const batch = writeBatch(db);
                  selectedIds.forEach(id => batch.delete(doc(db, 'animais', id)));
                  await batch.commit();
                  setSelectedIds([]);
                }} 
                className="bg-red-600/20 border border-red-500/50 text-red-500 text-xs font-black px-5 py-3 rounded-xl hover:bg-red-600 hover:text-white transition-all shadow-lg active:scale-95"
              >
                ELIMINAR ({selectedIds.length})
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
