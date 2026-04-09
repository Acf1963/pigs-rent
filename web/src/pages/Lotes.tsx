import { useState, useEffect, useRef } from 'react';
import { db } from '../lib/firebase';
import { 
  collection, onSnapshot, query, orderBy, 
  deleteDoc, doc, writeBatch, updateDoc 
} from 'firebase/firestore';
import { 
  Package, Trash2, UploadCloud, 
  Edit3, FileText, Check, X, FileSpreadsheet,
  Square, CheckSquare, Layers
} from 'lucide-react';

import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export default function LotesPage() {
  const [lotes, setLotes] = useState<any[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState<any>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const q = query(collection(db, 'lotes'), orderBy('dataEntrada', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setLotes(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });
    return () => unsubscribe();
  }, []);

  // Lógica de Seleção
  const toggleSelectAll = () => {
    if (selectedIds.length === lotes.length && lotes.length > 0) {
      setSelectedIds([]);
    } else {
      setSelectedIds(lotes.map(l => l.id));
    }
  };

  const toggleSelectOne = (id: string) => {
    setSelectedIds(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const deleteSelected = async () => {
    if (!confirm(`Eliminar ${selectedIds.length} lotes selecionados?`)) return;
    const batch = writeBatch(db);
    selectedIds.forEach(id => {
      batch.delete(doc(db, 'lotes', id));
    });
    await batch.commit();
    setSelectedIds([]);
  };

  // Cálculos do Resumo Final
  const totalLotes = lotes.length;
  const totalAnimais = lotes.reduce((acc, l) => acc + (Number(l.quantidade) || 0), 0);
  const custoTotalGeral = lotes.reduce((acc, l) => acc + (Number(l.custoAquisicao || 0) + Number(l.custoTransporte || 0)), 0);

  const formatDateDisplay = (dateVal: any) => {
    if (!dateVal) return '---';
    try {
      if (typeof dateVal === 'string' && dateVal.includes('-')) {
        const parts = dateVal.split('T')[0].split('-');
        return `${parts[2]}/${parts[1]}/${parts[0]}`;
      }
      const d = new Date(dateVal);
      return !isNaN(d.getTime()) ? d.toLocaleDateString('pt-PT') : String(dateVal);
    } catch (e) { return 'Data Inválida'; }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: 'binary', cellDates: true });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const data = XLSX.utils.sheet_to_json(ws);
        const batch = writeBatch(db);

        data.forEach((item: any) => {
          // Normalização de chaves para evitar erros de digitação no Excel
          const cleanItem: any = {};
          Object.keys(item).forEach(key => {
            const cleanKey = key.trim().replace(/\s+/g, '');
            cleanItem[cleanKey] = item[key];
          });

          const newDocRef = doc(collection(db, 'lotes'));
          
          let dEntrada = new Date().toISOString().split('T')[0];
          if (cleanItem.dataEntrada) {
            const d = new Date(cleanItem.dataEntrada);
            if (!isNaN(d.getTime())) dEntrada = d.toISOString().split('T')[0];
          }

          batch.set(newDocRef, {
            codigoLote: String(cleanItem.codigoLote || 'N/A').toUpperCase(),
            tipo: String(cleanItem.tipo || 'SUINO').toUpperCase(),
            raca: String(cleanItem.raca || '').toUpperCase(),
            quantidade: Number(cleanItem.quantidade) || 0,
            fornecedor: String(cleanItem.fornecedor || '').toUpperCase(),
            dataEntrada: dEntrada,
            pesoInicialMedio: Number(cleanItem.pesoInicialMedio) || 0,
            pesoFinalTransporte: Number(cleanItem.pesoFinalTransporte) || 0,
            custoTransporte: Number(cleanItem.custoTransporte) || 0,
            custoAquisicao: Number(cleanItem.custoAquisicao) || 0,
            createdAt: new Date().toISOString()
          });
        });
        await batch.commit();
        alert("Importação Concluída!");
        if (fileInputRef.current) fileInputRef.current.value = '';
      } catch (err) { alert("Erro ao importar."); }
    };
    reader.readAsBinaryString(file);
  };

  const exportToExcel = () => {
    const ws = XLSX.utils.json_to_sheet(lotes.map(l => ({
      Lote: l.codigoLote,
      Tipo: l.tipo,
      Qtd: l.quantidade,
      CustoAquisicao: l.custoAquisicao,
      Transporte: l.custoTransporte,
      Data: l.dataEntrada
    })));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Lotes");
    XLSX.writeFile(wb, "Lotes_Fazenda.xlsx");
  };

  const exportToPDF = () => {
    const docPDF = new jsPDF('l', 'mm', 'a4');
    docPDF.text("FAZENDA KWANZA - RELATÓRIO DE LOTES", 14, 15);
    autoTable(docPDF, {
      head: [["LOTE", "TIPO", "FORNECEDOR", "QTD", "DATA", "TOTAL (KZ)"]],
      body: lotes.map(l => [
        l.codigoLote, 
        l.tipo, 
        l.fornecedor, 
        l.quantidade, 
        formatDateDisplay(l.dataEntrada),
        (Number(l.custoAquisicao || 0) + Number(l.custoTransporte || 0)).toLocaleString()
      ]),
      startY: 20,
      headStyles: { fillColor: [16, 185, 129] }
    });
    docPDF.save("Lotes_Kwanza.pdf");
  };

  const handleSaveEdit = async () => {
    if (editingId && editValue) {
      await updateDoc(doc(db, 'lotes', editingId), {
        ...editValue,
        quantidade: Number(editValue.quantidade),
        pesoInicialMedio: Number(editValue.pesoInicialMedio),
        pesoFinalTransporte: Number(editValue.pesoFinalTransporte),
        custoAquisicao: Number(editValue.custoAquisicao),
        custoTransporte: Number(editValue.custoTransporte)
      });
      setEditingId(null);
    }
  };

  return (
    <div className="h-[calc(100vh-110px)] flex flex-col space-y-4 overflow-hidden p-2">
      <header className="flex justify-between items-center shrink-0">
        <div className="flex items-center gap-3">
          <Package className="text-emerald-500" size={32} />
          <h1 className="text-2xl font-black text-white uppercase tracking-tighter">Lotes</h1>
        </div>
        <div className="flex gap-2">
          {selectedIds.length > 0 && (
            <button onClick={deleteSelected} className="bg-red-600 px-3 py-2 rounded-lg text-[10px] font-black text-white flex items-center gap-2">
              <Trash2 size={14} /> ELIMINAR ({selectedIds.length})
            </button>
          )}
          <input type="file" ref={fileInputRef} className="hidden" onChange={handleFileUpload} accept=".xlsx, .xls" />
          <button onClick={() => fileInputRef.current?.click()} className="bg-[#1a202e] border border-slate-800 px-3 py-2 rounded-lg text-[10px] font-black text-slate-300 flex items-center gap-2 hover:bg-slate-800 transition-all uppercase tracking-tighter">
            <UploadCloud size={14} className="text-cyan-500" /> Importar Excel
          </button>
          <button onClick={exportToExcel} className="bg-[#1a202e] border border-slate-800 px-3 py-2 rounded-lg text-[10px] font-black text-slate-300 flex items-center gap-2 hover:bg-slate-800 transition-all uppercase tracking-tighter">
            <FileSpreadsheet size={14} className="text-emerald-500" /> Excel
          </button>
          <button onClick={exportToPDF} className="bg-[#1a202e] border border-slate-800 px-3 py-2 rounded-lg text-[10px] font-black text-slate-300 flex items-center gap-2 hover:bg-slate-800 transition-all uppercase tracking-tighter">
            <FileText size={14} className="text-red-500" /> PDF
          </button>
        </div>
      </header>

      <div className="bg-[#161922] rounded-2xl border border-slate-800/50 shadow-2xl flex flex-col flex-1 min-h-0 overflow-hidden">
        <div className="overflow-auto flex-1 custom-scrollbar"> 
          <table className="w-full text-left text-[11px] border-separate border-spacing-0 min-w-[1450px]">
            <thead className="bg-[#11141d] text-slate-500 font-black uppercase text-[9px] sticky top-0 z-10">
              <tr>
                <th className="p-4 border-b border-slate-800/50 w-10 text-center">
                  <button onClick={toggleSelectAll}>
                    {selectedIds.length === lotes.length && lotes.length > 0 ? <CheckSquare size={18} className="text-emerald-500"/> : <Square size={18}/>}
                  </button>
                </th>
                <th className="p-4 border-b border-slate-800/50">LOTE</th>
                <th className="p-4 border-b border-slate-800/50 text-center">TIPO</th>
                <th className="p-4 border-b border-slate-800/50">RAÇA</th>
                <th className="p-4 border-b border-slate-800/50">FORNECEDOR</th>
                <th className="p-4 border-b border-slate-800/50 text-center">DATA ENTRADA</th>
                <th className="p-4 border-b border-slate-800/50 text-center">QTD</th>
                <th className="p-4 border-b border-slate-800/50 text-center">PESO INICIAL</th>
                <th className="p-4 border-b border-slate-800/50 text-center">PESO TRANSP.</th>
                <th className="p-4 border-b border-slate-800/50 text-right text-emerald-500">CUSTO AQUIS.</th>
                <th className="p-4 border-b border-slate-800/50 text-right text-slate-500">TRANSPORTE</th>
                <th className="p-4 border-b border-slate-800/50 text-right">TOTAL (KZ)</th>
                <th className="p-4 border-b border-slate-800/50 text-center">AÇÕES</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/20">
              {lotes.map((l) => {
                const total = Number(l.custoAquisicao || 0) + Number(l.custoTransporte || 0);
                const isEditing = editingId === l.id;
                const isSelected = selectedIds.includes(l.id);
                return (
                  <tr key={l.id} className={`${isSelected ? 'bg-emerald-500/5' : ''} hover:bg-emerald-500/[0.02] transition-colors group`}>
                    <td className="p-4 text-center">
                      <button onClick={() => toggleSelectOne(l.id)} className={isSelected ? 'text-emerald-500' : 'text-slate-700'}>
                        {isSelected ? <CheckSquare size={18}/> : <Square size={18}/>}
                      </button>
                    </td>
                    <td className="p-4 font-black text-cyan-500 uppercase">{l.codigoLote}</td>
                    <td className="p-4 text-center font-bold text-slate-500 text-[9px] uppercase">{l.tipo}</td>
                    <td className="p-4 font-bold text-slate-200 uppercase">{l.raca || '---'}</td>
                    <td className="p-4 font-medium text-slate-400 uppercase">{l.fornecedor || '---'}</td>
                    <td className="p-4 text-center text-slate-400 font-bold">{formatDateDisplay(l.dataEntrada)}</td>
                    <td className="p-4 text-center">
                      {isEditing ? <input type="number" className="w-16 bg-black border border-emerald-500 text-center rounded" value={editValue.quantidade} onChange={e => setEditValue({...editValue, quantidade: e.target.value})} /> : <span className="text-white font-black">{l.quantidade}</span>}
                    </td>
                    <td className="p-4 text-center text-slate-300 font-bold">
                      {isEditing ? <input type="number" className="w-20 bg-black border border-emerald-500 text-center rounded" value={editValue.pesoInicialMedio} onChange={e => setEditValue({...editValue, pesoInicialMedio: e.target.value})} /> : `${l.pesoInicialMedio || 0} kg`}
                    </td>
                    <td className="p-4 text-center text-slate-500 font-medium">
                      {isEditing ? <input type="number" className="w-20 bg-black border border-emerald-500 text-center rounded" value={editValue.pesoFinalTransporte} onChange={e => setEditValue({...editValue, pesoFinalTransporte: e.target.value})} /> : `${l.pesoFinalTransporte || 0} kg`}
                    </td>
                    <td className="p-4 text-right text-emerald-500 font-black">
                      {isEditing ? <input type="number" className="w-24 bg-black border border-emerald-500 text-right rounded px-2" value={editValue.custoAquisicao} onChange={e => setEditValue({...editValue, custoAquisicao: e.target.value})} /> : Number(l.custoAquisicao).toLocaleString()}
                    </td>
                    <td className="p-4 text-right text-slate-400 font-medium">
                      {isEditing ? <input type="number" className="w-24 bg-black border border-emerald-500 text-right rounded px-2" value={editValue.custoTransporte} onChange={e => setEditValue({...editValue, custoTransporte: e.target.value})} /> : Number(l.custoTransporte || 0).toLocaleString()}
                    </td>
                    <td className="p-4 text-right font-black text-white bg-white/5">{total.toLocaleString()}</td>
                    <td className="p-4 text-center">
                      <div className="flex justify-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        {isEditing ? (
                          <><button onClick={handleSaveEdit} className="text-emerald-500 hover:scale-110"><Check size={16}/></button>
                          <button onClick={() => setEditingId(null)} className="text-red-500 hover:scale-110"><X size={16}/></button></>
                        ) : (
                          <><button onClick={() => { setEditingId(l.id); setEditValue({...l}); }} className="p-2 text-slate-600 hover:text-cyan-400"><Edit3 size={14}/></button>
                          <button onClick={() => { if(confirm('Eliminar?')) deleteDoc(doc(db, 'lotes', l.id)) }} className="p-2 text-slate-700 hover:text-red-500"><Trash2 size={14}/></button></>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* RESUMO FINAL ATUALIZADO */}
        <div className="p-4 bg-[#11141d] border-t border-slate-800 flex justify-between items-center shrink-0 shadow-inner">
          <div className="flex gap-12 px-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-cyan-500/10 rounded-lg text-cyan-500"><Layers size={20}/></div>
              <div className="flex flex-col">
                <span className="text-[8px] font-black text-slate-500 uppercase tracking-tighter">Total Lotes</span>
                <span className="text-lg font-black text-white leading-none">{totalLotes}</span>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              <div className="p-2 bg-emerald-500/10 rounded-lg text-emerald-500"><Package size={20}/></div>
              <div className="flex flex-col">
                <span className="text-[8px] font-black text-slate-500 uppercase tracking-tighter">Total Animais</span>
                <span className="text-lg font-black text-white leading-none">{totalAnimais.toLocaleString()}</span>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="p-2 bg-emerald-500/10 rounded-lg text-emerald-500">
                <span className="text-xs font-black">KZ</span>
              </div>
              <div className="flex flex-col">
                <span className="text-[8px] font-black text-slate-500 uppercase tracking-tighter">Investimento Geral</span>
                <span className="text-lg font-black text-emerald-500 leading-none">{custoTotalGeral.toLocaleString()}</span>
              </div>
            </div>
          </div>
          <div className="px-6 text-right">
             <p className="text-[9px] font-black text-slate-700 uppercase tracking-[0.2em] italic">Sistema de Gestão - Fazenda Kwanza</p>
          </div>
        </div>
      </div>
    </div>
  );
}
