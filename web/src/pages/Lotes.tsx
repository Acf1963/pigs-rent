import { useState, useEffect, useRef } from 'react';
import { db } from '../lib/firebase';
import { 
  collection, onSnapshot, query, orderBy, 
  deleteDoc, doc, writeBatch, updateDoc 
} from 'firebase/firestore';
import { 
  Package, Trash2, UploadCloud, 
  Edit3, FileText, Check, X, FileSpreadsheet,
  Square, CheckSquare
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

  // Cálculos (Corrigindo erro 6133 ao usá-los no rodapé)
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
        const data = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]]);
        const batch = writeBatch(db);
        data.forEach((item: any) => {
          const newDocRef = doc(collection(db, 'lotes'));
          let dEntrada = new Date().toISOString().split('T')[0];
          if (item.dataEntrada) {
            const d = new Date(item.dataEntrada);
            if (!isNaN(d.getTime())) dEntrada = d.toISOString().split('T')[0];
          }
          batch.set(newDocRef, {
            codigoLote: String(item.codigoLote || 'N/A').toUpperCase(),
            tipo: String(item.tipo || 'SUINO').toUpperCase(),
            raca: String(item.raca || '').toUpperCase(),
            quantidade: Number(item.quantidade) || 0,
            fornecedor: String(item.fornecedor || '').toUpperCase(),
            dataEntrada: dEntrada,
            pesoInicialMedio: Number(item.pesoInicialMedio) || 0,
            pesoFinalTransporte: Number(item.pesoFinalTransporte) || 0,
            custoTransporte: Number(item.custoTransporte) || 0,
            custoAquisicao: Number(item.custoAquisicao) || 0,
            createdAt: new Date().toISOString()
          });
        });
        await batch.commit();
        alert("Importação Concluída!");
      } catch (err) { alert("Erro ao importar."); }
    };
    reader.readAsBinaryString(file);
  };

  const exportToExcel = () => {
    const ws = XLSX.utils.json_to_sheet(lotes.map(l => ({
      Lote: l.codigoLote,
      Tipo: l.tipo,
      Qtd: l.quantidade,
      Custo: l.custoAquisicao
    })));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Lotes");
    XLSX.writeFile(wb, "Lotes_Fazenda.xlsx");
  };

  const exportToPDF = () => {
    const docPDF = new jsPDF('l', 'mm', 'a4');
    docPDF.text("FAZENDA KWANZA - LOTES", 14, 15);
    autoTable(docPDF, {
      head: [["LOTE", "TIPO", "QTD", "DATA"]],
      body: lotes.map(l => [l.codigoLote, l.tipo, l.quantidade, formatDateDisplay(l.dataEntrada)]),
      startY: 20
    });
    docPDF.save("Lotes.pdf");
  };

  const handleSaveEdit = async () => {
    if (editingId && editValue) {
      await updateDoc(doc(db, 'lotes', editingId), {
        ...editValue,
        pesoInicialMedio: Number(editValue.pesoInicialMedio),
        pesoFinalTransporte: Number(editValue.pesoFinalTransporte)
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
            <button onClick={deleteSelected} className="bg-red-600/20 border border-red-500/50 px-3 py-2 rounded-lg text-[10px] font-black text-red-500 flex items-center gap-2">
              <Trash2 size={14} /> ELIMINAR ({selectedIds.length})
            </button>
          )}
          <input type="file" ref={fileInputRef} className="hidden" onChange={handleFileUpload} />
          <button onClick={() => fileInputRef.current?.click()} className="bg-[#1a202e] border border-slate-800 px-3 py-2 rounded-lg text-[10px] font-black text-slate-300 flex items-center gap-2 uppercase tracking-tighter">
            <UploadCloud size={14} className="text-cyan-500" /> Importar
          </button>
          <button onClick={exportToExcel} className="bg-[#1a202e] border border-slate-800 px-3 py-2 rounded-lg text-[10px] font-black text-slate-300 flex items-center gap-2 uppercase tracking-tighter">
            <FileSpreadsheet size={14} className="text-emerald-500" /> Excel
          </button>
          <button onClick={exportToPDF} className="bg-[#1a202e] border border-slate-800 px-3 py-2 rounded-lg text-[10px] font-black text-slate-300 flex items-center gap-2 uppercase tracking-tighter">
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
                <th className="p-4 border-b border-slate-800/50 text-center">DATA</th>
                <th className="p-4 border-b border-slate-800/50 text-center">QTD</th>
                <th className="p-4 border-b border-slate-800/50 text-center">PESO INICIAL</th>
                <th className="p-4 border-b border-slate-800/50 text-center">PESO TRANSP.</th>
                <th className="p-4 border-b border-slate-800/50 text-right text-emerald-500">CUSTO AQUIS.</th>
                <th className="p-4 border-b border-slate-800/50 text-right">TRANSPORTE</th>
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
                  <tr key={l.id} className={`${isSelected ? 'bg-emerald-500/5' : ''} hover:bg-emerald-500/[0.02] transition-colors`}>
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
                    <td className="p-4 text-center text-white font-black">{l.quantidade}</td>
                    <td className="p-4 text-center text-slate-300 font-bold">
                      {isEditing ? <input type="number" className="w-20 bg-black border border-emerald-500 text-center" value={editValue.pesoInicialMedio} onChange={e => setEditValue({...editValue, pesoInicialMedio: e.target.value})} /> : `${l.pesoInicialMedio || 0} kg`}
                    </td>
                    <td className="p-4 text-center text-slate-500 font-medium">
                      {isEditing ? <input type="number" className="w-20 bg-black border border-emerald-500 text-center" value={editValue.pesoFinalTransporte} onChange={e => setEditValue({...editValue, pesoFinalTransporte: e.target.value})} /> : `${l.pesoFinalTransporte || 0} kg`}
                    </td>
                    <td className="p-4 text-right text-emerald-500 font-black">{Number(l.custoAquisicao).toLocaleString()}</td>
                    <td className="p-4 text-right text-slate-400 font-medium">{Number(l.custoTransporte || 0).toLocaleString()}</td>
                    <td className="p-4 text-right font-black text-white bg-white/5">{total.toLocaleString()}</td>
                    <td className="p-4 text-center">
                      <div className="flex justify-center gap-1">
                        {isEditing ? (
                          <><button onClick={handleSaveEdit} className="text-emerald-500"><Check size={14}/></button>
                          <button onClick={() => setEditingId(null)} className="text-red-500"><X size={14}/></button></>
                        ) : (
                          <><button onClick={() => { setEditingId(l.id); setEditValue({...l}); }} className="text-slate-600 hover:text-cyan-400"><Edit3 size={14}/></button>
                          <button onClick={() => { if(confirm('Eliminar?')) deleteDoc(doc(db, 'lotes', l.id)) }} className="text-slate-700 hover:text-red-500"><Trash2 size={14}/></button></>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div className="p-4 bg-black border-t border-slate-800/50 flex justify-between items-center shrink-0">
          <div className="flex gap-10 px-4">
            <div className="flex flex-col">
              <span className="text-[7px] font-black text-slate-500 uppercase">Total Animais</span>
              <span className="text-sm font-black text-white">{totalAnimais.toLocaleString()}</span>
            </div>
            <div className="flex flex-col">
              <span className="text-[7px] font-black text-slate-500 uppercase">Investimento Geral</span>
              <span className="text-sm font-black text-emerald-500">{custoTotalGeral.toLocaleString()} Kz</span>
            </div>
          </div>
          <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest px-4 italic">FAZENDA KWANZA</p>
        </div>
      </div>
    </div>
  );
}
