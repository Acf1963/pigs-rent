import { LayoutGrid, TrendingUp, Package, Activity, AlertTriangle, ArrowUpRight } from 'lucide-react';

export default function Dashboard() {
  return (
    // Fundo Escuro Anthracite consistente com as outras páginas
    <div className="p-4 md:p-8 space-y-6 bg-[#0f1117] min-h-screen text-slate-100 font-sans">
      
      {/* Cabeçalho Adaptativo */}
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mt-12 lg:mt-0 border-b border-slate-800 pb-6">
        <div>
          <h1 className="text-3xl font-black tracking-tighter text-white uppercase flex items-center gap-3">
            <LayoutGrid className="text-cyan-500" size={32} /> Painel de Controlo
          </h1>
          <p className="text-slate-500 text-xs font-bold uppercase tracking-widest mt-1">
            Gestão de Rentabilidade — Fazenda Kwanza
          </p>
        </div>
        <div className="bg-slate-800 text-cyan-400 px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest border border-cyan-500/20 shadow-sm">
          Luanda, Angola
        </div>
      </header>

      {/* Grid de Métricas Responsivo */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard 
          title="Investimento Operacional" 
          value="0 Kz" 
          sub="Lotes + Saúde + Nutrição" 
          icon={<TrendingUp size={20}/>} 
          trend="+12%" 
        />
        <MetricCard 
          title="Lotes Ativos" 
          value="3" 
          sub="Em engorda na fazenda" 
          icon={<Package size={20}/>} 
          trend="Estável" 
        />
        <MetricCard 
          title="Média Carcaça" 
          value="0.0 kg" 
          sub="Ref. últimos abates" 
          icon={<Activity size={20}/>} 
          trend="Apurado" 
        />
        <MetricCard 
          title="Alertas Sanitários" 
          value="0" 
          sub="Em período de carência" 
          icon={<AlertTriangle size={20}/>} 
          trend="Seguro" 
          status="danger" 
        />
      </div>

      {/* Área Central de Gráficos e Status Operacional */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Card de Desempenho Financeiro */}
        <div className="lg:col-span-2 bg-[#1a1d26] rounded-3xl p-8 shadow-2xl border border-slate-800 min-h-[350px] flex flex-col items-center justify-center text-center group hover:border-cyan-800 transition-all">
          <div className="w-16 h-16 bg-slate-900 rounded-2xl flex items-center justify-center text-slate-700 group-hover:text-cyan-500 transition-colors mb-4 border border-slate-800">
            <Activity size={32} />
          </div>
          <h3 className="font-black text-white uppercase tracking-tight">Desempenho Financeiro por Lote</h3>
          <p className="text-slate-500 text-[11px] max-w-xs mt-2 font-medium">
            Integração de dados pendente. O sistema está pronto para cruzar Proveitos vs. Custos Totais.
          </p>
        </div>

        {/* Painel Operacional Lateral */}
        <div className="bg-[#1a1d26] rounded-3xl p-8 text-white shadow-2xl relative overflow-hidden border border-slate-800">
          <div className="absolute top-0 right-0 p-4 opacity-5 text-slate-700">
            <LayoutGrid size={120} />
          </div>
          
          <h3 className="text-lg font-black mb-8 flex items-center gap-2 relative z-10 text-cyan-400">
            <ArrowUpRight size={20} />
            Operacional
          </h3>
          
          <div className="space-y-6 relative z-10">
            <StatusRow label="Status Sanitário" value="Livre para Abate" color="text-emerald-400" />
            <StatusRow label="Maneio Alimentar" value="Em curso" />
            <StatusRow label="Custo Médio Unitário" value="Cálculo Ativo" />
            <div className="pt-4">
              <div className="bg-slate-900 rounded-2xl p-4 border border-slate-800">
                <p className="text-[10px] text-slate-500 uppercase font-black mb-1">Próxima Vacinação</p>
                <p className="text-sm font-bold text-cyan-400 italic font-mono">NENHUMA AGENDADA</p>
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
    <div className="bg-[#1a1d26] rounded-3xl p-6 shadow-xl border border-slate-800 relative overflow-hidden group hover:border-cyan-700 transition-all">
      <div className="flex justify-between items-start mb-6">
        <div className="p-3 bg-slate-900 text-cyan-500 rounded-2xl border border-slate-800 group-hover:bg-cyan-950/30 transition-colors">
          {icon}
        </div>
        <span className={`text-[10px] font-black px-2.5 py-1 rounded-full border ${status === 'danger' ? 'bg-red-500/10 text-red-500 border-red-500/20' : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'}`}>
          {trend}
        </span>
      </div>
      <h4 className="text-slate-500 text-[10px] font-black uppercase tracking-[0.15em] mb-1">{title}</h4>
      <div className="text-3xl font-black text-white tracking-tighter">{value}</div>
      <p className="text-slate-500 text-[9px] font-bold uppercase mt-2 tracking-wide">{sub}</p>
    </div>
  );
}

function StatusRow({ label, value, color = "text-slate-300" }: any) {
  return (
    <div className="flex justify-between items-center border-b border-slate-800/50 pb-4">
      <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">{label}</span>
      <span className={`text-xs font-black ${color}`}>{value}</span>
    </div>
  );
}
