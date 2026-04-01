import { useState, useEffect, useRef } from 'react';
import { db } from '../lib/firebase';
import { collection, addDoc, onSnapshot, query, orderBy, deleteDoc, doc, updateDoc } from 'firebase/firestore';
import { 
  Boxes, FileSpreadsheet, FileText, UploadCloud, Check, Trash2, Edit3, RotateCcw, Plus, Scale, Truck
} from 'lucide-react';

import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export default function LotesPage() {
  const [registos, setRegistos] = useState<any[]>([]);
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
    pesoChegada: '',
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

  // --- LÓGICA DE EXPORTAÇÃO ---
  const exportToExcel = () => {
    const ws = XLSX.utils.json_to_sheet(registos.map(r => ({
      'LOTE': r.loteId,
      'DATA': r.dataEntrada,
      'TIPO': r.tipoAnimal,
      'RAÇA': r.raca,
      'QTD': r.quantidade,
      'CUSTO TOTAL (KZ)': Number(r.custoAquisicao || 0) + Number(r.custoTransporte || 0)
    })));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Lotes");
    XLSX.writeFile(wb, `Lotes_Kwanza_${new Date().getFullYear()}.xlsx`);
  };

  const exportToPDF = () => {
    const docPDF = new jsPDF('l', 'mm', 'a4');
    docPDF.setFontSize(16);
    docPDF.text("FAZENDA KWANZA - INVENTÁRIO DE LOTES", 14, 15);
    autoTable(docPDF, {
      head: [["LOTE", "ENTRADA", "TIPO/RAÇA", "QTD", "INVESTIMENTO (KZ)"]],
      body: registos.map(r => [
        r.loteId, 
        r.dataEntrada.split('-').reverse().join('/'), 
        `${r.tipoAnimal}/${r.raca}`, 
        r.quantidade, 
        (Number(r.custoAquisicao || 0) + Number(r.custoTransporte || 0)).toLocaleString()
      ]),
      startY: 22,
      headStyles: { fillColor: [8, 145, 178] }
    });
    docPDF.save("Relatorio_Lotes_Kwanza.pdf");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload = {
      ...formData,
      quantidade: parseInt(formData.quantidade as string) || 0,
      pesoSaida: parseFloat(formData.pesoSaida as string) || 0,
      pesoChegada: parseFloat(formData.pesoChegada as string) || 0,
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
    <div className="space-y-4 md:space-y-6 pb-24 lg:pb-0">
      
      {/* HEADER ADAPTATIVO */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-slate-800/50 pb-6">
        <div className="flex items-center gap-4">
          <div className="bg-cyan-500/10 p-3 rounded-2xl border border-cyan-500/20 shadow-inner">
            <Boxes className="text-cyan-500" size={32} />
          </div>
          <div>
            <h1 className="text-2xl md:text-3xl font-black text-white uppercase tracking-tighter leading-none">Lotes</h1>
            <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest italic mt-1">Gestão de Efetivo</p>
          </div>
        </div>

        <div className="flex flex-wrap gap-2 w-full md:w-auto bg-[#161922] p-1.5 rounded-2xl border border-slate-800 shadow-xl">
          <input type="file" ref={fileInputRef} className="hidden" accept=".xlsx, .xls" />
          <button onClick={() => fileInputRef.current?.click()} className="flex-1 md:flex-none bg-[#1e293b] text-slate-300 px-4 py-2.5 rounded-xl text-[10px] font-black uppercase flex items-center justify-center gap-2 hover:bg-slate-800 border border-slate-700/50 transition-all active:scale-95">
            <UploadCloud size={14} className="text-cyan-500" /> Importar
          </button>
          <button onClick={exportToExcel} className="flex-1 md:flex-none bg-[#1e293b] text-slate-300 px-4 py-2.5 rounded-xl text-[10px] font-black uppercase flex items-center justify-center gap-2 hover:bg-slate-800 border border-slate-700/50 transition-all active:scale-95">
            <FileSpreadsheet size={14} className="text-emerald-400" /> Excel
          </button>
          <button onClick={exportToPDF} className="flex-1 md:flex-none bg-[#1e293b] text-slate-300 px-4 py-2.5 rounded-xl text-[10px] font-black uppercase flex items-center justify-center gap-2 hover:bg-slate-800 border border-slate-700/50 transition-all active:scale-95">
            <FileText size={14} className="text-red-400" /> PDF
          </button>
        </div>
      </div>

      {/* FORMULÁRIO RESPONSIVO (MOBILE-FIRST) */}
      <div className="bg-[#161922] rounded-3xl md:rounded-[2rem] border border-slate-800/50 p-4 md:p-6 shadow-2xl">
        <form onSubmit={handleSubmit} className="flex flex-col md:grid md:grid-cols-12 gap-4">
          
          <div className="md:col-span-3 space-y-1 w-full">
            <label className="text-[8px] font-black text-slate-500 uppercase px-1">Cód. Lote</label>
            <input required className="w-full bg-[#0f121a] border border-slate-800 p-3 rounded-xl text-cyan-400 font-bold outline-none text-xs uppercase focus:border-cyan-500/50" placeholder="EX: LOTE-001" value={formData.loteId} onChange={e => setFormData({...formData, loteId: e.target.value.toUpperCase()})} />
          </div>

          <div className="md:col-span-3 space-y-1 w-full">
            <label className="text-[8px] font-black text-slate-500 uppercase px-1">Tipo / Raça</label>
            <div className="flex gap-2">
              <select className="bg-[#0f121a] border border-slate-800 p-3 rounded-xl text-white font-bold outline-none text-xs" value={formData.tipoAnimal} onChange={e => setFormData({...formData, tipoAnimal: e.target.value})}>
                <option value="SUÍNO">SUÍNO</option>
                <option value="BOVINO">BOVINO</option>
              </select>
              <input className="flex-1 bg-[#0f121a] border border-slate-800 p-3 rounded-xl text-white font-bold outline-none text-xs uppercase" placeholder="RAÇA" value={formData.raca} onChange={e => setFormData({...formData, raca: e.target.value.toUpperCase()})} />
            </div>
          </div>

          <div className="grid grid-cols-2 md:col-span-3 gap-4 w-full">
            <div className="space-y-1">
              <label className="text-[8px] font-black text-slate-500 uppercase px-1">Qtd Efetivo</label>
              <input type="number" required className="w-full bg-[#0f121a] border border-slate-800 p-3 rounded-xl text-white font-black outline-none text-xs" value={formData.quantidade} onChange={e => setFormData({...formData, quantidade: e.target.value})} />
            </div>
            <div className="space-y-1">
              <label className="text-[8px] font-black text-slate-500 uppercase px-1">Peso Médio (kg)</label>
              <div className="relative">
                <Scale className="absolute left-3 top-3 text-cyan-900" size={14} />
                <input type="number" step="0.1" className="w-full bg-[#0f121a] border border-slate-800 p-3 pl-10 rounded-xl text-cyan-500 font-black outline-none text-xs" value={formData.pesoSaida} onChange={e => setFormData({...formData, pesoSaida: e.target.value})} />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 md:col-span-3 gap-4 w-full">
            <div className="space-y-1">
              <label className="text-[8px] font-black text-emerald-500 uppercase px-1">Custo Aquisição</label>
              <input type="number" className="w-full bg-[#0f121a] border border-slate-800 p-3 rounded-xl text-emerald-500 font-black outline-none text-xs" value={formData.custoAquisicao} onChange={e => setFormData({...formData, custoAquisicao: e.target.value})} />
            </div>
            <div className="space-y-1">
              <label className="text-[8px] font-black text-emerald-500 uppercase px-1">Transporte</label>
              <div className="relative">
                <Truck className="absolute left-3 top-3 text-emerald-900" size={14} />
                <input type="number" className="w-full bg-[#0f121a] border border-slate-800 p-3 pl-10 rounded-xl text-emerald-500 font-black outline-none text-xs" value={formData.custoTransporte} onChange={e => setFormData({...formData, custoTransporte: e.target.value})} />
              </div>
            </div>
          </div>

          <div className="md:col-span-12 flex gap-2 w-full pt-2">
            <button type="submit" className="flex-1 bg-cyan-600 hover:bg-cyan-500 text-white font-black text-[10px] py-4 rounded-xl transition-all shadow-lg uppercase flex items-center justify-center gap-2 active:scale-95">
              {editingId ? <Check size={16} /> : <Plus size={16} />} 
              {editingId ? 'Atualizar Dados' : 'Registrar Novo Lote'}
            </button>
            <button type="button" onClick={() => { setEditingId(null); setFormData(initialForm); }} className="bg-slate-800 p-4 rounded-xl text-slate-500 hover:text-white transition-all">
              <RotateCcw size={16}/>
            </button>
          </div>
        </form>
      </div>

      {/* TABELA COM SCROLL HORIZONTAL */}
      <div className="bg-[#161922] rounded-3xl md:rounded-[2rem] border border-slate-800/50 shadow-2xl overflow-hidden flex flex-col">
        <div className="overflow-x-auto custom-scrollbar flex-1"> 
          <table className="w-full text-left text-[10px] min-w-[900px]">
            <thead className="bg-black/30 text-slate-500 font-black uppercase text-[8px] border-b border-slate-800/50 sticky top-0 z-10 backdrop-blur-md">
              <tr>
                <th className="p-4">CÓDIGO LOTE</th>
                <th className="p-4">ESPECIFICAÇÃO</th>
                <th className="p-4 text-center">QUANTIDADE</th>
                <th className="p-4 text-center">PESO INICIAL</th>
                <th className="p-4 text-center">INVESTIMENTO</th>
                <th className="p-4 text-center">AÇÕES</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/20">
              {registos.map((r) => (
                <tr key={r.id} className="hover:bg-cyan-500/[0.02] transition-colors group">
                  <td className="p-4 font-black text-cyan-500 uppercase text-xs">{r.loteId}</td>
                  <td className="p-4">
                    <div className="text-white font-black uppercase text-[9px]">{r.tipoAnimal}</div>
                    <div className="text-slate-500 uppercase text-[7px] font-bold">{r.raca || 'N/A'}</div>
                  </td>
                  <td className="p-4 text-center text-white font-black text-sm">{r.quantidade} <span className="text-[8px] text-slate-500">CAB</span></td>
                  <td className="p-4 text-center text-cyan-400 font-bold">{Number(r.pesoSaida || 0).toFixed(1)} Kg</td>
                  <td className="p-4 text-center">
                    <span className="bg-emerald-500/10 text-emerald-400 px-3 py-1.5 rounded-lg font-black border border-emerald-500/10">
                      {(Number(r.custoAquisicao || 0) + Number(r.custoTransporte || 0)).toLocaleString()} Kz
                    </span>
                  </td>
                  <td className="p-4 text-center">
                    <div className="flex justify-center gap-2">
                      <button onClick={() => { setEditingId(r.id); setFormData({...r}); }} className="p-2 bg-slate-800/40 rounded-lg text-slate-500 hover:text-cyan-400 transition-all"><Edit3 size={16}/></button>
                      <button onClick={() => { if(confirm('Eliminar Lote?')) deleteDoc(doc(db, 'lotes', r.id)) }} className="p-2 bg-slate-800/40 rounded-lg text-slate-600 hover:text-red-500 transition-all"><Trash2 size={16}/></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        
        {/* RESUMO DE INVESTIMENTO */}
        <div className="p-4 bg-black/40 border-t border-slate-800/50 flex justify-between items-center px-8">
          <div className="flex gap-10">
            <div className="flex flex-col">
              <span className="text-[7px] font-black text-slate-500 uppercase tracking-widest">Total Cabeças</span>
              <span className="text-xs font-black text-white">{registos.reduce((acc, r) => acc + (Number(r.quantidade) || 0), 0)}</span>
            </div>
            <div className="flex flex-col">
              <span className="text-[7px] font-black text-slate-500 uppercase tracking-widest">Investimento Total</span>
              <span className="text-sm font-black text-cyan-500">
                {registos.reduce((acc, r) => acc + (Number(r.custoAquisicao || 0) + Number(r.custoTransporte || 0)), 0).toLocaleString()} Kz
              </span>
            </div>
          </div>
          <Check size={14} className="text-cyan-500 opacity-30" />
        </div>
      </div>
    </div>
  );
}
