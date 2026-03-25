import { BrowserRouter as Router, Routes, Route, Link, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard, 
  ClipboardList, 
  TrendingUp, 
  PiggyBank, 
  Syringe 
} from 'lucide-react';

// Páginas do Ecossistema Pigs Rent
import DashboardPage from './pages/Dashboard';
import LotesPage from './pages/Lotes';
import AbatesPage from './pages/Abates';

function Sidebar() {
  const location = useLocation();

  const menuItems = [
    { path: '/', label: 'Dashboard', icon: <LayoutDashboard size={20} /> },
    { path: '/lotes', label: 'Gestão de Lotes', icon: <ClipboardList size={20} /> },
    { path: '/abates', label: 'Abates', icon: <TrendingUp size={20} /> },
    { path: '/saude', label: 'Saúde Animal', icon: <Syringe size={20} /> },
    { path: '/rendas', label: 'Rendas', icon: <PiggyBank size={20} /> },
  ];

  return (
    <aside className="w-64 bg-slate-900 text-white p-6 shadow-xl flex flex-col h-full">
      <div className="mb-10">
        <h1 className="text-2xl font-bold text-cyan-400 tracking-tight italic">Pigs Rent</h1>
        <p className="text-[10px] text-slate-400 uppercase tracking-[0.2em] mt-1 font-semibold">
          Gestão de Suinicultura
        </p>
      </div>
      
      <nav className="space-y-1 flex-1">
        {menuItems.map((item) => {
          const isActive = location.pathname === item.path;
          return (
            <Link 
              key={item.path}
              to={item.path} 
              className={`flex items-center gap-3 p-3 rounded-lg transition-all duration-200 ${
                isActive 
                  ? 'bg-cyan-600/20 text-cyan-400 border-l-4 border-cyan-400' 
                  : 'hover:bg-slate-800 text-slate-400 hover:text-slate-100'
              }`}
            >
              {item.icon}
              <span className="font-medium text-sm">{item.label}</span>
            </Link>
          );
        })}
      </nav>

      <div className="mt-auto pt-6 border-t border-slate-800 text-center">
        <p className="text-[10px] text-slate-500 uppercase tracking-widest">Pigs Rent © 2026</p>
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
      <div className="flex h-screen bg-slate-50 text-slate-900 overflow-hidden font-sans font-inter">
        <Sidebar />
        <main className="flex-1 flex flex-col h-full overflow-hidden">
          <header className="bg-white border-b border-slate-200 h-16 flex justify-between items-center px-8 shrink-0 shadow-sm">
            <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-widest">
              Painel de Controlo Local
            </h2>
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-green-500 animate-pulse"></span>
              <span className="text-xs font-medium text-slate-500">Firebase Conectado</span>
            </div>
          </header>

          <div className="flex-1 overflow-y-auto p-8">
            <Routes>
              <Route path="/" element={<DashboardPage />} />
              <Route path="/lotes" element={<LotesPage />} />
              <Route path="/abates" element={<AbatesPage />} />
              <Route path="*" element={
                <div className="p-10 text-center text-slate-400 border-2 border-dashed border-slate-200 rounded-xl">
                  Módulo em desenvolvimento para o Pigs Rent
                </div>
              } />
            </Routes>
          </div>
        </main>
      </div>
    </Router>
  );
}
