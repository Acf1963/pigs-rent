import { useState, useEffect, useRef } from 'react';
import { db } from '../lib/firebase';
import { collection, addDoc, onSnapshot, query, deleteDoc, doc, orderBy } from 'firebase/firestore';
import { 
  ShoppingCart, Plus, Trash2, Check, UploadCloud, 
  FileSpreadsheet, FileText, RotateCcw, TrendingUp, User, Scale
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

  // 1. Listeners do Firebase
  useEffect(() => {
    const q = query(collection(db, 'vendas'), orderBy('dataVenda', 'desc'));
    const unsub = onSnapshot(q, (snap) => {
      setVendas(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });
    return () => unsub();
  }, []);

  // 2. Cálculos Globais (Usados no ecrã e nos exports para evitar erros 6133)
  const faturamentoTotal = vendas.reduce((acc, v) => acc + (Number(v.pesoKg) * Number(v.precoKz) || 0), 0);
  const pesoTotal = vendas.reduce((acc, v) => acc + (Number(v.pesoKg) || 0), 0);

  // 3. Exportação Excel
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

  // 4. Exportação PDF
  const exportToPDF = () => {
    const docPDF = new jsPDF('l', 'mm', 'a4');
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
    docPDF.text(`FATURAMENTO TOTAL: ${faturamentoTotal.toLocaleString()} Kz`, 14, finalY + 5);
    docPDF.save("Vendas_Fazenda_Kwanza.pdf");
  };

  // 5. Importação Excel
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
      pesoKg: parseFloat(formData.pesoKg as string) || 0,
      precoKz: parseFloat(formData.precoKz as string) || 0,
      createdAt: new Date().toISOString()
    });
    setFormData(initialForm);
  };

  return (
    <div className="space-y-4 md:space-y-6 pb-24 lg:pb-0">
      
      {/* HEADER ADAPTATIVO */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-slate-800/50 pb-6">
        <div className="flex items-center gap-4">
          <div className="bg-emerald-500/10 p-3 rounded-2xl border border-emerald-500/20 shadow-inner">
            <ShoppingCart className="text-emerald-500" size={32} />
          </div>
          <div>
            <h1 className="text-2xl md:text-3xl font-black text-white uppercase tracking-tighter leading-none">Vendas</h1>
            <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest italic mt-1">Fazenda Kwanza</p>
          </div>
        </div>

        <div className="flex flex-wrap gap-2 w-full md:w-auto bg-[#161922] p-1.5 rounded-2xl border border-slate-800 shadow-xl">
          <input type="file" ref={fileInputRef} className="hidden" onChange={handleFileUpload} />
          <button onClick={() => fileInputRef.current?.click()} className="flex-1 md:flex-none bg-[#1e293b] text-slate-300 px-4 py-2.5 rounded-xl text-[10px] font-black uppercase flex items-center justify-center gap-2 hover:bg-slate-800 border border-slate-700/50 transition-all active:scale-95">
            <UploadCloud size={14} className="text-cyan-500" /> Importar
          </button>
          <button onClick={exportToExcel} className="flex-1 md:flex-none bg-[#1e293b] text-slate-300 px-4 py-2.5 rounded-xl text-[10px] font-black uppercase flex items-center justify-center gap-2 hover:bg-slate-800 border border-slate-700/50 transition-all active:scale-95">
            <FileSpreadsheet size={14} className="text-emerald-400" /> Excel
          </button>
          <button onClick={exportToPDF} className="flex-1 md:flex-none bg-[#1e293b] text-slate-300 px-4 py-2.5 rounded-xl text-[10px] font-black uppercase flex items-center justify-center gap-2 hover:bg-slate-800 border border-slate-700/50 transition-all active:scale-95">
            <FileText size={14} className="text-red-400" /> PDF
          </button>
        </div>
      </div>

      {/* FORMULÁRIO RESPONSIVO */}
      <div className="bg-[#161922] rounded-3xl md:rounded-[2rem] border border-slate-800/50 p-4 md:p-6 shadow-2xl">
        <form onSubmit={handleSubmit} className="flex flex-col md:grid md:grid-cols-12 gap-4 items-end">
          
          <div className="md:col-span-2 space-y-1 w-full">
            <label className="text-[8px] font-black text-slate-500 uppercase px-1">Lote Saída</label>
            <input required className="w-full bg-[#0f121a] border border-slate-800 p-3 rounded-xl text-white font-bold outline-none text-xs uppercase focus:border-emerald-500/50 transition-all" placeholder="LOTE ID" value={formData.codigoLote} onChange={e => setFormData({...formData, codigoLote: e.target.value.toUpperCase()})} />
          </div>

          <div className="md:col-span-3 space-y-1 w-full">
            <label className="text-[8px] font-black text-slate-500 uppercase px-1">Cliente</label>
            <div className="relative">
              <User className="absolute left-3 top-3 text-slate-700" size={14} />
              <input required className="w-full bg-[#0f121a] border border-slate-800 p-3 pl-10 rounded-xl text-white font-bold outline-none text-xs uppercase" placeholder="COMPRADOR" value={formData.cliente} onChange={e => setFormData({...formData, cliente: e.target.value.toUpperCase()})} />
            </div>
          </div>

          <div className="grid grid-cols-2 md:col-span-4 gap-4 w-full">
            <div className="space-y-1">
              <label className="text-[8px] font-black text-emerald-500 uppercase px-1">Peso (Kg)</label>
              <div className="relative">
                <Scale className="absolute left-3 top-3 text-emerald-900" size={14} />
                <input type="number" step="0.1" required className="w-full bg-[#0f121a] border border-slate-800 p-3 pl-10 rounded-xl text-emerald-500 font-black outline-none text-xs" value={formData.pesoKg} onChange={e => setFormData({...formData, pesoKg: e.target.value})} />
              </div>
            </div>
            <div className="space-y-1">
              <label className="text-[8px] font-black text-emerald-500 uppercase px-1">Kz/Kg</label>
              <div className="relative">
                <TrendingUp className="absolute left-3 top-3 text-emerald-900" size={14} />
                <input type="number" required className="w-full bg-[#0f121a] border border-slate-800 p-3 pl-10 rounded-xl text-emerald-500 font-black outline-none text-xs" value={formData.precoKz} onChange={e => setFormData({...formData, precoKz: e.target.value})} />
              </div>
            </div>
          </div>

          <div className="md:col-span-3 flex gap-2 w-full pt-2 md:pt-0">
            <button type="submit" className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white font-black text-[10px] py-3.5 rounded-xl transition-all shadow-lg uppercase flex items-center justify-center gap-2 active:scale-95">
              <Plus size={16} /> Confirmar
            </button>
            <button type="button" onClick={() => setFormData(initialForm)} className="bg-slate-800 p-3.5 rounded-xl text-slate-500 hover:text-white transition-all">
              <RotateCcw size={16}/>
            </button>
          </div>
        </form>
      </div>

      {/* TABELA COM SCROLL HORIZONTAL */}
      <div className="bg-[#161922] rounded-3xl md:rounded-[2rem] border border-slate-800/50 shadow-2xl overflow-hidden flex flex-col">
        <div className="overflow-x-auto custom-scrollbar flex-1"> 
          <table className="w-full text-left text-[10px] min-w-[900px]">
            <thead className="bg-black/30 text-slate-500 font-black uppercase text-[8px] border-b border-slate-800/50 sticky top-0 z-10 backdrop-blur-md">
              <tr>
                <th className="p-4">LOTE</th>
                <th className="p-4">DATA</th>
                <th className="p-4">CLIENTE</th>
                <th className="p-4 text-center">PESO</th>
                <th className="p-4 text-center">PREÇO/KG</th>
                <th className="p-4 text-center">TOTAL VENDA</th>
                <th className="p-4 text-center">AÇÕES</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/20">
              {vendas.map((v) => (
                <tr key={v.id} className="hover:bg-emerald-500/[0.02] transition-colors group">
                  <td className="p-4 font-black text-cyan-500 uppercase">{v.codigoLote}</td>
                  <td className="p-4 text-slate-500 font-bold">{v.dataVenda?.split('-').reverse().join('/')}</td>
                  <td className="p-4 text-white font-black uppercase text-[9px]">{v.cliente}</td>
                  <td className="p-4 text-center text-emerald-400 font-black">{v.pesoKg} Kg</td>
                  <td className="p-4 text-center text-emerald-500/80 font-bold">{Number(v.precoKz).toLocaleString()} Kz</td>
                  <td className="p-4 text-center">
                    <span className="bg-emerald-500/10 text-emerald-400 px-3 py-1.5 rounded-lg font-black border border-emerald-500/10 group-hover:border-emerald-500/30 transition-all">
                      {(Number(v.pesoKg) * Number(v.precoKz)).toLocaleString()} Kz
                    </span>
                  </td>
                  <td className="p-4 text-center">
                    <button onClick={() => { if(confirm('Eliminar venda?')) deleteDoc(doc(db, 'vendas', v.id)) }} className="p-2 text-slate-600 hover:text-red-500 transition-all rounded-lg hover:bg-red-500/10">
                      <Trash2 size={16}/>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        
        {/* RODAPÉ FINANCEIRO */}
        <div className="p-4 bg-black/40 border-t border-slate-800/50 flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex gap-8">
            <div className="flex flex-col">
              <span className="text-[7px] font-black text-slate-500 uppercase tracking-widest">Peso Escoado</span>
              <span className="text-xs font-black text-emerald-400">{pesoTotal.toLocaleString()} Kg</span>
            </div>
            <div className="flex flex-col">
              <span className="text-[7px] font-black text-slate-500 uppercase tracking-widest">Faturamento</span>
              <span className="text-sm font-black text-emerald-500">{faturamentoTotal.toLocaleString()} Kz</span>
            </div>
          </div>
          <div className="flex items-center gap-2 opacity-30">
            <Check size={14} className="text-emerald-500" />
            <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest italic">Dados Comercializados</p>
          </div>
        </div>
      </div>
    </div>
  );
}
