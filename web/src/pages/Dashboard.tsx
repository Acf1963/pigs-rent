import { useState, useEffect } from 'react';
import { db } from '../lib/firebase';
import { collection, onSnapshot, query } from 'firebase/firestore';
import { 
  LayoutDashboard, HeartPulse, Beef, 
  Utensils, Truck, Activity,
  ShoppingCart, Wallet, TrendingUp,
  Target
} from 'lucide-react';

export default function DashboardPage() {
  const [vendas, setVendas] = useState<any[]>([]);
  const [lotes, setLotes] = useState<any[]>([]);
  const [saude, setSaude] = useState<any[]>([]);
  const [alimentacao, setAlimentacao] = useState<any[]>([]);

  useEffect(() => {
    const unsubs = [
      onSnapshot(query(collection(db, 'vendas')), (s) => setVendas(s.docs.map(d => d.data()))),
      onSnapshot(query(collection(db, 'lotes')), (s) => setLotes(s.docs.map(d => d.data()))),
      onSnapshot(query(collection(db, 'saude')), (s) => setSaude(s.docs.map(d => d.data()))),
      onSnapshot(query(collection(db, 'alimentacao')), (s) => setAlimentacao(s.docs.map(d => d.data())))
    ];
    return () => unsubs.forEach(unsub => unsub());
  }, []);

  // --- 1. CONFIGURAÇÃO DO EFECTIVO ---
  const totalAnimaisSistema = 390;
  const totalVendidos = 8;
  const remanescenteGlobal = totalAnimaisSistema - totalVendidos;

  // --- 2. CUSTOS TOTAIS ACUMULADOS ---
  const cAlim = alimentacao.reduce((acc, a) => acc + (Number(a.quantidadeKg || 0) * Number(a.custoUnitario || 0)), 0);
  const cTransp = lotes.reduce((acc, l) => acc + Number(l.custoTransporte || 0), 0);
  const cAquis = lotes.reduce((acc, l) => acc + Number(l.custoAquisicao || 0), 0);
  const cSaude = saude.reduce((acc, s) => acc + Number(s.custoMedicamento || 0), 0);

  // Rácio unitário global para alocação de custos
  const rUnitario = totalAnimaisSistema > 0 ? (cAlim + cTransp + cAquis) / totalAnimaisSistema : 0;

  // --- 3. LÓGICA POR ESPÉCIE ---
  const getEspecieStats = (sufixo: string, totalNoSistema: number) => {
    const vFiltered = vendas.filter(v => String(v.loteId || v.codigoLote || '').toUpperCase().includes(sufixo));
    const fatReal = vFiltered.reduce((acc, v) => acc + (Number(v.pesoKg || 0) * Number(v.precoKz || 0)), 0);
    const qtdV = vFiltered.length;
    
    const precoMedio = qtdV > 0 ? fatReal / qtdV : 0;
    const stockRestante = totalNoSistema - qtdV;
    const expectativa = stockRestante * precoMedio;

    // AQUI ESTAVA O ERRO: Adicionado custoAlocado ao retorno
    const custoAlocado = (qtdV * rUnitario) + (cSaude / 2);
    const lucro = fatReal - custoAlocado;
    const margem = fatReal > 0 ? (lucro / fatReal) * 100 : 0;

    return { fatReal, qtdV, precoMedio, expectativa, stockRestante, lucro, margem, custoAlocado };
  };

  // Divisão estimada do efectivo
  const bov = getEspecieStats('-B', 190);
  const sui = getEspecieStats('-S', 200);

  const fatTotalReal = bov.fatReal + sui.fatReal;
  const expectativaTotal = bov.expectativa + sui.expectativa;

  return (
    <div className="min-h-screen bg-[#0a0f18] text-gray-200 p-8 font-sans">
      
      <header className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 mb-10">
        <div>
          <h1 className="text-3xl font-black text-white uppercase tracking-tighter flex items-center gap-3">
            <LayoutDashboard className="text-emerald-500" size={32} />
            MATADOURO CENTRAL
          </h1>
          <p className="text-slate-500 text-sm font-bold uppercase tracking-[0.3em]">Gestão de Margem e Projeção de Stock</p>
        </div>

        {/* CARTÃO DE CUSTOS GLOBAIS E EXPECTATIVA */}
        <div className="bg-[#111827] border border-white/5 p-6 rounded-3xl shadow-2xl w-full lg:w-[600px]">
          <div className="flex justify-between items-start mb-6 border-b border-white/5 pb-4">
            <div>
              <p className="text-[10px] font-black text-emerald-500 uppercase tracking-widest flex items-center gap-2 mb-1">
                <ShoppingCart size={14} /> Faturamento Real ({totalVendidos} un)
              </p>
              <p className="text-4xl font-black text-white">{fatTotalReal.toLocaleString()} Kz</p>
            </div>
            <div className="text-right border-l border-white/10 pl-6">
              <p className="text-[10px] font-black text-cyan-500 uppercase tracking-widest flex items-center justify-end gap-2 mb-1">
                <Target size={14} /> Expectativa ({remanescenteGlobal} un)
              </p>
              <p className="text-2xl font-black text-cyan-400 italic">{expectativaTotal.toLocaleString()} Kz</p>
            </div>
          </div>

          <div className="grid grid-cols-4 gap-2">
            <div className="bg-black/20 p-2 rounded-xl border border-white/5 text-center">
              <Utensils size={12} className="text-amber-500 mx-auto mb-1" />
              <span className="text-[8px] text-slate-500 uppercase font-black block">Alimentação</span>
              <span className="text-[11px] font-bold text-white">{cAlim.toLocaleString()}</span>
            </div>
            <div className="bg-black/20 p-2 rounded-xl border border-white/5 text-center">
              <Truck size={12} className="text-blue-400 mx-auto mb-1" />
              <span className="text-[8px] text-slate-500 uppercase font-black block">Transporte</span>
              <span className="text-[11px] font-bold text-white">{cTransp.toLocaleString()}</span>
            </div>
            <div className="bg-black/20 p-2 rounded-xl border border-white/5 text-center">
              <Wallet size={12} className="text-cyan-400 mx-auto mb-1" />
              <span className="text-[8px] text-slate-500 uppercase font-black block">Aquisição</span>
              <span className="text-[11px] font-bold text-white">{cAquis.toLocaleString()}</span>
            </div>
            <div className="bg-black/20 p-2 rounded-xl border border-white/5 text-center">
              <HeartPulse size={12} className="text-red-500 mx-auto mb-1" />
              <span className="text-[8px] text-slate-500 uppercase font-black block">Saúde</span>
              <span className="text-[11px] font-bold text-white">{cSaude.toLocaleString()}</span>
            </div>
          </div>
        </div>
      </header>

      {/* SECTORES POR ESPÉCIE */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
        {/* BOVINOS */}
        <div className="bg-[#111827]/40 border-t-4 border-cyan-500 p-8 rounded-b-3xl shadow-xl relative overflow-hidden">
          <div className="flex items-center gap-3 mb-8">
            <Beef className="text-cyan-400" size={32} />
            <h2 className="text-2xl font-black text-white uppercase italic">Bovinos</h2>
          </div>
          <div className="space-y-4">
            <div className="flex justify-between items-end border-b border-white/5 pb-2">
              <div>
                <span className="text-slate-500 uppercase font-bold text-[10px] block">Receita Bruta</span>
                <span className="text-xs text-cyan-500 font-bold">{bov.qtdV} Cabeças Vendidas</span>
              </div>
              <span className="font-black text-white text-xl">{bov.fatReal.toLocaleString()} Kz</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-slate-500 uppercase font-bold italic">Custo Alocado</span>
              <span className="font-black text-red-400">-{bov.custoAlocado.toLocaleString()} Kz</span>
            </div>
            
            <div className={`mt-8 p-6 rounded-2xl flex justify-between items-center border ${bov.lucro >= 0 ? 'bg-emerald-500/5 border-emerald-500/20' : 'bg-red-500/5 border-red-500/20'}`}>
              <div>
                <p className="text-[10px] font-black uppercase text-slate-500 mb-1">Margem Operacional ({bov.margem.toFixed(1)}%)</p>
                <p className="text-2xl font-black text-white">{bov.lucro.toLocaleString()} Kz</p>
              </div>
              <div className="text-right">
                <p className="text-[10px] font-black text-cyan-500 uppercase">Previsão Stock</p>
                <p className="text-sm font-bold text-white italic">{bov.expectativa.toLocaleString()} Kz</p>
              </div>
            </div>
          </div>
        </div>

        {/* SUÍNOS */}
        <div className="bg-[#111827]/40 border-t-4 border-pink-500 p-8 rounded-b-3xl shadow-xl relative overflow-hidden">
          <div className="flex items-center gap-3 mb-8">
            <Activity className="text-pink-400" size={32} />
            <h2 className="text-2xl font-black text-white uppercase italic">Suínos</h2>
          </div>
          <div className="space-y-4">
            <div className="flex justify-between items-end border-b border-white/5 pb-2">
              <div>
                <span className="text-slate-500 uppercase font-bold text-[10px] block">Receita Bruta</span>
                <span className="text-xs text-pink-500 font-bold">{sui.qtdV} Cabeças Vendidas</span>
              </div>
              <span className="font-black text-white text-xl">{sui.fatReal.toLocaleString()} Kz</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-slate-500 uppercase font-bold italic">Custo Alocado</span>
              <span className="font-black text-red-400">-{sui.custoAlocado.toLocaleString()} Kz</span>
            </div>
            
            <div className={`mt-8 p-6 rounded-2xl flex justify-between items-center border ${sui.lucro >= 0 ? 'bg-emerald-500/5 border-emerald-500/20' : 'bg-red-500/5 border-red-500/20'}`}>
              <div>
                <p className="text-[10px] font-black uppercase text-slate-500 mb-1">Margem Operacional ({sui.margem.toFixed(1)}%)</p>
                <p className="text-2xl font-black text-white">{sui.lucro.toLocaleString()} Kz</p>
              </div>
              <div className="text-right">
                <p className="text-[10px] font-black text-pink-500 uppercase">Previsão Stock</p>
                <p className="text-sm font-bold text-white italic">{sui.expectativa.toLocaleString()} Kz</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* RODAPÉ */}
      <footer className="mt-10 grid grid-cols-2 md:grid-cols-4 gap-6">
        <div className="bg-[#111827]/80 p-5 rounded-2xl border border-white/5">
          <p className="text-[10px] font-black text-slate-500 uppercase mb-2 flex items-center gap-2">
            <TrendingUp size={12} className="text-cyan-500" /> Preço Médio Bovino
          </p>
          <p className="text-xl font-black text-white">{bov.precoMedio.toLocaleString(undefined, {maximumFractionDigits:0})} Kz</p>
        </div>
        <div className="bg-[#111827]/80 p-5 rounded-2xl border border-white/5">
          <p className="text-[10px] font-black text-slate-500 uppercase mb-2 flex items-center gap-2">
            <TrendingUp size={12} className="text-pink-500" /> Preço Médio Suíno
          </p>
          <p className="text-xl font-black text-white">{sui.precoMedio.toLocaleString(undefined, {maximumFractionDigits:0})} Kz</p>
        </div>
        <div className="bg-[#111827]/80 p-5 rounded-2xl border border-white/5">
          <p className="text-[10px] font-black text-cyan-500 uppercase mb-2 flex items-center gap-2">
            <Wallet size={12} /> Rácio Global / Cab
          </p>
          <p className="text-xl font-black text-white">{rUnitario.toLocaleString(undefined, {maximumFractionDigits:0})} Kz</p>
        </div>
        <div className="bg-emerald-500/10 p-5 rounded-2xl border border-emerald-500/20 text-right">
          <p className="text-[10px] font-black text-emerald-500 uppercase mb-2">Lucro Total Real</p>
          <p className="text-2xl font-black text-emerald-500">{(bov.lucro + sui.lucro).toLocaleString()} Kz</p>
        </div>
      </footer>
    </div>
  );
}
