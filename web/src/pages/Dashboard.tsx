import { useState, useEffect } from 'react';
import { 
  TrendingUp,  
  Package, 
  AlertTriangle, 
  DollarSign, 
  BarChart3,
  ArrowUpRight,
  ArrowDownRight,
  FileText
} from 'lucide-react';
import { dataService } from '../lib/dataService';
import { Lote } from '../types/lote';
import { Abate } from '../types/comercial';

// Interface para garantir a tipagem correta dos dados de saúde
interface RegistroSaude {
  id: string;
  diasCarencia: number;
  custoTotal?: number;
}

export default function DashboardPage() {
  const [stats, setStats] = useState({
    totalLotes: 0,
    investimentoTotal: 0,
    mediaPesoCarcaca: 0,
    lotesEmCarencia: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchDashboardData() {
      try {
        // Busca simultânea de todas as coleções do Firebase via dataService
        const [lotes, abates, saude, alimentacao] = await Promise.all([
          dataService.getAll('lotes'),
          dataService.getAll('abates'),
          dataService.getAll('saude'),
          dataService.getAll('alimentacao')
        ]);

        const lotesData = lotes as Lote[];
        const abatesData = abates as Abate[];
        
        // Correção do erro TS2352: Conversão segura via 'unknown'
        const saudeData = saude as unknown as RegistroSaude[];
        const alimentacaoData = alimentacao as any[];

        // 1. Cálculo de Investimento Total (Kwanza)
        const custoAquisicao = lotesData.reduce((acc, curr) => 
          acc + (curr.custo_aquisicao_total_kz || 0) + (curr.custo_transporte_kz || 0), 0);
        
        const custoSaude = saudeData.reduce((acc, curr) => acc + (curr.custoTotal || 0), 0);
        const custoAlimentacao = alimentacaoData.reduce((acc, curr) => acc + (curr.custoTotal || 0), 0);
        
        // 2. Média de Peso de Carcaça (kg)
        const pesoTotalCarcaca = abatesData.reduce((acc, curr) => acc + (curr.peso_carcaca_total || 0), 0);
        
        // 3. Alertas Sanitários Reais (Lotes com carência ativa)
        const emCarencia = saudeData.filter(s => s.diasCarencia > 0).length;

        setStats({
          totalLotes: lotesData.length,
          investimentoTotal: custoAquisicao + custoSaude + custoAlimentacao,
          mediaPesoCarcaca: abatesData.length > 0 ? pesoTotalCarcaca / abatesData.length : 0,
          lotesEmCarencia: emCarencia
        });
      } catch (error) {
        console.error("Erro ao carregar dados do dashboard:", error);
      } finally {
        setLoading(false);
      }
    }

    fetchDashboardData();
  }, []);

  const cards = [
    { 
      title: 'Investimento Operacional', 
      value: `${stats.investimentoTotal.toLocaleString()} Kz`, 
      icon: <DollarSign className="text-emerald-600" />, 
      trend: '+12%', 
      positive: true,
      desc: 'Lotes + Saúde + Nutrição'
    },
    { 
      title: 'Lotes Ativos', 
      value: stats.totalLotes, 
      icon: <Package className="text-cyan-600" />, 
      trend: 'Estável', 
      positive: true,
      desc: 'Em engorda na fazenda'
    },
    { 
      title: 'Média Carcaça', 
      value: `${stats.mediaPesoCarcaca.toFixed(1)} kg`, 
      icon: <BarChart3 className="text-orange-600" />, 
      trend: 'Apurado', 
      positive: true,
      desc: 'Ref. últimos abates'
    },
    { 
      title: 'Alertas Sanitários', 
      value: stats.lotesEmCarencia, 
      icon: <AlertTriangle className="text-red-600" />, 
      trend: stats.lotesEmCarencia > 0 ? 'Atenção' : 'Seguro', 
      positive: stats.lotesEmCarencia === 0,
      desc: 'Em período de carência'
    },
  ];

  return (
    <div className="min-h-screen bg-slate-50 p-6 md:p-10 font-sans">
      <header className="max-w-7xl mx-auto mb-10 flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-800 tracking-tight">Painel de Controlo</h1>
          <p className="text-slate-500 mt-2 font-medium">Gestão de Rentabilidade - Fazenda Kwanza</p>
        </div>
        <div className="text-right">
          <span className="text-[10px] font-black text-emerald-600 bg-emerald-50 px-3 py-1 rounded-full uppercase tracking-[0.2em] border border-emerald-100">
            Luanda, Angola
          </span>
        </div>
      </header>

      <main className="max-w-7xl mx-auto">
        {/* Grid de Cards de Estatísticas */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
          {cards.map((card, i) => (
            <div key={i} className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 hover:shadow-lg transition-all cursor-default">
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
              <p className="text-slate-400 text-[10px] mt-2 uppercase font-black tracking-wider">{card.desc}</p>
            </div>
          ))}
        </div>

        {/* Secção de Gráficos e Resumo Operacional */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 bg-white p-8 rounded-3xl shadow-sm border border-slate-100 min-h-[400px] flex flex-col justify-center items-center text-center">
            <div className="bg-slate-50 p-6 rounded-full mb-4">
              <TrendingUp size={48} className="text-slate-200" />
            </div>
            <h4 className="text-slate-800 font-bold text-lg">Desempenho Financeiro por Lote</h4>
            <p className="text-slate-400 max-w-xs mt-2 text-sm italic">
              Integração com Recharts pendente. Pronto para cruzar Proveitos vs. Custos Totais.
            </p>
          </div>

          <div className="bg-slate-900 text-white p-8 rounded-3xl shadow-xl flex flex-col justify-between">
            <div>
              <h4 className="font-bold text-xl mb-6">Operacional</h4>
              <div className="space-y-6">
                <div className="flex justify-between items-center border-b border-slate-800 pb-4">
                  <span className="text-slate-400 text-sm font-medium">Status Sanitário</span>
                  <span className={`font-bold text-sm ${stats.lotesEmCarencia > 0 ? 'text-amber-400' : 'text-emerald-400'}`}>
                    {stats.lotesEmCarencia > 0 ? `${stats.lotesEmCarencia} em Carência` : 'Livre para Abate'}
                  </span>
                </div>
                <div className="flex justify-between items-center border-b border-slate-800 pb-4">
                  <span className="text-slate-400 text-sm font-medium">Manejo Alimentar</span>
                  <span className="font-bold text-sm text-slate-200">Em curso</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-400 text-sm font-medium">Custo Médio Unitário</span>
                  <span className="font-bold text-sm text-slate-200">Cálculo Ativo</span>
                </div>
              </div>
            </div>
            
            <button className="w-full mt-10 bg-white text-slate-900 hover:bg-slate-100 py-4 rounded-2xl font-black text-xs uppercase tracking-widest transition-all flex items-center justify-center gap-2 shadow-lg">
              <FileText size={18} /> Gerar Relatório Comercial
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}
