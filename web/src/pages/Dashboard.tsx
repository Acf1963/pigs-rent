import { useState, useEffect } from 'react';
import { 
  TrendingUp,  
  Package, 
  AlertTriangle, 
  DollarSign, 
  BarChart3,
  ArrowUpRight,
  ArrowDownRight
} from 'lucide-react';
import { dataService } from '../lib/dataService';
import { Lote } from '../types/lote';
import { Abate } from '../types/comercial';

export default function DashboardPage() {
  const [stats, setStats] = useState({
    totalLotes: 0,
    totalAnimais: 0,
    custoTotal: 0,
    mediaPeso: 0,
    lotesEmCarencia: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchDashboardData() {
      try {
        const [lotes, abates] = await Promise.all([
          dataService.getAll('lotes'),
          dataService.getAll('abates')
        ]);

        const lotesData = lotes as Lote[];
        const abatesData = abates as Abate[];

        // Cálculos simples para o MVP
        const custo = lotesData.reduce((acc, curr) => acc + (curr.custo_aquisicao_total_kz || 0) + (curr.custo_transporte_kz || 0), 0);
        const pesoTotal = abatesData.reduce((acc, curr) => acc + (curr.peso_carcaca_total || 0), 0);
        
        setStats({
          totalLotes: lotesData.length,
          totalAnimais: lotesData.length * 10, // Exemplo: estimativa se não houver contagem individual
          custoTotal: custo,
          mediaPeso: abatesData.length > 0 ? pesoTotal / abatesData.length : 0,
          lotesEmCarencia: 2 // Hardcoded para o exemplo visual
        });
      } catch (error) {
        console.error("Erro ao carregar dashboard:", error);
      } finally {
        setLoading(false);
      }
    }

    fetchDashboardData();
  }, []);

  const cards = [
    { 
      title: 'Investimento Total', 
      value: `${stats.custoTotal.toLocaleString()} Kz`, 
      icon: <DollarSign className="text-emerald-600" />, 
      trend: '+12%', 
      positive: true,
      desc: 'Lotes + Transporte'
    },
    { 
      title: 'Lotes Ativos', 
      value: stats.totalLotes, 
      icon: <Package className="text-cyan-600" />, 
      trend: 'Estável', 
      positive: true,
      desc: 'Em engorda'
    },
    { 
      title: 'Média Carcaça', 
      value: `${stats.mediaPeso.toFixed(1)} kg`, 
      icon: <BarChart3 className="text-orange-600" />, 
      trend: '-2.4%', 
      positive: false,
      desc: 'Últimos abates'
    },
    { 
      title: 'Alertas Sanitários', 
      value: stats.lotesEmCarencia, 
      icon: <AlertTriangle className="text-red-600" />, 
      trend: 'Crítico', 
      positive: false,
      desc: 'Em período de carência'
    },
  ];

  return (
    <div className="min-h-screen bg-slate-50 p-6 md:p-10">
      <header className="max-w-7xl mx-auto mb-10">
        <h1 className="text-3xl font-bold text-slate-800 tracking-tight">Painel de Controlo</h1>
        <p className="text-slate-500 mt-2">Visão geral da rentabilidade - Visangol / Fazenda Quanza.</p>
      </header>

      <main className="max-w-7xl mx-auto">
        {/* Grid de Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
          {cards.map((card, i) => (
            <div key={i} className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 hover:shadow-md transition-shadow">
              <div className="flex justify-between items-start mb-4">
                <div className="p-3 rounded-2xl bg-slate-50">
                  {card.icon}
                </div>
                <span className={`flex items-center text-xs font-bold px-2 py-1 rounded-lg ${
                  card.positive ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'
                }`}>
                  {card.positive ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
                  {card.trend}
                </span>
              </div>
              <h3 className="text-slate-400 text-sm font-medium">{card.title}</h3>
              <p className="text-2xl font-bold text-slate-800 mt-1">{loading ? '...' : card.value}</p>
              <p className="text-slate-400 text-[10px] mt-2 uppercase font-bold tracking-wider">{card.desc}</p>
            </div>
          ))}
        </div>

        {/* Placeholder para Gráficos Reais */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 bg-white p-8 rounded-3xl shadow-sm border border-slate-100 min-h-[400px] flex flex-col justify-center items-center text-center">
            <div className="bg-slate-50 p-6 rounded-full mb-4">
              <TrendingUp size={48} className="text-slate-200" />
            </div>
            <h4 className="text-slate-800 font-bold text-lg">Curva de Crescimento vs. Custo</h4>
            <p className="text-slate-400 max-w-xs mt-2 italic">
              Integração com Recharts pendente. Pronto para plotar os dados de Manejo e Abate.
            </p>
          </div>

          <div className="bg-emerald-900 text-white p-8 rounded-3xl shadow-xl">
            <h4 className="font-bold text-xl mb-6">Resumo de Luanda</h4>
            <div className="space-y-6">
              <div className="flex justify-between items-center border-b border-emerald-800 pb-4">
                <span className="text-emerald-300 text-sm">Próximo Abate</span>
                <span className="font-bold text-sm">12 Abr 2026</span>
              </div>
              <div className="flex justify-between items-center border-b border-emerald-800 pb-4">
                <span className="text-emerald-300 text-sm">Fornecedor Principal</span>
                <span className="font-bold text-sm">Fazenda Camabatela</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-emerald-300 text-sm">Eficiência Alimentar</span>
                <span className="font-bold text-sm text-emerald-400">88%</span>
              </div>
            </div>
            <button className="w-full mt-10 bg-emerald-500 hover:bg-emerald-400 text-white py-4 rounded-2xl font-bold transition-all flex items-center justify-center gap-2">
              Gerar Relatório PDF <ArrowUpRight size={18} />
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}
