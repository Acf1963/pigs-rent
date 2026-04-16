import React, { useState, useEffect, useRef } from 'react';
import { db } from '../lib/firebase';
import { 
  collection, addDoc, onSnapshot, query, orderBy, 
  deleteDoc, doc, updateDoc, writeBatch 
} from 'firebase/firestore';
import { 
  Activity, FileSpreadsheet, FileText, UploadCloud, 
  Check, Trash2, Edit3, Plus, Square, CheckSquare, 
  RotateCcw, Pill, User, HeartPulse
} from 'lucide-react'; // ShieldAlert, DollarSign e Syringe removidos daqui

import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

interface RegistoSaude {
  id: string;
  loteId: string;
  brinco: string;
  data: string;
  tipo: string;
  medicamento: string;
  dosagem: string;
  viaAplicacao: string;
  periodoCarenciaDias: number;
  custoMedicamento: number;
  veterinarioResponsavel: string;
}

export default function SaudePage() {
  const [registos, setRegistos] = useState<RegistoSaude[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const initialForm = {
    loteId: '',
    brinco: '',
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

  useEffect(() => {
    const q = query(collection(db, 'saude'), orderBy('data', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(docSnap => ({
        id: docSnap.id,
        ...docSnap.data()
      })) as RegistoSaude[];
      setRegistos(data);
    });
    return () => unsubscribe();
  }, []);

  // Lógica de Cálculos por Espécie
  const registosBovinos = registos.filter(r => r.loteId.toUpperCase().includes('-B'));
  const registosSuinos = registos.filter(r => r.loteId.toUpperCase().includes('-S'));

  const calcularStatsSaude = (lista: RegistoSaude[]) => {
    const totalProcedimentos = lista.length;
    const custoTotal = lista.reduce((acc, r) => acc + (Number(r.custoMedicamento) || 0), 0);
    const carenciaMedia = totalProcedimentos > 0 
      ? lista.reduce((acc, r) => acc + (Number(r.periodoCarenciaDias) || 0), 0) / totalProcedimentos 
      : 0;
    return { totalProcedimentos, custoTotal, carenciaMedia };
  };

  const statsBovinos = calcularStatsSaude(registosBovinos);
  const statsSuinos = calcularStatsSaude(registosSuinos);
  const totalGastoGlobal = registos.reduce((acc, r) => acc + (Number(r.custoMedicamento) || 0), 0);

  const handleImportExcel = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: 'binary', cellDates: true });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const rawData: any[] = XLSX.utils.sheet_to_json(ws);
        const batch = writeBatch(db);

        rawData.forEach((item) => {
          const cleanItem: any = {};
          Object.keys(item).forEach(key => {
            const cleanKey = key.toString().toLowerCase().trim().replace(/\s+/g, '');
            cleanItem[cleanKey] = item[key];
          });

          let dataFormatada = new Date().toISOString().split('T')[0];
          const rawDate = cleanItem.data;
          if (rawDate instanceof Date) dataFormatada = rawDate.toISOString().split('T')[0];

          const newDocRef = doc(collection(db, 'saude'));
          batch.set(newDocRef, {
            loteId: String(cleanItem.loteid || cleanItem.codigolote || 'S/L').toUpperCase(),
            brinco: String(cleanItem.brinco || cleanItem.identificacao || 'COLETIVO').toUpperCase(),
            data: dataFormatada,
            tipo: String(cleanItem.tipo || 'OUTRO').toUpperCase(),
            medicamento: String(cleanItem.medicamento || '--').toUpperCase(),
            dosagem: String(cleanItem.dosagem || ''),
            viaAplicacao: String(cleanItem.viaaplicacao || '').toUpperCase(),
            periodoCarenciaDias: Number(cleanItem.periodocarenciadias || 0),
            custoMedicamento: Number(cleanItem.customedicamento || 0),
            veterinarioResponsavel: String(cleanItem.veterinarioresponsavel || '').toUpperCase(),
            createdAt: new Date().toISOString()
          });
        });

        await batch.commit();
        alert("Importação Concluída!");
      } catch (err) { console.error(err); }
    };
    reader.readAsBinaryString(file);
  };

  const exportToExcel = () => {
    const dataMain = registos.map(({ id, ...r }) => ({
      'Lote': r.loteId, 'Brinco': r.brinco, 'Data': r.data, 'Tipo': r.tipo,
      'Medicamento': r.medicamento, 'Dosagem': r.dosagem, 'Via': r.viaAplicacao,
      'Carência': r.periodoCarenciaDias, 'Custo (Kz)': r.custoMedicamento, 'Vet': r.veterinarioResponsavel
    }));
    const worksheet = XLSX.utils.json_to_sheet(dataMain);
    XLSX.utils.sheet_add_aoa(worksheet, [
      [], ["RESUMO POR ESPÉCIE"],
      ["Investimento Bovinos (Kz)", statsBovinos.custoTotal],
      ["Investimento Suínos (Kz)", statsSuinos.custoTotal],
      ["Investimento Total (Kz)", totalGastoGlobal]
    ], { origin: -1 });
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, worksheet, "Saude");
    XLSX.writeFile(wb, "Saude_Fazenda_Kwanza.xlsx");
  };

  const exportToPDF = () => {
    const docPDF = new jsPDF('l', 'mm', 'a4');
    docPDF.setFontSize(16);
    docPDF.text("REGISTO DE SAÚDE - FAZENDA KWANZA", 14, 15);
    
    autoTable(docPDF, {
      head: [["LOTE", "BRINCO", "DATA", "MEDICAMENTO", "TIPO", "CARÊNCIA", "CUSTO"]],
      body: registos.map(r => [
        r.loteId, r.brinco, r.data.split('-').reverse().join('/'), 
        r.medicamento, r.tipo, `${r.periodoCarenciaDias}D`, `${r.custoMedicamento.toLocaleString()} KZ`
      ]),
      startY: 20, theme: 'grid', headStyles: { fillColor: [220, 38, 38] }
    });

    const finalY = (docPDF as any).lastAutoTable.finalY + 10;
    autoTable(docPDF, {
      startY: finalY,
      head: [["ESPÉCIE", "PROCEDIMENTOS", "CARÊNCIA MÉDIA", "INVESTIMENTO"]],
      body: [
        ["BOVINOS", statsBovinos.totalProcedimentos, `${statsBovinos.carenciaMedia.toFixed(1)} Dias`, `${statsBovinos.custoTotal.toLocaleString()} KZ`],
        ["SUÍNOS", statsSuinos.totalProcedimentos, `${statsSuinos.carenciaMedia.toFixed(1)} Dias`, `${statsSuinos.custoTotal.toLocaleString()} KZ`],
        ["TOTAL GLOBAL", registos.length, "-", `${totalGastoGlobal.toLocaleString()} KZ`]
      ],
      theme: 'striped', headStyles: { fillColor: [31, 41, 55] }
    });
    docPDF.save("Relatorio_Saude_Kwanza.pdf");
  };

  const handleSubmit = async (ev: React.FormEvent) => {
    ev.preventDefault();
    const payload = {
      ...formData,
      loteId: formData.loteId.toUpperCase(),
      brinco: formData.brinco.toUpperCase(),
      periodoCarenciaDias: Number(formData.periodoCarenciaDias),
      custoMedicamento: Number(formData.custoMedicamento),
    };
    if (editingId) await updateDoc(doc(db, 'saude', editingId), payload);
    else await addDoc(collection(db, 'saude'), { ...payload, createdAt: new Date().toISOString() });
    setEditingId(null); setFormData(initialForm);
  };

  return (
    <div className="h-[calc(100vh-110px)] flex flex-col space-y-4 p-2 text-slate-300 overflow-hidden">
      <header className="flex justify-between items-center shrink-0">
        <div className="flex items-center gap-3">
          <Activity className="text-red-500" size={32} />
          <h1 className="text-2xl font-black text-white uppercase tracking-tighter">Saúde</h1>
        </div>
        <div className="flex gap-2">
          {selectedIds.length > 0 && (
            <button onClick={async () => {
               if(!confirm('Eliminar selecionados?')) return;
               const batch = writeBatch(db);
               selectedIds.forEach(id => batch.delete(doc(db, 'saude', id)));
               await batch.commit(); setSelectedIds([]);
            }} className="bg-red-600 px-4 py-2 rounded-lg text-[10px] font-black text-white flex items-center gap-2">
              <Trash2 size={14} /> ELIMINAR ({selectedIds.length})
            </button>
          )}
          <input type="file" ref={fileInputRef} className="hidden" onChange={handleImportExcel} accept=".xlsx, .xls" />
          <button onClick={() => fileInputRef.current?.click()} className="bg-[#1a202e] border border-slate-800 px-4 py-2 rounded-lg text-[10px] font-black flex items-center gap-2 hover:bg-slate-800">
            <UploadCloud size={14} className="text-cyan-500" /> IMPORTAR
          </button>
          <button onClick={exportToExcel} className="bg-[#1a202e] border border-slate-800 px-4 py-2 rounded-lg text-[10px] font-black flex items-center gap-2">
            <FileSpreadsheet size={14} className="text-emerald-500" /> EXCEL
          </button>
          <button onClick={exportToPDF} className="bg-[#1a202e] border border-slate-800 px-4 py-2 rounded-lg text-[10px] font-black flex items-center gap-2">
            <FileText size={14} className="text-red-500" /> PDF
          </button>
        </div>
      </header>

      {/* FORMULÁRIO */}
      <div className="bg-[#161922] rounded-2xl border border-slate-800/50 p-4 shrink-0 shadow-2xl">
        <form onSubmit={handleSubmit} className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-11 gap-3 items-end">
          <div className="flex flex-col gap-1"><label className="text-[9px] font-black text-slate-500 uppercase">Lote ID</label>
            <input required className="bg-[#0d0f14] border border-slate-800 p-2 rounded-xl text-white text-xs font-bold uppercase" value={formData.loteId} onChange={e => setFormData({...formData, loteId: e.target.value})} />
          </div>
          <div className="flex flex-col gap-1"><label className="text-[9px] font-black text-slate-500 uppercase">Brinco</label>
            <input className="bg-[#0d0f14] border border-slate-800 p-2 rounded-xl text-white text-xs font-bold uppercase" value={formData.brinco} onChange={e => setFormData({...formData, brinco: e.target.value})} />
          </div>
          <div className="flex flex-col gap-1"><label className="text-[9px] font-black text-slate-500 uppercase">Data</label>
            <input type="date" className="bg-[#0d0f14] border border-slate-800 p-2 rounded-xl text-white text-xs font-bold" value={formData.data} onChange={e => setFormData({...formData, data: e.target.value})} />
          </div>
          <div className="flex flex-col gap-1"><label className="text-[9px] font-black text-slate-500 uppercase">Tipo</label>
            <select className="bg-[#0d0f14] border border-slate-800 p-2 rounded-xl text-white text-xs font-bold" value={formData.tipo} onChange={e => setFormData({...formData, tipo: e.target.value})}>
              <option value="VACINA">VACINA</option><option value="VERMIFUGO">VERMIFUGO</option><option value="TRATAMENTO">TRATAMENTO</option><option value="OUTRO">OUTRO</option>
            </select>
          </div>
          <div className="flex flex-col gap-1"><label className="text-[9px] font-black text-slate-500 uppercase">Medicamento</label>
            <input required className="bg-[#0d0f14] border border-slate-800 p-2 rounded-xl text-white text-xs font-bold uppercase" value={formData.medicamento} onChange={e => setFormData({...formData, medicamento: e.target.value})} />
          </div>
          <div className="flex flex-col gap-1"><label className="text-[9px] font-black text-slate-500 uppercase">Dosagem</label>
            <input className="bg-[#0d0f14] border border-slate-800 p-2 rounded-xl text-white text-xs font-bold" value={formData.dosagem} onChange={e => setFormData({...formData, dosagem: e.target.value})} />
          </div>
          <div className="flex flex-col gap-1"><label className="text-[9px] font-black text-slate-500 uppercase">Via</label>
            <input className="bg-[#0d0f14] border border-slate-800 p-2 rounded-xl text-white text-xs font-bold uppercase" value={formData.viaAplicacao} onChange={e => setFormData({...formData, viaAplicacao: e.target.value})} />
          </div>
          <div className="flex flex-col gap-1"><label className="text-[9px] font-black text-red-500 uppercase">Carência</label>
            <input type="number" className="bg-[#0d0f14] border border-red-900/30 p-2 rounded-xl text-red-500 text-xs font-black" value={formData.periodoCarenciaDias} onChange={e => setFormData({...formData, periodoCarenciaDias: e.target.value})} />
          </div>
          <div className="flex flex-col gap-1"><label className="text-[9px] font-black text-emerald-500 uppercase">Custo (KZ)</label>
            <input type="number" className="bg-[#0d0f14] border border-emerald-900/30 p-2 rounded-xl text-emerald-500 text-xs font-black" value={formData.custoMedicamento} onChange={e => setFormData({...formData, custoMedicamento: e.target.value})} />
          </div>
          <div className="flex flex-col gap-1"><label className="text-[9px] font-black text-slate-500 uppercase">Vet.</label>
            <input className="bg-[#0d0f14] border border-slate-800 p-2 rounded-xl text-white text-xs font-bold uppercase" value={formData.veterinarioResponsavel} onChange={e => setFormData({...formData, veterinarioResponsavel: e.target.value})} />
          </div>
          <div className="flex gap-1">
            <button type="submit" className="flex-1 bg-red-600 hover:bg-red-500 text-white p-3 rounded-xl shadow-lg transition-all active:scale-95">
              {editingId ? <Check size={20} className="mx-auto"/> : <Plus size={20} className="mx-auto"/>}
            </button>
            {editingId && (
              <button type="button" onClick={() => {setEditingId(null); setFormData(initialForm);}} className="bg-slate-800 p-2 rounded-xl text-white">
                <RotateCcw size={16}/>
              </button>
            )}
          </div>
        </form>
      </div>

      {/* TABELA */}
      <div className="bg-[#161922] rounded-2xl border border-slate-800/50 flex flex-col flex-1 min-h-0 overflow-hidden shadow-2xl">
        <div className="overflow-auto flex-1 custom-scrollbar"> 
          <table className="w-full text-left text-[10px] border-separate border-spacing-0 min-w-[1300px]">
            <thead className="bg-[#11141d] text-slate-500 font-black uppercase text-[9px] sticky top-0 z-10">
              <tr>
                <th className="p-4 border-b border-slate-800/50 w-10 text-center">
                   <button onClick={() => selectedIds.length === registos.length ? setSelectedIds([]) : setSelectedIds(registos.map(r => r.id))}>
                    {selectedIds.length === registos.length && registos.length > 0 ? <CheckSquare size={16} className="text-red-500"/> : <Square size={16}/>}
                   </button>
                </th>
                <th className="p-4 border-b border-slate-800/50">LOTE</th>
                <th className="p-4 border-b border-slate-800/50">BRINCO</th>
                <th className="p-4 border-b border-slate-800/50">DATA</th>
                <th className="p-4 border-b border-slate-800/50">TIPO</th>
                <th className="p-4 border-b border-slate-800/50">MEDICAMENTO</th>
                <th className="p-4 border-b border-slate-800/50">DOSAGEM</th>
                <th className="p-4 border-b border-slate-800/50">VIA</th>
                <th className="p-4 border-b border-slate-800/50 text-center">CARÊNCIA</th>
                <th className="p-4 border-b border-slate-800/50 text-right">CUSTO (KZ)</th>
                <th className="p-4 border-b border-slate-800/50">VETERINÁRIO</th>
                <th className="p-4 border-b border-slate-800/50 text-center">AÇÕES</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/20">
              {registos.map((r) => (
                <tr key={r.id} className="hover:bg-white/[0.02] transition-colors group">
                  <td className="p-4 text-center">
                    <button onClick={() => setSelectedIds(prev => prev.includes(r.id) ? prev.filter(i => i !== r.id) : [...prev, r.id])}>
                      {selectedIds.includes(r.id) ? <CheckSquare size={16} className="text-red-500"/> : <Square size={16} className="text-slate-700"/>}
                    </button>
                  </td>
                  <td className="p-4 font-black text-cyan-500 uppercase">{r.loteId}</td>
                  <td className="p-4 text-white font-bold uppercase">{r.brinco}</td>
                  <td className="p-4 text-slate-400 font-bold">{r.data.split('-').reverse().join('/')}</td>
                  <td className="p-4 text-[9px] font-black text-slate-500 uppercase">{r.tipo}</td>
                  <td className="p-4 text-white font-black flex items-center gap-2 uppercase">
                    <Pill size={12} className="text-red-500"/> {r.medicamento}
                  </td>
                  <td className="p-4 text-slate-400">{r.dosagem}</td>
                  <td className="p-4 text-slate-400 font-bold uppercase">{r.viaAplicacao}</td>
                  <td className="p-4 text-center">
                    <span className="px-2 py-1 bg-red-500/10 rounded-lg text-red-500 font-black">{r.periodoCarenciaDias} D</span>
                  </td>
                  <td className="p-4 text-right text-emerald-500 font-black">{r.custoMedicamento.toLocaleString()}</td>
                  <td className="p-4 text-slate-400 flex items-center gap-2 uppercase font-bold">
                    <User size={12}/> {r.veterinarioResponsavel}
                  </td>
                  <td className="p-4 text-center">
                    <div className="flex justify-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={() => { 
                        setEditingId(r.id); 
                        setFormData({...r, periodoCarenciaDias: String(r.periodoCarenciaDias), custoMedicamento: String(r.custoMedicamento)}); 
                      }} className="p-2 text-slate-600 hover:text-cyan-400"><Edit3 size={14}/></button>
                      <button onClick={async () => { if(confirm('Eliminar?')) await deleteDoc(doc(db, 'saude', r.id)) }} className="p-2 text-slate-700 hover:text-red-500"><Trash2 size={14}/></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* RODAPÉ SEGMENTADO POR ESPÉCIE */}
        <div className="bg-[#11141d] border-t border-slate-800 p-6 shrink-0 grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="flex items-center gap-5 bg-[#161922] p-4 rounded-2xl border border-slate-800/50 shadow-lg">
            <div className="p-3 bg-red-500/10 rounded-xl text-red-500">
              <Activity size={24}/>
            </div>
            <div>
              <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Investimento Global</p>
              <p className="text-2xl font-black text-white">
                {totalGastoGlobal.toLocaleString()} <span className="text-xs text-slate-500 font-medium">KZ</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-5 bg-[#161922] p-4 rounded-2xl border border-emerald-500/20 shadow-lg">
            <div className="p-3 bg-emerald-500/10 rounded-xl text-emerald-500">
              <HeartPulse size={24}/>
            </div>
            <div className="flex-1">
              <p className="text-[10px] font-black text-emerald-500 uppercase tracking-widest mb-1 flex items-center gap-2">
                <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse"/> Bovinos
              </p>
              <div className="flex flex-col">
                <span className="text-xl font-black text-white">
                  {statsBovinos.totalProcedimentos} <span className="text-xs text-slate-500 font-medium uppercase tracking-tight">Procds</span>
                </span>
                <span className="text-sm font-bold text-emerald-500/80">
                  {statsBovinos.custoTotal.toLocaleString()} <span className="text-[10px]">KZ</span>
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-5 bg-[#161922] p-4 rounded-2xl border border-pink-500/20 shadow-lg">
            <div className="p-3 bg-pink-500/10 rounded-xl text-pink-500">
              <HeartPulse size={24}/>
            </div>
            <div className="flex-1">
              <p className="text-[10px] font-black text-pink-500 uppercase tracking-widest mb-1 flex items-center gap-2">
                <div className="w-1.5 h-1.5 bg-pink-500 rounded-full animate-pulse"/> Suínos
              </p>
              <div className="flex flex-col">
                <span className="text-xl font-black text-white">
                  {statsSuinos.totalProcedimentos} <span className="text-xs text-slate-500 font-medium uppercase tracking-tight">Procds</span>
                </span>
                <span className="text-sm font-bold text-pink-500/80">
                  {statsSuinos.custoTotal.toLocaleString()} <span className="text-[10px]">KZ</span>
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}