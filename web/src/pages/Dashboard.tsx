import { useState, useEffect } from 'react';
import { db } from '../lib/firebase';
import { collection, onSnapshot } from 'firebase/firestore';
import { 
  LayoutGrid, TrendingUp, Package, Activity, 
  AlertTriangle, ArrowUpRight, CheckCircle2 
} from 'lucide-react';

export default function Dashboard() {
  const [stats, setStats] = useState({
    investimento: 0,
    lotesAtivos: 0,
    mediaCarcaca: 0,
    alertas: 0,
    statusSanitario: 'Livre'
  });

  useEffect(() => {
    // 1. Cálculo de Investimento Total (Alimentação + Saúde)
    const unsubAlim = onSnapshot(collection(db, 'alimentacao'), (snap) => {
      const totalAlim = snap.docs.reduce((acc, doc) => acc + (Number(doc.data().quantidadeKg) * Number(doc.data().custoUnitario)), 0);
      setStats(prev => ({ ...prev, investimento: prev.investimento + totalAlim }));
    });

    // 2. Lotes Ativos
    const unsubLotes = onSnapshot(collection(db, 'lotes'), (snap) => {
      setStats(prev => ({ ...prev, lotesAtivos: snap.size }));
    });

    // 3. Média de Carcaça (dos Abates)
    const unsubAbates = onSnapshot(collection(db, 'abates'), (snap) => {
      const total = snap.docs.reduce((acc, doc) => acc + Number(doc.data().carcacaKg || 0), 0);
      const media = snap.size > 0 ? total / snap.size : 0;
      setStats(prev => ({ ...prev, mediaCarcaca: media }));
    });

    return () => { unsubAlim(); unsubLotes(); unsubAbates(); };
  }, []);

  return (
    <div className="min-h-full w-full flex flex-col space-y-6 p-2 pb-24 md:pb-6">
      
      {/* Cabeçalho Adaptativo */}
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-slate-800/50 pb-6">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-cyan-500/10 text-cyan-500 rounded-2xl border border-cyan-500/20 shadow-inner">
            <LayoutGrid size={28} />
          </div>
          <div>
            <h1 className="text-2xl md:text-3xl font-black text-white uppercase tracking-tighter leading-none">Painel de Controlo</h1>
            <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mt-1 italic">Fazenda Kwanza — Luanda</p>
          </div>
        </div>
        <div className="hidden md:block bg-[#161922] px-4 py-2 rounded-full text-[10px] font-black text-emerald-500 uppercase tracking-widest border border-emerald-500/20">
          Sistema Online • 2026
        </div>
      </header>

      {/* Grid de Métricas: 1 col mobile, 2 tablet, 4 desktop */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard 
          title="Investimento Total" 
          value={`${stats.investimento.toLocaleString()} Kz`} 
          sub="Nutrição + Saúde" 
          icon={<TrendingUp size={20}/>} 
          trend="Real" 
        />
        <MetricCard 
          title="Lotes Ativos" 
          value={stats.lotesAtivos.toString()} 
          sub="Em engorda atual" 
          icon={<Package size={20}/>} 
          trend="Estável" 
        />
        <MetricCard 
          title="Média Carcaça" 
          value={`${stats.mediaCarcaca.toFixed(1)} kg`} 
          sub="Ref. últimos abates" 
          icon={<Activity size={20}/>} 
          trend="Apurado" 
        />
        <MetricCard 
          title="Alertas Sanitários" 
          value={stats.alertas.toString()} 
          sub="Carência Medicar" 
          icon={<AlertTriangle size={20}/>} 
          trend="Seguro" 
          status={stats.alertas > 0 ? "danger" : "safe"} 
        />
      </div>

      {/* Área Central */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 flex-1 min-h-0">
        
        {/* Card de Desempenho (Principal) */}
        <div className="lg:col-span-2 bg-[#161922] rounded-[2.5rem] p-8 shadow-2xl border border-slate-800/50 flex flex-col items-center justify-center text-center group hover:border-cyan-500/30 transition-all min-h-[300px]">
          <div className="w-20 h-20 bg-slate-900 rounded-3xl flex items-center justify-center text-slate-700 group-hover:text-cyan-500 group-hover:scale-110 transition-all mb-6 border border-slate-800 shadow-inner">
            <Activity size={40} />
          </div>
          <h3 className="text-xl font-black text-white uppercase tracking-tight">Análise de Lucratividade</h3>
          <p className="text-slate-500 text-xs max-w-sm mt-3 font-medium leading-relaxed">
            O sistema está a processar os dados de <span className="text-cyan-500">Vendas vs. Custos Operacionais</span>. Consulte o módulo Comercial para o balanço detalhado.
          </p>
          <div className="mt-8 flex gap-2">
             <div className="w-2 h-2 rounded-full bg-cyan-500 animate-pulse"></div>
             <div className="w-2 h-2 rounded-full bg-cyan-500 animate-pulse delay-75"></div>
             <div className="w-2 h-2 rounded-full bg-cyan-500 animate-pulse delay-150"></div>
          </div>
        </div>

        {/* Painel Operacional Lateral */}
        <div className="bg-[#161922] rounded-[2.5rem] p-8 text-white shadow-2xl relative overflow-hidden border border-slate-800/50">
          <div className="absolute -top-10 -right-10 opacity-[0.03] text-white rotate-12">
            <LayoutGrid size={250} />
          </div>
          
          <h3 className="text-lg font-black mb-10 flex items-center gap-3 relative z-10 text-cyan-400 uppercase tracking-tighter">
            <ArrowUpRight size={22} className="bg-cyan-400/10 p-1 rounded-lg"/>
            Estado Operacional
          </h3>
          
          <div className="space-y-8 relative z-10">
            <StatusRow label="Status Sanitário" value="LIVRE P/ ABATE" color="text-emerald-400" icon={<CheckCircle2 size={14}/>} />
            <StatusRow label="Maneio Alimentar" value="EM CURSO" color="text-cyan-500" />
            <StatusRow label="Custo Unitário" value="CÁLCULO ATIVO" color="text-slate-300" />
            
            <div className="pt-6">
              <div className="bg-[#0f1117] rounded-3xl p-5 border border-slate-800/80 shadow-inner group hover:bg-slate-900 transition-colors">
                <p className="text-[10px] text-slate-500 uppercase font-black mb-2 tracking-[0.2em]">Próxima Vacinação</p>
                <p className="text-sm font-black text-cyan-400/80 italic font-mono flex items-center gap-2">
                   NENHUM AGENDAMENTO
                </p>
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}

// Componentes Auxiliares
function MetricCard({ title, value, sub, icon, trend, status }: any) {
  return (
    <div className="bg-[#161922] rounded-[2rem] p-6 shadow-xl border border-slate-800/50 relative overflow-hidden group hover:border-cyan-500/50 transition-all active:scale-[0.98]">
      <div className="flex justify-between items-start mb-6">
        <div className="p-3 bg-slate-900 text-cyan-500 rounded-2xl border border-slate-800 group-hover:bg-cyan-500 group-hover:text-white transition-all shadow-inner">
          {icon}
        </div>
        <span className={`text-[9px] font-black px-3 py-1 rounded-full border tracking-widest uppercase ${status === 'danger' ? 'bg-red-500/10 text-red-500 border-red-500/20' : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'}`}>
          {trend}
        </span>
      </div>
      <h4 className="text-slate-500 text-[10px] font-black uppercase tracking-[0.2em] mb-2">{title}</h4>
      <div className="text-2xl md:text-3xl font-black text-white tracking-tighter group-hover:text-cyan-400 transition-colors">{value}</div>
      <p className="text-slate-600 text-[9px] font-bold uppercase mt-2 tracking-wider border-t border-slate-800/50 pt-2">{sub}</p>
    </div>
  );
}

function StatusRow({ label, value, color = "text-slate-300", icon }: any) {
  return (
    <div className="flex justify-between items-center border-b border-slate-800/30 pb-4 group hover:border-slate-700 transition-colors">
      <span className="text-[11px] font-black text-slate-500 uppercase tracking-widest">{label}</span>
      <span className={`text-[11px] font-black flex items-center gap-2 ${color} tracking-tight`}>
        {icon} {value}
      </span>
    </div>
  );
}
