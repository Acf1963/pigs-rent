import { Link, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Box, 
  Utensils, 
  HeartPulse, 
  Skull, 
  BadgeDollarSign 
} from 'lucide-react';

const menuItems = [
  { path: '/', label: 'Dashboard', icon: LayoutDashboard },
  { path: '/lotes', label: 'Lotes', icon: Box },
  { path: '/alimentacao', label: 'Alimentação', icon: Utensils },
  { path: '/saude', label: 'Saúde', icon: HeartPulse },
  { path: '/abates', label: 'Abates', icon: Skull },
  { path: '/vendas', label: 'Vendas', icon: BadgeDollarSign },
];

export default function Sidebar() {
  const location = useLocation();

  return (
    <aside className="w-64 h-screen bg-[#1a1d26] border-r border-slate-800 flex flex-col shrink-0 shadow-2xl">
      
      {/* ÁREA DO LOGÓTIPO - Chamando o ficheiro da pasta public */}
      <div className="p-8 border-b border-slate-800/50 flex justify-center">
        <Link to="/">
          <img 
            src="/img/lg_pgs01.png" 
            alt="Agro Rentabilidade" 
            className="h-24 w-auto object-contain"
            /* Nota: Se o nome do ficheiro for diferente de logo.png, 
               ajusta o nome acima (ex: logo_original.png) */
          />
        </Link>
      </div>

      {/* Navegação */}
      <nav className="flex-1 p-4 space-y-2 mt-4 overflow-y-auto">
        {menuItems.map((item) => {
          const isActive = location.pathname === item.path;
          return (
            <Link
              key={item.path}
              to={item.path}
              className={`
                flex items-center gap-3 px-4 py-3 rounded-2xl transition-all duration-300 group
                ${isActive 
                  ? 'bg-cyan-600 text-white shadow-lg shadow-cyan-900/30' 
                  : 'text-slate-400 hover:bg-slate-800/50 hover:text-slate-200'}
              `}
            >
              <item.icon 
                size={20} 
                className={isActive ? 'text-white' : 'text-slate-500 group-hover:text-cyan-500'} 
              />
              <span className="text-sm font-bold tracking-wide uppercase">{item.label}</span>
            </Link>
          );
        })}
      </nav>

      <div className="p-4 border-t border-slate-800/50 text-center">
        <p className="text-[9px] text-slate-600 font-black uppercase tracking-widest">
          v1.0.4 - 2026
        </p>
      </div>
    </aside>
  );
}
