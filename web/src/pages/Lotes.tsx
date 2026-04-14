import { useState, useEffect, useRef } from 'react';
import { db } from '../lib/firebase';
import { 
  collection, addDoc, onSnapshot, query, orderBy, 
  deleteDoc, doc, updateDoc
} from 'firebase/firestore';
import { 
  Box, Plus, Trash2, Check, 
  Square, Edit3, RotateCcw,
  CloudUpload, FileSpreadsheet, FileDown
} from 'lucide-react';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export default function LotesPage() {
  const [lotes, setLotes] = useState<any[]>([]);
  const [abates, setAbates] = useState<any[]>([]);
  const [vendas, setVendas] = useState<any[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const initialForm = {
    codigoLote: '',
    tipo: 'SUÍNO',
    raca: '',
    quantidade: '',
    fornecedor: '',
    dataEntrada: new Date().toISOString().split('T')[0],
    pesoInicialMedio: '',
    pesoFinalTransporte: '',
    custoTransporte: '',
    custoAquisicao: '',
  };

  const [formData, setFormData] = useState(initialForm);

  useEffect(() => {
    const unsubLotes = onSnapshot(query(collection(db, 'lotes'), orderBy('dataEntrada', 'desc')), (snap) => {
      setLotes(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });
    const unsubAbates = onSnapshot(collection(db, 'abates'), (snap) => {
      setAbates(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });
    const unsubVendas = onSnapshot(collection(db, 'vendas'), (snap) => {
      setVendas(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });
    return () => { unsubLotes(); unsubAbates(); unsubVendas(); };
  }, []);

  const getResumoTotal = () => {
    let bovinosIni = 0; let suinosIni = 0;
    let saídasBovino = 0; let saídasSuino = 0;

    lotes.forEach(l => {
      const qtd = Number(l.quantidade) || 0;
      const tipo = String(l.tipo || '').toUpperCase();
      const loteIdStr = String(l.codigoLote || '').trim().toUpperCase();
      const s = abates.filter(a => String(a.loteId || '').trim().toUpperCase() === loteIdStr).length +
                vendas.filter(v => String(v.loteId || '').trim().toUpperCase() === loteIdStr).length;

      if (tipo.includes('BOVINO')) { bovinosIni += qtd; saídasBovino += s; } 
      else { suinosIni += qtd; saídasSuino += s; }
    });

    return {
      bovinos: bovinosIni - saídasBovino,
      suinos: suinosIni - saídasSuino,
      totalSaidas: abates.length + vendas.length,
      stockGlobal: (bovinosIni + suinosIni) - (abates.length + vendas.length)
    };
  };

  const resumo = getResumoTotal();

  // --- LOGICA IMPORTAR/EXPORTAR ---
  const handleImportClick = () => fileInputRef.current?.click();

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (evt) => {
      const bstr = evt.target?.result;
      const wb = XLSX.read(bstr, { type: 'binary' });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const data = XLSX.utils.sheet_to_json(ws) as Record<string, any>[];
      for (const item of data) {
        await addDoc(collection(db, 'lotes'), {
          ...item,
          dataEntrada: item.dataEntrada || new Date().toISOString().split('T')[0],
          quantidade: Number(item.quantidade) || 0,
          codigoLote: String(item.codigoLote || '').trim().toUpperCase()
        });
      }
      e.target.value = '';
    };
    reader.readAsBinaryString(file);
  };

  const exportToExcel = () => {
    const dataToExport = lotes.map(l => {
      const loteCode = String(l.codigoLote || '').trim().toUpperCase();
      const out = abates.filter(a => String(a.loteId || '').toUpperCase() === loteCode).length + 
                  vendas.filter(v => String(v.loteId || '').toUpperCase() === loteCode).length;
      return {
        'Lote': l.codigoLote, 'Data': l.dataEntrada, 'Tipo': l.tipo, 'Raça': l.raca,
        'Qtd Inicial': l.quantidade, 'Saídas': out, 'Stock Atual': Number(l.quantidade) - out,
        'P. Médio': l.pesoInicialMedio, 'C. Aquisição': l.custoAquisicao, 'Fornecedor': l.fornecedor
      };
    });
    const worksheet = XLSX.utils.json_to_sheet(dataToExport);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Lotes");
    XLSX.writeFile(workbook, "Relatorio_Lotes.xlsx");
  };

  const exportToPDF = () => {
    const doc = new jsPDF('l', 'mm', 'a4');
    doc.text("RELATÓRIO DE COMPOSIÇÃO DE LOTES", 14, 15);
    const bodyData = lotes.map(l => {
      const loteCode = String(l.codigoLote || '').trim().toUpperCase();
      const out = abates.filter(a => String(a.loteId || '').toUpperCase() === loteCode).length + 
                  vendas.filter(v => String(v.loteId || '').toUpperCase() === loteCode).length;
      return [l.codigoLote, l.dataEntrada, l.tipo, l.raca, l.quantidade, out, Number(l.quantidade) - out, l.pesoInicialMedio, l.pesoFinalTransporte, l.custoTransporte, l.custoAquisicao, l.fornecedor];
    });
    autoTable(doc, {
      startY: 25,
      head: [['Lote', 'Data', 'Tipo', 'Raça', 'Qtd Ini', 'Saídas', 'Stock', 'P. Médio', 'P. Final', 'C. Transp', 'C. Aquis', 'Fornecedor']],
      body: bodyData,
      styles: { fontSize: 7 }
    });
    doc.save("Relatorio_Lotes.pdf");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload = { ...formData, codigoLote: formData.codigoLote.trim().toUpperCase(), quantidade: Number(formData.quantidade), pesoInicialMedio: Number(formData.pesoInicialMedio), pesoFinalTransporte: Number(formData.pesoFinalTransporte), custoTransporte: Number(formData.custoTransporte), custoAquisicao: Number(formData.custoAquisicao) };
    if (editingId) { await updateDoc(doc(db, 'lotes', editingId), payload); setEditingId(null); }
    else { await addDoc(collection(db, 'lotes'), payload); }
    setFormData(initialForm);
  };

  return (
    <div className="p-4 flex flex-col h-screen bg-[#0a0f18] text-gray-200 overflow-hidden">
      {/* HEADER */}
      <div className="flex justify-between items-center mb-4 shrink-0">
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          <Box className="text-blue-500" size={28} /> COMPOSIÇÃO DE LOTES
        </h1>
        <div className="flex gap-3">
          <input type="file" ref={fileInputRef} onChange={handleFileUpload} className="hidden" accept=".xlsx, .xls, .csv" />
          <button onClick={handleImportClick} className="flex items-center gap-2 px-4 py-2 bg-[#1a2233] text-gray-400 rounded-xl text-xs font-bold border border-gray-800 hover:bg-[#252f44] transition-all">
            <CloudUpload size={18} className="text-cyan-400" /> IMPORTAR
          </button>
          <button onClick={exportToExcel} className="flex items-center gap-2 px-4 py-2 bg-[#1a2233] text-gray-400 rounded-xl text-xs font-bold border border-gray-800 hover:bg-[#252f44] transition-all">
            <FileSpreadsheet size={18} className="text-emerald-500" /> EXCEL
          </button>
          <button onClick={exportToPDF} className="flex items-center gap-2 px-4 py-2 bg-[#1a2233] text-gray-400 rounded-xl text-xs font-bold border border-gray-800 hover:bg-[#252f44] transition-all">
            <FileDown size={18} className="text-red-500" /> PDF
          </button>
        </div>
      </div>

      {/* FORMULÁRIO */}
      <div className="bg-[#111827]/50 p-6 rounded-2xl border border-gray-800/50 mb-4 shrink-0 shadow-xl">
        <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-4 gap-6 items-end">
          <div className="space-y-2">
            <label className="text-[10px] text-blue-400 font-black uppercase tracking-widest">Cód. Lote</label>
            <input required className="w-full bg-black/40 border border-gray-700 rounded-xl p-3 text-white outline-none focus:border-blue-500 uppercase" value={formData.codigoLote} onChange={e => setFormData({...formData, codigoLote: e.target.value})} />
          </div>
          <div className="space-y-2">
            <label className="text-[10px] text-gray-400 font-black uppercase tracking-widest">Data Entrada</label>
            <input type="date" className="w-full bg-black/40 border border-gray-700 rounded-xl p-3 text-white outline-none focus:border-blue-500" value={formData.dataEntrada} onChange={e => setFormData({...formData, dataEntrada: e.target.value})} />
          </div>
          <div className="space-y-2">
            <label className="text-[10px] text-blue-400 font-black uppercase tracking-widest">Qtd Inicial</label>
            <input type="number" required className="w-full bg-black/40 border border-gray-700 rounded-xl p-3 text-white outline-none focus:border-blue-500" value={formData.quantidade} onChange={e => setFormData({...formData, quantidade: e.target.value})} />
          </div>
          <div className="flex gap-2">
            <button type="submit" className="flex-1 bg-blue-600 text-white font-black py-3 rounded-xl flex items-center justify-center gap-2 text-xs uppercase hover:bg-blue-500 transition-all shadow-lg">
              {editingId ? <Check size={18} /> : <Plus size={18} />} NOVO LOTE
            </button>
            <button type="button" onClick={() => {setEditingId(null); setFormData(initialForm);}} className="bg-gray-800 text-gray-400 p-3 rounded-xl hover:bg-gray-700 transition-all"><RotateCcw size={20}/></button>
          </div>
          <div className="md:col-span-4 grid grid-cols-2 md:grid-cols-6 gap-4 pt-4 border-t border-gray-800/30">
            <input placeholder="Tipo" className="bg-transparent border-b border-gray-800 p-2 text-xs text-gray-400 outline-none uppercase font-bold" value={formData.tipo} onChange={e => setFormData({...formData, tipo: e.target.value})} />
            <input placeholder="Raça" className="bg-transparent border-b border-gray-800 p-2 text-xs text-gray-400 outline-none uppercase font-bold" value={formData.raca} onChange={e => setFormData({...formData, raca: e.target.value})} />
            <input placeholder="Peso Médio" className="bg-transparent border-b border-gray-800 p-2 text-xs text-gray-400 outline-none" value={formData.pesoInicialMedio} onChange={e => setFormData({...formData, pesoInicialMedio: e.target.value})} />
            <input placeholder="Peso Final" className="bg-transparent border-b border-gray-800 p-2 text-xs text-gray-400 outline-none" value={formData.pesoFinalTransporte} onChange={e => setFormData({...formData, pesoFinalTransporte: e.target.value})} />
            <input placeholder="Custo Transp." className="bg-transparent border-b border-gray-800 p-2 text-xs text-gray-400 outline-none" value={formData.custoTransporte} onChange={e => setFormData({...formData, custoTransporte: e.target.value})} />
            <input placeholder="Custo Aquis." className="bg-transparent border-b border-gray-800 p-2 text-xs text-blue-400 outline-none font-bold" value={formData.custoAquisicao} onChange={e => setFormData({...formData, custoAquisicao: e.target.value})} />
          </div>
        </form>
      </div>

      {/* TABELA */}
      <div className="bg-[#111827]/30 rounded-2xl border border-gray-800 flex-1 flex flex-col min-h-0 shadow-2xl overflow-hidden">
        <div className="flex-1 overflow-auto scrollbar-custom">
          <table className="min-w-[1800px] w-full text-left text-[11px] border-separate border-spacing-0">
            <thead className="bg-[#0f1522] text-gray-500 font-black uppercase sticky top-0 z-20">
              <tr>
                <th className="p-4 border-b border-gray-800 bg-[#0f1522] w-10"><Square size={16}/></th>
                <th className="p-4 border-b border-gray-800 bg-[#0f1522]">Lote</th>
                <th className="p-4 border-b border-gray-800 bg-[#0f1522]">Data</th>
                <th className="p-4 border-b border-gray-800 bg-[#0f1522]">Tipo</th>
                <th className="p-4 border-b border-gray-800 bg-[#0f1522]">Raça</th>
                <th className="p-4 text-center border-b border-gray-800 bg-[#0f1522]">Qtd Inicial</th>
                <th className="p-4 text-center text-orange-500 border-b border-gray-800 bg-[#0f1522]">Saídas (Abate+Venda)</th>
                <th className="p-4 text-center text-emerald-500 border-b border-gray-800 bg-[#0f1522]">Stock Atual</th>
                <th className="p-4 border-b border-gray-800 bg-[#0f1522]">P. Médio Ini</th>
                <th className="p-4 border-b border-gray-800 bg-[#0f1522]">P. Final Transp</th>
                <th className="p-4 border-b border-gray-800 bg-[#0f1522]">Custo Transp</th>
                <th className="p-4 border-b border-gray-800 bg-[#0f1522] text-blue-400">Custo Aquisição</th>
                <th className="p-4 border-b border-gray-800 bg-[#0f1522]">Fornecedor</th>
                <th className="p-4 text-center border-b border-gray-800 bg-[#0f1522] sticky right-0">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800/50">
              {lotes.map((l) => {
                const loteCode = String(l.codigoLote || '').trim().toUpperCase();
                const out = abates.filter(a => String(a.loteId || '').trim().toUpperCase() === loteCode).length + 
                            vendas.filter(v => String(v.loteId || '').trim().toUpperCase() === loteCode).length;
                const saldo = Number(l.quantidade || 0) - out;
                return (
                  <tr key={l.id} className="hover:bg-blue-500/5 group transition-colors">
                    <td className="p-4 text-center"><Square size={16} className="text-gray-700"/></td>
                    <td className="p-4 font-black text-blue-500 text-sm italic uppercase">{l.codigoLote}</td>
                    <td className="p-4 text-gray-400">{l.dataEntrada?.split('-').reverse().join('/')}</td>
                    <td className="p-4 text-gray-400 uppercase font-bold">{l.tipo}</td>
                    <td className="p-4 text-gray-400 uppercase font-bold">{l.raca}</td>
                    <td className="p-4 text-center font-bold text-gray-200">{l.quantidade}</td>
                    <td className="p-4 text-center text-orange-500 font-black">{out}</td>
                    <td className="p-4 text-center">
                      <span className={`px-3 py-1 rounded-full border font-bold ${saldo <= 0 ? 'bg-red-500/10 text-red-500 border-red-500/20' : 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20'}`}>
                        {saldo} ANIMAIS
                      </span>
                    </td>
                    <td className="p-4 text-gray-400">{l.pesoInicialMedio} kg</td>
                    <td className="p-4 text-gray-400">{l.pesoFinalTransporte} kg</td>
                    <td className="p-4 text-gray-400">{Number(l.custoTransporte || 0).toLocaleString()} KZ</td>
                    <td className="p-4 font-bold text-blue-400">{Number(l.custoAquisicao || 0).toLocaleString()} KZ</td>
                    <td className="p-4 text-gray-400 italic font-bold uppercase">{l.fornecedor}</td>
                    <td className="p-4 text-center sticky right-0 bg-[#0a0f18] group-hover:bg-[#161d2b] transition-all">
                      <div className="flex justify-center gap-3">
                        <button onClick={() => { setEditingId(l.id); setFormData({...l}); }} className="text-gray-500 hover:text-white"><Edit3 size={18}/></button>
                        <button onClick={() => deleteDoc(doc(db, 'lotes', l.id))} className="text-gray-500 hover:text-red-500"><Trash2 size={18}/></button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* FOOTER RESUMO */}
      <div className="p-4 bg-[#0c121d] border-t border-gray-800 grid grid-cols-2 md:grid-cols-4 gap-4 shrink-0">
        <div className="bg-[#1a2233]/50 p-3 rounded-xl border border-gray-800">
          <span className="text-[9px] text-blue-400 font-black uppercase block">BOVINOS EM STOCK</span>
          <span className="text-2xl font-black text-white">{resumo.bovinos}</span>
        </div>
        <div className="bg-[#1a2233]/50 p-3 rounded-xl border border-gray-800">
          <span className="text-[9px] text-pink-400 font-black uppercase block">SUÍNOS EM STOCK</span>
          <span className="text-2xl font-black text-white">{resumo.suinos}</span>
        </div>
        <div className="bg-[#1a2233]/50 p-3 rounded-xl border border-gray-800">
          <span className="text-[9px] text-orange-500 font-black uppercase block">TOTAL SAÍDAS GLOBAIS</span>
          <span className="text-2xl font-black text-white">{resumo.totalSaidas}</span>
        </div>
        <div className="bg-emerald-500/10 p-3 rounded-xl border border-emerald-500/20 text-right">
          <span className="text-[9px] text-emerald-500 font-black uppercase block">STOCK TOTAL REAL</span>
          <span className="text-2xl font-black text-emerald-500">{resumo.stockGlobal}</span>
        </div>
      </div>

      <style>{`
        .scrollbar-custom::-webkit-scrollbar { width: 6px; height: 6px; }
        .scrollbar-custom::-webkit-scrollbar-track { background: #0a0f18; }
        .scrollbar-custom::-webkit-scrollbar-thumb { background: #1f2937; border-radius: 10px; }
      `}</style>
    </div>
  );
}
