import { useState, useEffect, useRef } from 'react';
import { db } from '../lib/firebase';
import { 
  collection, addDoc, onSnapshot, query, orderBy, 
  deleteDoc, doc, updateDoc, writeBatch 
} from 'firebase/firestore';
import { 
  ShoppingCart, Plus, Trash2, Check, CloudUpload, 
  FileSpreadsheet, FileDown, RotateCcw, TrendingUp, 
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

  const formatarDataParaPDF = (dataStr: any) => {
    if (!dataStr || typeof dataStr !== 'string') return '---';
    return dataStr.includes('-') ? dataStr.split('-').reverse().join('/') : dataStr;
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const data = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]]);
        const batch = writeBatch(db);
        data.forEach((item: any) => {
          const newDocRef = doc(collection(db, 'vendas'));
          batch.set(newDocRef, {
            codigoLote: String(item.loteId || item.codigoLote || '').toUpperCase(),
            brinco: String(item.brinco || '').toUpperCase(),
            dataVenda: item.dataVenda || new Date().toISOString().split('T')[0],
            cliente: String(item.cliente || 'CLIENTE GERAL').toUpperCase(),
            produto: String(item.produto || 'GERAL').toUpperCase(),
            pesoKg: parseFloat(item.pesoKg) || 0,
            precoKz: parseFloat(item.precoKz) || 0,
            createdAt: new Date().toISOString()
          });
        });
        await batch.commit();
      } catch (err) { alert("Erro na importação."); }
      e.target.value = '';
    };
    reader.readAsBinaryString(file);
  };

  const exportToExcel = () => {
    const ws = XLSX.utils.json_to_sheet(vendas.map(v => ({
      Lote: v.codigoLote, Brinco: v.brinco || '---', Data: v.dataVenda, 
      Cliente: v.cliente, 'Peso (Kg)': v.pesoKg, 'Preço (Kz)': v.precoKz, 'Total': v.pesoKg * v.precoKz
    })));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Vendas");
    XLSX.writeFile(wb, "Relatorio_Vendas_Kwanza.xlsx");
  };

  const exportToPDF = () => {
    const docPDF = new jsPDF('l', 'mm', 'a4');
    docPDF.text("RELATÓRIO COMERCIAL - FAZENDA KWANZA", 14, 15);
    autoTable(docPDF, {
      head: [["LOTE", "BRINCO", "DATA", "CLIENTE", "PESO (KG)", "PREÇO (KZ)", "TOTAL (KZ)"]],
      body: vendas.map(v => [v.codigoLote, v.brinco || '---', formatarDataParaPDF(v.dataVenda), v.cliente, v.pesoKg, v.precoKz, (v.pesoKg * v.precoKz).toLocaleString()]),
      startY: 25, styles: { fontSize: 8 }
    });
    docPDF.save("Relatorio_Vendas.pdf");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload = { ...formData, pesoKg: Number(formData.pesoKg), precoKz: Number(formData.precoKz) };
    if (editingId) { await updateDoc(doc(db, 'vendas', editingId), payload); setEditingId(null); }
    else { await addDoc(collection(db, 'vendas'), { ...payload, createdAt: new Date().toISOString() }); }
    setFormData(initialForm);
  };

  return (
    /* AJUSTE: Removido fixed/ml-64. Altura calculada para manter rodapé visível. */
    <div className="w-full h-[calc(100vh-80px)] flex flex-col justify-between bg-[#0a0f18] text-gray-200 font-sans overflow-hidden p-4">
      
      {/* HEADER */}
      <div className="flex flex-col shrink-0">
        <div className="flex justify-between items-center mb-4">
          <h1 className="text-2xl font-bold text-white flex items-center gap-2 uppercase tracking-tight">
            <ShoppingCart className="text-emerald-500" size={28} /> Vendas
          </h1>
          <div className="flex gap-2">
            <input type="file" ref={fileInputRef} className="hidden" onChange={handleFileUpload} />
            <button onClick={() => fileInputRef.current?.click()} className="flex items-center gap-2 px-4 py-2 bg-[#1a2233] text-gray-400 rounded-xl text-xs font-bold border border-gray-800 hover:bg-[#252f44]">
              <CloudUpload size={18} className="text-cyan-500" /> IMPORTAR
            </button>
            <button onClick={exportToExcel} className="flex items-center gap-2 px-4 py-2 bg-[#1a2233] text-gray-400 rounded-xl text-xs font-bold border border-gray-800 hover:bg-[#252f44]">
              <FileSpreadsheet size={18} className="text-emerald-500" /> EXCEL
            </button>
            <button onClick={exportToPDF} className="flex items-center gap-2 px-4 py-2 bg-[#1a2233] text-gray-400 rounded-xl text-xs font-bold border border-gray-800 hover:bg-[#252f44]">
              <FileDown size={18} className="text-red-500" /> PDF
            </button>
          </div>
        </div>

        {/* FORMULÁRIO */}
        <div className="bg-[#111827]/50 p-6 rounded-2xl border border-gray-800/50 mb-4 shadow-xl">
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
              <button type="submit" className="bg-emerald-600 hover:bg-emerald-500 text-white font-black text-[10px] px-6 py-3.5 rounded-xl uppercase flex items-center gap-2 shadow-lg">
                {editingId ? <Check size={18} /> : <Plus size={18} />} GRAVAR
              </button>
              <button type="button" onClick={() => { setEditingId(null); setFormData(initialForm); }} className="bg-gray-800 p-3.5 rounded-xl text-slate-500 hover:text-white">
                <RotateCcw size={18}/>
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* TABELA - Ocupa o espaço central com scroll próprio */}
      <div className="bg-[#111827]/30 rounded-2xl border border-gray-800 mb-4 flex-1 min-h-0 shadow-2xl overflow-hidden">
        <div className="h-full overflow-auto scrollbar-custom">
          <table className="min-w-[1200px] w-full text-left text-[11px] border-separate border-spacing-0">
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
                <tr key={v.id} className="hover:bg-emerald-500/5 group">
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
                  <td className="p-4 text-center sticky right-0 bg-[#0a0f18] group-hover:bg-[#161d2b]">
                    <div className="flex justify-center gap-1">
                      <button onClick={() => { setEditingId(v.id); setFormData({...v}); }} className="p-2 text-slate-500 hover:text-cyan-400"><Edit3 size={16}/></button>
                      <button onClick={() => { if(confirm('Eliminar?')) deleteDoc(doc(db, 'vendas', v.id)) }} className="p-2 text-slate-600 hover:text-red-500"><Trash2 size={16}/></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* RODAPÉ - Mantido visível no fundo */}
      <footer className="bg-[#0c121d] border border-gray-800 p-4 rounded-2xl flex flex-col md:flex-row gap-6 px-6 items-center shrink-0 shadow-2xl">
        <div className="flex-1 flex flex-col">
          <span className="text-[10px] text-cyan-500 font-black uppercase mb-1 tracking-widest">BOVINOS FATURADOS</span>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-black text-white">{resumoB.valor.toLocaleString()} Kz</span>
            <span className="text-sm font-black text-cyan-500 uppercase">{resumoB.total} CAB</span>
          </div>
        </div>
        <div className="flex-1 flex flex-col border-l border-gray-800 pl-6">
          <span className="text-[10px] text-pink-500 font-black uppercase mb-1 tracking-widest">SUÍNOS FATURADOS</span>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-black text-white">{resumoS.valor.toLocaleString()} Kz</span>
            <span className="text-sm font-black text-pink-500 uppercase">{resumoS.total} CAB</span>
          </div>
        </div>
        <div className="shrink-0 flex items-center gap-4 bg-emerald-500/10 p-4 rounded-xl border border-emerald-500/20 text-right">
          <TrendingUp size={24} className="text-emerald-500" />
          <div className="flex flex-col">
            <span className="text-[9px] font-black text-emerald-500 uppercase tracking-widest">FATURAMENTO TOTAL ({totalUnidades} UN)</span>
            <span className="text-2xl font-black text-emerald-500 leading-none">{totalGeral.toLocaleString()} Kz</span>
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
