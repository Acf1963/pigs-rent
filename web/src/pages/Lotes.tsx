import { useState, useEffect, useRef } from 'react';
import { db } from '../lib/firebase';
import { collection, addDoc, onSnapshot, query, orderBy, deleteDoc, doc, updateDoc } from 'firebase/firestore';
import { 
  Boxes, FileSpreadsheet, FileText, UploadCloud, Check, Trash2, Edit3, RotateCcw
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
    const dadosParaExportar = registos.map(r => ({
      'CÓDIGO LOTE': r.loteId,
      'DATA ENTRADA': r.dataEntrada,
      'TIPO': r.tipoAnimal,
      'RAÇA': r.raca,
      'QTD (UN)': r.quantidade,
      'FORNECEDOR': r.fornecedor,
      'PESO SAÍDA (KG)': r.pesoSaida,
      'PESO CHEGADA (KG)': r.pesoChegada,
      'CUSTO AQUISIÇÃO (KZ)': r.custoAquisicao,
      'CUSTO TRANSPORTE (KZ)': r.custoTransporte,
      'TOTAL (KZ)': (Number(r.custoAquisicao) + Number(r.custoTransporte))
    }));

    const ws = XLSX.utils.json_to_sheet(dadosParaExportar);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Inventário de Lotes");
    XLSX.writeFile(wb, `AgroRent_Lotes_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  const exportToPDF = () => {
    const doc = new jsPDF('l', 'mm', 'a4');
    doc.setFontSize(16);
    doc.text("AgroRent - Relatório Detalhado de Lotes", 14, 15);
    doc.setFontSize(8);
    doc.text(`Gerado em: ${new Date().toLocaleString()}`, 14, 20);

    autoTable(doc, {
      head: [["LOTE", "ENTRADA", "TIPO/RAÇA", "QTD", "FORNECEDOR", "P.SAÍDA", "P.CHEGADA", "AQUIS. (KZ)", "TRANSP. (KZ)"]],
      body: registos.map(r => [
        r.loteId,
        r.dataEntrada?.split('-').reverse().join('/'),
        `${r.tipoAnimal} / ${r.raca}`,
        r.quantidade,
        r.fornecedor,
        `${Number(r.pesoSaida).toFixed(1)}kg`,
        `${Number(r.pesoChegada).toFixed(1)}kg`,
        Number(r.custoAquisicao).toLocaleString(),
        Number(r.custoTransporte).toLocaleString()
      ]),
      startY: 25,
      styles: { fontSize: 7, cellPadding: 2 },
      headStyles: { fillColor: [8, 145, 178], textColor: [255, 255, 255], fontStyle: 'bold' },
      alternateRowStyles: { fillColor: [245, 247, 250] }
    });
    doc.save(`AgroRent_Lotes_${new Date().toISOString().split('T')[0]}.pdf`);
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
    /* h-full para preencher o ecrã e flex-col para organizar as secções */
    <div className="h-full flex flex-col space-y-4 overflow-hidden">
      
      {/* HEADER: shrink-0 mantém o tamanho fixo */}
      <div className="flex justify-between items-center shrink-0">
        <div className="flex items-center gap-3">
          <div className="bg-cyan-500/20 p-2 rounded-lg"><Boxes className="text-cyan-400" size={32} /></div>
          <div>
            <h1 className="text-3xl font-black text-white tracking-tighter uppercase">Lotes</h1>
            <p className="text-[8px] text-cyan-500 font-bold tracking-[0.2em] uppercase">Gestão de Inventário</p>
          </div>
        </div>

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

      {/* FORMULÁRIO: shrink-0 mantém o tamanho fixo */}
      <div className="bg-[#161922] rounded-[2rem] border border-slate-800/50 p-6 shadow-2xl shrink-0">
        <form onSubmit={handleSubmit} className="grid grid-cols-10 gap-3">
          <div className="col-span-2 space-y-1">
            <label className="text-[8px] font-black text-slate-500 uppercase px-1">Lote</label>
            <input required className="w-full bg-[#0f121a] border border-slate-800 p-2.5 rounded-xl text-cyan-500 font-bold outline-none text-xs uppercase" value={formData.loteId} onChange={e => setFormData({...formData, loteId: e.target.value.toUpperCase()})} />
          </div>
          <div className="col-span-2 space-y-1">
            <label className="text-[8px] font-black text-slate-500 uppercase px-1">Tipo</label>
            <select className="w-full bg-[#0f121a] border border-slate-800 p-2.5 rounded-xl text-white font-bold outline-none text-xs" value={formData.tipoAnimal} onChange={e => setFormData({...formData, tipoAnimal: e.target.value})}>
              <option value="SUÍNO">SUÍNO</option>
              <option value="BOVINO">BOVINO</option>
            </select>
          </div>
          <div className="col-span-2 space-y-1">
            <label className="text-[8px] font-black text-slate-500 uppercase px-1">Raça</label>
            <input className="w-full bg-[#0f121a] border border-slate-800 p-2.5 rounded-xl text-slate-300 font-bold outline-none text-xs uppercase" value={formData.raca} onChange={e => setFormData({...formData, raca: e.target.value.toUpperCase()})} />
          </div>
          <div className="col-span-2 space-y-1">
            <label className="text-[8px] font-black text-slate-500 uppercase px-1">Qtd</label>
            <input type="number" className="w-full bg-[#0f121a] border border-slate-800 p-2.5 rounded-xl text-white font-bold outline-none text-xs" value={formData.quantidade} onChange={e => setFormData({...formData, quantidade: e.target.value})} />
          </div>
          <div className="col-span-2 space-y-1">
            <label className="text-[8px] font-black text-slate-500 uppercase px-1">Fornecedor</label>
            <input className="w-full bg-[#0f121a] border border-slate-800 p-2.5 rounded-xl text-slate-400 font-bold outline-none text-xs uppercase" value={formData.fornecedor} onChange={e => setFormData({...formData, fornecedor: e.target.value.toUpperCase()})} />
          </div>

          <div className="col-span-2 space-y-1">
            <label className="text-[8px] font-black text-slate-500 uppercase px-1">Data</label>
            <input type="date" className="w-full bg-[#0f121a] border border-slate-800 p-2.5 rounded-xl text-white font-bold outline-none text-xs" value={formData.dataEntrada} onChange={e => setFormData({...formData, dataEntrada: e.target.value})} />
          </div>
          <div className="col-span-2 space-y-1">
            <label className="text-[8px] font-black text-emerald-500 uppercase px-1">P. Saída</label>
            <input type="number" step="0.1" className="w-full bg-[#0f121a] border border-slate-800 p-2.5 rounded-xl text-emerald-500 font-bold outline-none text-xs" value={formData.pesoSaida} onChange={e => setFormData({...formData, pesoSaida: e.target.value})} />
          </div>
          <div className="col-span-2 space-y-1">
            <label className="text-[8px] font-black text-orange-500 uppercase px-1">P. Chegada</label>
            <input type="number" step="0.1" className="w-full bg-[#0f121a] border border-slate-800 p-2.5 rounded-xl text-orange-500 font-bold outline-none text-xs" value={formData.pesoChegada} onChange={e => setFormData({...formData, pesoChegada: e.target.value})} />
          </div>
          <div className="col-span-2 space-y-1">
            <label className="text-[8px] font-black text-cyan-500 uppercase px-1">Aquisição</label>
            <input type="number" className="w-full bg-[#0f121a] border border-slate-800 p-2.5 rounded-xl text-cyan-500 font-bold outline-none text-xs" value={formData.custoAquisicao} onChange={e => setFormData({...formData, custoAquisicao: e.target.value})} />
          </div>
          <div className="col-span-2 flex gap-2 items-end">
            <button type="submit" className="flex-1 bg-cyan-600 hover:bg-cyan-500 text-white font-black text-[10px] py-3 rounded-xl transition-all shadow-lg uppercase flex items-center justify-center gap-2">
              <Check size={14} /> {editingId ? 'OK' : 'Gravar'}
            </button>
            <button type="button" onClick={() => { setEditingId(null); setFormData(initialForm); }} className="bg-slate-800 text-slate-400 p-3 rounded-xl hover:text-white transition-all">
              <RotateCcw size={14} />
            </button>
          </div>
        </form>
      </div>

      {/* ÁREA DA TABELA: flex-1 e min-h-0 são fundamentais para o scroll interno */}
      <div className="flex-1 min-h-0 bg-[#161922] rounded-[2rem] border border-slate-800/50 shadow-2xl overflow-hidden flex flex-col">
        {/* Este container permite o scroll apenas na tabela */}
        <div className="overflow-x-auto overflow-y-auto flex-1 custom-scrollbar"> 
          <table className="w-full text-left text-[10px] min-w-[1200px] border-collapse">
            <thead className="bg-[#1e293b] text-slate-400 font-black uppercase text-[8px] sticky top-0 z-20">
              <tr>
                <th className="p-4 border-b border-slate-700/50">CÓDIGO LOTE</th>
                <th className="p-4 border-b border-slate-700/50">TIPO/RAÇA</th>
                <th className="p-4 border-b border-slate-700/50 text-center">QUANTIDADE</th>
                <th className="p-4 border-b border-slate-700/50">FORNECEDOR</th>
                <th className="p-4 border-b border-slate-700/50">DATA ENTRADA</th>
                <th className="p-4 border-b border-slate-700/50 text-center">P. SAÍDA</th>
                <th className="p-4 border-b border-slate-700/50 text-center">P. CHEGADA</th>
                <th className="p-4 border-b border-slate-700/50">CUSTO AQUIS.</th>
                <th className="p-4 border-b border-slate-700/50">TRANSPORTE</th>
                <th className="p-4 border-b border-slate-700/50 text-center">AÇÕES</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/30">
              {registos.map((r) => (
                <tr key={r.id} className="hover:bg-slate-800/20 transition-colors h-[50px]">
                  <td className="p-4 font-black text-cyan-500 uppercase tracking-tighter">{r.loteId}</td>
                  <td className="p-4">
                    <div className="text-white font-black uppercase text-[9px]">{r.tipoAnimal}</div>
                    <div className="text-slate-500 uppercase text-[8px]">{r.raca}</div>
                  </td>
                  <td className="p-4 text-white font-black text-center">{r.quantidade} <span className="text-slate-600 text-[8px]">un</span></td>
                  <td className="p-4 text-slate-400 uppercase font-bold text-[9px]">{r.fornecedor}</td>
                  <td className="p-4 text-slate-500 font-bold">{r.dataEntrada?.split('-').reverse().join('/')}</td>
                  <td className="p-4 text-emerald-500 font-bold text-center">{Number(r.pesoSaida || 0).toFixed(1)}kg</td>
                  <td className="p-4 text-orange-500 font-bold text-center">{Number(r.pesoChegada || 0).toFixed(1)}kg</td>
                  <td className="p-4 text-cyan-500 font-black">{Number(r.custoAquisicao || 0).toLocaleString()} Kz</td>
                  <td className="p-4 text-slate-300 font-bold">{Number(r.custoTransporte || 0).toLocaleString()} Kz</td>
                  <td className="p-4 text-center">
                    <div className="flex justify-center gap-3">
                      <button onClick={() => { setEditingId(r.id); setFormData({...r}); }} className="text-slate-600 hover:text-cyan-400 transition-colors"><Edit3 size={14}/></button>
                      <button onClick={() => { if(confirm('Eliminar Lote?')) deleteDoc(doc(db, 'lotes', r.id)) }} className="text-slate-600 hover:text-red-500 transition-colors"><Trash2 size={14}/></button>
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
