import { useState, useEffect } from 'react';
import { 
  ClipboardCheck, 
  History, 
  TrendingUp, 
  Scale, 
  Calendar,
  Search
} from 'lucide-react';
import { AbateForm } from '../forms/AbateForm';
import { dataService } from '../lib/dataService';
import { Abate } from '../types/comercial';

export default function AbatesPage() {
  const [activeTab, setActiveTab] = useState<'registo' | 'historico'>('registo');
  const [abates, setAbates] = useState<Abate[]>([]);
  const [loading, setLoading] = useState(false);

  // Carregar histórico quando a aba mudar
  useEffect(() => {
    if (activeTab === 'historico') {
      carregarHistorico();
    }
  }, [activeTab]);

  const carregarHistorico = async () => {
    setLoading(true);
    try {
      // Nota: Assume que criaste o método getAll no dataService
      const docs = await dataService.getAll('abates');
      setAbates(docs as Abate[]);
    } catch (error) {
      console.error("Erro ao carregar abates:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 p-6 md:p-10">
      <header className="max-w-6xl mx-auto mb-10">
        <div className="flex items-center gap-4 mb-2">
          <div className="bg-emerald-600 text-white p-2 rounded-xl shadow-lg shadow-emerald-200">
            <TrendingUp size={24} />
          </div>
          <h1 className="text-3xl font-bold text-slate-800 tracking-tight">Controlo de Abates</h1>
        </div>
        <p className="text-slate-500">Monitorização de produtividade e rendimento de carcaça - Fazenda Quanza.</p>
      </header>

      <main className="max-w-6xl mx-auto">
        {/* Navegação entre Abas */}
        <div className="flex bg-slate-200/50 p-1.5 rounded-2xl w-fit mb-8 border border-slate-200">
          <button
            onClick={() => setActiveTab('registo')}
            className={`flex items-center gap-2 px-6 py-3 rounded-xl font-bold transition-all ${
              activeTab === 'registo' 
              ? 'bg-white text-emerald-600 shadow-sm' 
              : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            <ClipboardCheck size={18} /> Novo Abate
          </button>
          <button
            onClick={() => setActiveTab('historico')}
            className={`flex items-center gap-2 px-6 py-3 rounded-xl font-bold transition-all ${
              activeTab === 'historico' 
              ? 'bg-white text-emerald-600 shadow-sm' 
              : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            <History size={18} /> Histórico
          </button>
        </div>

        <section className="min-h-[500px]">
          {activeTab === 'registo' ? (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Formulário à Esquerda */}
              <div className="lg:col-span-2">
                <AbateForm />
              </div>

              {/* Card de Informação à Direita */}
              <div className="bg-emerald-900 text-emerald-50 p-8 rounded-3xl shadow-xl flex flex-col justify-between relative overflow-hidden">
                <div className="relative z-10">
                  <h4 className="font-bold text-lg mb-4">Dica de Rendimento</h4>
                  <p className="text-emerald-200 text-sm leading-relaxed">
                    O rendimento médio esperado para suínos na região é de 70-75%. 
                    Valores abaixo disto podem indicar problemas na nutrição final do lote.
                  </p>
                </div>
                <div className="mt-8 pt-8 border-t border-emerald-800 relative z-10">
                  <div className="flex items-center gap-3 mb-4 text-emerald-400">
                    <Scale size={20} />
                    <span className="text-xs font-bold uppercase tracking-widest">Métrica Crítica</span>
                  </div>
                  <p className="text-2xl font-bold">Peso Carcaça</p>
                  <p className="text-emerald-400 text-sm">vs. Peso Vivo</p>
                </div>
                {/* Decorativo */}
                <TrendingUp size={150} className="absolute -bottom-10 -right-10 text-emerald-800 opacity-50" />
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-3xl shadow-xl border border-slate-100 overflow-hidden">
              <div className="p-6 border-b border-slate-50 flex items-center justify-between bg-slate-50/50">
                <h3 className="font-bold text-slate-700 flex items-center gap-2">
                  <Search size={18} className="text-slate-400" /> Últimos Abates Registados
                </h3>
              </div>
              
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 text-slate-400 text-[10px] font-bold uppercase tracking-widest">
                      <th className="px-6 py-4">Data</th>
                      <th className="px-6 py-4">ID Lote</th>
                      <th className="px-6 py-4">Qtd</th>
                      <th className="px-6 py-4 text-right">Peso Total (Kg)</th>
                      <th className="px-6 py-4 text-right">Média/Animal</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {abates.length > 0 ? abates.map((a, index) => (
                      <tr key={index} className="hover:bg-slate-50/80 transition-colors">
                        <td className="px-6 py-4 text-sm text-slate-600 flex items-center gap-2">
                          <Calendar size={14} className="text-slate-300" /> {a.data_abate}
                        </td>
                        <td className="px-6 py-4 font-bold text-slate-700 text-sm">{a.lote_id}</td>
                        <td className="px-6 py-4 text-sm text-slate-600">{a.quantidade}</td>
                        <td className="px-6 py-4 text-right font-mono text-emerald-600 font-bold">
                          {a.peso_carcaca_total?.toLocaleString()} kg
                        </td>
                        <td className="px-6 py-4 text-right text-sm text-slate-500">
                          {a.quantidade ? (a.peso_carcaca_total / a.quantidade).toFixed(2) : 0} kg
                        </td>
                      </tr>
                    )) : (
                      <tr>
                        <td colSpan={5} className="px-6 py-20 text-center text-slate-400 italic">
                          {loading ? "A carregar histórico de Luanda..." : "Nenhum abate encontrado."}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
