import { useState, useEffect } from 'react';
import { db } from '../lib/firebase';
import { collection, addDoc, writeBatch, doc, onSnapshot, query, updateDoc, deleteDoc, orderBy } from 'firebase/firestore';
import { Scale, FileSpreadsheet, Trash2, Edit3, Search } from 'lucide-react';
import * as XLSX from 'xlsx';

export default function AbatesPage() {
  const [loading, setLoading] = useState(false);
  const [abates, setAbates] = useState<any[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    loteId: '',
    dataAbate: new Date().toISOString().split('T')[0],
    pesoVivo: 0,
    pesoCarcaca: 0,
    rendimento: 0
  });

  // Converte datas do Excel (ex: 46096) para formato legível
  const formatarDataExcel = (celula: any) => {
    if (!celula) return new Date().toISOString().split('T')[0];
    if (celula instanceof Date) return celula.toISOString().split('T')[0];
    if (typeof celula === 'number') {
      const date = XLSX.SSF.parse_date_code(celula);
      const pad = (n: number) => n < 10 ? `0${n}` : n;
      return `${date.y}-${pad(date.m)}-${pad(date.d)}`;
    }
    return String(celula);
  };

  // Limpa "Kg", espaços e converte vírgulas para evitar o erro NaN
  const parseNumeroSeguro = (valor: any): number => {
    if (valor === null || valor === undefined || valor === '') return 0;
    if (typeof valor === 'number') return valor;
    const limpo = String(valor)
      .replace(/\s/g, '')
      .replace(/[a-zA-Z]/g, '')
      .replace(',', '.');
    const num = parseFloat(limpo);
    return isNaN(num) ? 0 : num;
  };

  useEffect(() => {
    const q = query(collection(db, 'abates'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setAbates(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });
    return () => unsubscribe();
  }, []);

  const handleExcelImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setLoading(true);
    const reader = new FileReader();

    reader.onload = async (evt) => {
      try {
        const workbook = XLSX.read(evt.target?.result, { type: 'array', cellDates: true });
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        const json = XLSX.utils.sheet_to_json(sheet) as any[];
        const batch = writeBatch(db);

        json.forEach((row: any) => {
          const newDocRef = doc(collection(db, 'abates'));
          
          // MAPEAMENTO ROBUSTO: Procura exatamente as colunas da imagem
          // Tentamos variações com e sem espaços para garantir a captura
          const pVivo = parseNumeroSeguro(
            row['pesoVivoK'] || row.pesoVivoK || row.pesoVivo || row.Peso
          );
          
          const pCarcaca = parseNumeroSeguro(
            row['CarcacaKg'] || row.CarcacaKg || row.pesoCarcaca || row.Carcaca
          );
          
          batch.set(newDocRef, {
            loteId: String(row.loteId || row.Lote || 'SEM LOTE').trim().toUpperCase(),
            dataAbate: formatarDataExcel(row.dataAbate || row.data || row.Data),
            pesoVivo: pVivo,
            pesoCarcaca: pCarcaca,
            rendimento: pVivo > 0 ? (pCarcaca / pVivo) * 100 : 0,
            createdAt: new Date().toISOString()
          });
        });

        await batch.commit();
        alert("Importação de Abates da Fazenda Quanza concluída!");
      } catch (err) {
        alert("Erro técnico ao ler o Excel. Verifique se o ficheiro está aberto.");
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
    const rendimentoCalculado = formData.pesoVivo > 0 ? (formData.pesoCarcaca / formData.pesoVivo) * 100 : 0;
    try {
      if (editingId) {
        await updateDoc(doc(db, 'abates', editingId), { ...formData, rendimento: rendimentoCalculado });
        setEditingId(null);
      } else {
        await addDoc(collection(db, 'abates'), { ...formData, rendimento: rendimentoCalculado, createdAt: new Date().toISOString() });
      }
      setFormData({ loteId: '', dataAbate: new Date().toISOString().split('T')[0], pesoVivo: 0, pesoCarcaca: 0, rendimento: 0 });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="h-[calc(100vh-100px)] flex flex-col p-6 text-slate-900 overflow-hidden bg-slate-50 font-sans">
      <div className="flex justify-between items-center mb-6 shrink-0">
        <h1 className="text-2xl font-black uppercase tracking-tighter flex items-center gap-2">
          <Scale className="text-red-600" size={28} /> Registo de Abates
        </h1>
        <label className={`flex items-center gap-2 bg-red-600 text-white px-6 py-3 rounded-2xl cursor-pointer font-bold text-xs uppercase hover:bg-red-700 transition-all shadow-lg ${loading ? 'opacity-50' : ''}`}>
          <FileSpreadsheet size={18} /> {loading ? 'A IMPORTAR...' : 'IMPORTAR EXCEL'}
          <input type="file" accept=".xlsx, .xls" className="hidden" onChange={handleExcelImport} disabled={loading} />
        </label>
      </div>

      {/* FORMULÁRIO DE ENTRADA MANUAL */}
      <div className="bg-white rounded-[2rem] shadow-xl border border-slate-200 mb-6 shrink-0 p-6">
        <form onSubmit={handleSubmit} className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-black text-slate-400 uppercase italic ml-1">Lote</label>
            <input required className="bg-slate-50 border border-slate-200 p-3 rounded-xl text-sm font-bold uppercase" value={formData.loteId} onChange={e => setFormData({...formData, loteId: e.target.value})} />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-black text-slate-400 uppercase italic ml-1">Peso Vivo (Kg)</label>
            <input type="number" step="0.01" className="bg-slate-50 border border-slate-200 p-3 rounded-xl text-sm font-bold" value={formData.pesoVivo} onChange={e => setFormData({...formData, pesoVivo: Number(e.target.value)})} />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-black text-slate-400 uppercase italic ml-1">Peso Carcaça (Kg)</label>
            <input type="number" step="0.01" className="bg-slate-50 border border-slate-200 p-3 rounded-xl text-sm font-bold" value={formData.pesoCarcaca} onChange={e => setFormData({...formData, pesoCarcaca: Number(e.target.value)})} />
          </div>
          <button type="submit" disabled={loading} className="bg-red-600 text-white font-black rounded-xl uppercase text-xs h-[52px] mt-auto hover:bg-red-700 shadow-md">
            {editingId ? 'ATUALIZAR' : 'GRAVAR'}
          </button>
        </form>
      </div>

      {/* TABELA DE RESULTADOS */}
      <div className="bg-white rounded-[2rem] shadow-xl border border-slate-200 flex-1 flex flex-col overflow-hidden">
        <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center gap-2 shrink-0 italic text-slate-500 font-bold text-xs uppercase">
          <Search size={16} /> Listagem de Rendimento
        </div>
        
        <div className="flex-1 overflow-auto px-4">
          <table className="w-full text-left border-separate border-spacing-y-2">
            <thead>
              <tr className="text-[10px] font-black uppercase text-slate-400 italic text-center">
                <th className="p-4 text-left">Lote</th>
                <th className="p-4">Data</th>
                <th className="p-4">Peso Vivo</th>
                <th className="p-4">Carcaça</th>
                <th className="p-4">Rendimento</th>
                <th className="p-4">Ações</th>
              </tr>
            </thead>
            <tbody>
              {abates.map((a) => (
                <tr key={a.id} className="bg-white border border-slate-50 shadow-sm rounded-xl text-center">
                  <td className="p-4 font-black text-red-600 text-left">{a.loteId}</td>
                  <td className="p-4 text-sm font-bold text-slate-600">{a.dataAbate}</td>
                  <td className="p-4 font-bold">{a.pesoVivo.toFixed(1)} Kg</td>
                  <td className="p-4 font-bold">{a.pesoCarcaca.toFixed(1)} Kg</td>
                  <td className="p-4">
                    <span className="bg-red-50 text-red-700 px-3 py-1 rounded-lg text-[10px] font-black uppercase border border-red-100">
                      {(a.rendimento || 0).toFixed(1)}%
                    </span>
                  </td>
                  <td className="p-4 flex justify-center gap-2">
                    <button onClick={() => { setEditingId(a.id); setFormData({...a}); }} className="p-2 text-slate-300 hover:text-red-600"><Edit3 size={18}/></button>
                    <button onClick={async () => { if(confirm("Eliminar abate?")) await deleteDoc(doc(db, 'abates', a.id)) }} className="p-2 text-slate-300 hover:text-red-600"><Trash2 size={18}/></button>
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
