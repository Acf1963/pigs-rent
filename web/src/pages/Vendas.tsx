import { useState, useEffect, useRef } from 'react';
import { db } from '../lib/firebase';
import { collection, addDoc, onSnapshot, query, deleteDoc, doc, orderBy } from 'firebase/firestore';
import { 
  ShoppingCart, Plus, Trash2, Check, UploadCloud, 
  FileSpreadsheet, FileText, RotateCcw 
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
    produto: '',
    pesoKg: '',
    precoKz: ''
  };

  const [formData, setFormData] = useState(initialForm);

  // 1. Carregar Vendas em Tempo Real
  useEffect(() => {
    const q = query(collection(db, 'vendas'), orderBy('dataVenda', 'desc'));
    const unsub = onSnapshot(q, (snap) => {
      setVendas(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });
    return () => unsub();
  }, []);

  // --- EXPORTAÇÃO EXCEL ---
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
    XLSX.utils.book_append_sheet(wb, ws, "Vendas");
    XLSX.writeFile(wb, `Vendas_Kwanza_${new Date().getFullYear()}.xlsx`);
  };

  // --- EXPORTAÇÃO PDF COM RESUMO FINANCEIRO ---
  const exportToPDF = () => {
    const docPDF = new jsPDF('l', 'mm', 'a4');
    const totalPeso = vendas.reduce((acc, v) => acc + (Number(v.pesoKg) || 0), 0);
    const faturamentoTotal = vendas.reduce((acc, v) => acc + (Number(v.pesoKg) * Number(v.precoKz) || 0), 0);
    const precoMedio = totalPeso > 0 ? (faturamentoTotal / totalPeso).toFixed(2) : 0;

    docPDF.setFontSize(18);
    docPDF.setTextColor(15, 23, 42);
    docPDF.text("FAZENDA KWANZA - RELATÓRIO DE VENDAS", 14, 15);
    
    docPDF.setFontSize(10);
    docPDF.setTextColor(100, 100, 100);
    docPDF.text(`Relatório Comercial | Gerado em: ${new Date().toLocaleString('pt-AO')}`, 14, 22);

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
      startY: 30,
      headStyles: { fillColor: [16, 185, 129], textColor: [255, 255, 255] }, // Emerald para vendas
      alternateRowStyles: { fillColor: [245, 247, 250] }
    });

    const finalY = (docPDF as any).lastAutoTable.finalY + 15;
    docPDF.setFillColor(15, 23, 42);
    docPDF.rect(14, finalY, 269, 18, 'F');
    
    docPDF.setFontSize(11);
    docPDF.setTextColor(255, 255, 255);
    docPDF.setFont("helvetica", "bold");
    docPDF.text(`PESO TOTAL: ${totalPeso.toLocaleString()} Kg`, 25, finalY + 11);
    docPDF.text(`PREÇO MÉDIO: ${precoMedio} Kz/Kg`, 110, finalY + 11);
    docPDF.setTextColor(52, 211, 153);
    docPDF.text(`FATURAMENTO TOTAL: ${faturamentoTotal.toLocaleString()} Kz`, 190, finalY + 11);

    docPDF.save("Relatorio_Vendas_Kwanza.pdf");
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
            codigoLote: (item.codigoLote || 'N/A').toString().toUpperCase(),
            dataVenda: item.dataVenda instanceof Date ? item.dataVenda.toISOString().split('T')[0] : (item.dataVenda || new Date().toISOString().split('T')[0]),
            cliente: (item.cliente || 'CLIENTE GERAL').toString().toUpperCase(),
            produto: (item.produto || 'CARNE').toString().toUpperCase(),
            pesoKg: parseFloat(item.pesoKg) || 0,
            precoKz: parseFloat(item.precoKz) || 0,
            createdAt: new Date().toISOString() 
          });
        }
      } catch (err) { console.error("Erro importação:", err); }
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

  return (
    <div className="h-full flex flex-col space-y-4 overflow-hidden text-white">
      {/* HEADER */}
      <header className="flex justify-between items-center shrink-0">
        <div className="flex items-center gap-3">
          <div className="bg-emerald-500/20 p-2 rounded-lg border border-emerald-500/30">
            <ShoppingCart className="text-emerald-400" size={32} />
          </div>
          <div>
            <h1 className="text-3xl font-black uppercase tracking-tighter">Vendas & Saídas</h1>
            <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Controlo Comercial - Fazenda Kwanza</p>
          </div>
        </div>

        <div className="flex gap-2 bg-[#161922] p-1.5 rounded-2xl border border-slate-800 shadow-xl">
          <input type="file" ref={fileInputRef} className="hidden" onChange={handleFileUpload} />
          <button onClick={() => fileInputRef.current?.click()} className="bg-[#1e293b] text-slate-300 px-4 py-2 rounded-xl text-[10px] font-black uppercase flex items-center gap-2 hover:bg-slate-800 border border-slate-700/50 transition-all">
            <UploadCloud size={14} className="text-cyan-500" /> Importar
          </button>
          <button onClick={exportToExcel} className="bg-[#1e293b] text-slate-300 px-4 py-2 rounded-xl text-[10px] font-black uppercase flex items-center gap-2 hover:bg-slate-800 border border-slate-700/50 transition-all">
            <FileSpreadsheet size={14} className="text-emerald-400" /> Excel
          </button>
          <button onClick={exportToPDF} className="bg-[#1e293b] text-slate-300 px-4 py-2 rounded-xl text-[10px] font-black uppercase flex items-center gap-2 hover:bg-slate-800 border border-slate-700/50 transition-all">
            <FileText size={14} className="text-red-400" /> PDF
          </button>
        </div>
      </header>

      {/* FORMULÁRIO */}
      <div className="bg-[#161922] rounded-[2rem] border border-slate-800/50 p-6 shrink-0 shadow-2xl">
        <form onSubmit={handleSubmit} className="grid grid-cols-12 gap-4 items-end">
          <div className="col-span-2 space-y-1">
            <label className="text-[8px] font-black text-slate-500 uppercase px-1">Lote</label>
            <input required className="w-full bg-[#0f121a] border border-slate-800 p-2.5 rounded-xl text-white outline-none text-[10px] font-bold" value={formData.codigoLote} onChange={e => setFormData({...formData, codigoLote: e.target.value.toUpperCase()})} />
          </div>
          <div className="col-span-2 space-y-1">
            <label className="text-[8px] font-black text-slate-500 uppercase px-1">Data</label>
            <input type="date" required className="w-full bg-[#0f121a] border border-slate-800 p-2.5 rounded-xl text-white outline-none text-[10px] font-bold" value={formData.dataVenda} onChange={e => setFormData({...formData, dataVenda: e.target.value})} />
          </div>
          <div className="col-span-3 space-y-1">
            <label className="text-[8px] font-black text-slate-500 uppercase px-1">Cliente</label>
            <input required className="w-full bg-[#0f121a] border border-slate-800 p-2.5 rounded-xl text-white outline-none text-[10px] font-bold uppercase" value={formData.cliente} onChange={e => setFormData({...formData, cliente: e.target.value.toUpperCase()})} />
          </div>
          <div className="col-span-1 space-y-1">
            <label className="text-[8px] font-black text-emerald-500 uppercase px-1">Peso (Kg)</label>
            <input type="number" step="0.1" required className="w-full bg-[#0f121a] border border-slate-800 p-2.5 rounded-xl text-emerald-500 outline-none text-[10px] font-bold" value={formData.pesoKg} onChange={e => setFormData({...formData, pesoKg: e.target.value})} />
          </div>
          <div className="col-span-2 space-y-1">
            <label className="text-[8px] font-black text-emerald-500 uppercase px-1">Preço (Kz/Kg)</label>
            <input type="number" required className="w-full bg-[#0f121a] border border-slate-800 p-2.5 rounded-xl text-emerald-500 outline-none text-[10px] font-bold" value={formData.precoKz} onChange={e => setFormData({...formData, precoKz: e.target.value})} />
          </div>
          <div className="col-span-2 flex gap-2">
            <button type="submit" className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white font-black text-[10px] py-3 rounded-xl shadow-lg uppercase flex items-center justify-center gap-2">
              <Plus size={16} /> Registar
            </button>
            <button type="button" onClick={() => setFormData(initialForm)} className="bg-slate-800 p-3 rounded-xl text-slate-400">
              <RotateCcw size={16}/>
            </button>
          </div>
        </form>
      </div>

      {/* TABELA COM SCROLL */}
      <div className="flex-1 min-h-0 bg-[#161922] rounded-[2rem] border border-slate-800/50 shadow-2xl overflow-hidden flex flex-col">
        <div className="overflow-y-auto flex-1 custom-scrollbar"> 
          <table className="w-full text-left text-[10px] min-w-[900px] border-collapse">
            <thead className="bg-[#1e293b] text-slate-400 font-black uppercase text-[8px] sticky top-0 z-20">
              <tr>
                <th className="p-4 border-b border-slate-700/50">LOTE</th>
                <th className="p-4 border-b border-slate-700/50">DATA</th>
                <th className="p-4 border-b border-slate-700/50">CLIENTE</th>
                <th className="p-4 border-b border-slate-700/50 text-center">PESO</th>
                <th className="p-4 border-b border-slate-700/50 text-center">VALOR UNIT.</th>
                <th className="p-4 border-b border-slate-700/50 text-center">TOTAL</th>
                <th className="p-4 border-b border-slate-700/50 text-center">AÇÕES</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/30">
              {vendas.map((v) => (
                <tr key={v.id} className="hover:bg-slate-800/20 h-[55px] group">
                  <td className="p-4 font-black text-cyan-500 uppercase">{v.codigoLote}</td>
                  <td className="p-4 text-slate-500 font-bold">{v.dataVenda?.split('-').reverse().join('/')}</td>
                  <td className="p-4 text-slate-200 font-black uppercase">{v.cliente}</td>
                  <td className="p-4 text-emerald-400 font-black text-center">{v.pesoKg} Kg</td>
                  <td className="p-4 text-emerald-400 font-black text-center">{Number(v.precoKz).toLocaleString()} Kz</td>
                  <td className="p-4 text-white font-black text-center bg-emerald-500/5">{(Number(v.pesoKg) * Number(v.precoKz)).toLocaleString()} Kz</td>
                  <td className="p-4 text-center">
                    <button onClick={() => { if(confirm('Remover venda?')) deleteDoc(doc(db, 'vendas', v.id)) }} className="text-slate-600 hover:text-red-500 p-2">
                      <Trash2 size={16}/>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        
        {/* RODAPÉ */}
        <div className="p-4 bg-black/40 border-t border-slate-800/50 flex justify-between items-center shrink-0">
          <div className="flex gap-10">
            <div className="flex flex-col">
              <span className="text-[8px] font-black text-slate-500 uppercase tracking-widest">Peso Total</span>
              <span className="text-sm font-black text-white">{vendas.reduce((acc, v) => acc + (Number(v.pesoKg) || 0), 0).toLocaleString()} Kg</span>
            </div>
            <div className="flex flex-col">
              <span className="text-[8px] font-black text-slate-500 uppercase tracking-widest">Faturamento</span>
              <span className="text-sm font-black text-emerald-400">
                {vendas.reduce((acc, v) => acc + (Number(v.pesoKg) * Number(v.precoKz) || 0), 0).toLocaleString()} Kz
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2 text-slate-500 text-[10px] font-black uppercase opacity-50">
            <Check size={14} className="text-emerald-500" /> Sincronizado
          </div>
        </div>
      </div>
    </div>
  );
}
