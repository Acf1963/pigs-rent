import { useState, useEffect, useRef } from 'react';
import { db } from '../lib/firebase';
import { 
  collection, addDoc, onSnapshot, query, orderBy, 
  deleteDoc, doc, updateDoc, writeBatch 
} from 'firebase/firestore';
import { 
  ShoppingCart, Plus, Trash2, Check, UploadCloud, 
  FileSpreadsheet, FileText, RotateCcw, TrendingUp, 
  Square, CheckSquare, Edit3, Tag
} from 'lucide-react';

import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export default function VendasPage() {
  const [vendas, setVendas] = useState<any[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const initialForm = {
    codigoLote: '',
    brinco: '',
    dataVenda: new Date().toISOString().split('T')[0],
    cliente: '',
    produto: 'SUÍNO VIVO',
    pesoKg: '',
    precoKz: '',
  };

  const [formData, setFormData] = useState(initialForm);

  useEffect(() => {
    const q = query(collection(db, 'vendas'), orderBy('dataVenda', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setVendas(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });
    return () => unsubscribe();
  }, []);

  const deleteSelected = async () => {
    if (window.confirm(`Deseja eliminar os ${selectedIds.length} registos selecionados?`)) {
      const batch = writeBatch(db);
      selectedIds.forEach(id => {
        batch.delete(doc(db, 'vendas', id));
      });
      await batch.commit();
      setSelectedIds([]);
    }
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
        
        data.forEach((item: any) => {
          const newDocRef = doc(collection(db, 'vendas'));
          let dataFinal = new Date().toISOString().split('T')[0];
          const rawDate = item.dataVenda || item.Data || item.loteData;
          
          if (rawDate instanceof Date) {
            dataFinal = rawDate.toISOString().split('T')[0];
          } else if (typeof rawDate === 'string') {
            dataFinal = rawDate;
          }

          batch.set(newDocRef, {
            codigoLote: String(item.loteId || item.codigoLote || item.Lote || '').toUpperCase(),
            brinco: String(item.brinco || item.Brinco || '').toUpperCase(),
            dataVenda: dataFinal,
            cliente: String(item.cliente || item.Cliente || 'CLIENTE GERAL').toUpperCase(),
            produto: String(item.produto || item.Produto || 'GERAL').toUpperCase(),
            pesoKg: parseFloat(item.pesoKg || item.Peso) || 0,
            precoKz: parseFloat(item.precoKz || item.Preco) || 0,
            createdAt: new Date().toISOString()
          });
        });
        await batch.commit();
        alert("Importação concluída!");
      } catch (err) { alert("Erro na importação."); }
    };
    reader.readAsBinaryString(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const exportToExcel = () => {
    const ws = XLSX.utils.json_to_sheet(vendas.map(v => ({
      Lote: v.codigoLote, Brinco: v.brinco, Data: v.dataVenda, Cliente: v.cliente,
      'Peso (Kg)': v.pesoKg, 'Preço (Kz)': v.precoKz, 'Total': v.pesoKg * v.precoKz
    })));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Vendas");
    XLSX.writeFile(wb, "Vendas_Kwanza.xlsx");
  };

  const formatarDataParaPDF = (dataStr: any) => {
    if (!dataStr || typeof dataStr !== 'string') return '---';
    if (dataStr.includes('/')) return dataStr;
    if (dataStr.includes('-')) return dataStr.split('-').reverse().join('/');
    return dataStr;
  };

  const getResumo = (char: 'B' | 'S') => {
    const filtrados = vendas.filter(v => {
      const b = String(v.brinco || '').toUpperCase();
      const l = String(v.codigoLote || '').toUpperCase();
      return b.includes(char) || l.includes(`-${char}`);
    });
    const valor = filtrados.reduce((acc, v) => acc + (v.pesoKg * v.precoKz || 0), 0);
    const peso = filtrados.reduce((acc, v) => acc + (Number(v.pesoKg) || 0), 0);
    return { valor, total: filtrados.length, media: peso > 0 ? (valor / peso).toFixed(1) : "0.0" };
  };

  const resumoB = getResumo('B');
  const resumoS = getResumo('S');
  const totalGeral = vendas.reduce((acc, v) => acc + (v.pesoKg * v.precoKz || 0), 0);
  const totalUnidades = resumoB.total + resumoS.total;

  const exportToPDF = () => {
    try {
      const docPDF = new jsPDF('l', 'mm', 'a4');
      docPDF.setFontSize(18);
      docPDF.text("RELATÓRIO COMERCIAL - FAZENDA KWANZA", 14, 15);
      
      autoTable(docPDF, {
        head: [["LOTE", "BRINCO", "DATA", "CLIENTE", "PESO (KG)", "PREÇO (KZ)", "TOTAL (KZ)"]],
        body: vendas.map(v => [
          v.codigoLote, 
          v.brinco || '---', 
          formatarDataParaPDF(v.dataVenda), 
          v.cliente, 
          v.pesoKg.toLocaleString(), 
          v.precoKz.toLocaleString(), 
          (v.pesoKg * v.precoKz).toLocaleString()
        ]),
        startY: 25,
        headStyles: { fillColor: [16, 185, 129] },
      });

      let finalY = (docPDF as any).lastAutoTable ? (docPDF as any).lastAutoTable.finalY + 10 : 180;
      if (finalY > 160) { docPDF.addPage(); finalY = 20; }

      docPDF.setFontSize(12);
      docPDF.text("RESUMO FINANCEIRO", 14, finalY);

      autoTable(docPDF, {
        startY: finalY + 5,
        head: [["CATEGORIA", "QTD CAB", "MÉDIA KZ/KG", "TOTAL FATURADO"]],
        body: [
          ["BOVINOS", resumoB.total, `${resumoB.media} Kz`, `${resumoB.valor.toLocaleString()} Kz`],
          ["SUÍNOS", resumoS.total, `${resumoS.media} Kz`, `${resumoS.valor.toLocaleString()} Kz`],
          [{ 
            content: "FATURAMENTO TOTAL GERAL", 
            colSpan: 3, 
            styles: { halign: 'right', fontStyle: 'bold', fillColor: [240, 240, 240] } 
          }, 
          { 
            content: `${totalGeral.toLocaleString()} Kz`, 
            styles: { fontStyle: 'bold', fillColor: [240, 240, 240] } 
          }]
        ],
        theme: 'grid',
        headStyles: { fillColor: [31, 41, 55] }
      });

      docPDF.save(`Relatorio_Vendas_Kwanza.pdf`);
    } catch (err) { alert("Erro ao gerar PDF."); }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload = {
      ...formData,
      pesoKg: parseFloat(formData.pesoKg as string) || 0,
      precoKz: parseFloat(formData.precoKz as string) || 0,
    };
    if (editingId) { await updateDoc(doc(db, 'vendas', editingId), payload); setEditingId(null); }
    else { await addDoc(collection(db, 'vendas'), { ...payload, createdAt: new Date().toISOString() }); }
    setFormData(initialForm);
  };

  return (
    <div className="flex flex-col h-screen max-h-screen w-full bg-[#0a0f18] text-gray-200 overflow-hidden">
      
      {/* 1. HEADER (Altura Automática e Fixa) */}
      <header className="flex justify-between items-center p-4 pb-0 shrink-0">
        <div className="flex items-center gap-3">
          <ShoppingCart className="text-emerald-500" size={28} />
          <h1 className="text-2xl font-black text-white uppercase tracking-tight">Vendas</h1>
        </div>
        <div className="flex gap-2">
          {selectedIds.length > 0 && (
            <button onClick={deleteSelected} className="bg-red-600/10 border border-red-500/50 px-4 py-2 rounded-lg text-[10px] font-black text-red-500 flex items-center gap-2 hover:bg-red-600 hover:text-white transition-all">
              <Trash2 size={14} /> ELIMINAR ({selectedIds.length})
            </button>
          )}
          <input type="file" ref={fileInputRef} className="hidden" accept=".xlsx, .xls" onChange={handleFileUpload} />
          <button onClick={() => fileInputRef.current?.click()} className="bg-[#1a2233] border border-gray-800 px-4 py-2 rounded-xl text-[10px] font-black text-gray-400 flex items-center gap-2 hover:bg-[#252f44] transition-all">
            <UploadCloud size={16} className="text-cyan-500" /> IMPORTAR
          </button>
          <button onClick={exportToExcel} className="bg-[#1a2233] border border-gray-800 px-4 py-2 rounded-xl text-[10px] font-black text-gray-400 flex items-center gap-2 hover:bg-[#252f44] transition-all">
            <FileSpreadsheet size={16} className="text-emerald-500" /> EXCEL
          </button>
          <button onClick={exportToPDF} className="bg-[#1a2233] border border-gray-800 px-4 py-2 rounded-xl text-[10px] font-black text-gray-400 flex items-center gap-2 hover:bg-[#252f44] transition-all">
            <FileText size={16} className="text-red-500" /> PDF
          </button>
        </div>
      </header>

      {/* 2. FORMULÁRIO (Altura Automática e Fixa) */}
      <div className="p-4 shrink-0">
        <div className="bg-[#111827]/50 p-6 rounded-2xl border border-gray-800/50 shadow-xl">
          <form onSubmit={handleSubmit} className="grid grid-cols-2 lg:flex lg:flex-nowrap gap-4 items-end">
            <div className="flex-1">
              <label className="text-[9px] font-black text-slate-500 uppercase block mb-1">Lote</label>
              <input required className="w-full bg-black/40 border border-gray-700 p-3 rounded-xl text-white text-xs uppercase outline-none focus:border-emerald-500" value={formData.codigoLote} onChange={e => setFormData({...formData, codigoLote: e.target.value.toUpperCase()})} />
            </div>
            <div className="flex-1">
              <label className="text-[9px] font-black text-slate-500 uppercase block mb-1">Brinco</label>
              <input className="w-full bg-black/40 border border-gray-700 p-3 rounded-xl text-white text-xs uppercase outline-none focus:border-emerald-500" value={formData.brinco} onChange={e => setFormData({...formData, brinco: e.target.value.toUpperCase()})} />
            </div>
            <div className="flex-[1.5]">
              <label className="text-[9px] font-black text-slate-500 uppercase block mb-1">Cliente</label>
              <input required className="w-full bg-black/40 border border-gray-700 p-3 rounded-xl text-white text-xs uppercase outline-none focus:border-emerald-500" value={formData.cliente} onChange={e => setFormData({...formData, cliente: e.target.value.toUpperCase()})} />
            </div>
            <div className="w-24">
              <label className="text-[9px] font-black text-emerald-500 uppercase block mb-1 text-center">Peso (Kg)</label>
              <input type="number" step="0.1" required className="w-full bg-black/40 border border-gray-700 p-3 rounded-xl text-emerald-500 font-black text-xs text-center outline-none focus:border-emerald-500" value={formData.pesoKg} onChange={e => setFormData({...formData, pesoKg: e.target.value})} />
            </div>
            <div className="w-28">
              <label className="text-[9px] font-black text-emerald-500 uppercase block mb-1 text-center">Kz/Kg</label>
              <input type="number" required className="w-full bg-black/40 border border-gray-700 p-3 rounded-xl text-emerald-500 font-black text-xs text-center outline-none focus:border-emerald-500" value={formData.precoKz} onChange={e => setFormData({...formData, precoKz: e.target.value})} />
            </div>
            <div className="flex gap-2">
              <button type="submit" className="bg-emerald-600 hover:bg-emerald-500 text-white font-black text-[10px] px-6 py-3.5 rounded-xl uppercase flex items-center gap-2 transition-all shadow-lg">
                {editingId ? <Check size={18} /> : <Plus size={18} />} GRAVAR
              </button>
              <button type="button" onClick={() => { setEditingId(null); setFormData(initialForm); }} className="bg-gray-800 p-3.5 rounded-xl text-slate-500 hover:text-white transition-all">
                <RotateCcw size={18}/>
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* 3. TABELA (Área Flexível que ocupa o espaço central) */}
      <div className="flex-1 min-h-0 px-4 mb-4">
        <div className="h-full bg-[#111827]/30 rounded-2xl border border-gray-800 flex flex-col shadow-2xl overflow-hidden">
          <div className="flex-1 overflow-auto scrollbar-custom">
            <table className="w-full text-left text-[11px] border-separate border-spacing-0 min-w-[1200px]">
              <thead className="bg-[#0f1522] text-slate-500 font-black uppercase text-[9px] sticky top-0 z-10">
                <tr>
                  <th className="p-4 border-b border-gray-800 w-10 text-center">
                    <button onClick={() => setSelectedIds(selectedIds.length === vendas.length ? [] : vendas.map(v => v.id))}>
                      {selectedIds.length === vendas.length && vendas.length > 0 ? <CheckSquare size={16} className="text-emerald-500"/> : <Square size={16}/>}
                    </button>
                  </th>
                  <th className="p-4 border-b border-gray-800">LOTE</th>
                  <th className="p-4 border-b border-gray-800">BRINCO</th>
                  <th className="p-4 border-b border-gray-800">DATA</th>
                  <th className="p-4 border-b border-gray-800">CLIENTE</th>
                  <th className="p-4 border-b border-gray-800 text-center">PESO</th>
                  <th className="p-4 border-b border-gray-800 text-center">Kz/Kg</th>
                  <th className="p-4 border-b border-gray-800 text-right pr-8">TOTAL</th>
                  <th className="p-4 border-b border-gray-800 text-center sticky right-0 bg-[#0f1522]">AÇÕES</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800/50">
                {vendas.map((v) => (
                  <tr key={v.id} className="hover:bg-emerald-500/[0.02] transition-colors group">
                    <td className="p-4 text-center">
                      <button onClick={() => setSelectedIds(prev => prev.includes(v.id) ? prev.filter(i => i !== v.id) : [...prev, v.id])}>
                        {selectedIds.includes(v.id) ? <CheckSquare size={16} className="text-emerald-500"/> : <Square size={16} className="text-gray-700"/>}
                      </button>
                    </td>
                    <td className="p-4 font-black text-cyan-500 uppercase">{v.codigoLote}</td>
                    <td className="p-4 text-white font-bold uppercase"><Tag size={10} className="inline mr-1 text-slate-500" />{v.brinco || 'LOTE'}</td>
                    <td className="p-4 text-slate-400 font-bold">{formatarDataParaPDF(v.dataVenda)}</td>
                    <td className="p-4 text-white font-black uppercase text-[10px]">{v.cliente}</td>
                    <td className="p-4 text-center text-emerald-400 font-black">{v.pesoKg} Kg</td>
                    <td className="p-4 text-center text-slate-500 font-bold">{Number(v.precoKz).toLocaleString()}</td>
                    <td className="p-4 text-right pr-8 font-black text-white">
                      <span className="bg-emerald-500/10 px-2 py-1 rounded">{(v.pesoKg * v.precoKz).toLocaleString()} Kz</span>
                    </td>
                    <td className="p-4 text-center sticky right-0 bg-[#0a0f18] group-hover:bg-[#161d2b] transition-all">
                      <div className="flex justify-center gap-1">
                        <button onClick={() => { setEditingId(v.id); setFormData({...v}); }} className="p-2 text-slate-500 hover:text-cyan-400"><Edit3 size={16}/></button>
                        <button onClick={() => deleteDoc(doc(db, 'vendas', v.id))} className="p-2 text-slate-600 hover:text-red-500"><Trash2 size={16}/></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* 4. RESUMO (Fixo no Fundo) */}
      <footer className="px-4 pb-4 shrink-0">
        <div className="bg-[#0d0f14] border border-gray-800 p-4 rounded-2xl flex flex-col md:flex-row gap-6 px-6 items-center shadow-2xl">
          <div className="flex-1 flex flex-col">
            <span className="text-[10px] font-black text-cyan-500 uppercase mb-1">BOVINOS</span>
            <div className="flex items-baseline gap-2">
              <span className="text-lg font-black text-white">{resumoB.valor.toLocaleString()} Kz</span>
              <span className="text-[10px] font-bold text-cyan-500/80">{resumoB.total} CAB</span>
            </div>
            <span className="text-[8px] text-slate-500 font-bold uppercase">{resumoB.media} Kz/Kg Média</span>
          </div>
          <div className="flex-1 flex flex-col border-l border-gray-800 pl-6">
            <span className="text-[10px] font-black text-pink-500 uppercase mb-1">SUÍNOS</span>
            <div className="flex items-baseline gap-2">
              <span className="text-lg font-black text-white">{resumoS.valor.toLocaleString()} Kz</span>
              <span className="text-[10px] font-bold text-pink-500/80">{resumoS.total} CAB</span>
            </div>
            <span className="text-[8px] text-slate-500 font-bold uppercase">{resumoS.media} Kz/Kg Média</span>
          </div>
          <div className="shrink-0 flex items-center gap-4 bg-emerald-500/5 p-3 rounded-xl border border-emerald-500/10">
            <TrendingUp size={24} className="text-emerald-500" />
            <div className="flex flex-col text-right">
              <span className="text-[9px] font-black text-slate-500 uppercase">Faturamento Total ({totalUnidades} Un)</span>
              <span className="text-xl font-black text-emerald-500 leading-none">{totalGeral.toLocaleString()} Kz</span>
            </div>
          </div>
        </div>
      </footer>

      <style>{`
        .scrollbar-custom::-webkit-scrollbar { width: 6px; height: 6px; }
        .scrollbar-custom::-webkit-scrollbar-track { background: #0a0f18; }
        .scrollbar-custom::-webkit-scrollbar-thumb { background: #1f2937; border-radius: 10px; }
      `}</style>
    </div>
  );
}
