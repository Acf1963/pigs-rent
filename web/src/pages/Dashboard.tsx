import { useState, useEffect } from 'react';
import { db } from '../lib/firebase';
import { collection, onSnapshot, query } from 'firebase/firestore';
import { 
  LayoutDashboard, HeartPulse, Beef, 
  Utensils, Truck, Activity,
  ClipboardList
} from 'lucide-react';

export default function DashboardPage() {
  const [vendas, setVendas] = useState<any[]>([]);
  const [lotes, setLotes] = useState<any[]>([]);
  const [saude, setSaude] = useState<any[]>([]);
  const [alimentacao, setAlimentacao] = useState<any[]>([]);
  const [abates, setAbates] = useState<any[]>([]);

  useEffect(() => {
    const unsubs = [
      onSnapshot(query(collection(db, 'vendas')), (s) => setVendas(s.docs.map(d => d.data()))),
      onSnapshot(query(collection(db, 'lotes')), (s) => setLotes(s.docs.map(d => d.data()))),
      onSnapshot(query(collection(db, 'saude')), (s) => setSaude(s.docs.map(d => d.data()))),
      onSnapshot(query(collection(db, 'alimentacao')), (s) => setAlimentacao(s.docs.map(d => d.data()))),
      onSnapshot(query(collection(db, 'abates')), (s) => setAbates(s.docs.map(d => d.data())))
    ];
    return () => unsubs.forEach(unsub => unsub());
  }, []);

  // --- 1. INVENTÁRIO POR ESPÉCIE ---
  const cabecasB = lotes.filter(l => String(l.codigoLote || '').toUpperCase().includes('-B'))
                        .reduce((acc, l) => acc + Number(l.quantidade || 0), 0);
  const cabecasS = lotes.filter(l => String(l.codigoLote || '').toUpperCase().includes('-S'))
                        .reduce((acc, l) => acc + Number(l.quantidade || 0), 0);
  const totalCabecas = cabecasB + cabecasS;

  // --- 2. CUSTOS TOTAIS ---
  const totalAlim = alimentacao.reduce((acc, a) => {
    const qtd = Number(a.quantidadeKg || 0);
    const preco = Number(a.custoUnitario || 0); 
    return acc + (qtd * preco);
  }, 0);

  const totalSaude = saude.reduce((acc, s) => acc + Number(s.custoMedicamento || 0), 0);
  const totalTransp = lotes.reduce((acc, l) => acc + Number(l.custoTransporte || 0), 0);
  
  const rácioUnitario = totalCabecas > 0 ? (totalAlim + totalSaude + totalTransp) / totalCabecas : 0;

  // --- 3. PERFORMANCE BOVINA (-B) ---
  const vendasB = vendas.filter(v => String(v.loteId || v.codigoLote || '').toUpperCase().includes('-B'));
  const faturamentoB = vendasB.reduce((acc, v) => acc + (Number(v.pesoKg || 0) * Number(v.precoKz || 0)), 0);
  const custoAlocadoB = vendasB.length * rácioUnitario;
  const margemB = faturamentoB - custoAlocadoB;
  const margemPercentB = faturamentoB > 0 ? (margemB / faturamentoB) * 100 : 0;

  const abatesB = abates.filter(a => String(a.loteId || '').toUpperCase().includes('-B'));
  const mediaAbateB = abatesB.length > 0 ? (abatesB.reduce((acc, a) => acc + Number(a.pesoAbate || 0), 0) / abatesB.length).toFixed(1) : "0";

  // --- 4. PERFORMANCE SUÍNA (-S) ---
  const vendasS = vendas.filter(v => String(v.loteId || v.codigoLote || '').toUpperCase().includes('-S'));
  const faturamentoS = vendasS.reduce((acc, v) => acc + (Number(v.pesoKg || 0) * Number(v.precoKz || 0)), 0);
  const custoAlocadoS = vendasS.length * rácioUnitario;
  const margemS = faturamentoS - custoAlocadoS;
  const margemPercentS = faturamentoS > 0 ? (margemS / faturamentoS) * 100 : 0;

  const abatesS = abates.filter(a => String(a.loteId || '').toUpperCase().includes('-S'));
  const mediaAbateS = abatesS.length > 0 ? (abatesS.reduce((acc, a) => acc + Number(a.pesoAbate || 0), 0) / abatesS.length).toFixed(1) : "0";

  return (
    <div className="min-h-screen bg-[#0a0f18] text-gray-200 p-8 font-sans overflow-y-auto">
      
      <header className="flex justify-between items-center mb-10">
        <div>
          <h1 className="text-3xl font-black text-white uppercase tracking-tighter flex items-center gap-3">
            <LayoutDashboard className="text-emerald-500" size={32} />
            MATADOURO CENTRAL
          </h1>
          <p className="text-slate-500 text-sm font-bold uppercase tracking-[0.3em]">Gestão de Margem por Espécie</p>
        </div>
        <div className="bg-[#111827] border border-emerald-500/20 p-5 rounded-2xl text-right">
          <p className="text-[10px] font-black text-emerald-500 uppercase tracking-widest mb-1">Faturamento Global</p>
          <p className="text-3xl font-black text-white">{(faturamentoB + faturamentoS).toLocaleString()} Kz</p>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 mb-10">
        
        {/* SECTOR BOVINO */}
        <div className="bg-[#111827]/40 border-t-4 border-cyan-500 p-6 rounded-b-3xl backdrop-blur-md shadow-xl">
          <div className="flex justify-between items-center mb-6">
            <div className="flex items-center gap-3">
              <Beef className="text-cyan-400" size={28} />
              <h2 className="text-xl font-black text-white uppercase italic">Bovinos</h2>
            </div>
            <span className="text-[10px] bg-cyan-500/10 text-cyan-400 px-3 py-1 rounded-full font-bold uppercase border border-cyan-500/20">Média {mediaAbateB} Kg</span>
          </div>
          
          <div className="space-y-3">
            <div className="flex justify-between text-sm"><span className="text-slate-500 uppercase font-bold">Vendas Totais</span><span className="font-black text-white">{faturamentoB.toLocaleString()} Kz</span></div>
            <div className="flex justify-between text-sm"><span className="text-slate-500 uppercase font-bold">Unidades Vendidas</span><span className="font-black text-cyan-400">{vendasB.length}</span></div>
            <div className="flex justify-between text-sm"><span className="text-slate-500 uppercase font-bold">Custo Alocado</span><span className="font-black text-amber-500">-{custoAlocadoB.toLocaleString()} Kz</span></div>
            
            {/* RESULTADO AMPLIADO */}
            <div className={`mt-6 p-5 rounded-2xl flex justify-between items-center border shadow-inner ${margemB >= 0 ? 'bg-emerald-500/10 border-emerald-500/20' : 'bg-red-500/10 border-red-500/20'}`}>
              <div className="flex flex-col gap-1">
                <span className="text-[11px] font-black uppercase text-slate-400 tracking-wider">Resultado Final</span>
                <span className={`text-2xl font-black tracking-tight ${margemB >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                  MARGEM: {margemPercentB.toFixed(1)}%
                </span>
              </div>
              <div className="text-right">
                <span className={`text-2xl font-black ${margemB >= 0 ? 'text-white' : 'text-red-400'}`}>
                  {margemB.toLocaleString()} <span className="text-xs ml-1 text-slate-500 uppercase">Kz</span>
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* SECTOR SUÍNO */}
        <div className="bg-[#111827]/40 border-t-4 border-pink-500 p-6 rounded-b-3xl backdrop-blur-md shadow-xl">
          <div className="flex justify-between items-center mb-6">
            <div className="flex items-center gap-3">
              <Activity className="text-pink-400" size={28} />
              <h2 className="text-xl font-black text-white uppercase italic">Suínos</h2>
            </div>
            <span className="text-[10px] bg-pink-500/10 text-pink-400 px-3 py-1 rounded-full font-bold uppercase border border-pink-500/20">Média {mediaAbateS} Kg</span>
          </div>
          
          <div className="space-y-3">
            <div className="flex justify-between text-sm"><span className="text-slate-500 uppercase font-bold">Vendas Totais</span><span className="font-black text-white">{faturamentoS.toLocaleString()} Kz</span></div>
            <div className="flex justify-between text-sm"><span className="text-slate-500 uppercase font-bold">Unidades Vendidas</span><span className="font-black text-pink-400">{vendasS.length}</span></div>
            <div className="flex justify-between text-sm"><span className="text-slate-500 uppercase font-bold">Custo Alocado</span><span className="font-black text-amber-500">-{custoAlocadoS.toLocaleString()} Kz</span></div>
            
            {/* RESULTADO AMPLIADO */}
            <div className={`mt-6 p-5 rounded-2xl flex justify-between items-center border shadow-inner ${margemS >= 0 ? 'bg-emerald-500/10 border-emerald-500/20' : 'bg-red-500/10 border-red-500/20'}`}>
              <div className="flex flex-col gap-1">
                <span className="text-[11px] font-black uppercase text-slate-400 tracking-wider">Resultado Final</span>
                <span className={`text-2xl font-black tracking-tight ${margemS >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                  MARGEM: {margemPercentS.toFixed(1)}%
                </span>
              </div>
              <div className="text-right">
                <span className={`text-2xl font-black ${margemS >= 0 ? 'text-white' : 'text-red-400'}`}>
                  {margemS.toLocaleString()} <span className="text-xs ml-1 text-slate-500 uppercase">Kz</span>
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
        <div className="bg-[#111827]/60 p-5 rounded-2xl border border-white/5 shadow-lg">
          <Utensils className="text-amber-500 mb-2" size={20} />
          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Alimentação Total</p>
          <p className="text-lg font-black text-white">{totalAlim.toLocaleString()} Kz</p>
        </div>
        <div className="bg-[#111827]/60 p-5 rounded-2xl border border-white/5 shadow-lg">
          <HeartPulse className="text-red-500 mb-2" size={20} />
          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Saúde Total</p>
          <p className="text-lg font-black text-white">{totalSaude.toLocaleString()} Kz</p>
        </div>
        <div className="bg-[#111827]/60 p-5 rounded-2xl border border-white/5 shadow-lg">
          <Truck className="text-blue-500 mb-2" size={20} />
          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Transporte Total</p>
          <p className="text-lg font-black text-white">{totalTransp.toLocaleString()} Kz</p>
        </div>
      </div>

      <footer className="p-6 bg-white/5 rounded-3xl border border-white/5 flex justify-between items-center opacity-80 backdrop-blur-sm">
        <div className="flex gap-12">
            <div><p className="text-[10px] font-bold uppercase text-slate-500 mb-1">Bovinos em Stock</p><p className="text-2xl font-black text-white">{cabecasB}</p></div>
            <div><p className="text-[10px] font-bold uppercase text-slate-500 mb-1">Suínos em Stock</p><p className="text-2xl font-black text-white">{cabecasS}</p></div>
            <div>
              <p className="text-[10px] font-bold text-emerald-500 uppercase mb-1 tracking-wider">Rácio Médio / Cabeça</p>
              <p className="text-2xl font-black text-emerald-500">{rácioUnitario.toLocaleString(undefined, {maximumFractionDigits:0})} Kz</p>
            </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-right hidden md:block">
            <p className="text-[10px] font-black text-slate-500 uppercase">Sistema de Gestão</p>
            <p className="text-xs font-bold text-slate-400">MATADOURO GEST PRO</p>
          </div>
          <ClipboardList className="text-slate-600" size={32} />
        </div>
      </footer>
    </div>
  );
}
