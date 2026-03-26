import { BrowserRouter as Router, Routes, Route, Link, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Database, 
  ShieldCheck, 
  Beef, 
  ShoppingCart, 
  Settings, 
  Menu, 
  X 
} from 'lucide-react';
import { useState } from 'react';

// Importação das Páginas
import Dashboard from './pages/Dashboard';
import LotesPage from './pages/Lotes';
import SaudePage from './pages/Saude';
import AbatesPage from './pages/Abates';
import VendasPage from './pages/Vendas';

function Navigation() {
  const [isOpen, setIsOpen] = useState(false);
  const location = useLocation();

  const menuItems = [
    { path: '/', label: 'Dashboard', icon: LayoutDashboard },
    { path: '/lotes', label: 'Gestão de Lotes', icon: Database },
    { path: '/saude', label: 'Maneio Sanitário', icon: ShieldCheck },
    { path: '/abates', label: 'Abates', icon: Beef },
    { path: '/vendas', label: 'Vendas', icon: ShoppingCart },
  ];

  const isActive = (path: string) => location.pathname === path;

  return (
    <>
      {/* Botão Mobile */}
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="lg:hidden fixed top-4 right-4 z-50 p-2 bg-slate-900 text-white rounded-xl shadow-lg"
      >
        {isOpen ? <X size={24} /> : <Menu size={24} />}
      </button>

      {/* Sidebar */}
      <nav className={`
        fixed inset-y-0 left-0 z-40 w-72 bg-slate-900 text-slate-400 transform transition-transform duration-300 ease-in-out border-r border-slate-800
        ${isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}>
        <div className="p-8">
          <div className="flex items-center gap-3 mb-12">
            <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-indigo-500/20">
              <Beef size={24} />
            </div>
            <div>
              <h1 className="text-white font-black text-xl tracking-tighter leading-none">FAZENDA</h1>
              <p className="text-[10px] font-bold text-indigo-500 tracking-[0.3em] uppercase">Quanza</p>
            </div>
          </div>

          <div className="space-y-2">
            {menuItems.map((item) => (
              <Link
                key={item.path}
                to={item.path}
                onClick={() => setIsOpen(false)}
                className={`
                  flex items-center gap-3 px-4 py-3.5 rounded-2xl font-bold text-sm transition-all
                  ${isActive(item.path) 
                    ? 'bg-indigo-600 text-white shadow-xl shadow-indigo-500/20' 
                    : 'hover:bg-slate-800 hover:text-slate-200'}
                `}
              >
                <item.icon size={20} />
                {item.label}
              </Link>
            ))}
          </div>
        </div>

        <div className="absolute bottom-0 left-0 w-full p-8">
          <button className="flex items-center gap-3 px-4 py-3 w-full rounded-2xl font-bold text-sm hover:bg-slate-800 transition-all">
            <Settings size={20} />
            Configurações
          </button>
        </div>
      </nav>
    </>
  );
}

export default function App() {
  return (
    <Router>
      <div className="flex min-h-screen bg-slate-50">
        <Navigation />
        
        {/* Main Content Area */}
        <main className="flex-1 lg:ml-72 min-h-screen relative">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/lotes" element={<LotesPage />} />
            <Route path="/saude" element={<SaudePage />} />
            <Route path="/abates" element={<AbatesPage />} />
            <Route path="/vendas" element={<VendasPage />} />
          </Routes>
        </main>
      </div>
    </Router>
  );
}
