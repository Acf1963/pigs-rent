import { useState, useEffect, useRef } from 'react';
import { db } from '../lib/firebase';
import { collection, addDoc, onSnapshot, query, orderBy, deleteDoc, doc, updateDoc } from 'firebase/firestore';
import { 
  Utensils, FileSpreadsheet, FileText, UploadCloud, Check, Trash2, Edit3, Plus 
} from 'lucide-react';

import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export default function AlimentacaoPage() {
  const [registos, setRegistos] = useState<any[]>([]);
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

  // 1. Listeners do Firebase
  useEffect(() => {
    const q = query(collection(db, 'alimentacao'), orderBy('data', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setRegistos(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });
    return () => unsubscribe();
  }, []);

  // 2. Importação Excel Inteligente
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: 'binary', cellDates: true });
        const data = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]]);
        
        for (const item of data as any[]) {
          let dataFinal = item.data || item.Data;
          if (dataFinal instanceof Date) dataFinal = dataFinal.toISOString().split('T')[0];

          const lote = item.codigoLote || item.loteId || 'S/L';
          const tipo = item.tipoRacao || item.fase || 'RAÇÃO';
          const qtd = item.quantidadeKg || item.quantidade || 0;
          const custo = item.custoPorKgKz || item.custoUnitario || 0;
          const obs = item.observacoes || item.fornecedor || '';

          await addDoc(collection(db, 'alimentacao'), { 
            loteId: lote.toString().toUpperCase(),
            data: dataFinal || new Date().toISOString().split('T')[0],
            tipoAlimento: tipo.toString().toUpperCase(),
            quantidadeKg: parseFloat(qtd) || 0,
            custoUnitario: parseFloat(custo) || 0,
            observacoes: obs.toString().toUpperCase(),
            createdAt: new Date().toISOString() 
          });
        }
      } catch (err) { console.error("Erro na importação:", err); }
    };
    reader.readAsBinaryString(file);
  };

  // 3. Exportações
  const exportToExcel = () => {
    const ws = XLSX.utils.json_to_sheet(registos.map(r => ({
      'LOTE ID': r.loteId,
      'DATA': r.data,
      'ALIMENTO': r.tipoAlimento,
      'QTD (KG)': r.quantidadeKg,
      'CUSTO UN. (KZ)': r.custoUnitario,
      'TOTAL (KZ)': (r.quantidadeKg * r.custoUnitario),
      'OBSERVAÇÕES': r.observacoes
    })));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Consumo");
    XLSX.writeFile(wb, "Consumo_Alimentar_Kwanza.xlsx");
  };

  const exportToPDF = () => {
    const doc = new jsPDF('l', 'mm', 'a4');
    doc.text("AgroRent - Registo de Consumo Alimentar", 14, 15);
    autoTable(doc, {
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
    doc.save("Consumo_Alimentar.pdf");
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
    <div className="space-y-4 md:space-y-6 pb-24 lg:pb-0">
      
      {/* HEADER RESPONSIVO */}
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-slate-800/50 pb-6">
        <h1 className="text-2xl md:text-3xl font-black text-white flex items-center gap-3 tracking-tighter uppercase">
          <Utensils className="text-cyan-500" size={32} /> Consumo Alimentar
        </h1>

        <div className="flex flex-wrap gap-2 w-full md:w-auto bg-[#161922] p-1.5 rounded-2xl border border-slate-800 shadow-xl">
          <input type="file" ref={fileInputRef} className="hidden" accept=".xlsx, .xls" onChange={handleFileUpload} />
          <button onClick={() => fileInputRef.current?.click()} className="flex-1 md:flex-none bg-[#1e293b] text-slate-300 px-4 py-2.5 rounded-xl text-[10px] font-black uppercase flex items-center justify-center gap-2 hover:bg-slate-800 border border-slate-700/50 transition-all active:scale-95">
            <UploadCloud size={14} className="text-emerald-500" /> Importar
          </button>
          <button onClick={exportToExcel} className="flex-1 md:flex-none bg-[#1e293b] text-slate-300 px-4 py-2.5 rounded-xl text-[10px] font-black uppercase flex items-center justify-center gap-2 hover:bg-slate-800 border border-slate-700/50 transition-all active:scale-95">
            <FileSpreadsheet size={14} className="text-emerald-400" /> Excel
          </button>
          <button onClick={exportToPDF} className="flex-1 md:flex-none bg-[#1e293b] text-slate-300 px-4 py-2.5 rounded-xl text-[10px] font-black uppercase flex items-center justify-center gap-2 hover:bg-slate-800 border border-slate-700/50 transition-all active:scale-95">
            <FileText size={14} className="text-red-400" /> PDF
          </button>
        </div>
      </header>

      {/* FORMULÁRIO ADAPTATIVO */}
      <div className="bg-[#161922] rounded-3xl md:rounded-[2rem] border border-slate-800/50 p-4 md:p-6 shadow-2xl">
        <form onSubmit={handleSubmit} className="flex flex-col md:grid md:grid-cols-12 gap-4">
          <div className="md:col-span-2 space-y-1">
            <label className="text-[8px] font-black text-slate-500 uppercase px-1">Lote ID</label>
            <input required className="w-full bg-[#0f121a] border border-slate-800 p-3 rounded-xl text-cyan-500 font-bold outline-none text-xs uppercase" value={formData.loteId} onChange={e => setFormData({...formData, loteId: e.target.value.toUpperCase()})} />
          </div>
          
          <div className="md:col-span-2 space-y-1">
            <label className="text-[8px] font-black text-slate-500 uppercase px-1">Data</label>
            <input type="date" className="w-full bg-[#0f121a] border border-slate-800 p-3 rounded-xl text-white font-bold outline-none text-xs" value={formData.data} onChange={e => setFormData({...formData, data: e.target.value})} />
          </div>

          <div className="md:col-span-3 space-y-1">
            <label className="text-[8px] font-black text-slate-500 uppercase px-1">Tipo Alimento</label>
            <select className="w-full bg-[#0f121a] border border-slate-800 p-3 rounded-xl text-white font-bold outline-none text-xs" value={formData.tipoAlimento} onChange={e => setFormData({...formData, tipoAlimento: e.target.value})}>
              <option value="RAÇÃO CRESCIMENTO">RAÇÃO CRESCIMENTO</option>
              <option value="RAÇÃO ENGORDA">RAÇÃO ENGORDA</option>
              <option value="RAÇÃO MATRIZ">RAÇÃO MATRIZ</option>
              <option value="MILHO">MILHO</option>
            </select>
          </div>

          <div className="grid grid-cols-2 md:col-span-3 gap-4">
            <div className="space-y-1">
              <label className="text-[8px] font-black text-slate-500 uppercase px-1">Qtd (Kg)</label>
              <input type="number" step="0.1" className="w-full bg-[#0f121a] border border-slate-800 p-3 rounded-xl text-white font-bold outline-none text-xs" value={formData.quantidadeKg} onChange={e => setFormData({...formData, quantidadeKg: e.target.value})} />
            </div>
            <div className="space-y-1">
              <label className="text-[8px] font-black text-emerald-500 uppercase px-1">Custo Un (KZ)</label>
              <input type="number" className="w-full bg-[#0f121a] border border-slate-800 p-3 rounded-xl text-emerald-500 font-bold outline-none text-xs" value={formData.custoUnitario} onChange={e => setFormData({...formData, custoUnitario: e.target.value})} />
            </div>
          </div>

          <div className="md:col-span-2 pt-2 md:pt-0">
            <button type="submit" className="w-full h-full bg-cyan-600 hover:bg-cyan-500 text-white font-black text-xs py-3.5 rounded-xl transition-all shadow-lg uppercase flex items-center justify-center gap-2 active:scale-95">
              {editingId ? <Check size={16} /> : <Plus size={16} />} 
              {editingId ? 'Atualizar' : 'Gravar'}
            </button>
          </div>
        </form>
      </div>

      {/* TABELA COM SCROLL HORIZONTAL */}
      <div className="bg-[#161922] rounded-3xl md:rounded-[2rem] border border-slate-800/50 shadow-2xl overflow-hidden flex flex-col">
        <div className="overflow-x-auto custom-scrollbar"> 
          <table className="w-full text-left text-[10px] min-w-[900px]">
            <thead className="bg-black/30 text-slate-500 font-black uppercase text-[8px] border-b border-slate-800/50 sticky top-0 z-10 backdrop-blur-md">
              <tr>
                <th className="p-4">LOTE ID</th>
                <th className="p-4">DATA</th>
                <th className="p-4">ALIMENTO</th>
                <th className="p-4 text-center">QTD (KG)</th>
                <th className="p-4 text-center">CUSTO UN.</th>
                <th className="p-4 text-center">TOTAL (KZ)</th>
                <th className="p-4 text-center">AÇÕES</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/30">
              {registos.map((r) => (
                <tr key={r.id} className="hover:bg-slate-800/10 transition-colors">
                  <td className="p-4 font-black text-cyan-500 uppercase">{r.loteId}</td>
                  <td className="p-4 text-slate-500 font-bold">{r.data.split('-').reverse().join('/')}</td>
                  <td className="p-4 text-white font-bold">{r.tipoAlimento}</td>
                  <td className="p-4 text-center text-white font-bold">{Number(r.quantidadeKg).toFixed(1)} Kg</td>
                  <td className="p-4 text-center text-slate-400">{Number(r.custoUnitario).toLocaleString()} KZ</td>
                  <td className="p-4 text-center text-emerald-500 font-black">{(r.quantidadeKg * r.custoUnitario).toLocaleString()} KZ</td>
                  <td className="p-4 text-center">
                    <div className="flex justify-center gap-2">
                      <button onClick={() => { setEditingId(r.id); setFormData({...r}); window.scrollTo({top:0, behavior:'smooth'}) }} className="p-2 text-slate-600 hover:text-cyan-400 transition-all"><Edit3 size={16}/></button>
                      <button onClick={() => { if(confirm('Eliminar?')) deleteDoc(doc(db, 'alimentacao', r.id)) }} className="p-2 text-slate-600 hover:text-red-500 transition-all"><Trash2 size={16}/></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* RESUMO DE CUSTOS (Mobile Friendly) */}
        <div className="p-4 bg-black/40 border-t border-slate-800/50 flex justify-between items-center">
          <div className="flex gap-8">
            <div className="flex flex-col">
              <span className="text-[7px] font-black text-slate-500 uppercase tracking-widest">Total Kg</span>
              <span className="text-xs font-black text-white">
                {registos.reduce((acc, r) => acc + (Number(r.quantidadeKg) || 0), 0).toLocaleString()} Kg
              </span>
            </div>
            <div className="flex flex-col">
              <span className="text-[7px] font-black text-slate-500 uppercase tracking-widest">Investimento Total</span>
              <span className="text-xs font-black text-emerald-500">
                {registos.reduce((acc, r) => acc + (r.quantidadeKg * r.custoUnitario), 0).toLocaleString()} Kz
              </span>
            </div>
          </div>
          <Utensils size={16} className="text-cyan-500 opacity-20" />
        </div>
      </div>
    </div>
  );
}
