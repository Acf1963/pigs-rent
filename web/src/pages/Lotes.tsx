import { useState, useEffect } from 'react';
import { db } from '../lib/firebase';
import { collection, addDoc, writeBatch, doc, onSnapshot, query, orderBy, deleteDoc, updateDoc } from 'firebase/firestore';
import { FileSpreadsheet, Trash2, Edit3, Search, LayoutGrid, Download, Plus, Save, X } from 'lucide-react';
import * as XLSX from 'xlsx';

export default function LotesPage() {
  const [loading, setLoading] = useState(false);
  const [lotes, setLotes] = useState<any[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [quebraRealTime, setQuebraRealTime] = useState(0);
  
  const [formData, setFormData] = useState({
    codigoLote: '',
    dataEntrada: new Date().toISOString().split('T')[0],
    especie: 'SUÍNO',
    raca: '',
    quantidade: 0,
    pesoOrigemKg: 0,
    pesoChegadaKg: 0,
    custoAquisicao: 0,
    custoTransporte: 0,
    fornecedor: ''
  });

  // 1. Função de Limpeza de Datas (Evita o ecrã negro)
  const formatarDataExibicao = (data: any) => {
    if (!data) return '';
    if (data.seconds) {
      return new Date(data.seconds * 1000).toISOString().split('T')[0];
    }
    return String(data);
  };

  // 2. Monitor de Cálculo de Quebra
  useEffect(() => {
    const origem = Number(formData.pesoOrigemKg);
    const chegada = Number(formData.pesoChegadaKg);
    if (origem > 0) {
      const perda = ((origem - chegada) / origem) * 100;
      setQuebraRealTime(Number(perda.toFixed(2)));
    } else {
      setQuebraRealTime(0);
    }
  }, [formData.pesoOrigemKg, formData.pesoChegadaKg]);

  // 3. Carregamento de Dados
  useEffect(() => {
    const q = query(collection(db, 'lotes'), orderBy('dataEntrada', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setLotes(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });
    return () => unsubscribe();
  }, []);

  // 4. Exportação para Excel
  const handleExportarExcel = () => {
    const dadosParaExportar = lotes.map(({ id, ...l }) => ({
      ...l,
      dataEntrada: formatarDataExibicao(l.dataEntrada)
    }));
    const ws = XLSX.utils.json_to_sheet(dadosParaExportar);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Lotes");
    XLSX.writeFile(wb, `Lotes_Fazenda_Quanza.xlsx`);
  };

  // 5. Importação de Excel
  const handleExcelImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setLoading(true);
    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const workbook = XLSX.read(evt.target?.result, { type: 'array' });
        const json = XLSX.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]]) as any[];
        const batch = writeBatch(db);
        
        json.forEach((row: any) => {
          const docRef = doc(collection(db, 'lotes'));
          const pO = Number(row.pesoOrigemKg || row.PesoOrigem || 0);
          const pC = Number(row.pesoChegadaKg || row.PesoChegada || 0);
          batch.set(docRef, {
            codigoLote: String(row.codigoLote || row.Lote || 'ID').toUpperCase(),
            dataEntrada: row.dataEntrada || new Date().toISOString().split('T')[0],
            especie: String(row.especie || 'SUÍNO').toUpperCase(),
            raca: row.raca || '',
            quantidade: Number(row.quantidade || 0),
            pesoOrigemKg: pO,
            pesoChegadaKg: pC,
            quebraTransporte: pO > 0 ? Number((((pO - pC) / pO) * 100).toFixed(2)) : 0,
            custoAquisicao: Number(row.custoAquisicao || 0),
            custoTransporte: Number(row.custoTransporte || 0),
            fornecedor: row.fornecedor || '',
            createdAt: new Date().toISOString()
          });
        });
        await batch.commit();
        alert("Importação concluída!");
      } catch (err) {
        alert("Erro na importação.");
      } finally {
        setLoading(false);
        e.target.value = '';
      }
    };
    reader.readAsArrayBuffer(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const payload = {
        ...formData,
        codigoLote: formData.codigoLote.toUpperCase(),
        quebraTransporte: quebraRealTime,
        updatedAt: new Date().toISOString()
      };

      if (editingId) {
        await updateDoc(doc(db, 'lotes', editingId), payload);
      } else {
        await addDoc(collection(db, 'lotes'), { ...payload, createdAt: new Date().toISOString() });
      }
      resetForm();
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      codigoLote: '', dataEntrada: new Date().toISOString().split('T')[0], especie: 'SUÍNO',
      raca: '', quantidade: 0, pesoOrigemKg: 0, pesoChegadaKg: 0,
      custoAquisicao: 0, custoTransporte: 0, fornecedor: ''
    });
    setEditingId(null);
    setQuebraRealTime(0);
  };

  const handleEdit = (l: any) => {
    setEditingId(l.id);
    setFormData({
      codigoLote: l.codigoLote || '',
      dataEntrada: formatarDataExibicao(l.dataEntrada),
      especie: l.especie || 'SUÍNO',
      raca: l.raca || '',
      quantidade: Number(l.quantidade) || 0,
      pesoOrigemKg: Number(l.pesoOrigemKg) || 0,
      pesoChegadaKg: Number(l.pesoChegadaKg) || 0,
      custoAquisicao: Number(l.custoAquisicao) || 0,
      custoTransporte: Number(l.custoTransporte) || 0,
      fornecedor: l.fornecedor || ''
    });
  };

  return (
    <div className="h-[calc(100vh-100px)] flex flex-col p-6 text-slate-100 overflow-hidden bg-[#0f1117] font-sans">
      <div className="flex justify-between items-center mb-6 shrink-0">
        <h1 className="text-2xl font-black uppercase tracking-tighter flex items-center gap-2 text-white">
          <LayoutGrid className="text-red-600" size={28} /> Gestão de Lotes
        </h1>
        <div className="flex gap-3">
          <button onClick={handleExportarExcel} className="flex items-center gap-2 bg-[#1a1d26] text-slate-300 border border-slate-700 px-6 py-3 rounded-2xl font-bold text-xs uppercase hover:bg-slate-800 transition-all">
            <Download size={18} /> Exportar
          </button>
          <label className={`flex items-center gap-2 bg-red-700 text-white px-6 py-3 rounded-2xl cursor-pointer font-bold text-xs uppercase hover:bg-red-800 transition-all ${loading ? 'opacity-50' : ''}`}>
            <FileSpreadsheet size={18} /> {loading ? 'A PROCESSAR...' : 'IMPORTAR EXCEL'}
            <input type="file" accept=".xlsx, .xls" className="hidden" onChange={handleExcelImport} disabled={loading} />
          </label>
        </div>
      </div>

      <div className="bg-[#1a1d26] rounded-[2rem] shadow-xl border border-slate-800 mb-6 shrink-0 p-6">
        <form onSubmit={handleSubmit} className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-black text-slate-500 uppercase italic ml-1">Lote / Data</label>
            <div className="flex gap-2">
              <input required className="w-1/2 bg-[#0f1117] border border-slate-700 p-3 rounded-xl text-sm font-bold uppercase text-red-500" value={formData.codigoLote} onChange={e => setFormData({...formData, codigoLote: e.target.value})} placeholder="ID" />
              <input type="date" className="w-1/2 bg-[#0f1117] border border-slate-700 p-3 rounded-xl text-xs font-bold text-slate-300" value={formData.dataEntrada} onChange={e => setFormData({...formData, dataEntrada: e.target.value})} />
            </div>
          </div>
          
          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-black text-slate-500 uppercase italic ml-1">Espécie / Raça</label>
            <div className="flex gap-2">
              <select className="w-1/2 bg-[#0f1117] border border-slate-700 p-3 rounded-xl text-xs font-bold text-slate-400" value={formData.especie} onChange={e => setFormData({...formData, especie: e.target.value})}>
                <option value="SUÍNO">SUÍNO</option>
                <option value="BOVINO">BOVINO</option>
              </select>
              <input className="w-1/2 bg-[#0f1117] border border-slate-700 p-3 rounded-xl text-sm font-bold text-slate-300" value={formData.raca} onChange={e => setFormData({...formData, raca: e.target.value})} placeholder="RAÇA" />
            </div>
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-black text-slate-500 uppercase italic ml-1">Qtd / Pesos (Kg)</label>
            <div className="flex gap-2">
              <input type="number" className="w-1/3 bg-[#0f1117] border border-slate-700 p-3 rounded-xl text-sm font-bold text-slate-200" value={formData.quantidade} onChange={e => setFormData({...formData, quantidade: Number(e.target.value)})} />
              <input type="number" className="w-1/3 bg-[#0f1117] border border-slate-700 p-3 rounded-xl text-xs font-bold text-red-400" value={formData.pesoOrigemKg} onChange={e => setFormData({...formData, pesoOrigemKg: Number(e.target.value)})} placeholder="ORIGEM" />
              <input type="number" className="w-1/3 bg-[#0f1117] border border-slate-700 p-3 rounded-xl text-xs font-bold text-green-400" value={formData.pesoChegadaKg} onChange={e => setFormData({...formData, pesoChegadaKg: Number(e.target.value)})} placeholder="CHEGADA" />
            </div>
            <div className="text-[9px] font-bold italic ml-1 mt-1">
              PERDA: <span className={quebraRealTime > 5 ? "text-red-500 font-black" : "text-green-500 font-black"}>{quebraRealTime}%</span>
            </div>
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-black text-slate-500 uppercase italic ml-1">Custos (Kz)</label>
            <div className="flex gap-2">
              <input type="number" className="w-1/2 bg-[#0f1117] border border-slate-700 p-3 rounded-xl text-sm font-bold text-slate-200" value={formData.custoAquisicao} onChange={e => setFormData({...formData, custoAquisicao: Number(e.target.value)})} placeholder="AQUIS." />
              <input type="number" className="w-1/2 bg-[#0f1117] border border-slate-700 p-3 rounded-xl text-sm font-bold text-slate-400" value={formData.custoTransporte} onChange={e => setFormData({...formData, custoTransporte: Number(e.target.value)})} placeholder="TRANSP." />
            </div>
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-black text-slate-500 uppercase italic ml-1">Fornecedor / Gravar</label>
            <div className="flex gap-2">
              <input className="flex-1 bg-[#0f1117] border border-slate-700 p-3 rounded-xl text-sm font-bold text-slate-300 uppercase" value={formData.fornecedor} onChange={e => setFormData({...formData, fornecedor: e.target.value})} />
              <button type="submit" disabled={loading} className="bg-red-700 text-white p-3 rounded-xl hover:bg-red-800 transition-all shadow-lg">
                {editingId ? <Save size={20} /> : <Plus size={20} />}
              </button>
              {editingId && <button type="button" onClick={resetForm} className="bg-slate-700 p-3 rounded-xl"><X size={20}/></button>}
            </div>
          </div>
        </form>
      </div>

      <div className="bg-[#1a1d26] rounded-[2rem] shadow-xl border border-slate-800 flex-1 flex flex-col overflow-hidden">
        <div className="p-4 bg-[#14171f] border-b border-slate-800 flex items-center gap-2 shrink-0 italic text-slate-500 font-bold text-xs uppercase">
          <Search size={16} /> Registo de Lotes - Fazenda Quanza
        </div>
        
        <div className="flex-1 overflow-auto">
          <table className="w-full text-left border-separate border-spacing-0">
            <thead>
              <tr className="bg-[#14171f] text-[10px] font-black uppercase text-slate-500 italic text-center shadow-sm">
                <th className="p-4 text-left border-b border-slate-800">Lote</th>
                <th className="p-4 border-b border-slate-800">Data</th>
                <th className="p-4 border-b border-slate-800">Espécie/Raça</th>
                <th className="p-4 border-b border-slate-800">Qtd</th>
                <th className="p-4 border-b border-slate-800">Perda (%)</th>
                <th className="p-4 border-b border-slate-800">Custo Total</th>
                <th className="p-4 border-b border-slate-800">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {lotes.map((l) => (
                <tr key={l.id} className="hover:bg-[#1e222d] transition-all text-center">
                  <td className="p-4 font-black text-red-500 text-left uppercase">{l.codigoLote}</td>
                  <td className="p-4 text-xs font-bold text-slate-400">{formatarDataExibicao(l.dataEntrada)}</td>
                  <td className="p-4 text-xs font-bold text-slate-200">{l.especie} <span className="text-slate-500 ml-1">{l.raca}</span></td>
                  <td className="p-4 font-bold text-white">{l.quantidade}</td>
                  <td className="p-4">
                    <span className={`px-2 py-1 rounded-md text-[10px] font-black border ${
                      (l.quebraTransporte || 0) > 5 ? 'bg-red-900/30 text-red-400 border-red-900/50' : 'bg-green-900/30 text-green-400 border-green-900/50'
                    }`}>
                      {l.quebraTransporte || 0}%
                    </span>
                  </td>
                  <td className="p-4 font-black text-slate-300">
                    {((Number(l.custoAquisicao) || 0) + (Number(l.custoTransporte) || 0)).toLocaleString()} Kz
                  </td>
                  <td className="p-4 flex justify-center gap-2">
                    <button onClick={() => handleEdit(l)} className="p-2 text-slate-600 hover:text-blue-500 transition-colors"><Edit3 size={16}/></button>
                    <button onClick={async () => { if(confirm("Eliminar?")) await deleteDoc(doc(db, 'lotes', l.id)) }} className="p-2 text-slate-600 hover:text-red-500 transition-colors"><Trash2 size={16}/></button>
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
