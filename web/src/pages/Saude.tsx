import { useState, useEffect, useRef } from 'react';
import { db } from '../lib/firebase';
import { collection, addDoc, onSnapshot, query, orderBy, deleteDoc, doc, updateDoc } from 'firebase/firestore';
import { 
  Activity, FileSpreadsheet, FileText, UploadCloud, Check, Trash2, Edit3, RotateCcw, ShieldAlert, Syringe
} from 'lucide-react';

import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export default function SaudePage() {
  const [registos, setRegistos] = useState<any[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const initialForm = {
    loteId: '',
    data: new Date().toISOString().split('T')[0],
    tipo: 'VACINA',
    medicamento: '',
    dosagem: '',
    viaAplicacao: 'INTRAMUSCULAR',
    periodoCarenciaDias: '0',
    custoMedicamento: '',
    veterinarioResponsavel: ''
  };

  const [formData, setFormData] = useState(initialForm);

  // FUNÇÕES DE TRATAMENTO DE DATA (Excel-Friendly)
  const formatarDataInput = (valor: any) => {
    if (!valor) return '';
    if (typeof valor === 'number') {
      const data = new Date((valor - 25569) * 86400 * 1000);
      return data.toISOString().split('T')[0];
    }
    return String(valor).split('T')[0];
  };

  const formatarDataTabela = (valor: any) => {
    if (!valor) return '---';
    return valor.split('-').reverse().join('/');
  };

  useEffect(() => {
    const q = query(collection(db, 'saude'), orderBy('data', 'desc'));
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
          await addDoc(collection(db, 'saude'), { 
            loteId: String(item.loteId || 'N/A').toUpperCase(),
            data: formatarDataInput(item.data),
            tipo: String(item.tipo || 'VACINA').toUpperCase(),
            medicamento: String(item.medicamento || 'N/A').toUpperCase(),
            dosagem: String(item.dosagem || 'N/A'),
            viaAplicacao: String(item.viaAplicacao || 'INTRAMUSCULAR').toUpperCase(),
            periodoCarenciaDias: parseInt(item.periodoCarenciaDias) || 0,
            custoMedicamento: parseFloat(item.custoMedicamento) || 0,
            veterinarioResponsavel: String(item.veterinarioResponsavel || 'N/A').toUpperCase(),
            createdAt: new Date().toISOString() 
          });
        }
      } catch (err) { console.error("Erro na importação:", err); }
    };
    reader.readAsBinaryString(file);
  };

  const exportToExcel = () => {
    const ws = XLSX.utils.json_to_sheet(registos.map(r => ({
      Lote: r.loteId,
      Data: r.data,
      Tipo: r.tipo,
      Medicamento: r.medicamento,
      Custo: r.custoMedicamento,
      Carencia: r.periodoCarenciaDias
    })));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Maneio Sanitário");
    XLSX.writeFile(wb, `Sanitario_Kwanza_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  const exportToPDF = () => {
    const doc = new jsPDF('l', 'mm', 'a4');
    doc.setFontSize(16);
    doc.text("AgroRent - Relatório de Maneio Sanitário", 14, 15);
    autoTable(doc, {
      head: [["LOTE", "DATA", "TIPO", "MEDICAMENTO", "CARÊNCIA", "CUSTO (KZ)", "VETERINÁRIO"]],
      body: registos.map(r => [
        r.loteId, 
        formatarDataTabela(r.data), 
        r.tipo, 
        r.medicamento, 
        `${r.periodoCarenciaDias} dias`, 
        Number(r.custoMedicamento).toLocaleString(),
        r.veterinarioResponsavel
      ]),
      startY: 25,
      headStyles: { fillColor: [6, 182, 212] }
    });
    doc.save("Maneio_Sanitario.pdf");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload = {
      ...formData,
      periodoCarenciaDias: parseInt(formData.periodoCarenciaDias) || 0,
      custoMedicamento: parseFloat(formData.custoMedicamento) || 0,
    };

    if (editingId) {
      await updateDoc(doc(db, 'saude', editingId), payload);
      setEditingId(null);
    } else {
      await addDoc(collection(db, 'saude'), { ...payload, createdAt: new Date().toISOString() });
    }
    setFormData(initialForm);
  };

  return (
    <div className="h-full flex flex-col space-y-4 pb-20 md:pb-6 overflow-hidden">
      
      {/* HEADER RESPONSIVO */}
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 shrink-0">
        <div className="flex items-center gap-4">
          <div className="bg-red-500/10 p-3 rounded-2xl border border-red-500/20 shadow-inner">
            <Activity className="text-red-500" size={28} />
          </div>
          <div>
            <h1 className="text-2xl md:text-3xl font-black text-white uppercase tracking-tighter leading-none">Maneio Sanitário</h1>
            <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mt-1">Controlo de Vacinação e Tratamentos</p>
          </div>
        </div>

        <div className="flex gap-2 bg-[#161922] p-1.5 rounded-2xl border border-slate-800 shadow-xl w-full md:w-auto">
          <input type="file" ref={fileInputRef} className="hidden" accept=".xlsx, .xls" onChange={handleFileUpload} />
          <button onClick={() => fileInputRef.current?.click()} className="flex-1 md:flex-none bg-[#1e293b] text-slate-300 px-4 py-2.5 rounded-xl text-[10px] font-black uppercase flex items-center justify-center gap-2 hover:bg-slate-800 transition-all border border-slate-700/50">
            <UploadCloud size={14} className="text-cyan-500" /> Importar
          </button>
          <button onClick={exportToExcel} className="flex-1 md:flex-none bg-[#1e293b] text-slate-300 px-4 py-2.5 rounded-xl text-[10px] font-black uppercase flex items-center justify-center gap-2 hover:bg-slate-800 transition-all border border-slate-700/50">
            <FileSpreadsheet size={14} className="text-emerald-400" /> Excel
          </button>
          <button onClick={exportToPDF} className="flex-1 md:flex-none bg-[#1e293b] text-slate-300 px-4 py-2.5 rounded-xl text-[10px] font-black uppercase flex items-center justify-center gap-2 hover:bg-slate-800 transition-all border border-slate-700/50">
            <FileText size={14} className="text-red-400" /> PDF
          </button>
        </div>
      </header>

      {/* FORMULÁRIO TÉCNICO */}
      <div className="bg-[#161922] rounded-[2rem] border border-slate-800/50 p-6 md:p-8 shrink-0 shadow-2xl">
        <form onSubmit={handleSubmit} className="flex flex-col md:grid md:grid-cols-12 gap-4 items-end">
          <div className="md:col-span-1 space-y-1 w-full">
            <label className="text-[9px] font-black text-slate-500 uppercase px-1">Lote</label>
            <input required className="w-full bg-[#0f121a] border border-slate-800 p-3 rounded-xl text-cyan-500 font-black outline-none text-xs uppercase" value={formData.loteId} onChange={e => setFormData({...formData, loteId: e.target.value.toUpperCase()})} />
          </div>
          
          <div className="md:col-span-2 space-y-1 w-full">
            <label className="text-[9px] font-black text-slate-500 uppercase px-1">Tipo Maneio</label>
            <select className="w-full bg-[#0f121a] border border-slate-800 p-3 rounded-xl text-white font-black outline-none text-xs appearance-none" value={formData.tipo} onChange={e => setFormData({...formData, tipo: e.target.value})}>
              <option value="VACINA">VACINA</option>
              <option value="TRATAMENTO">TRATAMENTO</option>
              <option value="VERMÍFUGO">VERMÍFUGO</option>
              <option value="SUPLEMENTO">SUPLEMENTO</option>
            </select>
          </div>

          <div className="md:col-span-3 space-y-1 w-full">
            <label className="text-[9px] font-black text-slate-500 uppercase px-1">Medicamento / Princípio Ativo</label>
            <div className="relative">
              <Syringe className="absolute left-3 top-3 text-slate-700" size={14} />
              <input required className="w-full bg-[#0f121a] border border-slate-800 p-3 pl-10 rounded-xl text-white font-bold outline-none text-xs uppercase" placeholder="NOME DO PRODUTO" value={formData.medicamento} onChange={e => setFormData({...formData, medicamento: e.target.value.toUpperCase()})} />
            </div>
          </div>

          <div className="grid grid-cols-2 md:col-span-3 gap-3 w-full">
            <div className="space-y-1">
              <label className="text-[9px] font-black text-red-500 uppercase px-1">Carência (Dias)</label>
              <div className="relative">
                <ShieldAlert className="absolute left-3 top-3 text-red-900" size={14} />
                <input type="number" required className="w-full bg-[#0f121a] border border-red-900/30 p-3 pl-10 rounded-xl text-red-500 font-black outline-none text-xs" value={formData.periodoCarenciaDias} onChange={e => setFormData({...formData, periodoCarenciaDias: e.target.value})} />
              </div>
            </div>
            <div className="space-y-1">
              <label className="text-[9px] font-black text-emerald-500 uppercase px-1">Custo (Kz)</label>
              <input type="number" className="w-full bg-[#0f121a] border border-slate-800 p-3 rounded-xl text-emerald-500 font-black outline-none text-xs" value={formData.custoMedicamento} onChange={e => setFormData({...formData, custoMedicamento: e.target.value})} />
            </div>
          </div>

          <div className="md:col-span-3 flex gap-2 w-full pt-2 md:pt-0">
            <button type="submit" className="flex-1 bg-red-600 hover:bg-red-500 text-white font-black text-[11px] py-4 rounded-xl transition-all shadow-lg uppercase flex items-center justify-center gap-2 active:scale-95">
              <Check size={16} /> {editingId ? 'Confirmar' : 'Registar'}
            </button>
            <button type="button" onClick={() => { setEditingId(null); setFormData(initialForm); }} className="bg-slate-800 text-slate-500 p-4 rounded-xl hover:text-white transition-all">
              <RotateCcw size={16} />
            </button>
          </div>
        </form>
      </div>

      {/* TABELA DE REGISTOS */}
      <div className="flex-1 min-h-0 bg-[#161922] rounded-[2rem] border border-slate-800/50 shadow-2xl overflow-hidden flex flex-col">
        <div className="overflow-x-auto overflow-y-auto flex-1 custom-scrollbar"> 
          <table className="w-full text-left text-[10px] min-w-[1100px] border-separate border-spacing-0">
            <thead className="bg-black/40 text-slate-500 font-black uppercase text-[8px] sticky top-0 z-20 backdrop-blur-md">
              <tr>
                <th className="p-5 border-b border-slate-800/50">LOTE</th>
                <th className="p-5 border-b border-slate-800/50">DATA APLICAÇÃO</th>
                <th className="p-5 border-b border-slate-800/50">TIPO / VIA</th>
                <th className="p-5 border-b border-slate-800/50">MEDICAMENTO</th>
                <th className="p-5 border-b border-slate-800/50 text-center">CARÊNCIA</th>
                <th className="p-5 border-b border-slate-800/50">CUSTO UNIT.</th>
                <th className="p-5 border-b border-slate-800/50">VETERINÁRIO</th>
                <th className="p-5 border-b border-slate-800/50 text-center">AÇÕES</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/20">
              {registos.map((r) => (
                <tr key={r.id} className="hover:bg-red-500/[0.02] transition-colors group">
                  <td className="p-5 font-black text-cyan-500 uppercase text-sm">{r.loteId}</td>
                  <td className="p-5 text-slate-400 font-bold text-xs">{formatarDataTabela(r.data)}</td>
                  <td className="p-5">
                    <div className={`text-[10px] font-black uppercase ${r.tipo === 'VACINA' ? 'text-blue-400' : 'text-orange-400'}`}>{r.tipo}</div>
                    <div className="text-[8px] text-slate-600 font-bold uppercase tracking-tighter">{r.viaAplicacao}</div>
                  </td>
                  <td className="p-5 text-white font-black uppercase text-xs tracking-tighter">{r.medicamento}</td>
                  <td className="p-5 text-center">
                    <span className={`px-3 py-1 rounded-lg font-black text-[10px] border ${Number(r.periodoCarenciaDias) > 0 ? 'bg-red-500/10 text-red-500 border-red-500/20' : 'bg-slate-800 text-slate-500 border-slate-700'}`}>
                      {r.periodoCarenciaDias} DIAS
                    </span>
                  </td>
                  <td className="p-5 text-emerald-500 font-black text-sm">{Number(r.custoMedicamento || 0).toLocaleString()} Kz</td>
                  <td className="p-5 text-slate-400 font-bold uppercase text-[9px] italic">{r.veterinarioResponsavel || 'Não Atribuído'}</td>
                  <td className="p-5 text-center">
                    <div className="flex justify-center gap-2">
                      <button onClick={() => { setEditingId(r.id); setFormData({...r}); }} className="p-2.5 bg-slate-800/50 rounded-lg text-slate-600 hover:text-cyan-400 transition-all"><Edit3 size={16}/></button>
                      <button onClick={() => { if(confirm('Eliminar registo sanitário?')) deleteDoc(doc(db, 'saude', r.id)) }} className="p-2.5 bg-slate-800/50 rounded-lg text-slate-600 hover:text-red-500 transition-all"><Trash2 size={16}/></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        
        {/* RODAPÉ SANITÁRIO */}
        <div className="p-4 bg-black/40 border-t border-slate-800/50 flex justify-between items-center px-10 shrink-0">
          <div className="flex gap-10">
            <div className="flex flex-col">
              <span className="text-[8px] font-black text-slate-500 uppercase tracking-widest">Investimento Saúde (Total)</span>
              <span className="text-base font-black text-emerald-500">
                {registos.reduce((acc, r) => acc + (Number(r.custoMedicamento) || 0), 0).toLocaleString()} Kz
              </span>
            </div>
          </div>
          <Activity size={20} className="text-red-500 opacity-20" />
        </div>
      </div>
    </div>
  );
}
