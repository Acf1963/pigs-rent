import { useState, useEffect, useRef } from 'react';
import { db } from '../lib/firebase';
import { 
  collection, addDoc, onSnapshot, query, orderBy, 
  deleteDoc, doc, updateDoc, writeBatch 
} from 'firebase/firestore';
import { 
  Boxes, FileSpreadsheet, FileText, UploadCloud, Check, Trash2, 
  Edit3, RotateCcw, Plus, Scale, Truck, User, Square, CheckSquare 
} from 'lucide-react';

import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export default function LotesPage() {
  const [registos, setRegistos] = useState<any[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const initialForm = {
    loteId: '',
    dataEntrada: new Date().toISOString().split('T')[0],
    tipoAnimal: 'SUÍNO',
    raca: '',
    quantidade: '',
    fornecedor: '',
    pesoSaida: '',
    custoAquisicao: '',
    custoTransporte: '',
    status: 'ATIVO'
  };

  const [formData, setFormData] = useState(initialForm);

  useEffect(() => {
    const q = query(collection(db, 'lotes'), orderBy('dataEntrada', 'desc'));
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
    if (!confirm(`Eliminar ${selectedIds.length} lotes selecionados?`)) return;
    const batch = writeBatch(db);
    selectedIds.forEach(id => { batch.delete(doc(db, 'lotes', id)); });
    await batch.commit();
    setSelectedIds([]);
  };

  const handleImportExcel = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: 'binary', cellDates: true });
        const data: any[] = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]]);
        const batch = writeBatch(db);
        data.forEach((item) => {
          const newDocRef = doc(collection(db, 'lotes'));
          batch.set(newDocRef, {
            loteId: String(item.loteId || 'S/L').toUpperCase(),
            dataEntrada: item.dataEntrada || new Date().toISOString().split('T')[0],
            fornecedor: String(item.fornecedor || '').toUpperCase(),
            tipoAnimal: String(item.tipoAnimal || 'SUÍNO').toUpperCase(),
            raca: String(item.raca || '').toUpperCase(),
            quantidade: parseInt(item.quantidade) || 0,
            pesoSaida: parseFloat(item.pesoSaida) || 0,
            custoAquisicao: parseFloat(item.custoAquisicao) || 0,
            custoTransporte: parseFloat(item.custoTransporte) || 0,
            status: 'ATIVO',
            createdAt: new Date().toISOString()
          });
        });
        await batch.commit();
        alert("Importação concluída!");
      } catch (error) { console.error(error); }
    };
    reader.readAsBinaryString(file);
  };

  const exportToExcel = () => {
    const ws = XLSX.utils.json_to_sheet(registos.map(r => ({
      'LOTE': r.loteId, 'DATA': r.dataEntrada, 'FORNECEDOR': r.fornecedor,
      'TIPO': r.tipoAnimal, 'QTD': r.quantidade, 'AQUISIÇÃO': r.custoAquisicao
    })));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Lotes");
    XLSX.writeFile(wb, "Inventario_Lotes.xlsx");
  };

  const exportToPDF = () => {
    const docPDF = new jsPDF('l', 'mm', 'a4');
    autoTable(docPDF, {
      head: [["LOTE", "DATA", "FORNECEDOR", "TIPO/RAÇA", "QTD", "INVESTIMENTO"]],
      body: registos.map(r => [
        r.loteId, r.dataEntrada, r.fornecedor, `${r.tipoAnimal}/${r.raca}`, 
        r.quantidade, (Number(r.custoAquisicao) + Number(r.custoTransporte)).toLocaleString()
      ]),
      headStyles: { fillColor: [8, 145, 178] }
    });
    docPDF.save("Relatorio_Lotes.pdf");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload = {
      ...formData,
      quantidade: parseInt(formData.quantidade as string) || 0,
      pesoSaida: parseFloat(formData.pesoSaida as string) || 0,
      custoAquisicao: parseFloat(formData.custoAquisicao as string) || 0,
      custoTransporte: parseFloat(formData.custoTransporte as string) || 0,
    };
    if (editingId) {
      await updateDoc(doc(db, 'lotes', editingId), payload);
      setEditingId(null);
    } else {
      await addDoc(collection(db, 'lotes'), { ...payload, createdAt: new Date().toISOString() });
    }
    setFormData(initialForm);
  };

  return (
    <div className="h-[calc(100vh-110px)] flex flex-col space-y-4 overflow-hidden p-2">
      <header className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 shrink-0">
        <div className="flex items-center gap-4">
          <Boxes className="text-cyan-500" size={28} />
          <h1 className="text-2xl md:text-3xl font-black text-white uppercase tracking-tight">Lotes</h1>
        </div>

        <div className="flex flex-wrap gap-2 w-full lg:w-auto">
          <input type="file" ref={fileInputRef} className="hidden" onChange={handleImportExcel} accept=".xlsx, .xls" />
          <button onClick={() => fileInputRef.current?.click()} className="flex-1 lg:flex-none bg-[#1a202e] border border-slate-800 px-4 py-2 rounded-lg text-[10px] font-black text-slate-300 flex items-center justify-center gap-2 hover:bg-slate-800 transition-colors">
            <UploadCloud size={14} className="text-cyan-500" /> IMPORTAR
          </button>
          <button onClick={exportToExcel} className="flex-1 lg:flex-none bg-[#1a202e] border border-slate-800 px-4 py-2 rounded-lg text-[10px] font-black text-slate-300 flex items-center justify-center gap-2 hover:bg-slate-800 transition-colors">
            <FileSpreadsheet size={14} className="text-emerald-500" /> EXCEL
          </button>
          <button onClick={exportToPDF} className="flex-1 lg:flex-none bg-[#1a202e] border border-slate-800 px-4 py-2 rounded-lg text-[10px] font-black text-slate-300 flex items-center justify-center gap-2 hover:bg-slate-800 transition-colors">
            <FileText size={14} className="text-red-500" /> PDF
          </button>
          
          {selectedIds.length > 0 && (
            <button onClick={deleteSelected} className="flex-1 lg:flex-none bg-red-600/20 border border-red-500/50 px-4 py-2 rounded-lg text-[10px] font-black text-red-500 flex items-center justify-center gap-2 hover:bg-red-600 hover:text-white transition-all">
              <Trash2 size={14} /> ELIMINAR ({selectedIds.length})
            </button>
          )}
        </div>
      </header>

      <div className="bg-[#161922] rounded-2xl border border-slate-800/50 p-4 shrink-0">
        <form onSubmit={handleSubmit} className="grid grid-cols-2 md:flex md:flex-nowrap gap-4 items-end">
          <div className="space-y-1 flex-1">
            <label className="text-[9px] font-black text-slate-500 uppercase px-1">Fornecedor</label>
            <div className="relative">
              <User className="absolute left-3 top-3 text-slate-700" size={14} />
              <input required className="w-full bg-[#0d0f14] border border-slate-800 p-3 pl-10 rounded-lg text-white text-xs font-bold outline-none uppercase" value={formData.fornecedor} onChange={e => setFormData({...formData, fornecedor: e.target.value.toUpperCase()})} />
            </div>
          </div>

          <div className="space-y-1 flex-1">
            <label className="text-[9px] font-black text-slate-500 uppercase px-1">Peso Méd. (kg)</label>
            <div className="relative">
              <Scale className="absolute left-3 top-3 text-cyan-900" size={14} />
              <input type="number" step="0.1" className="w-full bg-[#0d0f14] border border-slate-800 p-3 pl-10 rounded-lg text-white font-black outline-none text-xs" value={formData.pesoSaida} onChange={e => setFormData({...formData, pesoSaida: e.target.value})} />
            </div>
          </div>

          <div className="space-y-1 flex-1">
            <label className="text-[9px] font-black text-slate-500 uppercase px-1">Transporte (Kz)</label>
            <div className="relative">
              <Truck className="absolute left-3 top-3 text-emerald-900" size={14} />
              <input type="number" className="w-full bg-[#0d0f14] border border-slate-800 p-3 pl-10 rounded-lg text-white font-black outline-none text-xs" value={formData.custoTransporte} onChange={e => setFormData({...formData, custoTransporte: e.target.value})} />
            </div>
          </div>

          <div className="flex gap-2 shrink-0">
            <button type="submit" className="bg-cyan-600 hover:bg-cyan-500 text-white font-black text-[11px] px-8 py-3.5 rounded-xl uppercase flex items-center gap-2 shadow-lg transition-all">
              {editingId ? <Check size={18} /> : <Plus size={18} />} GRAVAR
            </button>
            <button type="button" onClick={() => { setEditingId(null); setFormData(initialForm); }} className="bg-slate-800 p-3.5 rounded-xl text-slate-500 hover:text-white transition-all">
              <RotateCcw size={18}/>
            </button>
          </div>
        </form>
      </div>

      <div className="bg-[#161922] rounded-2xl border border-slate-800/50 shadow-2xl flex flex-col flex-1 min-h-0 overflow-hidden">
        <div className="overflow-y-auto flex-1 custom-scrollbar overflow-x-auto"> 
          <table className="w-full text-left text-[11px] border-separate border-spacing-0 min-w-[1000px]">
            <thead className="bg-[#11141d] text-slate-500 font-black uppercase text-[9px] sticky top-0 z-10">
              <tr>
                <th className="p-4 border-b border-slate-800/50 w-10">
                  <button onClick={toggleSelectAll} className="text-slate-500 hover:text-cyan-500">
                    {selectedIds.length === registos.length && registos.length > 0 ? <CheckSquare size={16}/> : <Square size={16}/>}
                  </button>
                </th>
                <th className="p-4 border-b border-slate-800/50">CÓDIGO LOTE</th>
                <th className="p-4 border-b border-slate-800/50">DATA</th>
                <th className="p-4 border-b border-slate-800/50 text-center">EFETIVO</th>
                <th className="p-4 text-right border-b border-slate-800/50">INVESTIMENTO (KZ)</th>
                <th className="p-4 text-center border-b border-slate-800/50">AÇÕES</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/20">
              {registos.map((r) => {
                const isSelected = selectedIds.includes(r.id);
                return (
                  <tr key={r.id} className={`${isSelected ? 'bg-cyan-500/5' : ''} hover:bg-cyan-500/[0.02] transition-colors`}>
                    <td className="p-4">
                      <button onClick={() => toggleSelectOne(r.id)} className={isSelected ? 'text-cyan-500' : 'text-slate-700'}>
                        {isSelected ? <CheckSquare size={16}/> : <Square size={16}/>}
                      </button>
                    </td>
                    <td className="p-4 font-black text-cyan-500 uppercase">{r.loteId}</td>
                    <td className="p-4 text-slate-400 font-bold">{r.dataEntrada?.split('-').reverse().join('/')}</td>
                    <td className="p-4 text-center text-white font-black">{r.quantidade} CAB</td>
                    <td className="p-4 text-right font-black text-emerald-500">
                      {(Number(r.custoAquisicao || 0) + Number(r.custoTransporte || 0)).toLocaleString()}
                    </td>
                    <td className="p-4 text-center">
                      <div className="flex justify-center gap-1">
                        <button onClick={() => { setEditingId(r.id); setFormData({...r}); }} className="p-2 text-slate-500 hover:text-cyan-400"><Edit3 size={14}/></button>
                        <button onClick={() => { if(confirm('Eliminar Lote?')) deleteDoc(doc(db, 'lotes', r.id)) }} className="p-2 text-slate-600 hover:text-red-500"><Trash2 size={14}/></button>
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
