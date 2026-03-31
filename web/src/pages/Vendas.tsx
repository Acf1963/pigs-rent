import { useState, useEffect, useRef } from 'react';
import { db } from '../lib/firebase';
import { collection, addDoc, onSnapshot, query, deleteDoc, doc, orderBy } from 'firebase/firestore';
import { 
  ShoppingCart, Plus, Trash2, Check, UploadCloud, 
  FileSpreadsheet, FileText, RotateCcw, TrendingUp, User 
} from 'lucide-react';

import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export default function VendasPage() {
  const [vendas, setVendas] = useState<any[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const initialForm = {
    codigoLote: '',
    dataVenda: new Date().toISOString().split('T')[0],
    cliente: '',
    produto: 'BOVINO VIVO',
    pesoKg: '',
    precoKz: ''
  };

  const [formData, setFormData] = useState(initialForm);

  useEffect(() => {
    const q = query(collection(db, 'vendas'), orderBy('dataVenda', 'desc'));
    const unsub = onSnapshot(q, (snap) => {
      setVendas(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });
    return () => unsub();
  }, []);

  const exportToExcel = () => {
    const data = vendas.map(v => ({
      Lote: v.codigoLote,
      Data: v.dataVenda,
      Cliente: v.cliente,
      Produto: v.produto,
      'Peso (Kg)': v.pesoKg,
      'Preço (Kz/Kg)': v.precoKz,
      'Total (Kz)': Number(v.pesoKg) * Number(v.precoKz)
    }));
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Vendas_Kwanza");
    XLSX.writeFile(wb, `Comercial_Kwanza_${new Date().getFullYear()}.xlsx`);
  };

  const exportToPDF = () => {
    const docPDF = new jsPDF('l', 'mm', 'a4');
    const faturamentoTotal = vendas.reduce((acc, v) => acc + (Number(v.pesoKg) * Number(v.precoKz) || 0), 0);

    docPDF.setFontSize(18);
    docPDF.text("FAZENDA KWANZA - RELATÓRIO COMERCIAL", 14, 15);
    
    autoTable(docPDF, {
      head: [["LOTE", "DATA", "CLIENTE", "PRODUTO", "PESO (KG)", "PREÇO (KZ)", "TOTAL (KZ)"]],
      body: vendas.map(v => [
        v.codigoLote,
        v.dataVenda.split('-').reverse().join('/'),
        v.cliente.toUpperCase(),
        v.produto.toUpperCase(),
        `${v.pesoKg} Kg`,
        `${Number(v.precoKz).toLocaleString()} Kz`,
        `${(Number(v.pesoKg) * Number(v.precoKz)).toLocaleString()} Kz`
      ]),
      startY: 25,
      headStyles: { fillColor: [16, 185, 129] }
    });

    const finalY = (docPDF as any).lastAutoTable.finalY + 10;
    docPDF.setFontSize(12);
    docPDF.text(`FATURAMENTO TOTAL: ${faturamentoTotal.toLocaleString()} Kz`, 14, finalY + 10);
    docPDF.save("Vendas_Fazenda_Kwanza.pdf");
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
            codigoLote: String(item.codigoLote || 'N/A').toUpperCase(),
            dataVenda: item.dataVenda instanceof Date ? item.dataVenda.toISOString().split('T')[0] : (item.dataVenda || new Date().toISOString().split('T')[0]),
            cliente: String(item.cliente || 'CLIENTE GERAL').toUpperCase(),
            produto: String(item.produto || 'CARNE').toUpperCase(),
            pesoKg: parseFloat(item.pesoKg) || 0,
            precoKz: parseFloat(item.precoKz) || 0,
            createdAt: new Date().toISOString() 
          });
        }
      } catch (err) { console.error("Erro na importação:", err); }
    };
    reader.readAsBinaryString(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await addDoc(collection(db, 'vendas'), {
      ...formData,
      pesoKg: parseFloat(formData.pesoKg),
      precoKz: parseFloat(formData.precoKz),
      createdAt: new Date().toISOString()
    });
    setFormData(initialForm);
  };

  const faturamentoTotal = vendas.reduce((acc, v) => acc + (Number(v.pesoKg) * Number(v.precoKz) || 0), 0);
  const pesoTotal = vendas.reduce((acc, v) => acc + (Number(v.pesoKg) || 0), 0);

  return (
    <div className="h-full flex flex-col space-y-4 pb-20 md:pb-6 overflow-hidden">
      
      {/* HEADER DINÂMICO */}
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 shrink-0">
        <div className="flex items-center gap-4">
          <div className="bg-emerald-500/10 p-3 rounded-2xl border border-emerald-500/20 shadow-inner">
            <ShoppingCart className="text-emerald-500" size={28} />
          </div>
          <div>
            <h1 className="text-2xl md:text-3xl font-black text-white uppercase tracking-tighter leading-none">Vendas & Saídas</h1>
            <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mt-1 italic">Gestão Comercial Fazenda Kwanza</p>
          </div>
        </div>

        <div className="flex gap-2 bg-[#161922] p-1.5 rounded-2xl border border-slate-800 shadow-xl w-full md:w-auto">
          <input type="file" ref={fileInputRef} className="hidden" onChange={handleFileUpload} />
          <button onClick={() => fileInputRef.current?.click()} className="flex-1 md:flex-none bg-[#1e293b] text-slate-300 px-4 py-2.5 rounded-xl text-[10px] font-black uppercase flex items-center justify-center gap-2 hover:bg-slate-800 transition-all border border-slate-700/50 active:scale-95">
            <UploadCloud size={14} className="text-cyan-500" /> Importar
          </button>
          <button onClick={exportToExcel} className="flex-1 md:flex-none bg-[#1e293b] text-slate-300 px-4 py-2.5 rounded-xl text-[10px] font-black uppercase flex items-center justify-center gap-2 hover:bg-slate-800 transition-all border border-slate-700/50 active:scale-95">
            <FileSpreadsheet size={14} className="text-emerald-400" /> Excel
          </button>
          <button onClick={exportToPDF} className="flex-1 md:flex-none bg-[#1e293b] text-slate-300 px-4 py-2.5 rounded-xl text-[10px] font-black uppercase flex items-center justify-center gap-2 hover:bg-slate-800 transition-all border border-slate-700/50 active:scale-95">
            <FileText size={14} className="text-red-400" /> PDF
          </button>
        </div>
      </header>

      {/* FORMULÁRIO COMERCIAL */}
      <div className="bg-[#161922] rounded-[2rem] border border-slate-800/50 p-6 md:p-8 shrink-0 shadow-2xl">
        <form onSubmit={handleSubmit} className="flex flex-col md:grid md:grid-cols-12 gap-4 items-end">
          <div className="md:col-span-2 space-y-1 w-full">
            <label className="text-[9px] font-black text-slate-500 uppercase px-1">Lote de Saída</label>
            <input required className="w-full bg-[#0f121a] border border-slate-800 p-3 rounded-xl text-white font-black outline-none text-xs focus:border-emerald-500/50 transition-colors uppercase" placeholder="LOTE ID" value={formData.codigoLote} onChange={e => setFormData({...formData, codigoLote: e.target.value.toUpperCase()})} />
          </div>

          <div className="md:col-span-3 space-y-1 w-full">
            <label className="text-[9px] font-black text-slate-500 uppercase px-1">Cliente / Destino</label>
            <div className="relative">
              <User className="absolute left-3 top-3 text-slate-700" size={14} />
              <input required className="w-full bg-[#0f121a] border border-slate-800 p-3 pl-10 rounded-xl text-white font-bold outline-none text-xs uppercase" placeholder="NOME DO COMPRADOR" value={formData.cliente} onChange={e => setFormData({...formData, cliente: e.target.value.toUpperCase()})} />
            </div>
          </div>

          <div className="grid grid-cols-2 md:col-span-4 gap-3 w-full">
            <div className="space-y-1">
              <label className="text-[9px] font-black text-emerald-500 uppercase px-1">Peso Total (Kg)</label>
              <input type="number" step="0.1" required className="w-full bg-[#0f121a] border border-slate-800 p-3 rounded-xl text-emerald-500 font-black outline-none text-xs" value={formData.pesoKg} onChange={e => setFormData({...formData, pesoKg: e.target.value})} />
            </div>
            <div className="space-y-1">
              <label className="text-[9px] font-black text-emerald-500 uppercase px-1">Preço (Kz/Kg)</label>
              <div className="relative">
                <TrendingUp className="absolute left-3 top-3 text-emerald-900" size={14} />
                <input type="number" required className="w-full bg-[#0f121a] border border-slate-800 p-3 pl-10 rounded-xl text-emerald-500 font-black outline-none text-xs" value={formData.precoKz} onChange={e => setFormData({...formData, precoKz: e.target.value})} />
              </div>
            </div>
          </div>

          <div className="md:col-span-3 flex gap-2 w-full">
            <button type="submit" className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white font-black text-[11px] py-4 rounded-xl transition-all shadow-lg uppercase flex items-center justify-center gap-2 active:scale-95">
              <Plus size={16} /> Confirmar Venda
            </button>
            <button type="button" onClick={() => setFormData(initialForm)} className="bg-slate-800 text-slate-500 p-4 rounded-xl hover:text-white transition-all">
              <RotateCcw size={16} />
            </button>
          </div>
        </form>
      </div>

      {/* TABELA DE VENDAS */}
      <div className="flex-1 min-h-0 bg-[#161922] rounded-[2rem] border border-slate-800/50 shadow-2xl overflow-hidden flex flex-col">
        <div className="overflow-x-auto overflow-y-auto flex-1 custom-scrollbar"> 
          <table className="w-full text-left text-[10px] min-w-[1000px] border-separate border-spacing-0">
            <thead className="bg-black/40 text-slate-500 font-black uppercase text-[8px] sticky top-0 z-20 backdrop-blur-md">
              <tr>
                <th className="p-5 border-b border-slate-800/50">LOTE</th>
                <th className="p-5 border-b border-slate-800/50">DATA VENDA</th>
                <th className="p-5 border-b border-slate-800/50">CLIENTE</th>
                <th className="p-5 border-b border-slate-800/50 text-center">PESO</th>
                <th className="p-5 border-b border-slate-800/50 text-center">PREÇO/KG</th>
                <th className="p-5 border-b border-slate-800/50 text-center">TOTAL VENDA</th>
                <th className="p-5 border-b border-slate-800/50 text-center">AÇÕES</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/20">
              {vendas.map((v) => (
                <tr key={v.id} className="hover:bg-emerald-500/[0.02] transition-colors group">
                  <td className="p-5 font-black text-cyan-500 uppercase text-sm">{v.codigoLote}</td>
                  <td className="p-5 text-slate-400 font-bold text-xs">{v.dataVenda?.split('-').reverse().join('/')}</td>
                  <td className="p-5 text-white font-black uppercase text-xs">{v.cliente}</td>
                  <td className="p-5 text-emerald-400 font-black text-center text-sm">{v.pesoKg} Kg</td>
                  <td className="p-5 text-emerald-500/80 font-bold text-center text-xs">{Number(v.precoKz).toLocaleString()} Kz</td>
                  <td className="p-5 text-center">
                    <span className="bg-emerald-500/10 text-emerald-400 px-4 py-2 rounded-xl font-black text-sm border border-emerald-500/20 group-hover:border-emerald-500 transition-colors">
                      {(Number(v.pesoKg) * Number(v.precoKz)).toLocaleString()} Kz
                    </span>
                  </td>
                  <td className="p-5 text-center">
                    <button onClick={() => { if(confirm('Eliminar registo de venda?')) deleteDoc(doc(db, 'vendas', v.id)) }} className="p-2.5 bg-slate-800/50 rounded-lg text-slate-600 hover:text-red-500 transition-all">
                      <Trash2 size={16}/>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        
        {/* RODAPÉ FINANCEIRO */}
        <div className="p-5 bg-black/40 border-t border-slate-800/50 flex justify-between items-center px-10 shrink-0">
          <div className="flex gap-12">
            <div className="flex flex-col">
              <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Efetivo Vendido</span>
              <span className="text-base font-black text-white">{vendas.length} Registos</span>
            </div>
            <div className="flex flex-col">
              <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Peso Total Escoado</span>
              <span className="text-base font-black text-emerald-400">{pesoTotal.toLocaleString()} Kg</span>
            </div>
            <div className="flex flex-col">
              <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Faturamento Acumulado</span>
              <span className="text-xl font-black text-emerald-500">{faturamentoTotal.toLocaleString()} Kz</span>
            </div>
          </div>
          <div className="hidden md:flex items-center gap-3 text-emerald-500 text-[10px] font-black uppercase tracking-[0.2em] opacity-40">
            <Check size={18} /> Fluxo de Caixa Atualizado
          </div>
        </div>
      </div>
    </div>
  );
}
