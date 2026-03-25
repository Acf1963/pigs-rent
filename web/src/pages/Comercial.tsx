import { useState, useEffect } from 'react';
import { db } from '../lib/firebase';
import { collection, onSnapshot } from 'firebase/firestore'; 
import { 
  DollarSign, 
  TrendingUp, 
  TrendingDown, // Mantido para os custos
  PieChart, 
  FileCheck,
  Info
} from 'lucide-react'; // 'ArrowDownCircle' e 'query' removidos para limpar os avisos

export default function ComercialPage() {
  const [financas, setFinancas] = useState({
    receita: 0,
    custoSaude: 0,
    custoAlimento: 0,
    totalAbates: 0
  });

  useEffect(() => {
    // 1. Ouvir Proveitos (Baseado nos Abates)
    const unsubAbates = onSnapshot(collection(db, "abates"), (snap) => {
      const total = snap.docs.reduce((acc, doc) => {
        const data = doc.data();
        // Valor de referência para o mercado de Angola
        return acc + (Number(data.pesoCarcaca) * 2800);
      }, 0);
      setFinancas(prev => ({ ...prev, receita: total, totalAbates: snap.size }));
    });

    // 2. Ouvir Custos de Saúde
    const unsubSaude = onSnapshot(collection(db, "saude"), (snap) => {
      const total = snap.docs.reduce((acc, doc) => acc + (Number(doc.data().custoTotal) || 0), 0);
      setFinancas(prev => ({ ...prev, custoSaude: total }));
    });

    // 3. Ouvir Custos de Alimentação (Manejo)
    const unsubAlimentacao = onSnapshot(collection(db, "alimentacao"), (snap) => {
      const total = snap.docs.reduce((acc, doc) => acc + (Number(doc.data().custoTotal) || 0), 0);
      setFinancas(prev => ({ ...prev, custoAlimento: total }));
    });

    return () => {
      unsubAbates();
      unsubSaude();
      unsubAlimentacao();
    };
  }, []);

  const custoTotal = financas.custoSaude + financas.custoAlimento;
  const margemBruta = financas.receita - custoTotal;

  return (
    <div className="p-6 space-y-8 font-sans text-slate-900">
      {/* Header com Identidade Visual Visangol */}
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="flex items-center gap-4">
          <div className="p-4 bg-emerald-600 text-white rounded-2xl shadow-lg shadow-emerald-100">
            <DollarSign size={32} />
          </div>
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-slate-800">Fecho Comercial</h1>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Balanço Financeiro por Lote</p>
          </div>
        </div>
        <div className="bg-white px-4 py-2 rounded-xl border border-slate-200 flex items-center gap-2 shadow-sm">
          <Info size={16} className="text-cyan-500" />
          <span className="text-[10px] font-bold text-slate-500 uppercase">Referência: 2.800 Kz/kg</span>
        </div>
      </header>

      {/* Cards de Desempenho */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Proveitos Estimados</p>
          <p className="text-3xl font-black text-slate-800">{financas.receita.toLocaleString()} Kz</p>
          <div className="mt-4 flex items-center gap-2 text-emerald-600 text-xs font-bold bg-emerald-50 w-fit px-3 py-1 rounded-lg">
            <TrendingUp size={14} /> {financas.totalAbates} registros de abate
          </div>
        </div>

        <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Total de Custos</p>
          <p className="text-3xl font-black text-slate-800">{custoTotal.toLocaleString()} Kz</p>
          <div className="mt-4 flex items-center gap-2 text-red-500 text-xs font-bold bg-red-50 w-fit px-3 py-1 rounded-lg">
            <TrendingDown size={14} /> Manejo + Sanidade
          </div>
        </div>

        <div className="bg-slate-900 p-8 rounded-[2.5rem] shadow-xl text-white transform hover:scale-[1.02] transition-all">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 text-opacity-80">Resultado Líquido</p>
          <p className={`text-3xl font-black ${margemBruta >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
            {margemBruta.toLocaleString()} Kz
          </p>
          <div className="mt-4 flex items-center gap-2 text-slate-300 text-xs font-bold">
            <FileCheck size={16} className="text-emerald-400" /> Margem de Operação
          </div>
        </div>
      </div>

      {/* Gráfico / Placeholder para Análise Profunda */}
      <div className="bg-white p-10 rounded-[3rem] border border-slate-100 flex flex-col items-center justify-center text-center min-h-[400px]">
        <div className="bg-slate-50 p-8 rounded-full mb-6 border border-slate-100">
          <PieChart size={64} className="text-slate-200" />
        </div>
        <h3 className="text-xl font-bold text-slate-800">Distribuição de Lucratividade</h3>
        <p className="text-sm text-slate-400 mt-2 max-w-sm leading-relaxed italic">
          A cruzar dados de alimentação e saúde com o rendimento de carcaça para gerar o ROI por lote.
        </p>
      </div>
    </div>
  );
}
