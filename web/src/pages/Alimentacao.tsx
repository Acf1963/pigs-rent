import React, { useState, useEffect, useRef } from 'react';
import { db } from '../lib/firebase';
import { 
  collection, addDoc, onSnapshot, query, orderBy, 
  deleteDoc, doc, updateDoc, writeBatch 
} from 'firebase/firestore';
import { 
  Utensils, FileSpreadsheet, FileText, UploadCloud, Check, 
  Trash2, Edit3, Plus, Square, CheckSquare, RotateCcw,
  TrendingUp, Scale
} from 'lucide-react';

import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

interface RegistoAlimentacao {
  id: string;
  loteId: string;
  data: string;
  tipoAlimento: string;
  quantidadeKg: number;
  custoUnitario: number;
  observacoes: string;
  createdAt?: string;
}

export default function AlimentacaoPage() {
  const [registos, setRegistos] = useState<RegistoAlimentacao[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const initialForm = {
    loteId: '',
    data: new Date().toISOString().split('T')[0],
    tipoAlimento: 'RAÇÃO CRESCIMENTO',
    quantidadeKg: '' as string | number,
    custoUnitario: '' as string | number,
    observacoes: ''
  };

  const [formData, setFormData] = useState(initialForm);

  useEffect(() => {
    const q = query(collection(db, 'alimentacao'), orderBy('data', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ 
        id: doc.id, 
        ...doc.data() 
      })) as RegistoAlimentacao[];
      setRegistos(data);
    });
    return () => unsubscribe();
  }, []);

  const registosBovinos = registos.filter(r => r.loteId.toUpperCase().includes('-B'));
  const registosSuinos = registos.filter(r => r.loteId.toUpperCase().includes('-S'));

  const calcularStats = (lista: RegistoAlimentacao[]) => {
    const kg = lista.reduce((acc, r) => acc + (Number(r.quantidadeKg) || 0), 0);
    const custo = lista.reduce((acc, r) => acc + (Number(r.quantidadeKg) * Number(r.custoUnitario) || 0), 0);
    return { kg, custo };
  };

  const statsBovinos = calcularStats(registosBovinos);
  const statsSuinos = calcularStats(registosSuinos);
  const totalInvestidoGlobal = registos.reduce((acc, r) => acc + (Number(r.quantidadeKg) * Number(r.custoUnitario) || 0), 0);

  const toggleSelectAll = () => {
    if (selectedIds.length === registos.length && registos.length > 0) {
      setSelectedIds([]);
    } else {
      setSelectedIds(registos.map(r => r.id));
    }
  };

  const toggleSelectOne = (id: string) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]);
  };

  const deleteSelected = async () => {
    if (!confirm(`Eliminar ${selectedIds.length} registos?`)) return;
    const batch = writeBatch(db);
    selectedIds.forEach(id => { batch.delete(doc(db, 'alimentacao', id)); });
    await batch.commit();
    setSelectedIds([]);
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
          const newDocRef = doc(collection(db, 'alimentacao'));
          let dataFinal = item.data || item.Data;
          if (dataFinal instanceof Date) dataFinal = dataFinal.toISOString().split('T')[0];
          batch.set(newDocRef, { 
            loteId: String(item.codigoLote || 'S/L').toUpperCase(),
            data: dataFinal || new Date().toISOString().split('T')[0],
            tipoAlimento: String(item.tipoRacao || item.fase || 'RAÇÃO').toUpperCase(),
            quantidadeKg: parseFloat(item.quantidadeKg) || 0,
            custoUnitario: parseFloat(item.custoPorKgKz) || 0,
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
    const dataMain = registos.map(r => ({
      'Lote': r.loteId, 
      'Data': r.data, 
      'Alimento': r.tipoAlimento,
      'Quantidade (Kg)': r.quantidadeKg, 
      'Preço/Kg (Kz)': r.custoUnitario,
      'Total (Kz)': (r.quantidadeKg * r.custoUnitario), 
      'Obs': r.observacoes
    }));

    const worksheet = XLSX.utils.json_to_sheet(dataMain);
    XLSX.utils.sheet_add_aoa(worksheet, [
      [],
      ["RESUMO GERAL"],
      ["Investimento Bovinos (Kz)", statsBovinos.custo],
      ["Investimento Suínos (Kz)", statsSuinos.custo],
      ["Investimento Total (Kz)", totalInvestidoGlobal]
    ], { origin: -1 });

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, worksheet, "Registos_Consumo");
    XLSX.writeFile(wb, "Fazenda_Kwanza_Alimentacao.xlsx");
  };

  const exportToPDF = () => {
    const docPDF = new jsPDF('l', 'mm', 'a4');
    docPDF.setFontSize(16);
    docPDF.text("REGISTO DE ALIMENTAÇÃO - FAZENDA KWANZA", 14, 15);
    
    autoTable(docPDF, {
      head: [["LOTE", "DATA", "ALIMENTO", "QTD", "CUSTO UN.", "TOTAL"]],
      body: registos.map(r => [
        r.loteId, 
        r.data.split('-').reverse().join('/'), 
        r.tipoAlimento, 
        `${r.quantidadeKg}kg`, 
        `${Number(r.custoUnitario).toLocaleString()} Kz`,
        `${(r.quantidadeKg * r.custoUnitario).toLocaleString()} Kz`
      ]),
      startY: 20, 
      theme: 'grid',
      headStyles: { fillColor: [8, 145, 178] }
    });

    const finalY = (docPDF as any).lastAutoTable.finalY + 10;
    autoTable(docPDF, {
      startY: finalY,
      head: [["RESUMO POR ESPÉCIE", "CONSUMO (KG)", "INVESTIMENTO (KZ)"]],
      body: [
        ["BOVINOS", `${statsBovinos.kg.toLocaleString()} Kg`, `${statsBovinos.custo.toLocaleString()} Kz`],
        ["SUÍNOS", `${statsSuinos.kg.toLocaleString()} Kg`, `${statsSuinos.custo.toLocaleString()} Kz`],
        [
          "TOTAL GLOBAL", 
          `${(statsBovinos.kg + statsSuinos.kg).toLocaleString()} Kg`, 
          `${totalInvestidoGlobal.toLocaleString()} Kz`
        ]
      ],
      theme: 'striped',
      headStyles: { fillColor: [31, 41, 55] }
    });

    docPDF.save("Relatorio_Alimentacao.pdf");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload = {
      loteId: formData.loteId.toUpperCase(),
      data: formData.data,
      tipoAlimento: formData.tipoAlimento.toUpperCase(),
      quantidadeKg: parseFloat(formData.quantidadeKg as string) || 0,
      custoUnitario: parseFloat(formData.custoUnitario as string) || 0,
      observacoes: formData.observacoes.toUpperCase()
    };
    if (editingId) {
      await updateDoc(doc(db, 'alimentacao', editingId), payload);
      setEditingId(null);
    } else {
      await addDoc(collection(db, 'alimentacao'), { ...payload, createdAt: new Date().toISOString() });
    }
    setFormData(initialForm);
  };

  return (
    <div className="h-[calc(100vh-110px)] flex flex-col space-y-4 overflow-hidden p-2">
      <header className="flex justify-between items-center shrink-0">
        <div className="flex items-center gap-3">
            <Utensils className="text-cyan-500" size={32} />
            <h1 className="text-2xl font-black text-white tracking-tighter uppercase">Alimentação</h1>
        </div>
        <div className="flex gap-2">
          {selectedIds.length > 0 && (
            <button onClick={deleteSelected} className="bg-red-600/20 border border-red-500/50 px-4 py-2 rounded-lg text-[10px] font-black text-red-500 flex items-center gap-2">
              <Trash2 size={14} /> ELIMINAR ({selectedIds.length})
            </button>
          )}
          <input type="file" ref={fileInputRef} className="hidden" onChange={handleFileUpload} />
          <button onClick={() => fileInputRef.current?.click()} className="bg-[#1a202e] border border-slate-800 px-4 py-2 rounded-lg text-[10px] font-black text-slate-300 flex items-center gap-2 uppercase transition-colors hover:bg-slate-800">
            <UploadCloud size={14} className="text-cyan-500" /> Importar
          </button>
          <button onClick={exportToExcel} className="bg-[#1a202e] border border-slate-800 px-4 py-2 rounded-lg text-[10px] font-black text-slate-300 flex items-center gap-2 uppercase transition-colors hover:bg-slate-800">
            <FileSpreadsheet size={14} className="text-emerald-500" /> Excel
          </button>
          <button onClick={exportToPDF} className="bg-[#1a202e] border border-slate-800 px-4 py-2 rounded-lg text-[10px] font-black text-slate-300 flex items-center gap-2 uppercase transition-colors hover:bg-slate-800">
            <FileText size={14} className="text-red-500" /> PDF
          </button>
        </div>
      </header>

      <div className="bg-[#161922] rounded-2xl border border-slate-800/50 p-4 shrink-0 shadow-xl">
        <form onSubmit={handleSubmit} className="grid grid-cols-2 md:grid-cols-6 gap-3 items-end">
          <div className="flex flex-col gap-1">
            <label className="text-[9px] font-black text-slate-500 uppercase">Lote ID</label>
            <input required className="bg-[#0d0f14] border border-slate-800 p-2.5 rounded-xl text-cyan-500 font-bold outline-none text-xs uppercase focus:border-cyan-500" value={formData.loteId} onChange={e => setFormData({...formData, loteId: e.target.value})} />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-[9px] font-black text-slate-500 uppercase">Data</label>
            <input type="date" className="bg-[#0d0f14] border border-slate-800 p-2.5 rounded-xl text-white outline-none text-xs focus:border-cyan-500" value={formData.data} onChange={e => setFormData({...formData, data: e.target.value})} />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-[9px] font-black text-slate-500 uppercase">Qtd (Kg)</label>
            <input type="number" step="0.1" className="bg-[#0d0f14] border border-slate-800 p-2.5 rounded-xl text-white outline-none text-xs focus:border-cyan-500" value={formData.quantidadeKg} onChange={e => setFormData({...formData, quantidadeKg: e.target.value})} />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-[9px] font-black text-slate-500 uppercase">Preço/Kg</label>
            <input type="number" className="bg-[#0d0f14] border border-slate-800 p-2.5 rounded-xl text-white outline-none text-xs focus:border-cyan-500" value={formData.custoUnitario} onChange={e => setFormData({...formData, custoUnitario: e.target.value})} />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-[9px] font-black text-slate-500 uppercase">Observações</label>
            <input className="bg-[#0d0f14] border border-slate-800 p-2.5 rounded-xl text-white outline-none text-xs uppercase focus:border-cyan-500" value={formData.observacoes} onChange={e => setFormData({...formData, observacoes: e.target.value})} />
          </div>
          <div className="flex gap-2">
            <button type="submit" className="flex-1 bg-cyan-600 hover:bg-cyan-500 text-white font-black text-[10px] py-3 rounded-xl uppercase flex items-center justify-center gap-2 transition-all">
              {editingId ? <Check size={16}/> : <Plus size={16}/>} Gravar
            </button>
            {editingId && (
              <button type="button" onClick={() => {setEditingId(null); setFormData(initialForm);}} className="bg-slate-800 p-3 rounded-xl text-white">
                <RotateCcw size={16}/>
              </button>
            )}
          </div>
        </form>
      </div>

      <div className="bg-[#161922] rounded-2xl border border-slate-800/50 shadow-2xl flex flex-col flex-1 min-h-0 overflow-hidden">
        <div className="overflow-auto flex-1 custom-scrollbar"> 
          <table className="w-full text-left text-[11px] border-separate border-spacing-0 min-w-[1000px]">
            <thead className="bg-[#11141d] text-slate-500 font-black uppercase text-[9px] sticky top-0 z-10">
              <tr>
                <th className="p-4 border-b border-slate-800/50 w-10 text-center">
                  <button onClick={toggleSelectAll}>{selectedIds.length === registos.length && registos.length > 0 ? <CheckSquare size={16} className="text-cyan-500"/> : <Square size={16}/>}</button>
                </th>
                <th className="p-4 border-b border-slate-800/50">LOTE</th>
                <th className="p-4 border-b border-slate-800/50">DATA</th>
                <th className="p-4 border-b border-slate-800/50">ALIMENTO</th>
                <th className="p-4 border-b border-slate-800/50 text-center">QTD (KG)</th>
                <th className="p-4 border-b border-slate-800/50 text-right">PREÇO/KG</th>
                <th className="p-4 border-b border-slate-800/50 text-right">TOTAL (KZ)</th>
                <th className="p-4 border-b border-slate-800/50 text-center">AÇÕES</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/20">
              {registos.map((r) => {
                const isSelected = selectedIds.includes(r.id);
                return (
                  <tr key={r.id} className={`${isSelected ? 'bg-cyan-500/5' : ''} hover:bg-white/[0.02] transition-colors`}>
                    <td className="p-4 text-center">
                      <button onClick={() => toggleSelectOne(r.id)} className={isSelected ? 'text-cyan-500' : 'text-slate-700'}>
                        {isSelected ? <CheckSquare size={16}/> : <Square size={16}/>}
                      </button>
                    </td>
                    <td className="p-4 font-black text-cyan-500 uppercase">{r.loteId}</td>
                    <td className="p-4 text-slate-400 font-bold">{r.data.split('-').reverse().join('/')}</td>
                    <td className="p-4 text-slate-300 font-medium uppercase">{r.tipoAlimento}</td>
                    <td className="p-4 text-center text-white font-black">{Number(r.quantidadeKg).toFixed(1)} Kg</td>
                    <td className="p-4 text-right text-slate-400 font-bold">{Number(r.custoUnitario).toLocaleString()}</td>
                    <td className="p-4 text-right text-emerald-500 font-black">{(r.quantidadeKg * r.custoUnitario).toLocaleString()}</td>
                    <td className="p-4 text-center">
                      <div className="flex justify-center gap-1">
                        <button onClick={() => { setEditingId(r.id); setFormData({...r}); }} className="p-2 text-slate-600 hover:text-cyan-400"><Edit3 size={14}/></button>
                        <button onClick={() => { if(confirm('Eliminar?')) deleteDoc(doc(db, 'alimentacao', r.id)) }} className="p-2 text-slate-700 hover:text-red-500"><Trash2 size={14}/></button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div className="bg-[#11141d] border-t border-slate-800 p-6 shrink-0 grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="flex items-center gap-5 bg-[#161922] p-4 rounded-2xl border border-slate-800/50 shadow-lg">
            <div className="p-3 bg-cyan-500/10 rounded-xl text-cyan-500">
              <TrendingUp size={24}/>
            </div>
            <div>
              <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Investimento Global</p>
              <p className="text-2xl font-black text-white">
                {totalInvestidoGlobal.toLocaleString()} <span className="text-xs text-slate-500 font-medium">KZ</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-5 bg-[#161922] p-4 rounded-2xl border border-emerald-500/20 shadow-lg">
            <div className="p-3 bg-emerald-500/10 rounded-xl text-emerald-500">
              <Scale size={24}/>
            </div>
            <div className="flex-1">
              <p className="text-[10px] font-black text-emerald-500 uppercase tracking-widest mb-1 flex items-center gap-2">
                <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse"/> Bovinos
              </p>
              <div className="flex flex-col">
                <span className="text-xl font-black text-white">
                  {statsBovinos.kg.toLocaleString(undefined, { minimumFractionDigits: 1 })} <span className="text-xs text-slate-500 font-medium">KG</span>
                </span>
                <span className="text-sm font-bold text-emerald-500/80">
                  {statsBovinos.custo.toLocaleString()} <span className="text-[10px]">KZ</span>
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-5 bg-[#161922] p-4 rounded-2xl border border-pink-500/20 shadow-lg">
            <div className="p-3 bg-pink-500/10 rounded-xl text-pink-500">
              <Scale size={24}/>
            </div>
            <div className="flex-1">
              <p className="text-[10px] font-black text-pink-500 uppercase tracking-widest mb-1 flex items-center gap-2">
                <div className="w-1.5 h-1.5 bg-pink-500 rounded-full animate-pulse"/> Suínos
              </p>
              <div className="flex flex-col">
                <span className="text-xl font-black text-white">
                  {statsSuinos.kg.toLocaleString(undefined, { minimumFractionDigits: 1 })} <span className="text-xs text-slate-500 font-medium">KG</span>
                </span>
                <span className="text-sm font-bold text-pink-500/80">
                  {statsSuinos.custo.toLocaleString()} <span className="text-[10px]">KZ</span>
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}