import { useState, useEffect, useRef } from 'react';
import { db } from '../lib/firebase';
import { 
  collection, addDoc, onSnapshot, query, orderBy, 
  deleteDoc, doc, updateDoc, writeBatch 
} from 'firebase/firestore';
import { 
  Utensils, FileSpreadsheet, FileText, UploadCloud, Check, 
  Trash2, Edit3, Plus, Square, CheckSquare 
} from 'lucide-react';

import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export default function AlimentacaoPage() {
  const [registos, setRegistos] = useState<any[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const initialForm = {
    loteId: '',
    data: new Date().toISOString().split('T')[0],
    tipoAlimento: 'RAÇÃO CRESCIMENTO',
    quantidadeKg: '',
    custoUnitario: '',
    observacoes: ''
  };

  const [formData, setFormData] = useState(initialForm);

  useEffect(() => {
    const q = query(collection(db, 'alimentacao'), orderBy('data', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setRegistos(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });
    return () => unsubscribe();
  }, []);

  const toggleSelectAll = () => {
    if (selectedIds.length === registos.length && registos.length > 0) {
      setSelectedIds([]);
    } else {
      setSelectedIds(registos.map(r => r.id));
    }
  };

  const toggleSelectOne = (id: string) => {
    setSelectedIds(prev => 
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  const deleteSelected = async () => {
    if (!confirm(`Eliminar ${selectedIds.length} registos selecionados?`)) return;
    const batch = writeBatch(db);
    selectedIds.forEach(id => { batch.delete(doc(db, 'alimentacao', id)); });
    await batch.commit();
    setSelectedIds([]);
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
        for (const item of data as any[]) {
          const newDocRef = doc(collection(db, 'alimentacao'));
          let dataFinal = item.data || item.Data;
          if (dataFinal instanceof Date) dataFinal = dataFinal.toISOString().split('T')[0];
          batch.set(newDocRef, { 
            loteId: String(item.codigoLote || item.loteId || 'S/L').toUpperCase(),
            data: dataFinal || new Date().toISOString().split('T')[0],
            tipoAlimento: String(item.tipoRacao || item.fase || 'RAÇÃO').toUpperCase(),
            quantidadeKg: parseFloat(item.quantidadeKg || item.quantidade) || 0,
            custoUnitario: parseFloat(item.custoPorKgKz || item.custoUnitario) || 0,
            observacoes: String(item.observacoes || '').toUpperCase(),
            createdAt: new Date().toISOString() 
          });
        }
        await batch.commit();
        alert("Importação concluída!");
      } catch (err) { console.error(err); }
    };
    reader.readAsBinaryString(file);
  };

  const exportToExcel = () => {
    const ws = XLSX.utils.json_to_sheet(registos.map(r => ({
      'LOTE ID': r.loteId, 'DATA': r.data, 'ALIMENTO': r.tipoAlimento,
      'QTD (KG)': r.quantidadeKg, 'CUSTO UN.': r.custoUnitario,
      'TOTAL (KZ)': (r.quantidadeKg * r.custoUnitario)
    })));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Consumo");
    XLSX.writeFile(wb, "Consumo_Alimentar_Kwanza.xlsx");
  };

  const exportToPDF = () => {
    const docPDF = new jsPDF('l', 'mm', 'a4');
    docPDF.text("Registo de Consumo Alimentar - Fazenda Kwanza", 14, 15);
    autoTable(docPDF, {
      head: [["LOTE ID", "DATA", "ALIMENTO", "QTD (KG)", "CUSTO UN.", "TOTAL (KZ)"]],
      body: registos.map(r => [
        r.loteId, r.data, r.tipoAlimento, 
        `${Number(r.quantidadeKg).toFixed(1)} Kg`, 
        `${Number(r.custoUnitario).toLocaleString()} KZ`, 
        `${(r.quantidadeKg * r.custoUnitario).toLocaleString()} KZ`
      ]),
      startY: 22,
      headStyles: { fillColor: [8, 145, 178] }
    });
    docPDF.save("Consumo_Alimentar.pdf");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload = {
      ...formData,
      quantidadeKg: parseFloat(formData.quantidadeKg as string) || 0,
      custoUnitario: parseFloat(formData.custoUnitario as string) || 0,
    };
    if (editingId) {
      await updateDoc(doc(db, 'alimentacao', editingId), payload);
      setEditingId(null);
    } else {
      await addDoc(collection(db, 'alimentacao'), { ...payload, createdAt: new Date().toISOString() });
    }
    setFormData(initialForm);
  };

  return (
    <div className="h-[calc(100vh-110px)] flex flex-col space-y-4 overflow-hidden p-2">
      <header className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 shrink-0">
        <h1 className="text-2xl md:text-3xl font-black text-white flex items-center gap-3 tracking-tighter uppercase">
          <Utensils className="text-cyan-500" size={32} /> Consumo
        </h1>

        <div className="flex flex-wrap gap-2 w-full lg:w-auto">
          <input type="file" ref={fileInputRef} className="hidden" accept=".xlsx, .xls" onChange={handleFileUpload} />
          <button onClick={() => fileInputRef.current?.click()} className="flex-1 lg:flex-none bg-[#1a202e] border border-slate-800 px-4 py-2 rounded-lg text-[10px] font-black text-slate-300 flex items-center justify-center gap-2 hover:bg-slate-800 transition-colors">
            <UploadCloud size={14} className="text-emerald-500" /> IMPORTAR
          </button>
          <button onClick={exportToExcel} className="flex-1 lg:flex-none bg-[#1a202e] border border-slate-800 px-4 py-2 rounded-lg text-[10px] font-black text-slate-300 flex items-center justify-center gap-2 hover:bg-slate-800 transition-colors">
            <FileSpreadsheet size={14} className="text-cyan-400" /> EXCEL
          </button>
          {/* BOTÃO DE PDF REATIVADO AQUI */}
          <button onClick={exportToPDF} className="flex-1 lg:flex-none bg-[#1a202e] border border-slate-800 px-4 py-2 rounded-lg text-[10px] font-black text-slate-300 flex items-center justify-center gap-2 hover:bg-slate-800 transition-colors">
            <FileText size={14} className="text-red-400" /> PDF
          </button>
          
          {selectedIds.length > 0 && (
            <button onClick={deleteSelected} className="flex-1 lg:flex-none bg-red-600/20 border border-red-500/50 px-4 py-2 rounded-lg text-[10px] font-black text-red-500 flex items-center justify-center gap-2 hover:bg-red-600 hover:text-white transition-all">
              <Trash2 size={14} /> ELIMINAR ({selectedIds.length})
            </button>
          )}
        </div>
      </header>

      <div className="bg-[#161922] rounded-2xl border border-slate-800/50 p-4 shrink-0 shadow-2xl">
        <form onSubmit={handleSubmit} className="grid grid-cols-2 md:flex md:flex-nowrap gap-4 items-end">
          <div className="space-y-1 flex-1">
            <label className="text-[9px] font-black text-slate-500 uppercase px-1">Lote ID</label>
            <input required className="w-full bg-[#0d0f14] border border-slate-800 p-3 rounded-xl text-cyan-500 font-bold outline-none text-xs uppercase" value={formData.loteId} onChange={e => setFormData({...formData, loteId: e.target.value.toUpperCase()})} />
          </div>
          <div className="space-y-1 flex-1">
            <label className="text-[9px] font-black text-slate-500 uppercase px-1">Qtd (Kg)</label>
            <input type="number" step="0.1" className="w-full bg-[#0d0f14] border border-slate-800 p-3 rounded-xl text-white font-bold outline-none text-xs" value={formData.quantidadeKg} onChange={e => setFormData({...formData, quantidadeKg: e.target.value})} />
          </div>
          <button type="submit" className="md:w-auto bg-cyan-600 hover:bg-cyan-500 text-white font-black text-[11px] px-8 py-3.5 rounded-xl uppercase flex items-center gap-2 shadow-lg transition-all shrink-0">
            {editingId ? <Check size={18} /> : <Plus size={18} />} GRAVAR
          </button>
        </form>
      </div>

      <div className="bg-[#161922] rounded-2xl border border-slate-800/50 shadow-2xl flex flex-col flex-1 min-h-0 overflow-hidden">
        <div className="overflow-y-auto flex-1 custom-scrollbar overflow-x-auto"> 
          <table className="w-full text-left text-[11px] border-separate border-spacing-0 min-w-[900px]">
            <thead className="bg-[#11141d] text-slate-500 font-black uppercase text-[9px] sticky top-0 z-10">
              <tr>
                <th className="p-4 border-b border-slate-800/50 w-10">
                  <button onClick={toggleSelectAll} className="text-slate-500 hover:text-cyan-500 transition-colors">
                    {selectedIds.length === registos.length && registos.length > 0 ? <CheckSquare size={16}/> : <Square size={16}/>}
                  </button>
                </th>
                <th className="p-4 border-b border-slate-800/50">LOTE ID</th>
                <th className="p-4 border-b border-slate-800/50">DATA</th>
                <th className="p-4 border-b border-slate-800/50">ALIMENTO</th>
                <th className="p-4 text-center border-b border-slate-800/50">QTD (KG)</th>
                <th className="p-4 text-right border-b border-slate-800/50 px-8">TOTAL (KZ)</th>
                <th className="p-4 text-center border-b border-slate-800/50">AÇÕES</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/20">
              {registos.map((r) => {
                const isSelected = selectedIds.includes(r.id);
                return (
                  <tr key={r.id} className={`${isSelected ? 'bg-cyan-500/5' : ''} hover:bg-cyan-500/[0.02] transition-colors`}>
                    <td className="p-4">
                      <button onClick={() => toggleSelectOne(r.id)} className={`${isSelected ? 'text-cyan-500' : 'text-slate-700'} transition-colors`}>
                        {isSelected ? <CheckSquare size={16}/> : <Square size={16}/>}
                      </button>
                    </td>
                    <td className="p-4 font-black text-cyan-500 uppercase">{r.loteId}</td>
                    <td className="p-4 text-slate-400 font-bold">{r.data.split('-').reverse().join('/')}</td>
                    <td className="p-4 text-white font-bold">{r.tipoAlimento}</td>
                    <td className="p-4 text-center text-white font-bold">{Number(r.quantidadeKg).toFixed(1)} Kg</td>
                    <td className="p-4 text-right text-emerald-500 font-black px-8">{(r.quantidadeKg * r.custoUnitario).toLocaleString()}</td>
                    <td className="p-4 text-center">
                      <div className="flex justify-center gap-1">
                        <button onClick={() => { setEditingId(r.id); setFormData({...r}); }} className="p-2 text-slate-500 hover:text-cyan-400"><Edit3 size={14}/></button>
                        <button onClick={() => { if(confirm('Eliminar?')) deleteDoc(doc(db, 'alimentacao', r.id)) }} className="p-2 text-slate-600 hover:text-red-500"><Trash2 size={14}/></button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
