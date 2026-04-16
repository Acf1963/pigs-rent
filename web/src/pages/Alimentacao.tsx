import React, { useState, useEffect, useRef } from 'react';
import { db } from '../lib/firebase';
import { 
  collection, addDoc, onSnapshot, query, orderBy, 
  deleteDoc, doc, updateDoc, writeBatch 
} from 'firebase/firestore';
import { 
  Utensils, FileSpreadsheet, FileText, UploadCloud, Check, 
  Trash2, Edit3, Plus, Square, CheckSquare, RotateCcw,
  Calculator, TrendingUp, DollarSign
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

  // Cálculos de Resumo
  const totalKg = registos.reduce((acc, r) => acc + (Number(r.quantidadeKg) || 0), 0);
  const totalInvestido = registos.reduce((acc, r) => acc + (Number(r.quantidadeKg) * Number(r.custoUnitario) || 0), 0);
  const precoMedioKg = totalKg > 0 ? totalInvestido / totalKg : 0;

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
    
    // Adicionar Rodapé de Resumo no Excel
    XLSX.utils.sheet_add_aoa(worksheet, [
      [],
      ["RESUMO GERAL"],
      ["Total Consumido (Kg)", totalKg.toFixed(1)],
      ["Preço Médio / Kg (Kz)", precoMedioKg.toFixed(0)],
      ["Investimento Total (Kz)", totalInvestido.toFixed(0)]
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
      headStyles: { fillColor: [8, 145, 178] } // Cyan-600
    });

    // Tabela de Resumo no PDF
    const finalY = (docPDF as any).lastAutoTable.finalY + 10;
    autoTable(docPDF, {
      startY: finalY,
      head: [["RESUMO DE INVESTIMENTO", "VALOR"]],
      body: [
        ["TOTAL CONSUMIDO", `${totalKg.toLocaleString()} Kg`],
        ["PREÇO MÉDIO POR KG", `${precoMedioKg.toLocaleString(undefined, { maximumFractionDigits: 0 })} Kz`],
        ["INVESTIMENTO TOTAL", `${totalInvestido.toLocaleString()} Kz`]
      ],
      theme: 'striped',
      headStyles: { fillColor: [31, 41, 55] },
      columnStyles: { 0: { fontStyle: 'bold', cellWidth: 60 } }
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
        <h1 className="text-2xl font-black text-white flex items-center gap-3 tracking-tighter uppercase">
          <Utensils className="text-cyan-500" size={32} /> Alimentação
        </h1>
        <div className="flex gap-2">
          {selectedIds.length > 0 && (
            <button onClick={deleteSelected} className="bg-red-600/20 border border-red-500/50 px-4 py-2 rounded-lg text-[10px] font-black text-red-500 flex items-center gap-2">
              <Trash2 size={14} /> ELIMINAR ({selectedIds.length})
            </button>
          )}
          <input type="file" ref={fileInputRef} className="hidden" onChange={handleFileUpload} />
          <button onClick={() => fileInputRef.current?.click()} className="bg-[#1a202e] border border-slate-800 px-4 py-2 rounded-lg text-[10px] font-black text-slate-300 flex items-center gap-2 uppercase">
            <UploadCloud size={14} className="text-cyan-500" /> Importar
          </button>
          <button onClick={exportToExcel} className="bg-[#1a202e] border border-slate-800 px-4 py-2 rounded-lg text-[10px] font-black text-slate-300 flex items-center gap-2 uppercase">
            <FileSpreadsheet size={14} className="text-emerald-500" /> Excel
          </button>
          <button onClick={exportToPDF} className="bg-[#1a202e] border border-slate-800 px-4 py-2 rounded-lg text-[10px] font-black text-slate-300 flex items-center gap-2 uppercase">
            <FileText size={14} className="text-red-500" /> PDF
          </button>
        </div>
      </header>

      {/* Formulário */}
      <div className="bg-[#161922] rounded-2xl border border-slate-800/50 p-4 shrink-0 shadow-xl">
        <form onSubmit={handleSubmit} className="grid grid-cols-2 md:grid-cols-6 gap-3 items-end">
          <div className="flex flex-col gap-1">
            <label className="text-[9px] font-black text-slate-500 uppercase">Lote ID</label>
            <input required className="bg-[#0d0f14] border border-slate-800 p-2.5 rounded-xl text-cyan-500 font-bold outline-none text-xs uppercase" value={formData.loteId} onChange={e => setFormData({...formData, loteId: e.target.value})} />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-[9px] font-black text-slate-500 uppercase">Data</label>
            <input type="date" className="bg-[#0d0f14] border border-slate-800 p-2.5 rounded-xl text-white outline-none text-xs" value={formData.data} onChange={e => setFormData({...formData, data: e.target.value})} />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-[9px] font-black text-slate-500 uppercase">Qtd (Kg)</label>
            <input type="number" step="0.1" className="bg-[#0d0f14] border border-slate-800 p-2.5 rounded-xl text-white outline-none text-xs" value={formData.quantidadeKg} onChange={e => setFormData({...formData, quantidadeKg: e.target.value})} />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-[9px] font-black text-slate-500 uppercase">Preço/Kg</label>
            <input type="number" className="bg-[#0d0f14] border border-slate-800 p-2.5 rounded-xl text-white outline-none text-xs" value={formData.custoUnitario} onChange={e => setFormData({...formData, custoUnitario: e.target.value})} />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-[9px] font-black text-slate-500 uppercase">Observações</label>
            <input className="bg-[#0d0f14] border border-slate-800 p-2.5 rounded-xl text-white outline-none text-xs uppercase" value={formData.observacoes} onChange={e => setFormData({...formData, observacoes: e.target.value})} />
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

      {/* Tabela */}
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
                  <tr key={r.id} className={`${isSelected ? 'bg-cyan-500/5' : ''} hover:bg-white/[0.02]`}>
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

        {/* BARRA DE RESUMO (INTERFACE) */}
        <div className="bg-[#11141d] border-t border-slate-800 p-4 shrink-0 grid grid-cols-3 gap-4">
          <div className="flex items-center gap-4 bg-[#161922] p-3 rounded-2xl border border-slate-800/50">
            <div className="p-2 bg-cyan-500/10 rounded-lg text-cyan-500"><TrendingUp size={20}/></div>
            <div>
              <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Total Consumido</p>
              <p className="text-xl font-black text-white">{totalKg.toLocaleString(undefined, { minimumFractionDigits: 1 })} <span className="text-xs text-slate-500 font-medium">KG</span></p>
            </div>
          </div>
          <div className="flex items-center gap-4 bg-[#161922] p-3 rounded-2xl border border-slate-800/50">
            <div className="p-2 bg-amber-500/10 rounded-lg text-amber-500"><Calculator size={20}/></div>
            <div>
              <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Preço Médio / Kg</p>
              <p className="text-xl font-black text-white">{precoMedioKg.toLocaleString(undefined, { maximumFractionDigits: 0 })} <span className="text-xs text-slate-500 font-medium">KZ</span></p>
            </div>
          </div>
          <div className="flex items-center gap-4 bg-[#161922] p-3 rounded-2xl border border-slate-800/50">
            <div className="p-2 bg-emerald-500/10 rounded-lg text-emerald-500"><DollarSign size={20}/></div>
            <div>
              <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Investimento Total</p>
              <p className="text-xl font-black text-emerald-500">{totalInvestido.toLocaleString()} <span className="text-xs text-slate-500 font-medium">KZ</span></p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
