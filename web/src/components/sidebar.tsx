import { NavLink } from 'react-router-dom';
import { 
  LayoutDashboard, 
  ClipboardList, 
  Utensils, 
  HeartPulse, 
  Skull, 
  ShoppingBag,
  DollarSign,
  Users
} from 'lucide-react';

export default function Sidebar() {
  const menuItems = [
    { path: '/dashboard', icon: <LayoutDashboard size={20} />, label: 'DASHBOARD' },
    { path: '/lotes', icon: <ClipboardList size={20} />, label: 'LOTES' },
    { path: '/alimentacao', icon: <Utensils size={20} />, label: 'ALIMENTAÇÃO' },
    { path: '/saude', icon: <HeartPulse size={20} />, label: 'SAÚDE' },
    { path: '/abates', icon: <Skull size={20} />, label: 'ABATES' },
    { path: '/vendas', icon: <ShoppingBag size={20} />, label: 'VENDAS' },
    { path: '/comercial', icon: <DollarSign size={20} />, label: 'COMERCIAL' },
    { path: '/lotes-detalhe', icon: <Users size={20} />, label: 'ANIMAIS (ID)' },
  ];

  return (
    <aside className="w-64 bg-[#111827] flex flex-col shrink-0">
      <div className="p-6">
        <img 
          src="./img/lg_pgs01.png" 
          alt="AgroRent Logo" 
          className="w-32 mb-8"
        />
      </div>

      <nav className="flex-1 px-2 space-y-1">
        {menuItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) => `
              flex items-center gap-3 px-4 py-3 rounded-xl text-[11px] font-bold tracking-wider transition-all
              ${isActive 
                ? 'bg-[#0ea5e9] text-white shadow-lg shadow-cyan-900/20' 
                : 'text-slate-400 hover:bg-slate-800/50 hover:text-slate-200'}
            `}
          >
            {item.icon}
            {item.label}
          </NavLink>
        ))}
      </nav>
    </aside>
  );
}
