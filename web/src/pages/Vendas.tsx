import { useState, useEffect, useRef } from 'react';
import { db } from '../lib/firebase';
import { collection, addDoc, onSnapshot, query, orderBy, deleteDoc, doc, updateDoc } from 'firebase/firestore';
import { 
  ShoppingBag, FileSpreadsheet, FileText, UploadCloud, Trash2, Edit3, RotateCcw, Check
} from 'lucide-react';

import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export default function VendasPage() {
  const [registos, setRegistos] = useState<any[]>([]);
  const [lotes, setLotes] = useState<any[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const initialForm = {
    loteId: '',
    dataVenda: new Date().toISOString().split('T')[0],
    cliente: '',
    produto: '',
    pesoKg: '',
    precoKz: '',
  };

  const [formData, setFormData] = useState(initialForm);

  useEffect(() => {
    const qVendas = query(collection(db, 'vendas'), orderBy('dataVenda', 'desc'));
    const unsubscribeVendas = onSnapshot(qVendas, (snapshot) => {
      setRegistos(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    const qLotes = query(collection(db, 'lotes'));
    const unsubscribeLotes = onSnapshot(qLotes, (snapshot) => {
      setLotes(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    return () => { unsubscribeVendas(); unsubscribeLotes(); };
  }, []);

  const resolverData = (data: any) => {
    if (!data) return '---';
    if (typeof data === 'string' && data.includes('-')) {
      return data.split('T')[0].split('-').reverse().join('/');
    }
    return String(data);
  };

  const exportToExcel = () => {
    const ws = XLSX.utils.json_to_sheet(registos.map(r => ({
      Lote: r.loteId,
      Data: r.dataVenda,
      Cliente: r.cliente,
      Produto: r.produto,
      Peso: r.pesoKg,
      Preco: r.precoKz,
      Total: (Number(r.pesoKg || 0) * Number(r.precoKz || 0))
    })));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Vendas");
    XLSX.writeFile(wb, `Vendas_AgroRent.xlsx`);
  };

  const exportToPDF = () => {
    const docPDF = new jsPDF('l', 'mm', 'a4');
    docPDF.text("AgroRent - Relatório de Vendas", 14, 15);
    autoTable(docPDF, {
      head: [["LOTE", "DATA", "CLIENTE", "PRODUTO", "PESO (KG)", "PREÇO (KZ)", "TOTAL"]],
      body: registos.map(r => [
        r.loteId, resolverData(r.dataVenda), r.cliente, r.produto, r.pesoKg, r.precoKz, 
        (Number(r.pesoKg) * Number(r.precoKz)).toLocaleString()
      ]),
      startY: 20,
      headStyles: { fillColor: [16, 185, 129] }
    });
    docPDF.save("Relatorio_Vendas.pdf");
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
          await addDoc(collection(db, 'vendas'), { 
            loteId: (item.codigoLote || 'N/A').toString().toUpperCase(),
            dataVenda: item.dataVenda instanceof Date ? item.dataVenda.toISOString().split('T')[0] : (item.dataVenda || new Date().toISOString().split('T')[0]),
            cliente: (item.cliente || 'N/A').toString().toUpperCase(),
            produto: (item.produto || 'N/A').toString().toUpperCase(),
            pesoKg: parseFloat(item.pesoKg) || 0,
            precoKz: parseFloat(item.precoKz) || 0,
            createdAt: new Date().toISOString() 
          });
        }
      } catch (err) { console.error(err); }
    };
    reader.readAsBinaryString(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload = { ...formData, pesoKg: parseFloat(formData.pesoKg as string), precoKz: parseFloat(formData.precoKz as string) };
    if (editingId) {
      await updateDoc(doc(db, 'vendas', editingId), payload);
      setEditingId(null);
    } else {
      await addDoc(collection(db, 'vendas'), { ...payload, createdAt: new Date().toISOString() });
    }
    setFormData(initialForm);
  };

  return (
    <div className="h-[calc(100vh-2rem)] flex flex-col space-y-6 overflow-hidden text-white">
      {/* HEADER */}
      <div className="flex justify-between items-center shrink-0">
        <div className="flex items-center gap-3">
          <div className="bg-emerald-500/20 p-2 rounded-lg"><ShoppingBag className="text-emerald-400" size={32} /></div>
          <h1 className="text-3xl font-black uppercase tracking-tighter">Vendas</h1>
        </div>

        <div className="flex gap-2 bg-[#161922] p-1.5 rounded-2xl border border-slate-800">
          <input type="file" ref={fileInputRef} className="hidden" onChange={handleFileUpload} />
          <button onClick={() => fileInputRef.current?.click()} className="bg-[#1e293b] text-slate-300 px-4 py-2 rounded-xl text-[10px] font-black uppercase flex items-center gap-2 hover:bg-slate-800 border border-slate-700/50 transition-all">
            <UploadCloud size={14} className="text-emerald-500" /> Importar
          </button>
          <button onClick={exportToExcel} className="bg-[#1e293b] text-slate-300 px-4 py-2 rounded-xl text-[10px] font-black uppercase flex items-center gap-2 hover:bg-slate-800 border border-slate-700/50 transition-all">
            <FileSpreadsheet size={14} className="text-emerald-400" /> Excel
          </button>
          <button onClick={exportToPDF} className="bg-[#1e293b] text-slate-300 px-4 py-2 rounded-xl text-[10px] font-black uppercase flex items-center gap-2 hover:bg-slate-800 border border-slate-700/50 transition-all">
            <FileText size={14} className="text-red-400" /> PDF
          </button>
        </div>
      </div>

      {/* FORMULÁRIO */}
      <div className="bg-[#161922] rounded-[2rem] border border-slate-800/50 p-6 shrink-0 shadow-2xl">
        <form onSubmit={handleSubmit} className="grid grid-cols-12 gap-3">
          <div className="col-span-2 space-y-1">
            <label className="text-[8px] font-black text-slate-500 uppercase px-1">Lote</label>
            <select required className="w-full bg-[#0f121a] border border-slate-800 p-2.5 rounded-xl text-cyan-500 font-bold outline-none text-xs" value={formData.loteId} onChange={e => setFormData({...formData, loteId: e.target.value})}>
              <option value="">SELECIONE...</option>
              {lotes.map(l => <option key={l.id} value={l.loteId}>{l.loteId}</option>)}
            </select>
          </div>
          <div className="col-span-2 space-y-1">
            <label className="text-[8px] font-black text-slate-500 uppercase px-1">Data</label>
            <input type="date" required className="w-full bg-[#0f121a] border border-slate-800 p-2.5 rounded-xl outline-none text-xs" value={formData.dataVenda} onChange={e => setFormData({...formData, dataVenda: e.target.value})} />
          </div>
          <div className="col-span-2 space-y-1">
            <label className="text-[8px] font-black text-slate-500 uppercase px-1">Cliente</label>
            <input required className="w-full bg-[#0f121a] border border-slate-800 p-2.5 rounded-xl outline-none text-xs uppercase" value={formData.cliente} onChange={e => setFormData({...formData, cliente: e.target.value.toUpperCase()})} />
          </div>
          <div className="col-span-2 space-y-1">
            <label className="text-[8px] font-black text-slate-500 uppercase px-1">Produto</label>
            <input required className="w-full bg-[#0f121a] border border-slate-800 p-2.5 rounded-xl outline-none text-xs uppercase" value={formData.produto} onChange={e => setFormData({...formData, produto: e.target.value.toUpperCase()})} />
          </div>
          <div className="col-span-1 space-y-1">
            <label className="text-[8px] font-black text-emerald-500 uppercase px-1">Peso (Kg)</label>
            <input type="number" step="0.1" required className="w-full bg-[#0f121a] border border-slate-800 p-2.5 rounded-xl text-emerald-500 outline-none text-xs" value={formData.pesoKg} onChange={e => setFormData({...formData, pesoKg: e.target.value})} />
          </div>
          <div className="col-span-2 space-y-1">
            <label className="text-[8px] font-black text-cyan-500 uppercase px-1">Preço (Kz)</label>
            <input type="number" required className="w-full bg-[#0f121a] border border-slate-800 p-2.5 rounded-xl text-cyan-500 outline-none text-xs" value={formData.precoKz} onChange={e => setFormData({...formData, precoKz: e.target.value})} />
          </div>
          <div className="col-span-1 flex gap-2 items-end">
            <button type="submit" className="flex-1 bg-emerald-600 hover:bg-emerald-500 py-3 rounded-xl flex items-center justify-center transition-all"><Check size={14}/></button>
            <button type="button" onClick={() => {setEditingId(null); setFormData(initialForm);}} className="bg-slate-800 p-3 rounded-xl hover:text-white transition-all"><RotateCcw size={14}/></button>
          </div>
        </form>
      </div>

      {/* TABELA COM PRODUTO E ACUMULADO */}
      <div className="flex-1 min-h-0 bg-[#161922] rounded-[2rem] border border-slate-800/50 overflow-hidden flex flex-col shadow-2xl">
        <div className="overflow-auto flex-1 custom-scrollbar"> 
          <table className="w-full text-left text-[10px] min-w-[1100px]">
            <thead className="bg-black/30 text-slate-500 font-black uppercase text-[8px] sticky top-0 z-10 backdrop-blur-md">
              <tr>
                <th className="p-4">LOTE</th>
                <th className="p-4">DATA</th>
                <th className="p-4">CLIENTE</th>
                <th className="p-4">PRODUTO</th>
                <th className="p-4 text-center">PESO (KG)</th>
                <th className="p-4">ACUMULADO (TOTAL)</th>
                <th className="p-4 text-center">AÇÕES</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/30">
              {registos.map((r) => (
                <tr key={r.id} className="hover:bg-slate-800/10 h-[50px] transition-colors">
                  <td className="p-4 font-black text-cyan-500 uppercase">{r.loteId}</td>
                  <td className="p-4 text-slate-400 font-bold">{resolverData(r.dataVenda)}</td>
                  <td className="p-4 font-black uppercase text-white">{r.cliente}</td>
                  <td className="p-4 text-slate-300 uppercase">{r.produto || '---'}</td>
                  <td className="p-4 text-emerald-500 font-bold text-center">{Number(r.pesoKg || 0).toFixed(1)}kg</td>
                  <td className="p-4 text-emerald-400 font-black">{(Number(r.pesoKg || 0) * Number(r.precoKz || 0)).toLocaleString()} Kz</td>
                  <td className="p-4 text-center">
                    <div className="flex justify-center gap-3">
                      <button onClick={() => { setEditingId(r.id); setFormData({...r}); }} className="text-slate-600 hover:text-emerald-400"><Edit3 size={14}/></button>
                      <button onClick={() => { if(confirm('Eliminar?')) deleteDoc(doc(db, 'vendas', r.id)) }} className="text-slate-600 hover:text-red-500"><Trash2 size={14}/></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
