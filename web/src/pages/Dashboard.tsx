import { useState, useEffect } from 'react';
import { db } from '../lib/firebase';
import { collection, onSnapshot, query } from 'firebase/firestore';
import { 
  LayoutDashboard, 
  Beef, 
  Activity,
  TrendingUp,
  Users,
  Layers,
  Scale
} from 'lucide-react';

export default function DashboardPage() {
  const [vendas, setVendas] = useState<any[]>([]);
  const [lotes, setLotes] = useState<any[]>([]);
  const [abates, setAbates] = useState<any[]>([]);
  const [saude, setSaude] = useState<any[]>([]);
  const [alimentacao, setAlimentacao] = useState<any[]>([]);

  useEffect(() => {
    const unsubs = [
      onSnapshot(query(collection(db, 'vendas')), (s) => setVendas(s.docs.map(d => d.data()))),
      onSnapshot(query(collection(db, 'lotes')), (s) => setLotes(s.docs.map(d => d.data()))),
      onSnapshot(query(collection(db, 'abates')), (s) => setAbates(s.docs.map(d => d.data()))),
      onSnapshot(query(collection(db, 'saude')), (s) => setSaude(s.docs.map(d => d.data()))),
      onSnapshot(query(collection(db, 'alimentacao')), (s) => setAlimentacao(s.docs.map(d => d.data())))
    ];
    return () => unsubs.forEach(unsub => unsub());
  }, []);

  // Função Auxiliar para Variação Percentual
  const renderVar = (atual: number, anterior: number) => {
    if (!anterior || anterior === 0) return null;
    const variacao = ((atual - anterior) / anterior) * 100;
    return (
      <p className={`text-[10px] font-bold ${variacao >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
        {variacao >= 0 ? '↑' : '↓'} {Math.abs(variacao).toFixed(1)}%
      </p>
    );
  };

  // --- 1. CONFIGURAÇÃO DO EFECTIVO ---
  const totalBovinosEfetivo = 55;
  const totalSuinosEfetivo = 335;
  const totalAnimaisSistema = totalBovinosEfetivo + totalSuinosEfetivo; 
  
  const pesoConsumoBovino = 5; 
  const unidadesConsumoTotal = (totalBovinosEfetivo * pesoConsumoBovino) + (totalSuinosEfetivo * 1);

  // --- 2. CUSTOS GLOBAIS ---
  const cAlimTotal = alimentacao.reduce((acc, a) => acc + (Number(a.quantidadeKg || 0) * Number(a.custoUnitario || 0)), 0);
  const cSaudeTotal = saude.reduce((acc, s) => acc + (Number(s.custoMedicamento || 0)), 0);
  
  const custoPorUnidadeConsumo = unidadesConsumoTotal > 0 ? cAlimTotal / unidadesConsumoTotal : 0;
  
  const rAlimBovinoUn = custoPorUnidadeConsumo * pesoConsumoBovino;
  const rAlimSuinoUn = custoPorUnidadeConsumo * 1;
  const rSaudeUn = totalAnimaisSistema > 0 ? cSaudeTotal / totalAnimaisSistema : 0;

  // --- 3. LÓGICA DE PERFORMANCE E STOCK ---
  const getEspecieStats = (tipo: 'BOVINO' | 'SUINO', sufixoLote: string, totalNoSistema: number, rAlimEspecifico: number) => {
    const lotesEspecie = lotes.filter(l => l.tipo === tipo);
    const abatesEspecie = abates.filter(a => String(a.loteId || '').toUpperCase().includes(sufixoLote));
    const vendasEspecie = vendas.filter(v => String(v.loteId || v.codigoLote || '').toUpperCase().includes(sufixoLote));

    // Lógica das Pesagens - CORRIGIDA para usar campos pesoInicialMedio e pesoFinalTransporte
    const pCompra = lotesEspecie.reduce((acc, l) => acc + Number(l.pesoInicialMedio || 0), 0) / (lotesEspecie.length || 1);
    const pTransporte = lotesEspecie.reduce((acc, l) => acc + Number(l.pesoFinalTransporte || 0), 0) / (lotesEspecie.length || 1);
    const pAbate = abatesEspecie.reduce((acc, a) => acc + Number(a.pesoAbate || 0), 0) / (abatesEspecie.length || 1);
    const pCarcaca = abatesEspecie.reduce((acc, a) => acc + Number(a.carcaca || 0), 0) / (abatesEspecie.length || 1);

    // Custos Diretos
    const cAquisEspecie = lotesEspecie.reduce((acc, l) => acc + Number(l.custoAquisicao || 0), 0);
    const cTranspEspecie = lotesEspecie.reduce((acc, l) => acc + Number(l.custoTransporte || 0), 0);
    const qtdTotalLotes = lotesEspecie.reduce((acc, l) => acc + Number(l.quantidade || 0), 0);

    const rAquisUn = qtdTotalLotes > 0 ? cAquisEspecie / qtdTotalLotes : 0;
    const rTranspUn = qtdTotalLotes > 0 ? cTranspEspecie / qtdTotalLotes : 0;

    const custoMedioUn = rAquisUn + rTranspUn + rAlimEspecifico + rSaudeUn;

    const qtdV = vendasEspecie.length;
    const abatesCount = abatesEspecie.length; 
    const carcaças = abatesCount - qtdV;

    const fatReal = vendasEspecie.reduce((acc, v) => acc + (Number(v.pesoKg || 0) * Number(v.precoKz || 0)), 0);
    const custoAlocado = qtdV * custoMedioUn;
    
    const lucro = fatReal - custoAlocado;
    const margem = fatReal > 0 ? (lucro / fatReal) * 100 : 0;
    const stockRestante = totalNoSistema - abatesCount;

    return { 
      fatReal, qtdV, custoAlocado, lucro, margem, stockRestante, 
      custoMedioUn, abates: abatesCount, carcaças, 
      pCompra, pTransporte, pAbate, pCarcaca
    };
  };

  const bov = getEspecieStats('BOVINO', '-B', totalBovinosEfetivo, rAlimBovinoUn);
  const sui = getEspecieStats('SUINO', '-S', totalSuinosEfetivo, rAlimSuinoUn);

  return (
    <div className="min-h-screen bg-[#0a0f18] text-gray-200 p-8 font-sans">
      {/* HEADER */}
      <header className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 mb-8">
        <div>
          <h1 className="text-3xl font-black text-white uppercase tracking-tighter flex items-center gap-3">
            <LayoutDashboard className="text-emerald-500" size={32} />
            MATADOURO CENTRAL
          </h1>
          <p className="text-slate-500 text-sm font-bold uppercase tracking-[0.3em]">Gestão de Custos e Processamento</p>
        </div>

        <div className="bg-[#111827] border border-white/5 p-6 rounded-3xl shadow-2xl w-full lg:w-[500px]">
          <div className="flex justify-between items-center mb-4 border-b border-white/5 pb-4">
            <div>
              <p className="text-[10px] font-black text-emerald-500 uppercase tracking-widest mb-1">Faturamento Real</p>
              <p className="text-3xl font-black text-white">{(bov.fatReal + sui.fatReal).toLocaleString()} Kz</p>
            </div>
            <div className="text-right">
              <p className="text-[10px] font-black text-cyan-500 uppercase tracking-widest mb-1">Custo Médio/Un</p>
              <p className="text-sm font-bold text-slate-400">Bov: {bov.custoMedioUn.toLocaleString(undefined, {maximumFractionDigits:0})} | Sui: {sui.custoMedioUn.toLocaleString(undefined, {maximumFractionDigits:0})}</p>
            </div>
          </div>
        </div>
      </header>

      {/* SECÇÃO DE PESAGENS */}
      <section className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-10">
        <div className="bg-[#111827]/60 p-6 rounded-2xl border border-white/5">
          <div className="flex items-center gap-2 text-emerald-500 mb-6 font-black uppercase text-xs tracking-widest">
            <Beef size={18} /> Ciclo de Pesagem Bovino (KG)
          </div>
          <div className="grid grid-cols-4 gap-2 text-center">
            <div><p className="text-[9px] text-slate-500 uppercase font-bold">Compra</p><p className="text-lg font-black text-white">{bov.pCompra.toFixed(1)}</p></div>
            <div><p className="text-[9px] text-slate-500 uppercase font-bold">Transp.</p><p className="text-lg font-black text-slate-400">{bov.pTransporte.toFixed(1)}</p>{renderVar(bov.pTransporte, bov.pCompra)}</div>
            <div><p className="text-[9px] text-emerald-500 uppercase font-bold">Abate</p><p className="text-lg font-black text-emerald-400">{bov.pAbate.toFixed(1)}</p>{renderVar(bov.pAbate, bov.pTransporte)}</div>
            <div><p className="text-[9px] text-orange-500 uppercase font-bold">Carcaça</p><p className="text-lg font-black text-orange-400">{bov.pCarcaca.toFixed(1)}</p>{renderVar(bov.pCarcaca, bov.pAbate)}</div>
          </div>
        </div>
        
        <div className="bg-[#111827]/60 p-6 rounded-2xl border border-white/5">
          <div className="flex items-center gap-2 text-pink-500 mb-6 font-black uppercase text-xs tracking-widest">
            <Activity size={18} /> Ciclo de Pesagem Suíno (KG)
          </div>
          <div className="grid grid-cols-4 gap-2 text-center">
            <div><p className="text-[9px] text-slate-500 uppercase font-bold">Compra</p><p className="text-lg font-black text-white">{sui.pCompra.toFixed(1)}</p></div>
            <div><p className="text-[9px] text-slate-500 uppercase font-bold">Transp.</p><p className="text-lg font-black text-slate-400">{sui.pTransporte.toFixed(1)}</p>{renderVar(sui.pTransporte, sui.pCompra)}</div>
            <div><p className="text-[9px] text-pink-500 uppercase font-bold">Abate</p><p className="text-lg font-black text-pink-400">{sui.pAbate.toFixed(1)}</p>{renderVar(sui.pAbate, sui.pTransporte)}</div>
            <div><p className="text-[9px] text-orange-500 uppercase font-bold">Carcaça</p><p className="text-lg font-black text-orange-400">{sui.pCarcaca.toFixed(1)}</p>{renderVar(sui.pCarcaca, sui.pAbate)}</div>
          </div>
        </div>
      </section>

      {/* STOCK */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
        <div className="bg-[#111827]/60 p-6 rounded-2xl border border-white/5 flex items-center gap-4">
          <div className="bg-slate-800/50 p-4 rounded-xl"><Users className="text-slate-400" /></div>
          <div>
            <p className="text-xs font-black text-slate-500 uppercase">Efetivo Total</p>
            <p className="text-2xl font-black text-white">{totalAnimaisSistema} CAB.</p>
          </div>
        </div>

        <div className="bg-[#111827]/60 p-6 rounded-2xl border border-white/5">
          <div className="flex justify-between items-start mb-2">
            <div className="flex items-center gap-2 text-emerald-500">
              <Beef size={18} />
              <span className="font-black text-xs uppercase tracking-widest">Bovinos</span>
            </div>
            <span className="text-[10px] font-bold text-slate-500">EM STOCK</span>
          </div>
          <div className="flex justify-between items-end">
            <p className="text-2xl font-black text-white">{bov.stockRestante} <span className="text-xs text-slate-500 uppercase">Cab.</span></p>
            <div className="text-right">
              <p className="text-[10px] font-black text-slate-500 uppercase">Média Peso</p>
              <p className="text-sm font-bold text-emerald-400">{bov.pAbate.toFixed(1)} KG</p>
            </div>
          </div>
        </div>

        <div className="bg-[#111827]/60 p-6 rounded-2xl border border-white/5">
          <div className="flex justify-between items-start mb-2">
            <div className="flex items-center gap-2 text-pink-500">
              <Activity size={18} />
              <span className="font-black text-xs uppercase tracking-widest">Suínos</span>
            </div>
            <span className="text-[10px] font-bold text-slate-500">EM STOCK</span>
          </div>
          <div className="flex justify-between items-end">
            <p className="text-2xl font-black text-white">{sui.stockRestante} <span className="text-xs text-slate-500 uppercase">Cab.</span></p>
            <div className="text-right">
              <p className="text-[10px] font-black text-slate-500 uppercase">Média Peso</p>
              <p className="text-sm font-bold text-pink-400">{sui.pAbate.toFixed(1)} KG</p>
            </div>
          </div>
        </div>
      </section>

      {/* PERFORMANCE CARDS */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
        <div className="bg-[#111827]/40 border-t-4 border-cyan-500 p-8 rounded-b-3xl shadow-xl">
          <div className="flex justify-between items-start mb-8">
            <h2 className="text-2xl font-black text-white uppercase italic flex items-center gap-3">
              <Beef className="text-cyan-400" /> Bovinos
            </h2>
            <div className="flex gap-2">
              <span className="bg-cyan-500/10 text-cyan-500 px-3 py-1 rounded-full text-[9px] font-black uppercase border border-cyan-500/20">{bov.abates} Abates</span>
              <span className="bg-orange-500/10 text-orange-500 px-3 py-1 rounded-full text-[9px] font-black uppercase border border-orange-500/20">{bov.carcaças} Carcaças</span>
            </div>
          </div>
          <div className="space-y-4">
            <div className="flex justify-between items-center text-sm border-b border-white/5 pb-2">
              <span className="text-slate-500 uppercase font-bold italic">Receita Bruta ({bov.qtdV} vendidos)</span>
              <span className="font-black text-white text-xl">{bov.fatReal.toLocaleString()} Kz</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-slate-500 uppercase font-bold italic">Custo Alocado</span>
              <span className="font-black text-red-400">-{bov.custoAlocado.toLocaleString()} Kz</span>
            </div>
            <div className="mt-8 p-6 rounded-2xl bg-emerald-500/5 border border-emerald-500/20">
              <p className="text-[10px] font-black uppercase text-slate-500 mb-1">Margem Operacional ({bov.margem.toFixed(1)}%)</p>
              <p className="text-3xl font-black text-white">{bov.lucro.toLocaleString()} Kz</p>
            </div>
          </div>
        </div>

        <div className="bg-[#111827]/40 border-t-4 border-pink-500 p-8 rounded-b-3xl shadow-xl">
          <div className="flex justify-between items-start mb-8">
            <h2 className="text-2xl font-black text-white uppercase italic flex items-center gap-3">
              <Activity className="text-pink-400" /> Suínos
            </h2>
            <div className="flex gap-2">
              <span className="bg-pink-500/10 text-pink-500 px-3 py-1 rounded-full text-[9px] font-black uppercase border border-pink-500/20">{sui.abates} Abates</span>
              <span className="bg-orange-500/10 text-orange-500 px-3 py-1 rounded-full text-[9px] font-black uppercase border border-orange-500/20">{sui.carcaças} Carcaças</span>
            </div>
          </div>
          <div className="space-y-4">
            <div className="flex justify-between items-center text-sm border-b border-white/5 pb-2">
              <span className="text-slate-500 uppercase font-bold italic">Receita Bruta ({sui.qtdV} vendidos)</span>
              <span className="font-black text-white text-xl">{sui.fatReal.toLocaleString()} Kz</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-slate-500 uppercase font-bold italic">Custo Alocado</span>
              <span className="font-black text-red-400">-{sui.custoAlocado.toLocaleString()} Kz</span>
            </div>
            <div className="mt-8 p-6 rounded-2xl bg-emerald-500/5 border border-emerald-500/20">
              <p className="text-[10px] font-black uppercase text-slate-500 mb-1">Margem Operacional ({sui.margem.toFixed(1)}%)</p>
              <p className="text-3xl font-black text-white">{sui.lucro.toLocaleString()} Kz</p>
            </div>
          </div>
        </div>
      </div>

      {/* FOOTER */}
      <footer className="mt-10 grid grid-cols-2 md:grid-cols-4 gap-6 text-[11px] font-black uppercase">
        <div className="bg-[#111827]/80 p-5 rounded-2xl border border-white/5">
          <p className="text-slate-500 mb-2 italic flex items-center gap-2"><TrendingUp size={12} /> Preço Médio Venda</p>
          <span className="text-lg text-white">Bov: {(bov.fatReal / (bov.qtdV || 1)).toLocaleString(undefined, {maximumFractionDigits:0})} Kz</span>
        </div>
        <div className="bg-[#111827]/80 p-5 rounded-2xl border border-white/5">
          <p className="text-cyan-500 mb-2 flex items-center gap-2"><Scale size={12} /> Stock Vivo Restante</p>
          <span className="text-lg text-white">{bov.stockRestante + sui.stockRestante} CAB.</span>
        </div>
        <div className="bg-[#111827]/80 p-5 rounded-2xl border border-white/5">
          <p className="text-orange-500 mb-2 flex items-center gap-2"><Layers size={12} /> Carcaças em Stock</p>
          <span className="text-lg text-white">{bov.carcaças + sui.carcaças} UNIDADES</span>
        </div>
        <div className="bg-emerald-500/10 p-5 rounded-2xl border border-emerald-500/20 text-right">
          <p className="text-emerald-500 mb-1">Lucro Líquido Real</p>
          <span className="text-2xl text-white">{(bov.lucro + sui.lucro).toLocaleString()} Kz</span>
        </div>
      </footer>
    </div>
  );
}