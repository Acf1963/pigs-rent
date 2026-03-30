import { useState, useEffect, useRef } from 'react';
import { db } from '../lib/firebase';
import { collection, addDoc, onSnapshot, query, orderBy, deleteDoc, doc, updateDoc } from 'firebase/firestore';
import { Skull, FileSpreadsheet, FileText, UploadCloud, Check, Trash2, Edit3 } from 'lucide-react';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export default function AbatesPage() {
  const [registos, setRegistos] = useState<any[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [formData, setFormData] = useState({
    loteId: '',
    dataAbate: new Date().toISOString().split('T')[0],
    pesoVivoKg: '',
    carcacaKg: '',
    observacoes: ''
  });

  useEffect(() => {
    const q = query(collection(db, 'abates'), orderBy('dataAbate', 'desc'));
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
          let dataFinal = item.dataAbate || item.data;
          if (dataFinal instanceof Date) {
            dataFinal = dataFinal.toISOString().split('T')[0];
          }

          // Mapeamento inteligente para aceitar variações do Excel (pesoVivoK, CarcacaKg)
          const vivo = item.pesoVivoKg || item.pesoVivoK || item.peso_vivo || 0;
          const carcaca = item.carcacaKg || item.CarcacaKg || item.carcaca || 0;

          await addDoc(collection(db, 'abates'), { 
            loteId: (item.loteId || item.loteID || 'S/L').toString(),
            dataAbate: dataFinal || new Date().toISOString().split('T')[0],
            pesoVivoKg: parseFloat(vivo),
            carcacaKg: parseFloat(carcaca),
            observacoes: (item.observacoes || item.obs || '').toString().toUpperCase(),
            createdAt: new Date().toISOString() 
          });
        }
      } catch (err) { console.error("Erro na importação:", err); }
    };
    reader.readAsBinaryString(file);
  };

  const exportToPDF = () => {
    const doc = new jsPDF('l', 'mm', 'a4');
    doc.text("AgroRent - Registo de Abates", 14, 15);
    autoTable(doc, {
      head: [["LOTE ID", "DATA ABATE", "PESO VIVO", "CARCAÇA", "REND. %", "OBSERVAÇÕES"]],
      body: registos.map(r => [
        r.loteId, 
        r.dataAbate, 
        `${Number(r.pesoVivoKg).toFixed(1)} Kg`, 
        `${Number(r.carcacaKg).toFixed(1)} Kg`,
        `${r.pesoVivoKg > 0 ? ((r.carcacaKg / r.pesoVivoKg) * 100).toFixed(1) : '0.0'}%`,
        r.observacoes
      ]),
      startY: 20,
      headStyles: { fillColor: [8, 145, 178] }
    });
    doc.save("Registos_Abate.pdf");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload = {
      ...formData,
      pesoVivoKg: parseFloat(formData.pesoVivoKg as string) || 0,
      carcacaKg: parseFloat(formData.carcacaKg as string) || 0,
    };

    if (editingId) {
      await updateDoc(doc(db, 'abates', editingId), payload);
      setEditingId(null);
    } else {
      await addDoc(collection(db, 'abates'), { ...payload, createdAt: new Date().toISOString() });
    }
    setFormData({ loteId: '', dataAbate: new Date().toISOString().split('T')[0], pesoVivoKg: '', carcacaKg: '', observacoes: '' });
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center border-b border-slate-800/50 pb-6">
        <h1 className="text-3xl font-black text-white flex items-center gap-3 tracking-tighter uppercase">
          <Skull className="text-cyan-500" size={32} /> Registo de Abates
        </h1>

        <div className="flex gap-2 bg-[#161922] p-1.5 rounded-2xl border border-slate-800 shadow-xl">
          <input type="file" ref={fileInputRef} className="hidden" accept=".xlsx, .xls" onChange={handleFileUpload} />
          <button onClick={() => fileInputRef.current?.click()} className="bg-[#1e293b] text-slate-300 px-4 py-2 rounded-xl text-[10px] font-black uppercase flex items-center gap-2 hover:bg-slate-800 border border-slate-700/50 transition-all">
            <UploadCloud size={14} className="text-emerald-500" /> Importar
          </button>
          <button onClick={() => { /* lógica excel */ }} className="bg-[#1e293b] text-slate-300 px-4 py-2 rounded-xl text-[10px] font-black uppercase flex items-center gap-2 hover:bg-slate-800 border border-slate-700/50">
            <FileSpreadsheet size={14} className="text-emerald-400" /> Excel
          </button>
          {/* Botão PDF Restaurado para limpar os erros do TS */}
          <button onClick={exportToPDF} className="bg-[#1e293b] text-slate-300 px-4 py-2 rounded-xl text-[10px] font-black uppercase flex items-center gap-2 hover:bg-slate-800 border border-slate-700/50 transition-all">
            <FileText size={14} className="text-red-400" /> PDF
          </button>
        </div>
      </div>

      {/* Resto do formulário e tabela igual à versão anterior... */}
      <div className="bg-[#161922] rounded-[2rem] border border-slate-800/50 p-6 shadow-2xl">
        <form onSubmit={handleSubmit} className="grid grid-cols-12 gap-3 items-end">
          <div className="col-span-2 space-y-1">
            <label className="text-[8px] font-black text-slate-500 uppercase px-1">Lote ID</label>
            <input required className="w-full bg-[#0f121a] border border-slate-800 p-2.5 rounded-xl text-cyan-500 font-bold outline-none text-[10px] uppercase" value={formData.loteId} onChange={e => setFormData({...formData, loteId: e.target.value.toUpperCase()})} />
          </div>
          <div className="col-span-2 space-y-1">
            <label className="text-[8px] font-black text-slate-500 uppercase px-1">Data Abate</label>
            <input type="date" className="w-full bg-[#0f121a] border border-slate-800 p-2.5 rounded-xl text-white font-bold outline-none text-[10px]" value={formData.dataAbate} onChange={e => setFormData({...formData, dataAbate: e.target.value})} />
          </div>
          <div className="col-span-1 space-y-1">
            <label className="text-[8px] font-black text-slate-500 uppercase px-1">P. Vivo</label>
            <input type="number" step="0.1" className="w-full bg-[#0f121a] border border-slate-800 p-2.5 rounded-xl text-white font-bold outline-none text-[10px]" value={formData.pesoVivoKg} onChange={e => setFormData({...formData, pesoVivoKg: e.target.value})} />
          </div>
          <div className="col-span-1 space-y-1">
            <label className="text-[8px] font-black text-slate-500 uppercase px-1">Carcaça</label>
            <input type="number" step="0.1" className="w-full bg-[#0f121a] border border-slate-800 p-2.5 rounded-xl text-white font-bold outline-none text-[10px]" value={formData.carcacaKg} onChange={e => setFormData({...formData, carcacaKg: e.target.value})} />
          </div>
          <div className="col-span-4 space-y-1">
            <label className="text-[8px] font-black text-slate-500 uppercase px-1">Observações</label>
            <input className="w-full bg-[#0f121a] border border-slate-800 p-2.5 rounded-xl text-slate-400 font-bold outline-none text-[10px] uppercase" value={formData.observacoes} onChange={e => setFormData({...formData, observacoes: e.target.value.toUpperCase()})} />
          </div>
          <div className="col-span-2">
            <button type="submit" className="w-full bg-cyan-600 hover:bg-cyan-500 text-white font-black text-[10px] py-3 rounded-xl transition-all shadow-lg uppercase">
              <Check size={14} className="inline mr-2" /> Gravar
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
                <th className="p-4">DATA ABATE</th>
                <th className="p-4">PESO VIVO</th>
                <th className="p-4">CARCAÇA</th>
                <th className="p-4">REND. (%)</th>
                <th className="p-4">OBSERVAÇÕES</th>
                <th className="p-4 text-center">AÇÕES</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/30">
              {registos.map((r) => {
                const rendimento = (r.pesoVivoKg > 0) ? ((r.carcacaKg / r.pesoVivoKg) * 100).toFixed(1) : '0.0';
                return (
                  <tr key={r.id} className="hover:bg-slate-800/10 transition-colors">
                    <td className="p-4 font-black text-cyan-500 uppercase">{r.loteId}</td>
                    <td className="p-4 text-slate-500 font-bold">{r.dataAbate}</td>
                    <td className="p-4 text-white font-bold">{Number(r.pesoVivoKg).toFixed(1)} Kg</td>
                    <td className="p-4 text-white font-bold">{Number(r.carcacaKg).toFixed(1)} Kg</td>
                    <td className="p-4">
                      <span className="text-emerald-500 font-black bg-emerald-500/10 px-2 py-1 rounded-lg border border-emerald-500/20">{rendimento}%</span>
                    </td>
                    <td className="p-4 text-slate-400 uppercase text-[9px] truncate max-w-[150px]">{r.observacoes}</td>
                    <td className="p-4 text-center">
                      <div className="flex justify-center gap-3">
                        <button onClick={() => { setEditingId(r.id); setFormData({...r}); }} className="text-slate-600 hover:text-cyan-400"><Edit3 size={14}/></button>
                        <button onClick={() => { if(confirm('Eliminar?')) deleteDoc(doc(db, 'abates', r.id)) }} className="text-slate-600 hover:text-red-500"><Trash2 size={14}/></button>
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
