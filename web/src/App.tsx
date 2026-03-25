import { BrowserRouter as Router, Routes, Route, Link, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Gavel, 
  Syringe, 
  Pizza, 
  DollarSign,
  Layers 
} from 'lucide-react'; // 'ClipboardList' removido para limpar o erro 6133

// Páginas do Ecossistema Pigs Rent - Fazenda Quanza
import DashboardPage from './pages/Dashboard';
import LotesPage from './pages/Lotes';
import AbatesPage from './pages/Abates';
import SaudePage from './pages/Saude';
import AlimentacaoPage from './pages/Alimentacao';
import ComercialPage from './pages/Comercial';

function Sidebar() {
  const location = useLocation();

  const menuItems = [
    { path: '/', label: 'Dashboard', icon: <LayoutDashboard size={20} /> },
    { path: '/lotes', label: 'Suínos & Bovinos', icon: <Layers size={20} /> },
    { path: '/abates', label: 'Abates & Vendas', icon: <Gavel size={20} /> },
    { path: '/saude', label: 'Maneio Sanitário', icon: <Syringe size={20} /> },
    { path: '/alimentacao', label: 'Nutrição', icon: <Pizza size={20} /> },
    { path: '/comercial', label: 'Fecho de Contas', icon: <DollarSign size={20} /> },
  ];

  return (
    <aside className="w-64 bg-slate-900 text-white p-6 shadow-xl flex flex-col h-full shrink-0">
      <div className="mb-10 px-2">
        <h1 className="text-2xl font-black text-cyan-400 italic tracking-tighter">Pigs Rent</h1>
        <p className="text-[9px] text-slate-400 uppercase tracking-[0.2em] mt-1 font-bold">
          Pecuária Integrada — Fazenda Quanza
        </p>
      </div>
      
      <nav className="space-y-1 flex-1">
        {menuItems.map((item) => {
          const isActive = location.pathname === item.path;
          return (
            <Link 
              key={item.path}
              to={item.path} 
              className={`flex items-center gap-3 p-3 rounded-xl transition-all duration-200 ${
                isActive 
                  ? 'bg-cyan-600/20 text-cyan-400 border-l-4 border-cyan-400 font-bold' 
                  : 'hover:bg-slate-800 text-slate-400 hover:text-slate-100'
              }`}
            >
              <span className={isActive ? 'text-cyan-400' : 'text-slate-500'}>
                {item.icon}
              </span>
              <span className="text-sm">{item.label}</span>
            </Link>
          );
        })}
      </nav>

      <div className="mt-auto pt-6 border-t border-slate-800 text-center">
        <p className="text-[10px] text-slate-500 uppercase tracking-widest font-black">
          Pigs Rent © 2026
        </p>
      </div>
    </aside>
  );
}

export default function App() {
  return (
    <Router 
      future={{ 
        v7_startTransition: true, 
        v7_relativeSplatPath: true 
      }}
    >
      <div className="flex h-screen bg-slate-50 text-slate-900 overflow-hidden font-sans">
        <Sidebar />
        
        <main className="flex-1 flex flex-col h-full overflow-hidden">
          <header className="bg-white border-b border-slate-200 h-16 flex justify-between items-center px-8 shrink-0 shadow-sm z-10">
            <h2 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">
              Painel Operacional — Luanda, Angola
            </h2>
            <div className="flex items-center gap-3 bg-slate-50 px-3 py-1.5 rounded-full border border-slate-100">
              <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse"></span>
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-tight">
                Suínos & Bovinos
              </span>
            </div>
          </header>

          <div className="flex-1 overflow-y-auto p-8 bg-[#f8fafc]">
            <Routes>
              <Route path="/" element={<DashboardPage />} />
              <Route path="/lotes" element={<LotesPage />} />
              <Route path="/abates" element={<AbatesPage />} />
              <Route path="/saude" element={<SaudePage />} />
              <Route path="/alimentacao" element={<AlimentacaoPage />} />
              <Route path="/comercial" element={<ComercialPage />} />
              <Route path="*" element={<DashboardPage />} />
            </Routes>
          </div>
        </main>
      </div>
    </Router>
  );
}
