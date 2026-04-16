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
    let bStock = 0, sStock = 0;
    let bLotes = 0, sLotes = 0;
    let bAbates = 0, sAbates = 0;
    let bCarc = 0, sCarc = 0;
    
    lotes.forEach(l => {
      const loteRef = String(l.codigoLote || '').trim();
      const nA = abates.filter(a => String(a.loteId || '').trim() === loteRef).length;
      const nV = vendas.filter(v => String(v.codigoLote || '').trim() === loteRef && v.brinco).length;
      const vivo = Number(l.quantidade || 0) - nA;
      const carc = nA - nV;

      if (String(l.tipo).toUpperCase().includes('BOVINO')) { 
        bStock += vivo; bLotes++; bAbates += nA; bCarc += carc;
      } else { 
        sStock += vivo; sLotes++; sAbates += nA; sCarc += carc;
      }
    });

    return {
      totalAbates: abates.length,
      totalLotes: bLotes + sLotes,
      totalCarcacas: bCarc + sCarc,
      stockGlobal: bStock + sStock,
      bovinos: { vivos: bStock, qtd: bLotes, abates: bAbates, carcaca: bCarc },
      suinos: { vivos: sStock, qtd: sLotes, abates: sAbates, carcaca: sCarc }
    };
  };

  const resumo = getResumoTotal();

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
    const dataMain = lotes.map(l => ({
      'Cód. Lote': l.codigoLote,
      'Tipo': l.tipo,
      'Raça': l.raca,
      'Qtd': l.quantidade,
      'Fornecedor': l.fornecedor,
      'Data Entrada': l.dataEntrada,
      'Peso Médio': l.pesoInicialMedio,
      'Peso Final Transp.': l.pesoFinalTransporte,
      'Custo Transp.': l.custoTransporte,
      'Custo Aquisição': l.custoAquisicao
    }));
    const worksheet = XLSX.utils.json_to_sheet(dataMain);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Lotes");
    XLSX.writeFile(workbook, "Listagem_Lotes_Completa.xlsx");
  };

  const exportToPDF = () => {
    const doc = new jsPDF('l', 'mm', 'a4');
    doc.text("LISTAGEM DE LOTES COMPLETA", 14, 15);
    const bodyData = lotes.map(l => [
      l.codigoLote, l.tipo, l.raca, l.quantidade, l.fornecedor, 
      l.dataEntrada, l.pesoInicialMedio, l.pesoFinalTransporte, 
      l.custoTransporte, l.custoAquisicao
    ]);
    autoTable(doc, {
      startY: 20,
      head: [['Lote', 'Tipo', 'Raça', 'Qtd', 'Fornecedor', 'Entrada', 'P.Médio', 'P.Final', 'C.Transp', 'C.Aq.']],
      body: bodyData,
      styles: { fontSize: 7 }
    });
    doc.save("Listagem_Lotes.pdf");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload = { 
      ...formData, 
      codigoLote: formData.codigoLote.trim().toUpperCase(), 
      quantidade: Number(formData.quantidade), 
      pesoInicialMedio: Number(formData.pesoInicialMedio), 
      pesoFinalTransporte: Number(formData.pesoFinalTransporte), 
      custoTransporte: Number(formData.custoTransporte), 
      custoAquisicao: Number(formData.custoAquisicao) 
    };
    if (editingId) { await updateDoc(doc(db, 'lotes', editingId), payload); setEditingId(null); }
    else { await addDoc(collection(db, 'lotes'), payload); }
    setFormData(initialForm);
  };

  return (
    <div className="fixed inset-0 ml-64 p-4 flex flex-col bg-[#0a0f18] text-gray-200 font-sans overflow-hidden">
      {/* HEADER */}
      <div className="flex justify-between items-center mb-4 shrink-0">
        <h1 className="text-2xl font-bold text-white flex items-center gap-2 uppercase tracking-tight">
          <Box className="text-blue-500" size={28} /> COMPOSIÇÃO DE LOTES
        </h1>
        <div className="flex gap-2">
          <input type="file" ref={fileInputRef} onChange={handleFileUpload} className="hidden" />
          <button onClick={() => fileInputRef.current?.click()} className="flex items-center gap-2 px-4 py-2 bg-[#1a2233] text-gray-400 rounded-xl text-xs font-bold border border-gray-800 hover:bg-[#252f44]">
            <CloudUpload size={18} className="text-cyan-400" /> IMPORTAR
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
              {editingId ? <Check size={18} /> : <Plus size={18} />} SALVAR
            </button>
            <button type="button" onClick={() => {setEditingId(null); setFormData(initialForm);}} className="bg-gray-800 text-gray-400 p-3 rounded-xl hover:bg-gray-700"><RotateCcw size={20}/></button>
          </div>
          <div className="md:col-span-4 grid grid-cols-2 md:grid-cols-6 gap-4 pt-4 border-t border-gray-800/30">
            <select className="bg-transparent border-b border-gray-800 p-2 text-xs text-gray-400 outline-none uppercase font-bold" value={formData.tipo} onChange={e => setFormData({...formData, tipo: e.target.value})}>
              <option value="SUÍNO">SUÍNO</option>
              <option value="BOVINO">BOVINO</option>
            </select>
            <input placeholder="Raça" className="bg-transparent border-b border-gray-800 p-2 text-xs text-gray-400 outline-none uppercase font-bold" value={formData.raca} onChange={e => setFormData({...formData, raca: e.target.value})} />
            <input placeholder="Peso Médio" className="bg-transparent border-b border-gray-800 p-2 text-xs text-gray-400 outline-none" value={formData.pesoInicialMedio} onChange={e => setFormData({...formData, pesoInicialMedio: e.target.value})} />
            <input placeholder="Peso Final" className="bg-transparent border-b border-gray-800 p-2 text-xs text-gray-400 outline-none" value={formData.pesoFinalTransporte} onChange={e => setFormData({...formData, pesoFinalTransporte: e.target.value})} />
            <input placeholder="Custo Transp." className="bg-transparent border-b border-gray-800 p-2 text-xs text-gray-400 outline-none" value={formData.custoTransporte} onChange={e => setFormData({...formData, custoTransporte: e.target.value})} />
            <input placeholder="Fornecedor" className="bg-transparent border-b border-gray-800 p-2 text-xs text-blue-400 outline-none font-bold uppercase" value={formData.fornecedor} onChange={e => setFormData({...formData, fornecedor: e.target.value})} />
          </div>
        </form>
      </div>

      {/* TABELA - COM TODAS AS COLUNAS RESTAURADAS */}
      <div className="bg-[#111827]/30 rounded-2xl border border-gray-800 mb-4 flex-1 min-h-0 shadow-2xl overflow-hidden">
        <div className="h-full overflow-auto scrollbar-custom">
          <table className="min-w-[2100px] w-full text-left text-[11px] border-separate border-spacing-0">
            <thead className="bg-[#0f1522] text-gray-500 font-black uppercase sticky top-0 z-20">
              <tr>
                <th className="p-4 border-b border-gray-800 bg-[#0f1522] w-10"><Square size={16}/></th>
                <th className="p-4 border-b border-gray-800 bg-[#0f1522]">Cód. Lote</th>
                <th className="p-4 border-b border-gray-800 bg-[#0f1522]">Tipo</th>
                <th className="p-4 border-b border-gray-800 bg-[#0f1522]">Raça</th>
                <th className="p-4 text-center border-b border-gray-800 bg-[#0f1522]">Qtd</th>
                <th className="p-4 border-b border-gray-800 bg-[#0f1522]">Fornecedor</th>
                <th className="p-4 border-b border-gray-800 bg-[#0f1522]">Data Entrada</th>
                <th className="p-4 border-b border-gray-800 bg-[#0f1522]">Peso Inicial Médio</th>
                <th className="p-4 border-b border-gray-800 bg-[#0f1522]">Peso Final Transporte</th>
                <th className="p-4 border-b border-gray-800 bg-[#0f1522]">Custo Transporte</th>
                <th className="p-4 border-b border-gray-800 bg-[#0f1522]">Custo Aquisição</th>
                <th className="p-4 text-center text-orange-500 border-b border-gray-800 bg-[#0f1522]">Abates</th>
                <th className="p-4 text-center text-emerald-500 border-b border-gray-800 bg-[#0f1522]">Stock Vivo</th>
                <th className="p-4 text-center text-blue-400 border-b border-gray-800 bg-[#0f1522]">Stock Carcaça</th>
                <th className="p-4 text-center border-b border-gray-800 bg-[#0f1522] sticky right-0">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800/50">
              {lotes.map((l) => {
                const nA = abates.filter(a => String(a.loteId).trim() === String(l.codigoLote).trim()).length;
                const nV = vendas.filter(v => String(v.codigoLote).trim() === String(l.codigoLote).trim() && v.brinco).length;
                const vivo = Number(l.quantidade) - nA;
                const carc = nA - nV;
                return (
                  <tr key={l.id} className="hover:bg-blue-500/5 group text-gray-300">
                    <td className="p-4 text-center"><Square size={16} className="text-gray-700"/></td>
                    <td className="p-4 font-black text-blue-500 text-sm italic uppercase">{l.codigoLote}</td>
                    <td className="p-4 uppercase font-bold">{l.tipo}</td>
                    <td className="p-4 uppercase font-bold">{l.raca}</td>
                    <td className="p-4 text-center font-bold text-gray-200">{l.quantidade}</td>
                    <td className="p-4 italic font-bold uppercase">{l.fornecedor}</td>
                    <td className="p-4">{l.dataEntrada?.split('-').reverse().join('/')}</td>
                    <td className="p-4 font-mono">{Number(l.pesoInicialMedio || 0).toFixed(2)} Kg</td>
                    <td className="p-4 font-mono">{Number(l.pesoFinalTransporte || 0).toFixed(2)} Kg</td>
                    <td className="p-4 font-mono">{Number(l.custoTransporte || 0).toLocaleString()} Kz</td>
                    <td className="p-4 font-mono text-blue-400 font-bold">{Number(l.custoAquisicao || 0).toLocaleString()} Kz</td>
                    <td className="p-4 text-center text-orange-500 font-black">{nA}</td>
                    <td className="p-4 text-center">
                      <span className={`px-3 py-1 rounded-full border font-bold ${vivo <= 0 ? 'text-red-500 border-red-500/20' : 'text-emerald-500 border-emerald-500/20'}`}>
                        {vivo} VIVOS
                      </span>
                    </td>
                    <td className="p-4 text-center">
                      <span className={`font-black text-sm ${carc > 0 ? 'text-blue-400' : 'text-gray-600'}`}>
                        {carc} UN
                      </span>
                    </td>
                    <td className="p-4 text-center sticky right-0 bg-[#0a0f18] group-hover:bg-[#161d2b]">
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

      {/* RODAPÉ */}
      <div className="p-4 bg-[#0c121d] border border-gray-800 rounded-2xl grid grid-cols-2 md:grid-cols-4 gap-4 shrink-0 shadow-2xl">
        <div className="bg-[#1a2233]/50 p-4 rounded-xl border border-gray-800 flex flex-col justify-between h-28">
          <span className="text-[10px] text-blue-400 font-black uppercase block tracking-widest">BOVINOS EM STOCK</span>
          <div className="flex items-end justify-between">
            <span className="text-4xl font-black text-white leading-none">{resumo.bovinos.vivos}</span>
            <div className="text-[10px] text-gray-500 text-right leading-tight font-bold">
              <div>{resumo.bovinos.qtd} LOTES</div>
              <div>{resumo.bovinos.abates} ABATES</div>
              <div className="text-blue-400">{resumo.bovinos.carcaca} CARC.</div>
            </div>
          </div>
        </div>
        
        <div className="bg-[#1a2233]/50 p-4 rounded-xl border border-gray-800 flex flex-col justify-between h-28">
          <span className="text-[10px] text-pink-400 font-black uppercase block tracking-widest">SUÍNOS EM STOCK</span>
          <div className="flex items-end justify-between">
            <span className="text-4xl font-black text-white leading-none">{resumo.suinos.vivos}</span>
            <div className="text-[10px] text-gray-500 text-right leading-tight font-bold">
              <div>{resumo.suinos.qtd} LOTES</div>
              <div>{resumo.suinos.abates} ABATES</div>
              <div className="text-blue-400">{resumo.suinos.carcaca} CARC.</div>
            </div>
          </div>
        </div>

        <div className="bg-[#1a2233]/50 p-4 rounded-xl border border-gray-800 flex flex-col justify-center h-28">
          <span className="text-[10px] text-orange-500 font-black uppercase block tracking-widest mb-1">TOTAL ABATES</span>
          <span className="text-4xl font-black text-white leading-none">{resumo.totalAbates}</span>
        </div>

        <div className="bg-emerald-500/10 p-4 rounded-xl border border-emerald-500/20 text-right flex flex-col justify-center h-28">
          <span className="text-[10px] text-emerald-500 font-black uppercase block tracking-widest mb-1">STOCK VIVO REAL</span>
          <span className="text-4xl font-black text-emerald-500 leading-none">{resumo.stockGlobal}</span>
        </div>
      </div>

      <style>{`
        html, body, #root { margin: 0; padding: 0; height: 100%; overflow: hidden; }
        .scrollbar-custom::-webkit-scrollbar { width: 6px; height: 6px; }
        .scrollbar-custom::-webkit-scrollbar-track { background: #0a0f18; }
        .scrollbar-custom::-webkit-scrollbar-thumb { background: #1f2937; border-radius: 10px; }
      `}</style>
    </div>
  );
}
