import { useState, useEffect, useRef } from 'react';
import { db } from '../lib/firebase';
import { 
  collection, addDoc, onSnapshot, query, orderBy, 
  deleteDoc, doc, updateDoc, writeBatch 
} from 'firebase/firestore';
import { 
  ShoppingCart, Plus, Trash2, Check, UploadCloud, 
  FileSpreadsheet, FileText, RotateCcw, TrendingUp, 
  User, Scale, Square, CheckSquare, Fingerprint
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
    observacoes: ''
  };

  const [formData, setFormData] = useState(initialForm);

  // 1. Listeners do Firebase
  useEffect(() => {
    const q = query(collection(db, 'vendas'), orderBy('dataVenda', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setVendas(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });
    return () => unsubscribe();
  }, []);

  // --- LÓGICA DE SELEÇÃO ---
  const toggleSelectAll = () => {
    if (selectedIds.length === vendas.length && vendas.length > 0) {
      setSelectedIds([]);
    } else {
      setSelectedIds(vendas.map(v => v.id));
    }
  };

  const toggleSelectOne = (id: string) => {
    setSelectedIds(prev => 
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  const deleteSelected = async () => {
    if (!confirm(`Eliminar ${selectedIds.length} vendas selecionadas?`)) return;
    const batch = writeBatch(db);
    selectedIds.forEach(id => {
      batch.delete(doc(db, 'vendas', id));
    });
    await batch.commit();
    setSelectedIds([]);
  };

  // 2. Importação Excel Inteligente
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
          batch.set(newDocRef, {
            codigoLote: String(item.codigoLote || 'N/A').toUpperCase(),
            brinco: String(item.brinco || '').toUpperCase(),
            dataVenda: item.dataVenda instanceof Date ? item.dataVenda.toISOString().split('T')[0] : (item.dataVenda || new Date().toISOString().split('T')[0]),
            cliente: String(item.cliente || 'CLIENTE GERAL').toUpperCase(),
            produto: String(item.produto || 'CARNE').toUpperCase(),
            pesoKg: parseFloat(item.pesoKg) || 0,
            precoKz: parseFloat(item.precoKz) || 0,
            createdAt: new Date().toISOString()
          });
        });
        await batch.commit();
        alert("Vendas importadas!");
      } catch (err) { console.error(err); }
    };
    reader.readAsBinaryString(file);
  };

  // 3. Exportações
  const exportToExcel = () => {
    const ws = XLSX.utils.json_to_sheet(vendas.map(v => ({
      Lote: v.codigoLote, Brinco: v.brinco, Data: v.dataVenda, Cliente: v.cliente,
      Produto: v.produto, 'Peso (Kg)': v.pesoKg, 'Preço (Kz)': v.precoKz, 'Total': v.pesoKg * v.precoKz
    })));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Vendas");
    XLSX.writeFile(wb, "Relatorio_Vendas_Fazenda.xlsx");
  };

  const exportToPDF = () => {
    const docPDF = new jsPDF('l', 'mm', 'a4');
    docPDF.text("Fazenda Kwanza - Relatório Comercial", 14, 15);
    autoTable(docPDF, {
      head: [["LOTE", "BRINCO", "DATA", "CLIENTE", "PESO", "PREÇO/KG", "TOTAL"]],
      body: vendas.map(v => [
        v.codigoLote, v.brinco || '---', v.dataVenda, v.cliente, 
        `${v.pesoKg} Kg`, `${Number(v.precoKz).toLocaleString()} Kz`, 
        `${(v.pesoKg * v.precoKz).toLocaleString()} Kz`
      ]),
      startY: 22,
      headStyles: { fillColor: [16, 185, 129] }
    });
    docPDF.save("Vendas_Comercial.pdf");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload = {
      ...formData,
      pesoKg: parseFloat(formData.pesoKg as string) || 0,
      precoKz: parseFloat(formData.precoKz as string) || 0,
    };

    if (editingId) {
      await updateDoc(doc(db, 'vendas', editingId), payload);
      setEditingId(null);
    } else {
      await addDoc(collection(db, 'vendas'), { ...payload, createdAt: new Date().toISOString() });
    }
    setFormData(initialForm);
  };

  const faturamentoTotal = vendas.reduce((acc, v) => acc + (v.pesoKg * v.precoKz), 0);

  return (
    <div className="h-[calc(100vh-110px)] flex flex-col space-y-4 overflow-hidden p-2">
      
      {/* HEADER */}
      <header className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 shrink-0">
        <div className="flex items-center gap-3">
          <ShoppingCart className="text-emerald-500" size={32} />
          <h1 className="text-2xl md:text-3xl font-black text-white uppercase tracking-tighter">Vendas</h1>
        </div>

        <div className="flex flex-wrap gap-2 w-full lg:w-auto">
          <input type="file" ref={fileInputRef} className="hidden" onChange={handleFileUpload} />
          <button onClick={() => fileInputRef.current?.click()} className="flex-1 lg:flex-none bg-[#1a202e] border border-slate-800 px-4 py-2 rounded-lg text-[10px] font-black text-slate-300 flex items-center justify-center gap-2 hover:bg-slate-800">
            <UploadCloud size={14} className="text-cyan-500" /> IMPORTAR
          </button>
          <button onClick={exportToExcel} className="flex-1 lg:flex-none bg-[#1a202e] border border-slate-800 px-4 py-2 rounded-lg text-[10px] font-black text-slate-300 flex items-center justify-center gap-2 hover:bg-slate-800">
            <FileSpreadsheet size={14} className="text-emerald-500" /> EXCEL
          </button>
          <button onClick={exportToPDF} className="flex-1 lg:flex-none bg-[#1a202e] border border-slate-800 px-4 py-2 rounded-lg text-[10px] font-black text-slate-300 flex items-center justify-center gap-2 hover:bg-slate-800">
            <FileText size={14} className="text-red-500" /> PDF
          </button>
          
          {selectedIds.length > 0 && (
            <button onClick={deleteSelected} className="flex-1 lg:flex-none bg-red-600/20 border border-red-500/50 px-4 py-2 rounded-lg text-[10px] font-black text-red-500 flex items-center justify-center gap-2 hover:bg-red-600 hover:text-white transition-all">
              <Trash2 size={14} /> ELIMINAR ({selectedIds.length})
            </button>
          )}
        </div>
      </header>

      {/* FORMULÁRIO */}
      <div className="bg-[#161922] rounded-2xl border border-slate-800/50 p-4 shrink-0 shadow-2xl">
        <form onSubmit={handleSubmit} className="grid grid-cols-2 lg:flex lg:flex-nowrap gap-4 items-end">
          <div className="space-y-1 flex-1">
            <label className="text-[9px] font-black text-slate-500 uppercase px-1">Lote</label>
            <input required className="w-full bg-[#0d0f14] border border-slate-800 p-3 rounded-xl text-white font-bold outline-none text-xs uppercase" value={formData.codigoLote} onChange={e => setFormData({...formData, codigoLote: e.target.value.toUpperCase()})} />
          </div>

          <div className="space-y-1 flex-1">
            <label className="text-[9px] font-black text-slate-500 uppercase px-1">Brinco</label>
            <div className="relative">
              <Fingerprint className="absolute left-3 top-3 text-slate-700" size={14} />
              <input className="w-full bg-[#0d0f14] border border-slate-800 p-3 pl-10 rounded-xl text-white font-bold outline-none text-xs uppercase" placeholder="OPCIONAL" value={formData.brinco} onChange={e => setFormData({...formData, brinco: e.target.value.toUpperCase()})} />
            </div>
          </div>

          <div className="space-y-1 flex-[2]">
            <label className="text-[9px] font-black text-slate-500 uppercase px-1">Cliente</label>
            <div className="relative">
              <User className="absolute left-3 top-3 text-slate-700" size={14} />
              <input required className="w-full bg-[#0d0f14] border border-slate-800 p-3 pl-10 rounded-xl text-white font-bold outline-none text-xs uppercase" value={formData.cliente} onChange={e => setFormData({...formData, cliente: e.target.value.toUpperCase()})} />
            </div>
          </div>

          <div className="space-y-1 flex-1">
            <label className="text-[9px] font-black text-emerald-500 uppercase px-1">Peso (Kg)</label>
            <input type="number" step="0.1" required className="w-full bg-[#0d0f14] border border-slate-800 p-3 rounded-xl text-emerald-500 font-black outline-none text-xs" value={formData.pesoKg} onChange={e => setFormData({...formData, pesoKg: e.target.value})} />
          </div>

          <button type="submit" className="bg-emerald-600 hover:bg-emerald-500 text-white font-black text-[11px] px-8 py-3.5 rounded-xl uppercase flex items-center justify-center gap-2 shadow-lg transition-all shrink-0">
            {editingId ? <Check size={18} /> : <Plus size={18} />} GRAVAR
          </button>
        </form>
      </div>

      {/* TABELA COM MULTI-SELEÇÃO */}
      <div className="bg-[#161922] rounded-2xl border border-slate-800/50 shadow-2xl flex flex-col flex-1 min-h-0 overflow-hidden">
        <div className="overflow-y-auto flex-1 custom-scrollbar overflow-x-auto"> 
          <table className="w-full text-left text-[11px] border-separate border-spacing-0 min-w-[950px]">
            <thead className="bg-[#11141d] text-slate-500 font-black uppercase text-[9px] sticky top-0 z-10">
              <tr>
                <th className="p-4 border-b border-slate-800/50 w-10">
                  <button onClick={toggleSelectAll} className="text-slate-500 hover:text-emerald-500 transition-colors">
                    {selectedIds.length === vendas.length && vendas.length > 0 ? <CheckSquare size={16}/> : <Square size={16}/>}
                  </button>
                </th>
                <th className="p-4 border-b border-slate-800/50">LOTE</th>
                <th className="p-4 border-b border-slate-800/50">BRINCO</th>
                <th className="p-4 border-b border-slate-800/50">DATA</th>
                <th className="p-4 border-b border-slate-800/50">CLIENTE</th>
                <th className="p-4 text-center border-b border-slate-800/50">PESO</th>
                <th className="p-4 text-right border-b border-slate-800/50">TOTAL (KZ)</th>
                <th className="p-4 text-center border-b border-slate-800/50">AÇÕES</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/20">
              {vendas.map((v) => {
                const isSelected = selectedIds.includes(v.id);
                return (
                  <tr key={v.id} className={`${isSelected ? 'bg-emerald-500/5' : ''} hover:bg-emerald-500/[0.02] transition-colors group`}>
                    <td className="p-4">
                      <button onClick={() => toggleSelectOne(v.id)} className={`${isSelected ? 'text-emerald-500' : 'text-slate-700'} transition-colors`}>
                        {isSelected ? <CheckSquare size={16}/> : <Square size={16}/>}
                      </button>
                    </td>
                    <td className="p-4 font-black text-cyan-500 uppercase">{v.codigoLote}</td>
                    <td className="p-4 text-white font-bold uppercase">{v.brinco || <span className="text-slate-700 italic text-[9px]">LOTE</span>}</td>
                    <td className="p-4 text-slate-400 font-bold">{v.dataVenda?.split('-').reverse().join('/')}</td>
                    <td className="p-4 text-white font-black uppercase text-[9px]">{v.cliente}</td>
                    <td className="p-4 text-center text-emerald-400 font-black">{v.pesoKg} Kg</td>
                    <td className="p-4 text-right">
                      <span className="bg-emerald-500/10 text-emerald-400 px-3 py-1 rounded-lg font-black border border-emerald-500/10">
                        {(v.pesoKg * v.precoKz).toLocaleString()}
                      </span>
                    </td>
                    <td className="p-4 text-center">
                      <div className="flex justify-center gap-1">
                        <button onClick={() => { setEditingId(v.id); setFormData({...v}); }} className="p-2 text-slate-500 hover:text-cyan-400"><Edit3 size={14}/></button>
                        <button onClick={() => { if(confirm('Eliminar venda?')) deleteDoc(doc(db, 'vendas', v.id)) }} className="p-2 text-slate-600 hover:text-red-500"><Trash2 size={14}/></button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* FOOTER FINANCEIRO */}
        <div className="p-4 bg-black/40 border-t border-slate-800/50 flex justify-between items-center shrink-0">
          <div className="flex gap-10 px-4">
            <div className="flex flex-col">
              <span className="text-[7px] font-black text-slate-500 uppercase tracking-widest">Peso Total Escoado</span>
              <span className="text-sm font-black text-white">
                {vendas.reduce((acc, v) => acc + (Number(v.pesoKg) || 0), 0).toLocaleString()} Kg
              </span>
            </div>
            <div className="flex flex-col">
              <span className="text-[7px] font-black text-slate-500 uppercase tracking-widest">Faturamento Acumulado</span>
              <span className="text-sm font-black text-emerald-500">
                {faturamentoTotal.toLocaleString()} Kz
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}