import { useState, useEffect, useRef } from 'react';
import { db } from '../lib/firebase';
import { collection, addDoc, onSnapshot, query, orderBy, deleteDoc, doc, updateDoc } from 'firebase/firestore';
import { 
  Boxes, FileSpreadsheet, FileText, UploadCloud, Check, Trash2, Edit3, RotateCcw, Plus
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
          let dataFinal = item.dataEntrada || item.data || new Date();
          if (dataFinal instanceof Date) dataFinal = dataFinal.toISOString().split('T')[0];

          await addDoc(collection(db, 'lotes'), { 
            loteId: (item.codigoLote || 'N/A').toString().toUpperCase(),
            tipoAnimal: (item.tipo || 'SUÍNO').toString().toUpperCase(),
            raca: (item.raca || 'N/A').toString().toUpperCase(),
            quantidade: parseInt(item.quantidade) || 0,
            fornecedor: (item.fornecedor || 'N/A').toString().toUpperCase(),
            dataEntrada: dataFinal,
            pesoSaida: parseFloat(item.pesoInicialMedio) || 0,
            pesoChegada: parseFloat(item.pesoFinalTransporte) || 0,
            custoAquisicao: parseFloat(item.custoAquisicaol) || 0,
            custoTransporte: parseFloat(item.custoTransporte) || 0,
            status: 'ATIVO',
            createdAt: new Date().toISOString() 
          });
        }
      } catch (err) { console.error("Erro na importação:", err); }
    };
    reader.readAsBinaryString(file);
  };

  const exportToExcel = () => {
    const ws = XLSX.utils.json_to_sheet(registos.map(r => ({
      'CÓDIGO LOTE': r.loteId,
      'DATA ENTRADA': r.dataEntrada,
      'TIPO': r.tipoAnimal,
      'QTD': r.quantidade,
      'AQUIS. (KZ)': r.custoAquisicao,
      'TRANSP. (KZ)': r.custoTransporte
    })));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Lotes");
    XLSX.writeFile(wb, `Lotes_Kwanza_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  const exportToPDF = () => {
    const doc = new jsPDF('l', 'mm', 'a4');
    doc.text("AgroRent - Inventário de Lotes", 14, 15);
    autoTable(doc, {
      head: [["LOTE", "ENTRADA", "TIPO/RAÇA", "QTD", "FORNECEDOR", "AQUIS. (KZ)"]],
      body: registos.map(r => [
        r.loteId, r.dataEntrada, `${r.tipoAnimal}/${r.raca}`, r.quantidade, r.fornecedor, Number(r.custoAquisicao).toLocaleString()
      ]),
      startY: 22,
      headStyles: { fillColor: [8, 145, 178] }
    });
    doc.save("Relatorio_Lotes.pdf");
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
    <div className="h-full flex flex-col space-y-6 pb-24 md:pb-6">
      
      {/* HEADER RESPONSIVO */}
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 shrink-0 border-b border-slate-800/50 pb-6">
        <div className="flex items-center gap-4">
          <div className="bg-cyan-500/10 p-3 rounded-2xl border border-cyan-500/20 shadow-inner">
            <Boxes className="text-cyan-500" size={28} />
          </div>
          <div>
            <h1 className="text-2xl md:text-3xl font-black text-white tracking-tighter uppercase leading-none">Gestão de Lotes</h1>
            <p className="text-[10px] text-slate-500 font-black tracking-[0.2em] uppercase mt-1">Inventário Fazenda Kwanza</p>
          </div>
        </div>

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

      {/* FORMULÁRIO RESPONSIVO */}
      <div className="bg-[#161922] rounded-3xl md:rounded-[2.5rem] border border-slate-800/50 p-5 md:p-8 shadow-2xl shrink-0 transition-all">
        <form onSubmit={handleSubmit} className="flex flex-col md:grid md:grid-cols-10 gap-4">
          <div className="md:col-span-2 space-y-1">
            <label className="text-[9px] font-black text-slate-500 uppercase px-1">Código Lote</label>
            <input required className="w-full bg-[#0f121a] border border-slate-800 p-3.5 rounded-xl text-cyan-500 font-black outline-none text-xs uppercase focus:border-cyan-500/50 transition-colors" value={formData.loteId} onChange={e => setFormData({...formData, loteId: e.target.value.toUpperCase()})} />
          </div>
          
          <div className="md:col-span-2 space-y-1">
            <label className="text-[9px] font-black text-slate-500 uppercase px-1">Tipo Animal</label>
            <select className="w-full bg-[#0f121a] border border-slate-800 p-3.5 rounded-xl text-white font-black outline-none text-xs appearance-none" value={formData.tipoAnimal} onChange={e => setFormData({...formData, tipoAnimal: e.target.value})}>
              <option value="SUÍNO">SUÍNO</option>
              <option value="BOVINO">BOVINO</option>
            </select>
          </div>

          <div className="md:col-span-2 space-y-1">
            <label className="text-[9px] font-black text-slate-500 uppercase px-1">Raça / Linhagem</label>
            <input className="w-full bg-[#0f121a] border border-slate-800 p-3.5 rounded-xl text-slate-300 font-bold outline-none text-xs uppercase" value={formData.raca} onChange={e => setFormData({...formData, raca: e.target.value.toUpperCase()})} />
          </div>

          <div className="grid grid-cols-2 md:col-span-2 gap-4">
            <div className="space-y-1">
              <label className="text-[9px] font-black text-slate-500 uppercase px-1">Quantidade</label>
              <input type="number" className="w-full bg-[#0f121a] border border-slate-800 p-3.5 rounded-xl text-white font-black outline-none text-xs" value={formData.quantidade} onChange={e => setFormData({...formData, quantidade: e.target.value})} />
            </div>
            <div className="space-y-1">
              <label className="text-[9px] font-black text-slate-500 uppercase px-1">Data Entrada</label>
              <input type="date" className="w-full bg-[#0f121a] border border-slate-800 p-3.5 rounded-xl text-white font-black outline-none text-xs" value={formData.dataEntrada} onChange={e => setFormData({...formData, dataEntrada: e.target.value})} />
            </div>
          </div>

          <div className="md:col-span-2 flex gap-2 pt-2 md:pt-0 items-end">
            <button type="submit" className="flex-1 bg-cyan-600 hover:bg-cyan-500 text-white font-black text-xs py-4 rounded-xl transition-all shadow-lg uppercase flex items-center justify-center gap-2 active:scale-95">
              {editingId ? <Check size={16} /> : <Plus size={16} />} 
              {editingId ? 'Atualizar' : 'Criar Lote'}
            </button>
            <button type="button" onClick={() => { setEditingId(null); setFormData(initialForm); }} className="bg-slate-800 text-slate-500 p-4 rounded-xl hover:text-white transition-all">
              <RotateCcw size={16} />
            </button>
          </div>
        </form>
      </div>

      {/* ÁREA DA TABELA COM SCROLL INTERNO */}
      <div className="flex-1 min-h-0 bg-[#161922] rounded-3xl md:rounded-[2.5rem] border border-slate-800/50 shadow-2xl overflow-hidden flex flex-col">
        <div className="overflow-x-auto overflow-y-auto flex-1 custom-scrollbar"> 
          <table className="w-full text-left text-[10px] min-w-[1100px] border-separate border-spacing-0">
            <thead className="bg-black/40 text-slate-500 font-black uppercase text-[9px] sticky top-0 z-20 backdrop-blur-md">
              <tr>
                <th className="p-5 border-b border-slate-800/50">CÓDIGO LOTE</th>
                <th className="p-5 border-b border-slate-800/50">ESPECIFICAÇÃO</th>
                <th className="p-5 border-b border-slate-800/50 text-center">EFETIVO</th>
                <th className="p-5 border-b border-slate-800/50">DATA</th>
                <th className="p-5 border-b border-slate-800/50 text-center font-black text-emerald-500">P. SAÍDA</th>
                <th className="p-5 border-b border-slate-800/50 text-center font-black text-orange-500">P. CHEGADA</th>
                <th className="p-5 border-b border-slate-800/50">CUSTO TOTAL (KZ)</th>
                <th className="p-5 border-b border-slate-800/50 text-center">AÇÕES</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/20">
              {registos.map((r) => (
                <tr key={r.id} className="hover:bg-slate-800/10 transition-colors">
                  <td className="p-5 font-black text-cyan-500 uppercase tracking-tighter text-sm">{r.loteId}</td>
                  <td className="p-5">
                    <div className="text-white font-black uppercase text-[10px]">{r.tipoAnimal}</div>
                    <div className="text-slate-500 uppercase text-[8px] font-bold tracking-widest">{r.raca || 'N/A'}</div>
                  </td>
                  <td className="p-5 text-white font-black text-center text-sm">{r.quantidade} <span className="text-slate-600 text-[9px]">UN</span></td>
                  <td className="p-5 text-slate-500 font-bold">{r.dataEntrada?.split('-').reverse().join('/')}</td>
                  <td className="p-5 text-emerald-500/80 font-black text-center text-xs">{Number(r.pesoSaida || 0).toFixed(1)} kg</td>
                  <td className="p-5 text-orange-500/80 font-black text-center text-xs">{Number(r.pesoChegada || 0).toFixed(1)} kg</td>
                  <td className="p-5">
                    <div className="text-cyan-500 font-black text-sm">{(Number(r.custoAquisicao || 0) + Number(r.custoTransporte || 0)).toLocaleString()}</div>
                    <div className="text-[8px] text-slate-600 font-black uppercase tracking-tighter">Incl. Transporte</div>
                  </td>
                  <td className="p-5 text-center">
                    <div className="flex justify-center gap-2">
                      <button onClick={() => { setEditingId(r.id); setFormData({...r}); }} className="p-2.5 bg-slate-800/50 rounded-lg text-slate-600 hover:text-cyan-400 transition-all"><Edit3 size={16}/></button>
                      <button onClick={() => { if(confirm('Eliminar Lote?')) deleteDoc(doc(db, 'lotes', r.id)) }} className="p-2.5 bg-slate-800/50 rounded-lg text-slate-600 hover:text-red-500 transition-all"><Trash2 size={16}/></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        
        {/* RODAPÉ RESUMO */}
        <div className="p-4 bg-black/40 border-t border-slate-800/50 flex justify-between items-center px-8 shrink-0">
          <div className="flex gap-10">
            <div className="flex flex-col">
              <span className="text-[8px] font-black text-slate-500 uppercase tracking-widest">Efetivo Total</span>
              <span className="text-sm font-black text-white">{registos.reduce((acc, r) => acc + (Number(r.quantidade) || 0), 0)} Animais</span>
            </div>
            <div className="flex flex-col">
              <span className="text-[8px] font-black text-slate-500 uppercase tracking-widest">Investimento em Lotes</span>
              <span className="text-sm font-black text-cyan-500">
                {registos.reduce((acc, r) => acc + (Number(r.custoAquisicao || 0) + Number(r.custoTransporte || 0)), 0).toLocaleString()} Kz
              </span>
            </div>
          </div>
          <Boxes size={20} className="text-cyan-500 opacity-20" />
        </div>
      </div>
    </div>
  );
}
