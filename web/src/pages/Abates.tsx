import { useState, useEffect } from 'react';
import { db } from '../lib/firebase';
import { collection, addDoc, writeBatch, doc, onSnapshot, query, updateDoc, deleteDoc } from 'firebase/firestore';
import { Beef, Save, FileSpreadsheet, Trash2, Edit3, X, Check, Search, AlertCircle, Percent } from 'lucide-react';
import * as XLSX from 'xlsx';

export default function AbatesPage() {
  const [loading, setLoading] = useState(false);
  const [abates, setAbates] = useState<any[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    loteId: '',
    dataAbate: new Date().toISOString().split('T')[0],
    quantidadeCabecas: 0,
    pesoVivoTotal: 0,
    pesoCarcacaTotal: 0,
    rendimento: 0,
    custoAbateKz: 0
  });

  // Cálculo automático do rendimento %
  useEffect(() => {
    if (formData.pesoVivoTotal > 0) {
      const rend = (formData.pesoCarcacaTotal / formData.pesoVivoTotal) * 100;
      setFormData(prev => ({ ...prev, rendimento: Number(rend.toFixed(2)) }));
    }
  }, [formData.pesoVivoTotal, formData.pesoCarcacaTotal]);

  useEffect(() => {
    const q = query(collection(db, 'abates'));
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
        const workbook = XLSX.read(evt.target?.result, { type: 'array' });
        const json = XLSX.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]]) as any[];
        const batch = writeBatch(db);

        json.forEach((row: any) => {
          const newDocRef = doc(collection(db, 'abates'));
          const pVivo = Number(row.pesoVivoTotal || 0);
          const pCarc = Number(row.pesoCarcacaTotal || 0);
          
          batch.set(newDocRef, {
            loteId: String(row.loteId || ''),
            dataAbate: row.dataAbate || new Date().toISOString().split('T')[0],
            quantidadeCabecas: Number(row.quantidadeCabecas || 0),
            pesoVivoTotal: pVivo,
            pesoCarcacaTotal: pCarc,
            rendimento: pVivo > 0 ? Number(((pCarc / pVivo) * 100).toFixed(2)) : 0,
            custoAbateKz: Number(row.custoAbateKz || 0),
            createdAt: new Date().toISOString()
          });
        });
        await batch.commit();
        alert("Dados de abate sincronizados!");
      } catch (err) {
        alert("Erro na leitura do ficheiro.");
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
      if (editingId) {
        await updateDoc(doc(db, 'abates', editingId), formData);
        setEditingId(null);
      } else {
        await addDoc(collection(db, 'abates'), { ...formData, createdAt: new Date().toISOString() });
      }
      setFormData({ loteId: '', dataAbate: new Date().toISOString().split('T')[0], quantidadeCabecas: 0, pesoVivoTotal: 0, pesoCarcacaTotal: 0, rendimento: 0, custoAbateKz: 0 });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="h-[calc(100vh-100px)] flex flex-col p-6 text-slate-900 overflow-hidden bg-slate-50">
      
      <div className="flex justify-between items-center mb-6 shrink-0">
        <h1 className="text-2xl font-black uppercase tracking-tighter flex items-center gap-2">
          <Beef className="text-red-600" size={28} /> Controlo de Abates
        </h1>
        <label className="flex items-center gap-2 bg-slate-900 text-white px-6 py-3 rounded-2xl cursor-pointer font-bold text-xs uppercase hover:bg-slate-800 transition-all shadow-lg">
          <FileSpreadsheet size={18} /> {loading ? 'Sincronizando...' : 'Importar Matadouro'}
          <input type="file" accept=".xlsx, .xls" className="hidden" onChange={handleExcelImport} disabled={loading} />
        </label>
      </div>

      <div className="bg-white rounded-[2rem] shadow-xl border border-slate-200 mb-6 shrink-0 overflow-hidden">
        <div className="bg-red-600 p-4 text-white flex justify-between items-center">
          <h2 className="text-xs font-black uppercase tracking-[0.2em] flex items-center gap-2">
            <Save size={16} /> Registo Técnico de Abate
          </h2>
          {editingId && <button onClick={() => setEditingId(null)}><X size={20}/></button>}
        </div>
        <form onSubmit={handleSubmit} className="p-6 grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-black text-slate-400 uppercase italic ml-1">Lote</label>
            <input required className="bg-slate-50 border border-slate-200 p-3 rounded-xl text-sm font-bold" value={formData.loteId} onChange={e => setFormData({...formData, loteId: e.target.value})} />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-black text-slate-400 uppercase italic ml-1">Data</label>
            <input type="date" className="bg-slate-50 border border-slate-200 p-3 rounded-xl text-sm font-bold" value={formData.dataAbate} onChange={e => setFormData({...formData, dataAbate: e.target.value})} />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-black text-slate-400 uppercase italic ml-1">Cabeças</label>
            <input type="number" className="bg-slate-50 border border-slate-200 p-3 rounded-xl text-sm font-bold" value={formData.quantidadeCabecas} onChange={e => setFormData({...formData, quantidadeCabecas: Number(e.target.value)})} />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-black text-slate-400 uppercase italic ml-1">P. Vivo (Kg)</label>
            <input type="number" className="bg-slate-50 border border-slate-200 p-3 rounded-xl text-sm font-bold" value={formData.pesoVivoTotal} onChange={e => setFormData({...formData, pesoVivoTotal: Number(e.target.value)})} />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-black text-slate-400 uppercase italic ml-1">P. Carcaça (Kg)</label>
            <input type="number" className="bg-slate-50 border border-slate-200 p-3 rounded-xl text-sm font-bold text-red-600" value={formData.pesoCarcacaTotal} onChange={e => setFormData({...formData, pesoCarcacaTotal: Number(e.target.value)})} />
          </div>
          <div className="flex flex-col gap-1 text-center bg-orange-50 rounded-xl border border-orange-100 p-2">
            <label className="text-[9px] font-black text-orange-400 uppercase">Rendimento</label>
            <p className="text-lg font-black text-orange-600">{formData.rendimento}%</p>
          </div>
          <button type="submit" className="bg-red-600 text-white font-black rounded-xl uppercase text-xs tracking-widest hover:bg-red-700 transition-all flex items-center justify-center gap-2 h-[52px] mt-auto">
            <Check size={18} /> {editingId ? 'OK' : 'GRAVAR'}
          </button>
        </form>
      </div>

      <div className="bg-white rounded-[2rem] shadow-xl border border-slate-200 flex-1 flex flex-col overflow-hidden">
        <div className="p-4 bg-slate-50 border-b border-slate-200 flex justify-between items-center shrink-0">
          <h3 className="font-bold uppercase text-xs text-slate-500 flex items-center gap-2"><Search size={16} /> Performance de Abate</h3>
          <div className="flex gap-4">
             <div className="text-right">
                <p className="text-[9px] font-black text-slate-400 uppercase">Média Rendimento</p>
                <p className="text-md font-black text-red-600">
                  {(abates.reduce((acc, curr) => acc + curr.rendimento, 0) / (abates.length || 1)).toFixed(1)}%
                </p>
             </div>
          </div>
        </div>
        
        <div className="flex-1 overflow-auto px-4">
          <table className="w-full text-left border-separate border-spacing-y-2 min-w-[1000px]">
            <thead>
              <tr className="text-[10px] font-black uppercase text-slate-400 italic">
                <th className="p-4">Lote</th>
                <th className="p-4">Data Abate</th>
                <th className="p-4 text-center">Cabeças</th>
                <th className="p-4 text-center">Peso Vivo</th>
                <th className="p-4 text-center">Peso Limpo</th>
                <th className="p-4 text-center">Rendimento</th>
                <th className="p-4 text-right">Custo Matadouro</th>
                <th className="p-4 text-center">Ações</th>
              </tr>
            </thead>
            <tbody>
              {abates.map((a) => (
                <tr key={a.id} className="bg-white border border-slate-50 shadow-sm hover:shadow-md transition-all rounded-xl">
                  <td className="p-4 font-black text-red-600">{a.loteId}</td>
                  <td className="p-4 text-sm font-medium text-slate-600">{a.dataAbate}</td>
                  <td className="p-4 text-center font-bold">{a.quantidadeCabecas}</td>
                  <td className="p-4 text-center text-slate-500">{a.pesoVivoTotal} Kg</td>
                  <td className="p-4 text-center font-black text-slate-800">{a.pesoCarcacaTotal} Kg</td>
                  <td className="p-4 text-center">
                    <span className="flex items-center justify-center gap-1 bg-orange-50 text-orange-700 px-3 py-1 rounded-full text-xs font-black border border-orange-100">
                      <Percent size={12} /> {a.rendimento}
                    </span>
                  </td>
                  <td className="p-4 text-right font-medium">{Number(a.custoAbateKz).toLocaleString()} Kz</td>
                  <td className="p-4">
                    <div className="flex justify-center gap-2">
                      <button onClick={() => { setEditingId(a.id); setFormData({...a}); }} className="p-2 text-slate-300 hover:text-red-600"><Edit3 size={18}/></button>
                      <button onClick={async () => { if(confirm("Apagar registo?")) await deleteDoc(doc(db, 'abates', a.id)) }} className="p-2 text-slate-300 hover:text-red-800"><Trash2 size={18}/></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {abates.length === 0 && (
            <div className="flex flex-col items-center justify-center p-20 opacity-20">
              <AlertCircle size={48} />
              <p className="font-black uppercase tracking-widest text-xs mt-2">Sem dados de matadouro</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
