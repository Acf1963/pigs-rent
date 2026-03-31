import { useState, useEffect } from 'react';
import { db } from '../lib/firebase';
import { collection, onSnapshot } from 'firebase/firestore'; 
import { 
  DollarSign, 
  PieChart, 
  Truck,
  HeartPulse,
  Utensils,
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

    // 2. CUSTOS DE SAÚDE (Campo exato do teu Firebase: custoMedicamento)
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

    // 4. CUSTOS DE TRANSPORTE (Campo exato do teu Firebase: custoTransporte)
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
    /* h-full força a div a ter a altura exata do contentor pai */
    <div className="h-full w-full flex flex-col space-y-4 overflow-hidden p-1">
      
      {/* HEADER: shrink-0 para não esmagar */}
      <header className="flex justify-between items-center shrink-0">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-cyan-500/20 text-cyan-400 rounded-xl border border-cyan-500/30">
            <DollarSign size={24} />
          </div>
          <div>
            <h1 className="text-2xl font-black text-white uppercase tracking-tighter leading-none">Gestão Comercial</h1>
            <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mt-1">Dados Consolidados</p>
          </div>
        </div>
      </header>

      {/* BLOCO DE RESULTADOS: shrink-0 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 shrink-0">
        <div className="bg-[#161922] p-4 rounded-3xl border border-slate-800/50 shadow-lg">
          <p className="text-[9px] font-black text-slate-500 uppercase mb-1">Faturamento</p>
          <p className="text-xl font-black text-white">{financas.receitaTotal.toLocaleString()} <span className="text-[10px] text-slate-500">Kz</span></p>
        </div>

        <div className="bg-[#161922] p-4 rounded-3xl border border-slate-800/50 shadow-lg">
          <p className="text-[9px] font-black text-slate-500 uppercase mb-1">Custos Totais</p>
          <p className="text-xl font-black text-white">{custoTotalOperacional.toLocaleString()} <span className="text-[10px] text-slate-500">Kz</span></p>
        </div>

        <div className={`p-4 rounded-3xl shadow-xl flex flex-col justify-center transition-all ${lucroLiquido >= 0 ? 'bg-emerald-600' : 'bg-red-600'}`}>
          <p className="text-[9px] font-black text-white/70 uppercase mb-0.5">Saldo Líquido</p>
          <div className="flex items-baseline gap-2">
            <p className="text-xl font-black text-white">{lucroLiquido.toLocaleString()} Kz</p>
            <span className="text-[10px] font-bold bg-black/20 px-2 py-0.5 rounded-full text-white">{margemPercentual}%</span>
          </div>
        </div>
      </div>

      {/* MINI CARDS DE DESPESA: shrink-0 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 shrink-0">
        {[
          { label: 'Transporte', val: financas.custoTransporte, icon: Truck, color: 'text-blue-400' },
          { label: 'Saúde', val: financas.custoSaude, icon: HeartPulse, color: 'text-red-400' },
          { label: 'Alimentação', val: financas.custoAlimentacao, icon: Utensils, color: 'text-orange-400' }
        ].map((item) => (
          <div key={item.label} className="bg-[#11141b] p-3 rounded-2xl border border-slate-800/40 flex items-center gap-3">
            <item.icon className={item.color} size={20} />
            <div>
              <p className="text-[9px] font-black text-slate-500 uppercase tracking-tight">{item.label}</p>
              <p className="text-base font-black text-white">{item.val.toLocaleString()} Kz</p>
            </div>
          </div>
        ))}
      </div>

      {/* GRÁFICO: flex-1 min-h-0 para ocupar o resto do ecrã e auto-ajustar */}
      <div className="bg-[#161922] p-6 rounded-[2.5rem] border border-slate-800/50 flex-1 min-h-0 flex flex-col">
        <div className="flex items-center gap-2 mb-4 shrink-0">
          <PieChart size={18} className="text-cyan-500" />
          <span className="text-[10px] font-black text-white uppercase tracking-widest">Peso de Custos</span>
        </div>
        
        {/* Este container vai esticar ou encolher as barras para caberem na janela */}
        <div className="flex-1 flex flex-col justify-around w-full max-w-2xl mx-auto py-2">
          {[
            { label: 'Alimentação', val: financas.custoAlimentacao, color: 'bg-orange-500' },
            { label: 'Saúde', val: financas.custoSaude, color: 'bg-red-500' },
            { label: 'Transporte', val: financas.custoTransporte, color: 'bg-blue-500' }
          ].map((item) => {
            const perc = custoTotalOperacional > 0 ? (item.val / custoTotalOperacional * 100).toFixed(1) : 0;
            return (
              <div key={item.label} className="w-full">
                <div className="flex justify-between text-[10px] font-black uppercase text-slate-500 mb-1.5">
                  <span>{item.label}</span>
                  <span className="text-white">{perc}%</span>
                </div>
                <div className="w-full bg-slate-900 h-2.5 rounded-full overflow-hidden border border-slate-800">
                  <div className={`${item.color} h-full transition-all duration-700`} style={{ width: `${perc}%` }}></div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}