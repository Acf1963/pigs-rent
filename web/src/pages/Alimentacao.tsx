import { useState, useEffect, useRef } from 'react';
import { db } from '../lib/firebase';
import { collection, addDoc, onSnapshot, query, orderBy, deleteDoc, doc, updateDoc } from 'firebase/firestore';
import { 
  Utensils, FileSpreadsheet, FileText, UploadCloud, Check, Trash2, Edit3 
} from 'lucide-react';

import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export default function AlimentacaoPage() {
  const [registos, setRegistos] = useState<any[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [formData, setFormData] = useState({
    loteId: '',
    data: new Date().toISOString().split('T')[0],
    tipoAlimento: 'RAÇÃO CRESCIMENTO',
    quantidadeKg: '',
    custoUnitario: '',
    observacoes: ''
  });

  useEffect(() => {
    const q = query(collection(db, 'alimentacao'), orderBy('data', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setRegistos(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });
    return () => unsubscribe();
  }, []);

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
          if (dataFinal instanceof Date) {
            dataFinal = dataFinal.toISOString().split('T')[0];
          }

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

  const exportToExcel = () => {
    const dadosExcel = registos.map(r => ({
      'LOTE ID': r.loteId,
      'DATA': r.data,
      'ALIMENTO': r.tipoAlimento,
      'QTD (KG)': r.quantidadeKg,
      'CUSTO UN. (KZ)': r.custoUnitario,
      'TOTAL (KZ)': (r.quantidadeKg * r.custoUnitario),
      'OBSERVAÇÕES': r.observacoes
    }));

    const ws = XLSX.utils.json_to_sheet(dadosExcel);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Consumo Alimentar");
    XLSX.writeFile(wb, "Consumo_Alimentar.xlsx");
  };

  const exportToPDF = () => {
    const doc = new jsPDF('l', 'mm', 'a4');
    doc.setFontSize(18);
    doc.text("AgroRent - Registo de Consumo Alimentar", 14, 15);
    
    autoTable(doc, {
      head: [["LOTE ID", "DATA", "ALIMENTO", "QTD (KG)", "CUSTO UN.", "TOTAL (KZ)", "OBS"]],
      body: registos.map(r => [
        r.loteId, 
        r.data, 
        r.tipoAlimento, 
        Number(r.quantidadeKg).toFixed(1), 
        Number(r.custoUnitario).toLocaleString(), 
        (r.quantidadeKg * r.custoUnitario).toLocaleString(),
        r.observacoes
      ]),
      startY: 22,
      headStyles: { fillColor: [8, 145, 178], fontStyle: 'bold' },
      styles: { fontSize: 8, cellPadding: 3 },
      alternateRowStyles: { fillColor: [245, 247, 250] }
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
    setFormData({ loteId: '', data: new Date().toISOString().split('T')[0], tipoAlimento: 'RAÇÃO CRESCIMENTO', quantidadeKg: '', custoUnitario: '', observacoes: '' });
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center border-b border-slate-800/50 pb-6">
        <h1 className="text-3xl font-black text-white flex items-center gap-3 tracking-tighter uppercase">
          <Utensils className="text-cyan-500" size={32} /> Consumo Alimentar
        </h1>

        <div className="flex gap-2 bg-[#161922] p-1.5 rounded-2xl border border-slate-800 shadow-xl">
          <input type="file" ref={fileInputRef} className="hidden" accept=".xlsx, .xls" onChange={handleFileUpload} />
          <button onClick={() => fileInputRef.current?.click()} className="bg-[#1e293b] text-slate-300 px-4 py-2 rounded-xl text-[10px] font-black uppercase flex items-center gap-2 hover:bg-slate-800 border border-slate-700/50 transition-all">
            <UploadCloud size={14} className="text-emerald-500" /> Importar
          </button>
          <button onClick={exportToExcel} className="bg-[#1e293b] text-slate-300 px-4 py-2 rounded-xl text-[10px] font-black uppercase flex items-center gap-2 hover:bg-slate-800 border border-slate-700/50 transition-all">
            <FileSpreadsheet size={14} className="text-emerald-400" /> Excel
          </button>
          <button onClick={exportToPDF} className="bg-[#1e293b] text-slate-300 px-4 py-2 rounded-xl text-[10px] font-black uppercase flex items-center gap-2 hover:bg-slate-800 border border-slate-700/50 transition-all">
            <FileText size={14} className="text-red-400" /> PDF
          </button>
        </div>
      </div>

      <div className="bg-[#161922] rounded-[2rem] border border-slate-800/50 p-6 shadow-2xl">
        <form onSubmit={handleSubmit} className="grid grid-cols-12 gap-3 items-end">
          <div className="col-span-2 space-y-1">
            <label className="text-[8px] font-black text-slate-500 uppercase px-1">Lote ID</label>
            <input required className="w-full bg-[#0f121a] border border-slate-800 p-2.5 rounded-xl text-cyan-500 font-bold outline-none text-[10px] uppercase" value={formData.loteId} onChange={e => setFormData({...formData, loteId: e.target.value.toUpperCase()})} />
          </div>
          <div className="col-span-2 space-y-1">
            <label className="text-[8px] font-black text-slate-500 uppercase px-1">Data</label>
            <input type="date" className="w-full bg-[#0f121a] border border-slate-800 p-2.5 rounded-xl text-white font-bold outline-none text-[10px]" value={formData.data} onChange={e => setFormData({...formData, data: e.target.value})} />
          </div>
          <div className="col-span-2 space-y-1">
            <label className="text-[8px] font-black text-slate-500 uppercase px-1">Tipo Alimento</label>
            <select className="w-full bg-[#0f121a] border border-slate-800 p-2.5 rounded-xl text-white font-bold outline-none text-[10px]" value={formData.tipoAlimento} onChange={e => setFormData({...formData, tipoAlimento: e.target.value})}>
              <option value="RAÇÃO CRESCIMENTO">RAÇÃO CRESCIMENTO</option>
              <option value="RAÇÃO ENGORDA">RAÇÃO ENGORDA</option>
              <option value="RAÇÃO MATRIZ">RAÇÃO MATRIZ</option>
              <option value="MILHO">MILHO</option>
            </select>
          </div>
          <div className="col-span-1 space-y-1">
            <label className="text-[8px] font-black text-slate-500 uppercase px-1">Qtd (Kg)</label>
            <input type="number" step="0.1" className="w-full bg-[#0f121a] border border-slate-800 p-2.5 rounded-xl text-white font-bold outline-none text-[10px]" value={formData.quantidadeKg} onChange={e => setFormData({...formData, quantidadeKg: e.target.value})} />
          </div>
          <div className="col-span-2 space-y-1">
            <label className="text-[8px] font-black text-slate-500 uppercase px-1">Custo Un. (KZ)</label>
            <input type="number" className="w-full bg-[#0f121a] border border-slate-800 p-2.5 rounded-xl text-emerald-500 font-bold outline-none text-[10px]" value={formData.custoUnitario} onChange={e => setFormData({...formData, custoUnitario: e.target.value})} />
          </div>
          <div className="col-span-3">
            <button type="submit" className="w-full bg-cyan-600 hover:bg-cyan-500 text-white font-black text-[10px] py-3 rounded-xl transition-all shadow-lg uppercase">
              <Check size={14} className="inline mr-2" /> Gravar Registo
            </button>
          </div>
        </form>
      </div>

      <div className="bg-[#161922] rounded-[2rem] border border-slate-800/50 shadow-2xl overflow-hidden">
        <div className="max-h-[220px] overflow-y-auto custom-scrollbar"> 
          <table className="w-full text-left text-[10px]">
            <thead className="bg-black/30 text-slate-500 font-black uppercase text-[8px] border-b border-slate-800/50 sticky top-0 z-10 backdrop-blur-md">
              <tr>
                <th className="p-4">LOTE ID</th>
                <th className="p-4">DATA</th>
                <th className="p-4">ALIMENTO</th>
                <th className="p-4">QTD (KG)</th>
                <th className="p-4">CUSTO UN.</th>
                <th className="p-4">TOTAL (KZ)</th>
                <th className="p-4 text-center">AÇÕES</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/30">
              {registos.map((r) => (
                <tr key={r.id} className="hover:bg-slate-800/10 transition-colors h-[50px]">
                  <td className="p-4 font-black text-cyan-500 uppercase">{r.loteId}</td>
                  <td className="p-4 text-slate-500 font-bold">{r.data}</td>
                  <td className="p-4 text-white font-bold">{r.tipoAlimento}</td>
                  <td className="p-4 text-white font-bold">{Number(r.quantidadeKg).toFixed(1)} Kg</td>
                  <td className="p-4 text-slate-400">{Number(r.custoUnitario).toLocaleString()} KZ</td>
                  <td className="p-4 text-emerald-500 font-black">{(r.quantidadeKg * r.custoUnitario).toLocaleString()} KZ</td>
                  <td className="p-4 text-center">
                    <div className="flex justify-center gap-3">
                      <button onClick={() => { setEditingId(r.id); setFormData({...r}); }} className="text-slate-600 hover:text-cyan-400"><Edit3 size={14}/></button>
                      <button onClick={() => { if(confirm('Eliminar?')) deleteDoc(doc(db, 'alimentacao', r.id)) }} className="text-slate-600 hover:text-red-500"><Trash2 size={14}/></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
