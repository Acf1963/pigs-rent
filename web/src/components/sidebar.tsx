import { Link, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard, 
  ClipboardList, 
  Package, 
  ShoppingCart, 
  Settings, 
  LogOut,
  ChevronRight
} from 'lucide-react';

export default function Sidebar() {
  const location = useLocation();

  const menuItems = [
    { path: '/', icon: LayoutDashboard, label: 'Dashboard' },
    { path: '/lotes', icon: Package, label: 'Gestão de Lotes' },
    { path: '/maneio', icon: ClipboardList, label: 'Maneio Sanitário' },
    { path: '/vendas', icon: ShoppingCart, label: 'Vendas e Saídas' },
    { path: '/configuracoes', icon: Settings, label: 'Configurações' },
  ];

  return (
    <aside className="w-64 bg-[#1a1d26] border-r border-slate-800 flex flex-col h-screen shrink-0">
      
      <div className="p-8 flex flex-col items-center">
        <div className="mb-4">
          <img 
            src="/img/lg_pgs01.png" 
            alt="Matadouro Gest Pro" 
            className="w-32 h-auto object-contain"
          />
        </div>
        
        <div className="text-center">
          <h2 className="text-white font-black text-xs uppercase tracking-[0.2em]">
            Matadouro Gest Pro
          </h2>
          <p className="text-red-600 text-[9px] font-bold uppercase italic mt-1">
            Gestão de Alta Performance
          </p>
        </div>
      </div>

      <nav className="flex-1 px-4 mt-2 space-y-2">
        {menuItems.map((item) => {
          const isActive = location.pathname === item.path;
          return (
            <Link
              key={item.path}
              to={item.path}
              className={`flex items-center justify-between p-3 rounded-2xl transition-all group ${
                isActive 
                ? 'bg-red-700/10 border border-red-700/20 text-red-500 shadow-lg shadow-red-900/5' 
                : 'text-slate-400 hover:bg-slate-800/50 hover:text-slate-200'
              }`}
            >
              <div className="flex items-center gap-3">
                <item.icon size={20} className={isActive ? 'text-red-500' : 'group-hover:text-slate-200'} />
                <span className="text-xs font-black uppercase tracking-wider">{item.label}</span>
              </div>
              {isActive && <ChevronRight size={14} className="animate-pulse" />}
            </Link>
          );
        })}
      </nav>

      <div className="p-4 border-t border-slate-800">
        <button className="flex items-center gap-3 w-full p-3 rounded-2xl text-slate-500 hover:text-red-400 hover:bg-red-500/5 transition-all group">
          <LogOut size={20} />
          <span className="text-xs font-black uppercase tracking-wider">Sair do Sistema</span>
        </button>
      </div>
    </aside>
  );
}
