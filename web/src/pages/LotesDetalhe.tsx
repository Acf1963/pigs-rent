import React, { useState, useEffect, useRef } from 'react';
import { db } from '../lib/firebase';
import { 
  collection, addDoc, onSnapshot, query, 
  deleteDoc, doc, orderBy, writeBatch 
} from 'firebase/firestore';
import { 
  Users, Plus, Trash2, Search,
  UploadCloud, FileSpreadsheet, FileText, Square, CheckSquare, Scale} from 'lucide-react';

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
  const [importHistory, setImportHistory] = useState<string[]>([]); // Filtro de ficheiros
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

    // 1. FILTRO: Verificar se o ficheiro já foi importado nesta sessão
    if (importHistory.includes(file.name)) {
      alert(`O ficheiro "${file.name}" já foi processado.`);
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    const reader = new FileReader();
    reader.onload = async (evt) => {
      const bstr = evt.target?.result;
      const wb = XLSX.read(bstr, { type: 'binary' });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const data: any[] = XLSX.utils.sheet_to_json(ws);

      const batch = writeBatch(db);
      let countImportados = 0;
      let countDuplicados = 0;

      data.forEach((row: any) => {
        const brincoLimpo = String(row.brinco || '').toUpperCase();
        
        // 2. FILTRO: Verificar se o brinco já existe na base de dados (localmente para performance)
        const existe = animais.some(a => a.brinco === brincoLimpo);

        if (!existe) {
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
        } else {
          countDuplicados++;
        }
      });

      if (countImportados > 0) {
        await batch.commit();
        setImportHistory(prev => [...prev, file.name]);
        alert(`Sucesso!\nImportados: ${countImportados}\nDuplicados saltados: ${countDuplicados}`);
      } else {
        alert(`Nenhum registo novo encontrado. (${countDuplicados} duplicados detetados)`);
      }

      if (fileInputRef.current) fileInputRef.current.value = '';
    };
    reader.readAsBinaryString(file);
  };

  const filteredAnimais = animais.filter(a => 
    (a.brinco?.toLowerCase() || '').includes(searchTerm.toLowerCase()) || 
    (a.loteId?.toLowerCase() || '').includes(searchTerm.toLowerCase())
  );

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  };

  const toggleSelectAll = () => {
    setSelectedIds(selectedIds.length === filteredAnimais.length && filteredAnimais.length > 0 
      ? [] 
      : filteredAnimais.map(a => a.id!)
    );
  };

  const handleBulkDelete = async () => {
    if (!confirm(`Eliminar ${selectedIds.length} registos permanentemente?`)) return;
    const batch = writeBatch(db);
    selectedIds.forEach(id => batch.delete(doc(db, 'animais', id)));
    await batch.commit();
    setSelectedIds([]);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validar duplicado no manual também
    if (animais.some(a => a.brinco === formData.brinco.toUpperCase())) {
      alert("Este brinco já está registado!");
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
      headStyles: { fillColor: [0, 157, 196] }
    });
    docPDF.save("Relatorio_Animais.pdf");
  };

  const bovinos = animais.filter(a => a.loteId?.includes('-B'));
  const suinos = animais.filter(a => a.loteId?.includes('-S'));
  
  const calcularMedia = (lista: Animal[]) => 
    lista.length > 0 ? (lista.reduce((acc, a) => acc + (a.pesoAtual || 0), 0) / lista.length).toFixed(1) : "0.0";

  return (
    <div className="h-[calc(100vh-110px)] flex flex-col space-y-4 overflow-hidden p-2">
      <header className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 shrink-0">
        <div className="flex items-center gap-3">
          <Users className="text-white" size={28} />
          <h1 className="text-2xl font-black text-white uppercase tracking-tight">CONTROLO DE EFETIVO</h1>
        </div>

        <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto">
          <div className="relative flex-1 lg:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
            <input 
              placeholder="PESQUISAR POR BRINCO OU LOTE..." 
              className="w-full bg-[#161922] border border-slate-800 pl-10 pr-4 py-2 rounded-xl text-[10px] font-bold text-white outline-none focus:border-cyan-500 transition-all"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="flex gap-2">
            <input type="file" ref={fileInputRef} className="hidden" accept=".xlsx, .xls" onChange={handleImport} />
            <button 
              type="button"
              onClick={() => fileInputRef.current?.click()} 
              className="bg-[#1a202e] border border-slate-800 px-4 py-2 rounded-lg text-[10px] font-black text-slate-300 flex items-center gap-2 hover:bg-slate-800 transition-colors"
            >
              <UploadCloud size={14} className="text-cyan-500" /> IMPORTAR
            </button>
            <button 
              type="button"
              onClick={exportToExcel} 
              className="bg-[#1a202e] border border-slate-800 px-4 py-2 rounded-lg text-[10px] font-black text-slate-300 flex items-center gap-2 hover:bg-slate-800 transition-colors"
            >
              <FileSpreadsheet size={14} className="text-emerald-500" /> EXCEL
            </button>
            <button 
              type="button"
              onClick={exportToPDF} 
              className="bg-[#1a202e] border border-slate-800 px-4 py-2 rounded-lg text-[10px] font-black text-slate-300 flex items-center gap-2 hover:bg-slate-800 transition-colors"
            >
              <FileText size={14} className="text-red-500" /> PDF
            </button>
          </div>
        </div>
      </header>

      {/* Formulário Manual */}
      <div className="bg-[#161922] rounded-2xl border border-slate-800/50 p-4 shrink-0 shadow-lg">
        <form onSubmit={handleSubmit} className="grid grid-cols-2 md:grid-cols-6 gap-3 items-end">
          <div className="space-y-1">
            <label className="text-[8px] font-black text-slate-500 uppercase px-1">Lote ID</label>
            <input 
              required 
              placeholder="EX: FQ-2026-B01"
              className="w-full bg-[#0d0f14] border border-slate-800 p-2 rounded-lg text-white text-[10px] font-bold outline-none focus:border-cyan-500 uppercase" 
              value={formData.loteId} 
              onChange={e => setFormData({...formData, loteId: e.target.value})} 
            />
          </div>
          <div className="space-y-1">
            <label className="text-[8px] font-black text-slate-500 uppercase px-1">Brinco</label>
            <input 
              required 
              className="w-full bg-[#0d0f14] border border-slate-800 p-2 rounded-lg text-white text-[10px] font-bold outline-none focus:border-cyan-500 uppercase" 
              value={formData.brinco} 
              onChange={e => setFormData({...formData, brinco: e.target.value})} 
            />
          </div>
          <div className="space-y-1">
            <label className="text-[8px] font-black text-slate-500 uppercase px-1">Raça</label>
            <input 
              required 
              className="w-full bg-[#0d0f14] border border-slate-800 p-2 rounded-lg text-white text-[10px] font-bold outline-none focus:border-cyan-500 uppercase" 
              value={formData.raca} 
              onChange={e => setFormData({...formData, raca: e.target.value})} 
            />
          </div>
          <div className="space-y-1">
            <label className="text-[8px] font-black text-slate-500 uppercase px-1">Peso (Kg)</label>
            <input 
              type="number" 
              step="0.1" 
              required 
              className="w-full bg-[#0d0f14] border border-slate-800 p-2 rounded-lg text-white text-[10px] font-bold outline-none focus:border-cyan-500" 
              value={formData.pesoAtual || ''} 
              onChange={e => setFormData({...formData, pesoAtual: Number(e.target.value)})} 
            />
          </div>
          <div className="space-y-1">
            <label className="text-[8px] font-black text-slate-500 uppercase px-1">Nascimento</label>
            <input 
              type="date" 
              required 
              className="w-full bg-[#0d0f14] border border-slate-800 p-2 rounded-lg text-white text-[10px] font-bold outline-none focus:border-cyan-500" 
              value={formData.dataNascimento} 
              onChange={e => setFormData({...formData, dataNascimento: e.target.value})} 
            />
          </div>
          <button 
            type="submit" 
            className="bg-[#009dc4] hover:bg-[#008db1] text-white font-black text-[10px] py-2.5 rounded-lg uppercase flex items-center justify-center gap-2 transition-all active:scale-95 shadow-lg shadow-cyan-500/10"
          >
            <Plus size={14} /> Adicionar
          </button>
        </form>
      </div>

      {/* Tabela Principal */}
      <div className="bg-[#161922] rounded-2xl border border-slate-800/50 flex flex-col flex-1 min-h-0 overflow-hidden shadow-2xl">
        <div className="overflow-y-auto flex-1 overflow-x-auto scrollbar-thin scrollbar-thumb-slate-800"> 
          <table className="w-full text-left text-[11px] border-separate border-spacing-0 min-w-[900px]">
            <thead className="bg-[#11141d] text-slate-500 font-black uppercase text-[9px] sticky top-0 z-10">
              <tr>
                <th className="p-4 w-10 text-center border-b border-slate-800/50">
                  <button type="button" onClick={toggleSelectAll} className="hover:text-cyan-500 transition-colors">
                    {selectedIds.length === filteredAnimais.length && filteredAnimais.length > 0 
                      ? <CheckSquare size={16} className="text-cyan-500"/> 
                      : <Square size={16}/>}
                  </button>
                </th>
                <th className="p-4 border-b border-slate-800/50">LOTE</th>
                <th className="p-4 border-b border-slate-800/50">BRINCO</th>
                <th className="p-4 border-b border-slate-800/50">RAÇA</th>
                <th className="p-4 border-b border-slate-800/50">SEXO</th>
                <th className="p-4 text-center border-b border-slate-800/50">PESO ATUAL</th>
                <th className="p-4 border-b border-slate-800/50">NASCIMENTO</th>
                <th className="p-4 text-center border-b border-slate-800/50">AÇÕES</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/20">
              {filteredAnimais.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-10 text-center text-slate-600 font-bold italic uppercase tracking-widest">
                    Nenhum registo encontrado
                  </td>
                </tr>
              ) : (
                filteredAnimais.map((a) => (
                  <tr key={a.id} className="hover:bg-white/[0.02] transition-colors group">
                    <td className="p-4 text-center">
                      <button type="button" onClick={() => toggleSelect(a.id!)}>
                        {selectedIds.includes(a.id!) 
                          ? <CheckSquare size={16} className="text-cyan-400"/> 
                          : <Square size={16} className="text-slate-700 group-hover:text-slate-500"/>}
                      </button>
                    </td>
                    <td className="p-4 font-black text-cyan-500 uppercase">{a.loteId}</td>
                    <td className="p-4 text-white font-bold uppercase">{a.brinco}</td>
                    <td className="p-4 text-slate-400 font-bold uppercase">{a.raca}</td>
                    <td className="p-4 text-slate-500 font-bold uppercase">{a.sexo}</td>
                    <td className="p-4 text-center font-black text-white">{a.pesoAtual} Kg</td>
                    <td className="p-4 text-slate-500 font-bold uppercase">{a.dataNascimento}</td>
                    <td className="p-4 text-center">
                      <button 
                        type="button"
                        onClick={() => deleteDoc(doc(db, 'animais', a.id!))} 
                        className="text-slate-700 hover:text-red-500 transition-colors p-2"
                      >
                        <Trash2 size={16}/>
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        
        {/* Rodapé Estatístico */}
        <div className="p-4 bg-[#0d0f14] border-t border-slate-800/50 grid grid-cols-2 md:grid-cols-4 gap-4 px-6 items-center shrink-0">
          <div className="flex flex-col border-r border-slate-800/50">
            <span className="text-[8px] font-black text-slate-500 uppercase">Efetivo Total</span>
            <span className="text-sm font-black text-white tracking-widest">{animais.length} <span className="text-[9px] text-slate-500">UNIDADES</span></span>
          </div>
          <div className="flex flex-col border-r border-slate-800/50">
            <div className="flex items-center gap-1 text-emerald-500">
              <Scale size={10} /><span className="text-[8px] font-black uppercase">Média Bovinos</span>
            </div>
            <span className="text-sm font-black text-white">{calcularMedia(bovinos)} KG</span>
            <span className="text-[7px] text-slate-500 font-bold uppercase">{bovinos.length} Cabeças em recria</span>
          </div>
          <div className="flex flex-col border-r border-slate-800/50">
            <div className="flex items-center gap-1 text-cyan-500">
              <Scale size={10} /><span className="text-[8px] font-black uppercase">Média Suínos</span>
            </div>
            <span className="text-sm font-black text-white">{calcularMedia(suinos)} KG</span>
            <span className="text-[7px] text-slate-500 font-bold uppercase">{suinos.length} Animais no lote</span>
          </div>
          <div className="flex justify-end gap-3">
            {selectedIds.length > 0 && (
              <button 
                type="button"
                onClick={handleBulkDelete} 
                className="bg-red-600/10 text-red-500 text-[9px] font-black px-4 py-2 rounded-lg border border-red-500/20 hover:bg-red-600 hover:text-white transition-all"
              >
                ELIMINAR SELECIONADOS ({selectedIds.length})
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
