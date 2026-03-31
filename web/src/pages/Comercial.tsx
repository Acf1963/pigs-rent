import { useState, useEffect } from 'react';
import { db } from '../lib/firebase';
import { collection, onSnapshot } from 'firebase/firestore'; 
import { 
  DollarSign, 
  PieChart, 
  Truck,
  HeartPulse,
  Utensils,
  TrendingUp,
  TrendingDown
} from 'lucide-react';

export default function ComercialPage() {
  const [financas, setFinancas] = useState({
    receitaTotal: 0,
    custoSaude: 0,
    custoAlimentacao: 0,
    custoTransporte: 0
  });

  useEffect(() => {
    // 1. RECEITAS
    const unsubVendas = onSnapshot(collection(db, "vendas"), (snap) => {
      let receita = 0;
      snap.docs.forEach(doc => {
        const d = doc.data();
        const valorVenda = d.precoTotal || (Number(d.pesoKg || 0) * Number(d.precoKz || 0));
        receita += Number(valorVenda || 0);
      });
      setFinancas(prev => ({ ...prev, receitaTotal: receita }));
    });

    // 2. CUSTOS DE SAÚDE
    const unsubSaude = onSnapshot(collection(db, "saude"), (snap) => {
      const total = snap.docs.reduce((acc, doc) => acc + Number(doc.data().custoMedicamento || 0), 0);
      setFinancas(prev => ({ ...prev, custoSaude: total }));
    });

    // 3. CUSTOS DE ALIMENTAÇÃO
    const unsubAlimentacao = onSnapshot(collection(db, "alimentacao"), (snap) => {
      const total = snap.docs.reduce((acc, doc) => {
        const d = doc.data();
        return acc + (Number(d.quantidadeKg || 0) * Number(d.custoUnitario || 0));
      }, 0);
      setFinancas(prev => ({ ...prev, custoAlimentacao: total }));
    });

    // 4. CUSTOS DE TRANSPORTE
    const unsubLotes = onSnapshot(collection(db, "lotes"), (snap) => {
      const total = snap.docs.reduce((acc, doc) => acc + Number(doc.data().custoTransporte || 0), 0);
      setFinancas(prev => ({ ...prev, custoTransporte: total }));
    });

    return () => {
      unsubVendas(); unsubSaude(); unsubAlimentacao(); unsubLotes();
    };
  }, []);

  const custoTotalOperacional = financas.custoSaude + financas.custoAlimentacao + financas.custoTransporte;
  const lucroLiquido = financas.receitaTotal - custoTotalOperacional;
  const margemPercentual = financas.receitaTotal > 0 
    ? ((lucroLiquido / financas.receitaTotal) * 100).toFixed(1) 
    : "0";

  return (
    <div className="min-h-full w-full flex flex-col space-y-6 p-2 pb-24 md:pb-6">
      
      {/* HEADER ADAPTATIVO */}
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 shrink-0">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-cyan-500/10 text-cyan-500 rounded-2xl border border-cyan-500/20 shadow-inner">
            <DollarSign size={28} />
          </div>
          <div>
            <h1 className="text-2xl md:text-3xl font-black text-white uppercase tracking-tighter leading-none">Gestão Comercial</h1>
            <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mt-1">Consolidação Fazenda Kwanza</p>
          </div>
        </div>
      </header>

      {/* RESULTADOS PRINCIPAIS: 1 Coluna no Mobile, 3 no Desktop */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 shrink-0">
        <div className="bg-[#161922] p-5 rounded-[2rem] border border-slate-800/50 shadow-xl">
          <p className="text-[10px] font-black text-slate-500 uppercase mb-2 tracking-widest">Faturamento Total</p>
          <div className="flex items-baseline gap-2">
            <p className="text-2xl font-black text-white">{financas.receitaTotal.toLocaleString()}</p>
            <span className="text-[10px] font-bold text-slate-500">Kz</span>
          </div>
        </div>

        <div className="bg-[#161922] p-5 rounded-[2rem] border border-slate-800/50 shadow-xl">
          <p className="text-[10px] font-black text-slate-500 uppercase mb-2 tracking-widest">Despesa Operacional</p>
          <div className="flex items-baseline gap-2">
            <p className="text-2xl font-black text-white">{custoTotalOperacional.toLocaleString()}</p>
            <span className="text-[10px] font-bold text-slate-500">Kz</span>
          </div>
        </div>

        <div className={`p-5 rounded-[2rem] shadow-2xl flex flex-col justify-center transition-all border ${lucroLiquido >= 0 ? 'bg-emerald-600/10 border-emerald-500/30' : 'bg-red-600/10 border-red-500/30'}`}>
          <div className="flex justify-between items-start mb-1">
            <p className={`text-[10px] font-black uppercase tracking-widest ${lucroLiquido >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>Saldo Líquido</p>
            {lucroLiquido >= 0 ? <TrendingUp size={16} className="text-emerald-500" /> : <TrendingDown size={16} className="text-red-500" />}
          </div>
          <div className="flex items-baseline gap-2">
            <p className={`text-2xl font-black ${lucroLiquido >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>{lucroLiquido.toLocaleString()} Kz</p>
            <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${lucroLiquido >= 0 ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'}`}>
              {margemPercentual}%
            </span>
          </div>
        </div>
      </div>

      {/* MINI CARDS DE DESPESA: Grid Dinâmico */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 shrink-0">
        {[
          { label: 'Transporte', val: financas.custoTransporte, icon: Truck, color: 'text-blue-400', bg: 'bg-blue-400/5' },
          { label: 'Saúde', val: financas.custoSaude, icon: HeartPulse, color: 'text-red-400', bg: 'bg-red-400/5' },
          { label: 'Alimentação', val: financas.custoAlimentacao, icon: Utensils, color: 'text-orange-400', bg: 'bg-orange-400/5' }
        ].map((item) => (
          <div key={item.label} className={`p-4 rounded-2xl border border-slate-800/40 flex items-center gap-4 ${item.bg}`}>
            <div className={`p-2 rounded-xl bg-slate-900 border border-slate-800 ${item.color}`}>
              <item.icon size={20} />
            </div>
            <div>
              <p className="text-[9px] font-black text-slate-500 uppercase tracking-tighter">{item.label}</p>
              <p className="text-lg font-black text-white">{item.val.toLocaleString()} <span className="text-[8px] text-slate-600">Kz</span></p>
            </div>
          </div>
        ))}
      </div>

      {/* GRÁFICO DE PESO DE CUSTOS */}
      <div className="bg-[#161922] p-6 md:p-8 rounded-[2.5rem] border border-slate-800/50 flex-1 min-h-[300px] flex flex-col shadow-2xl">
        <div className="flex items-center justify-between mb-8 shrink-0">
          <div className="flex items-center gap-3">
            <PieChart size={20} className="text-cyan-500" />
            <span className="text-[11px] font-black text-white uppercase tracking-[0.2em]">Distribuição de Custos</span>
          </div>
        </div>
        
        <div className="flex-1 flex flex-col justify-center space-y-8 w-full max-w-3xl mx-auto">
          {[
            { label: 'Alimentação', val: financas.custoAlimentacao, color: 'bg-orange-500', shadow: 'shadow-orange-500/20' },
            { label: 'Saúde', val: financas.custoSaude, color: 'bg-red-500', shadow: 'shadow-red-500/20' },
            { label: 'Transporte', val: financas.custoTransporte, color: 'bg-blue-500', shadow: 'shadow-blue-500/20' }
          ].map((item) => {
            const perc = custoTotalOperacional > 0 ? (item.val / custoTotalOperacional * 100).toFixed(1) : "0";
            return (
              <div key={item.label} className="w-full group">
                <div className="flex justify-between text-[10px] font-black uppercase text-slate-500 mb-2 px-1">
                  <span className="group-hover:text-white transition-colors">{item.label}</span>
                  <span className="text-white bg-slate-800 px-2 py-0.5 rounded-md">{perc}%</span>
                </div>
                <div className="w-full bg-slate-900 h-3 rounded-full overflow-hidden border border-slate-800/50 p-[2px]">
                  <div 
                    className={`${item.color} ${item.shadow} h-full rounded-full transition-all duration-1000 ease-out shadow-lg`} 
                    style={{ width: `${perc}%` }}
                  ></div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
