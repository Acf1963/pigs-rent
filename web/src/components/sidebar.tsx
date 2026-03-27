import { Link, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard, 
  ClipboardList, 
  Package, 
  ShoppingCart, 
  Settings, 
  LogOut,
  ChevronRight,
  Utensils, // Ícone para Alimentação
  Activity   // Ícone para Abates
} from 'lucide-react';

export default function Sidebar() {
  const location = useLocation();

  // ADICIONADO: 'Alimentação' e 'Abates' no array para aparecerem no menu
  const menuItems = [
    { path: '/', icon: LayoutDashboard, label: 'Dashboard' },
    { path: '/lotes', icon: Package, label: 'Gestão de Lotes' },
    { path: '/abates', icon: Activity, label: 'Abates' },
    { path: '/maneio', icon: ClipboardList, label: 'Maneio Sanitário' },
    { path: '/alimentacao', icon: Utensils, label: 'Alimentação' }, // Nova linha
    { path: '/vendas', icon: ShoppingCart, label: 'Vendas' },
    { path: '/configuracoes', icon: Settings, label: 'Configurações' },
  ];

  return (
    <aside className="w-64 bg-[#1a1d26] border-r border-slate-800 flex flex-col h-screen shrink-0 font-sans">
      
      {/* SEÇÃO DO LOGO (Já funcional após movermos para /web/public) */}
      <div className="p-8 flex flex-col items-center gap-4">
        <div className="relative group flex justify-center items-center">
          <div className="absolute inset-0 bg-cyan-500/10 rounded-full blur-2xl group-hover:bg-cyan-500/20 transition-all duration-700"></div>
          <img 
            src="/img/lg_pgs01.png" 
            alt="Matadouro Gest Pro" 
            className="relative w-32 h-auto object-contain transition-transform duration-500 group-hover:scale-105"
          />
        </div>
        
        <div className="text-center mt-2">
          <h2 className="text-white font-black text-xs uppercase tracking-[0.25em]">
            Matadouro Gest Pro
          </h2>
          <span className="text-cyan-500 text-[9px] font-bold uppercase italic tracking-widest block mt-1">
            Gestão de Alta Performance
          </span>
        </div>
      </div>

      {/* MENU COM ALIMENTAÇÃO E ABATES */}
      <nav className="flex-1 px-4 mt-2 space-y-2 overflow-y-auto">
        {menuItems.map((item) => {
          const isActive = location.pathname === item.path;
          return (
            <Link
              key={item.path}
              to={item.path}
              className={`flex items-center justify-between p-3 rounded-2xl transition-all group ${
                isActive 
                ? 'bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 shadow-lg shadow-cyan-900/10' 
                : 'text-slate-400 hover:bg-slate-800/50 hover:text-slate-200'
              }`}
            >
              <div className="flex items-center gap-3">
                <item.icon size={20} className={isActive ? 'text-cyan-400' : 'group-hover:text-slate-200'} />
                <span className="text-xs font-black uppercase tracking-wider">{item.label}</span>
              </div>
              {isActive && <ChevronRight size={14} className="animate-pulse" />}
            </Link>
          );
        })}
      </nav>

      <div className="p-4 border-t border-slate-800">
        <button className="flex items-center gap-3 w-full p-3 rounded-2xl text-slate-500 hover:text-cyan-400 hover:bg-cyan-500/5 transition-all">
          <LogOut size={20} />
          <span className="text-xs font-black uppercase tracking-wider">Sair do Sistema</span>
        </button>
      </div>
    </aside>
  );
}
