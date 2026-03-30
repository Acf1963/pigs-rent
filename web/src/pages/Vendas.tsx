import { useState, useEffect, useRef } from 'react';
import { db } from '../lib/firebase';
import { collection, addDoc, onSnapshot, query, orderBy, deleteDoc, doc, updateDoc } from 'firebase/firestore';
import { 
  FileSpreadsheet, 
  FileText, 
  UploadCloud, 
  PieChart, 
  Trash2, 
  Edit3, 
  RotateCcw, 
  Plus 
} from 'lucide-react';

// Bibliotecas de Exportação
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export default function VendasPage() {
  const [vendas, setVendas] = useState<any[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [formData, setFormData] = useState({
    loteId: '', cliente: '', produto: '', pesoKg: 0, precoKz: 0,
    dataVenda: new Date().toISOString().split('T')[0]
  });

  const resetForm = () => {
    setFormData({ loteId: '', cliente: '', produto: '', pesoKg: 0, precoKz: 0, dataVenda: new Date().toISOString().split('T')[0] });
    setEditingId(null);
  };

  useEffect(() => {
    const q = query(collection(db, 'vendas'), orderBy('dataVenda', 'asc'));
    return onSnapshot(q, (snapshot) => {
      setVendas(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });
  }, []);

  // --- EXPORTAÇÃO EXCEL ---
  const exportToExcel = () => {
    if (vendas.length === 0) return alert("Sem dados para exportar.");
    const data = vendas.map(v => ({
      Lote: (v.loteId || '').toUpperCase(),
      Data: v.dataVenda || '',
      Cliente: (v.cliente || '').toUpperCase(),
      Produto: (v.produto || '').toUpperCase(),
      Peso: Number(v.pesoKg || 0),
      Preco: Number(v.precoKz || 0),
      Total: (Number(v.pesoKg || 0) * Number(v.precoKz || 0))
    }));
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Vendas");
    XLSX.writeFile(wb, `Vendas_FazendaKwanza_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  // --- EXPORTAÇÃO PDF ---
  const exportToPDF = () => {
    if (vendas.length === 0) return alert("Sem dados para exportar.");
    const doc = new jsPDF();
    doc.text("Relatório de Vendas - Fazenda Kwanza", 14, 15);
    
    const rows = vendas.map(v => [
      (v.loteId || '').toUpperCase(),
      v.dataVenda || '',
      `${(v.cliente || '').toUpperCase()} / ${(v.produto || '').toUpperCase()}`,
      Number(v.pesoKg || 0).toFixed(2),
      (Number(v.pesoKg || 0) * Number(v.precoKz || 0)).toLocaleString() + " Kz"
    ]);

    autoTable(doc, {
      head: [["Lote", "Data", "Cliente/Produto", "Peso (kg)", "Total (Kz)"]],
      body: rows,
      startY: 20,
      theme: 'grid',
      headStyles: { fillColor: [14, 116, 144] }
    });
    doc.save("Relatorio_Vendas.pdf");
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const data = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]]);
        for (const item of data as any[]) {
          await addDoc(collection(db, 'vendas'), {
            loteId: (item.loteId || '').toString().toUpperCase(),
            dataVenda: item.dataVenda || new Date().toISOString().split('T')[0],
            cliente: (item.cliente || '').toUpperCase(),
            produto: (item.produto || '').toUpperCase(),
            pesoKg: Number(item.pesoKg || 0),
            precoKz: Number(item.precoKz || 0),
            createdAt: new Date().toISOString()
          });
        }
      } catch (err) { alert("Erro no processamento."); }
    };
    reader.readAsBinaryString(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (editingId) {
      await updateDoc(doc(db, 'vendas', editingId), { ...formData });
    } else {
      await addDoc(collection(db, 'vendas'), { ...formData, createdAt: new Date().toISOString() });
    }
    resetForm();
  };

  const formatDate = (date: any) => {
    if (!date || typeof date !== 'string') return "---";
    const p = date.split('-');
    return p.length === 3 ? `${p[2]}/${p[1]}/${p[0]}` : date;
  };

  let totalAcumulado = 0;

  return (
    <div className="space-y-6">
      {/* HEADER HARMONIZADO */}
      <div className="flex justify-between items-end border-b border-slate-800 pb-6">
        <div>
          <h1 className="text-3xl font-black uppercase tracking-tighter flex items-center gap-3">
            <PieChart className="text-cyan-500" size={32} /> VENDAS
          </h1>
          <p className="text-cyan-500/40 text-[10px] font-bold uppercase tracking-[0.2em]">Controlo de Faturação Acumulada</p>
        </div>

        <div className="flex items-center gap-2 bg-[#1a1d26] p-2 rounded-2xl border border-slate-800 shadow-xl">
          <input type="file" ref={fileInputRef} onChange={handleFileUpload} className="hidden" accept=".xlsx, .xls" />
          <button onClick={() => fileInputRef.current?.click()} className="bg-[#1e293b] border border-slate-700 text-slate-300 px-4 py-2 rounded-xl text-[10px] font-black uppercase flex items-center gap-2 hover:bg-slate-800 transition-all">
            <UploadCloud size={14} className="text-emerald-500" /> Importar
          </button>
          <button onClick={exportToExcel} className="bg-[#1e293b] border border-slate-700 text-slate-300 px-4 py-2 rounded-xl text-[10px] font-black uppercase flex items-center gap-2 hover:bg-slate-800 transition-all">
            <FileSpreadsheet size={14} className="text-emerald-400" /> Excel
          </button>
          <button onClick={exportToPDF} className="bg-[#1e293b] border border-slate-700 text-slate-300 px-4 py-2 rounded-xl text-[10px] font-black uppercase flex items-center gap-2 hover:bg-slate-800 transition-all">
            <FileText size={14} className="text-red-400" /> PDF
          </button>
        </div>
      </div>

      {/* FORMULÁRIO */}
      <div className="bg-[#1a1d26] rounded-3xl border border-slate-800 p-6">
        <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-7 gap-4 items-end">
          <div className="space-y-1">
            <label className="text-[9px] font-black text-slate-500 uppercase px-1">Lote</label>
            <input required className="w-full bg-[#0f1117] border border-slate-700 p-2.5 rounded-xl text-sm font-black text-cyan-400" value={formData.loteId} onChange={e => setFormData({...formData, loteId: e.target.value.toUpperCase()})} />
          </div>
          <div className="space-y-1">
            <label className="text-[9px] font-black text-slate-500 uppercase px-1">Data</label>
            <input type="date" required className="w-full bg-[#0f1117] border border-slate-700 p-2.5 rounded-xl text-sm font-bold text-slate-300" value={formData.dataVenda} onChange={e => setFormData({...formData, dataVenda: e.target.value})} />
          </div>
          <div className="space-y-1 lg:col-span-1">
            <label className="text-[9px] font-black text-slate-500 uppercase px-1">Cliente</label>
            <input required className="w-full bg-[#0f1117] border border-slate-700 p-2.5 rounded-xl text-sm font-bold uppercase" value={formData.cliente} onChange={e => setFormData({...formData, cliente: e.target.value})} />
          </div>
          <div className="space-y-1">
            <label className="text-[9px] font-black text-slate-500 uppercase px-1">Produto</label>
            <input required className="w-full bg-[#0f1117] border border-slate-700 p-2.5 rounded-xl text-sm font-bold text-cyan-500 uppercase" value={formData.produto} onChange={e => setFormData({...formData, produto: e.target.value})} />
          </div>
          <div className="space-y-1">
            <label className="text-[9px] font-black text-slate-500 uppercase px-1">Peso (kg)</label>
            <input type="number" step="0.1" className="w-full bg-[#0f1117] border border-slate-700 p-2.5 rounded-xl text-sm font-bold text-emerald-500" value={formData.pesoKg} onChange={e => setFormData({...formData, pesoKg: Number(e.target.value)})} />
          </div>
          <div className="space-y-1">
            <label className="text-[9px] font-black text-slate-500 uppercase px-1">Preço (kz)</label>
            <input type="number" className="w-full bg-[#0f1117] border border-slate-700 p-2.5 rounded-xl text-sm font-bold text-amber-500" value={formData.precoKz} onChange={e => setFormData({...formData, precoKz: Number(e.target.value)})} />
          </div>
          <div className="flex gap-2">
            <button type="submit" className="flex-1 bg-cyan-600 text-white font-black text-[10px] uppercase rounded-xl h-[45px] hover:bg-cyan-500 transition-all flex items-center justify-center gap-2">
              <Plus size={18}/> {editingId ? 'OK' : 'REGISTAR'}
            </button>
            <button type="button" onClick={resetForm} className="bg-slate-800 text-slate-400 rounded-xl w-12 h-[45px] border border-slate-700 flex items-center justify-center hover:text-white transition-all">
              <RotateCcw size={20}/>
            </button>
          </div>
        </form>
      </div>

      {/* TABELA */}
      <div className="bg-[#1a1d26] rounded-3xl border border-slate-800 overflow-hidden shadow-2xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-[11px]">
            <thead>
              <tr className="text-[9px] font-black uppercase text-slate-600 tracking-widest border-b border-slate-800 bg-black/20">
                <th className="p-4">Lote</th>
                <th className="p-4">Data</th>
                <th className="p-4">Cliente / Produto</th>
                <th className="p-4 text-center">Peso</th>
                <th className="p-4 text-right">Preço Un.</th>
                <th className="p-4 text-right text-white">Venda Total</th>
                <th className="p-4 text-right text-cyan-400 italic">Acumulado</th>
                <th className="p-4 text-center">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/50">
              {vendas.map((v) => {
                const totalLinha = (Number(v.pesoKg) || 0) * (Number(v.precoKz) || 0);
                totalAcumulado += totalLinha;
                return (
                  <tr key={v.id} className="hover:bg-slate-800/20 transition-colors">
                    <td className="p-4 font-black text-cyan-500 uppercase">{v.loteId}</td>
                    <td className="p-4 text-slate-500 font-mono">{formatDate(v.dataVenda)}</td>
                    <td className="p-4 font-bold text-white uppercase">{v.cliente} <span className="block text-[9px] text-cyan-600 font-normal italic">{v.produto}</span></td>
                    <td className="p-4 text-center font-bold text-emerald-500">{v.pesoKg} kg</td>
                    <td className="p-4 text-right font-bold text-amber-500">{v.precoKz.toLocaleString()} Kz</td>
                    <td className="p-4 text-right font-black text-slate-300 bg-white/5">{totalLinha.toLocaleString()} Kz</td>
                    <td className="p-4 text-right font-black text-cyan-400 bg-cyan-500/5 italic">{totalAcumulado.toLocaleString()} Kz</td>
                    <td className="p-4 text-center">
                      <div className="flex justify-center gap-3">
                        <button onClick={() => { setEditingId(v.id); setFormData({...v}); }} className="text-slate-600 hover:text-cyan-400"><Edit3 size={16}/></button>
                        <button onClick={() => deleteDoc(doc(db, 'vendas', v.id))} className="text-slate-600 hover:text-red-500"><Trash2 size={16}/></button>
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