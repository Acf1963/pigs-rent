import { useState, useEffect, ChangeEvent } from 'react';
import { db } from '../lib/firebase';
import { 
  collection, 
  query, 
  onSnapshot, 
  orderBy, 
  addDoc 
} from 'firebase/firestore';
import { 
  Pizza, 
  TrendingDown, 
  FilePlus, 
  Calendar, 
  Weight,
  History
} from 'lucide-react'; // 'Calculator' removido para resolver o aviso TS6133
import * as XLSX from 'xlsx';

export default function AlimentacaoPage() {
  const [consumo, setConsumo] = useState<any[]>([]);
  const [isImporting, setIsImporting] = useState(false);

  // 1. Escutar dados do Firebase em tempo real
  useEffect(() => {
    const q = query(collection(db, "alimentacao"), orderBy("data", "desc"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setConsumo(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });
    return () => unsubscribe();
  }, []);

  // 2. Importação de Guia de Ração (Excel)
  const handleImportExcel = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsImporting(true);
    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const data = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]]);

        for (const item of data as any[]) {
          await addDoc(collection(db, "alimentacao"), {
            lote: item.lote || 'N/A',
            tipoRacao: item.tipoRacao || 'Crescimento',
            quantidadeKg: Number(item.quantidadeKg) || 0,
            custoTotal: Number(item.custoTotal) || 0,
            data: new Date().toISOString()
          });
        }
        alert("Manejo alimentar atualizado com sucesso!");
      } catch (error) {
        console.error("Erro na importação:", error);
        alert("Erro ao ler o ficheiro Excel.");
      } finally {
        setIsImporting(false);
        e.target.value = '';
      }
    };
    reader.readAsBinaryString(file);
  };

  // Cálculos dinâmicos
  const totalKg = consumo.reduce((acc, curr) => acc + (Number(curr.quantidadeKg) || 0), 0);
  const totalKz = consumo.reduce((acc, curr) => acc + (Number(curr.custoTotal) || 0), 0);

  return (
    <div className="p-6 space-y-6 font-sans">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-amber-100 text-amber-600 rounded-2xl">
            <Pizza size={28} />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-800 tracking-tight">Manejo Alimentar</h1>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Nutrição e Conversão Alimentar</p>
          </div>
        </div>

        <label className="bg-amber-600 hover:bg-amber-700 text-white px-4 py-2 rounded-xl flex items-center gap-2 text-sm font-bold cursor-pointer transition-all active:scale-95 shadow-lg shadow-amber-100">
          <FilePlus size={18} />
          {isImporting ? "A processar..." : "Importar Guia"}
          <input type="file" accept=".xlsx, .xls" onChange={handleImportExcel} className="hidden" />
        </label>
      </div>

      {/* Cards de Resumo Operacional */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
          <div className="flex items-center gap-2 mb-2 text-slate-400">
            <Weight size={16} />
            <p className="text-[10px] font-black uppercase tracking-wider">Consumo Total Acumulado</p>
          </div>
          <p className="text-2xl font-black text-slate-700">{totalKg.toLocaleString()} <span className="text-sm font-medium text-slate-400">kg</span></p>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
          <div className="flex items-center gap-2 mb-2 text-emerald-500">
            <TrendingDown size={16} />
            <p className="text-[10px] font-black uppercase tracking-wider">Investimento em Nutrição</p>
          </div>
          <p className="text-2xl font-black text-emerald-600">{totalKz.toLocaleString()} <span className="text-sm font-medium text-emerald-400 text-opacity-70">Kz</span></p>
        </div>

        <div className="hidden lg:block bg-slate-50 p-6 rounded-2xl border border-dashed border-slate-200">
          <div className="flex items-center gap-2 mb-2 text-slate-400">
            <History size={16} />
            <p className="text-[10px] font-black uppercase tracking-wider">Última Atualização</p>
          </div>
          <p className="text-sm font-bold text-slate-600">
            {consumo.length > 0 ? new Date(consumo[0].data).toLocaleDateString('pt-PT') : 'Sem registos'}
          </p>
        </div>
      </div>

      {/* Tabela de Histórico */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/50 border-b border-slate-100">
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Lote</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Tipo de Ração</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Quantidade</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Custo (Kz)</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Data</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50 text-sm">
              {consumo.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-slate-400 italic font-medium">
                    Nenhum registo de alimentação encontrado no Firebase.
                  </td>
                </tr>
              ) : (
                consumo.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50/50 transition-colors group">
                    <td className="px-6 py-4 font-bold text-slate-700">{item.lote}</td>
                    <td className="px-6 py-4 text-slate-600 font-medium">{item.tipoRacao}</td>
                    <td className="px-6 py-4 text-slate-600">{item.quantidadeKg} kg</td>
                    <td className="px-6 py-4 font-bold text-slate-700">{Number(item.custoTotal).toLocaleString()} Kz</td>
                    <td className="px-6 py-4 text-slate-400 flex items-center gap-2">
                      <Calendar size={14} />
                      {new Date(item.data).toLocaleDateString('pt-PT')}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
