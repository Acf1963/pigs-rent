import { useState, useEffect } from 'react';
import { db } from '../lib/firebase';
import { collection, addDoc, writeBatch, doc, onSnapshot, query, updateDoc, deleteDoc } from 'firebase/firestore';
// Removido o AlertCircle para limpar o erro 6133
import { ShoppingCart, FileSpreadsheet, Trash2, Edit3, Search, DollarSign } from 'lucide-react';
import * as XLSX from 'xlsx';

export default function VendasPage() {
  const [loading, setLoading] = useState(false);
  const [vendas, setVendas] = useState<any[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    loteId: '',
    dataVenda: new Date().toISOString().split('T')[0],
    cliente: '',
    produto: 'CARCAÇA',
    pesoKg: 0,
    precoKz: 0,
    valorTotal: 0
  });

  // CORREÇÃO DE DATA: Converte o número do Excel (ex: 46091) para AAAA-MM-DD
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

  // PROTEÇÃO CONTRA NaN: Limpa "AOA", espaços e converte vírgulas
  const parseMoeda = (valor: any): number => {
    if (valor === null || valor === undefined) return 0;
    if (typeof valor === 'number') return valor;
    const limpo = String(valor)
      .replace(/\s/g, '')
      .replace('AOA', '')
      .replace('.', '')
      .replace(',', '.');
    const num = parseFloat(limpo);
    return isNaN(num) ? 0 : num;
  };

  useEffect(() => {
    setFormData(prev => ({ ...prev, valorTotal: (prev.pesoKg || 0) * (prev.precoKz || 0) }));
  }, [formData.pesoKg, formData.precoKz]);

  useEffect(() => {
    const q = query(collection(db, 'vendas'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setVendas(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
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
        const workbook = XLSX.read(evt.target?.result, { 
          type: 'array', 
          cellDates: true,
          cellNF: false 
        });
        
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        const json = XLSX.utils.sheet_to_json(sheet) as any[];
        const batch = writeBatch(db);

        json.forEach((row: any) => {
          const newDocRef = doc(collection(db, 'vendas'));
          const peso = parseMoeda(row.pesoKg || row.Peso);
          const preco = parseMoeda(row.precoKz || row.Preco);
          
          batch.set(newDocRef, {
            loteId: String(row.loteId || 'SEM LOTE'),
            dataVenda: formatarDataExcel(row.dataVenda || row.data),
            cliente: String(row.cliente || 'CLIENTE GERAL'),
            produto: String(row.produto || 'CARCAÇA').toUpperCase(),
            pesoKg: peso,
            precoKz: preco,
            valorTotal: peso * preco,
            createdAt: new Date().toISOString()
          });
        });
        await batch.commit();
        alert("Vendas importadas com sucesso!");
      } catch (err) {
        alert("Erro na leitura do Excel.");
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
        await updateDoc(doc(db, 'vendas', editingId), formData);
        setEditingId(null);
      } else {
        await addDoc(collection(db, 'vendas'), { ...formData, createdAt: new Date().toISOString() });
      }
      setFormData({ loteId: '', dataVenda: new Date().toISOString().split('T')[0], cliente: '', produto: 'CARCAÇA', pesoKg: 0, precoKz: 0, valorTotal: 0 });
    } finally {
      setLoading(false);
    }
  };

  const formatarKz = (valor: number = 0) => {
    return (valor || 0).toLocaleString('pt-AO', { minimumFractionDigits: 0 }) + ' Kz';
  };

  return (
    <div className="h-[calc(100vh-100px)] flex flex-col p-6 text-slate-900 overflow-hidden bg-slate-50">
      
      <div className="flex justify-between items-center mb-6 shrink-0">
        <h1 className="text-2xl font-black uppercase tracking-tighter flex items-center gap-2">
          <ShoppingCart className="text-blue-600" size={28} /> Vendas Fazenda Quanza
        </h1>
        <label className={`flex items-center gap-2 bg-blue-600 text-white px-6 py-3 rounded-2xl cursor-pointer font-bold text-xs uppercase hover:bg-blue-700 transition-all shadow-lg ${loading ? 'opacity-50' : ''}`}>
          <FileSpreadsheet size={18} /> {loading ? 'A PROCESSAR...' : 'IMPORTAR EXCEL'}
          <input type="file" accept=".xlsx, .xls" className="hidden" onChange={handleExcelImport} disabled={loading} />
        </label>
      </div>

      <div className="bg-white rounded-[2rem] shadow-xl border border-slate-200 mb-6 shrink-0 overflow-hidden">
        <form onSubmit={handleSubmit} className="p-6 grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4 bg-slate-50/30">
          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-black text-slate-400 uppercase italic ml-1">Lote</label>
            <input required className="bg-white border border-slate-200 p-3 rounded-xl text-sm font-bold uppercase" value={formData.loteId} onChange={e => setFormData({...formData, loteId: e.target.value})} />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-black text-slate-400 uppercase italic ml-1">Data</label>
            <input type="date" className="bg-white border border-slate-200 p-3 rounded-xl text-sm font-bold" value={formData.dataVenda} onChange={e => setFormData({...formData, dataVenda: e.target.value})} />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-black text-slate-400 uppercase italic ml-1">Peso (Kg)</label>
            <input type="number" step="0.01" className="bg-white border border-slate-200 p-3 rounded-xl text-sm font-bold" value={formData.pesoKg} onChange={e => setFormData({...formData, pesoKg: Number(e.target.value)})} />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-black text-slate-400 uppercase italic ml-1">Preço/Kg (Kz)</label>
            <input type="number" className="bg-white border border-slate-200 p-3 rounded-xl text-sm font-bold" value={formData.precoKz} onChange={e => setFormData({...formData, precoKz: Number(e.target.value)})} />
          </div>
          <button type="submit" disabled={loading} className="mt-auto bg-blue-600 text-white font-black h-[46px] rounded-xl uppercase text-xs tracking-widest hover:bg-blue-700 transition-all shadow-lg">
             {editingId ? 'ATUALIZAR' : 'GRAVAR'}
          </button>
        </form>
      </div>

      <div className="bg-white rounded-[2rem] shadow-xl border border-slate-200 flex-1 flex flex-col overflow-hidden">
        <div className="p-4 bg-slate-50 border-b border-slate-200 flex justify-between items-center shrink-0">
          <h3 className="font-bold uppercase text-xs text-slate-500 flex items-center gap-2"><Search size={16} /> Histórico de Vendas</h3>
          <div className="bg-blue-600 px-6 py-2 rounded-2xl flex items-center gap-4 text-white shadow-xl shadow-blue-100">
            <DollarSign size={20} />
            <div className="text-right">
              <p className="text-[9px] font-black uppercase opacity-70 leading-none">Faturamento Total</p>
              <p className="text-lg font-black leading-none">{formatarKz(vendas.reduce((acc, curr) => acc + (curr.valorTotal || 0), 0))}</p>
            </div>
          </div>
        </div>
        
        <div className="flex-1 overflow-auto px-4">
          <table className="w-full text-left border-separate border-spacing-y-2">
            <thead>
              <tr className="text-[10px] font-black uppercase text-slate-400 italic text-center">
                <th className="p-4 text-left">Lote</th>
                <th className="p-4">Data Saída</th>
                <th className="p-4">Peso</th>
                <th className="p-4 text-right">Preço/Kg</th>
                <th className="p-4 text-right">Total (Kz)</th>
                <th className="p-4">Ações</th>
              </tr>
            </thead>
            <tbody>
              {vendas.map((v) => (
                <tr key={v.id} className="bg-white border border-slate-50 shadow-sm hover:shadow-md transition-all rounded-xl text-center group">
                  <td className="p-4 font-black text-blue-600 text-left">{v.loteId}</td>
                  <td className="p-4 text-sm font-bold text-slate-600">{v.dataVenda || '-'}</td>
                  <td className="p-4 font-bold">{v.pesoKg || 0} Kg</td>
                  <td className="p-4 text-right font-medium">{formatarKz(v.precoKz)}</td>
                  <td className="p-4 text-right font-black text-blue-700 bg-blue-50/30 rounded-r-xl">
                    {formatarKz(v.valorTotal)}
                  </td>
                  <td className="p-4">
                    <div className="flex justify-center gap-2">
                      <button onClick={() => { setEditingId(v.id); setFormData({...v}); }} className="p-2 text-slate-300 hover:text-blue-600 transition-colors"><Edit3 size={18}/></button>
                      <button onClick={async () => { if(confirm("Remover venda?")) await deleteDoc(doc(db, 'vendas', v.id)) }} className="p-2 text-slate-300 hover:text-red-600 transition-colors"><Trash2 size={18}/></button>
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
