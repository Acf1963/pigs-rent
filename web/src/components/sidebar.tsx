import { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { 
  LayoutDashboard, 
  ClipboardList, 
  Utensils, 
  HeartPulse, 
  Skull, 
  ShoppingBag,
  DollarSign,
  Users,
  Menu,
  X
} from 'lucide-react';

export default function Sidebar() {
  const [isOpen, setIsOpen] = useState(false);

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

  const toggleMenu = () => setIsOpen(!isOpen);

  return (
    <>
      {/* BOTÃO HAMBURGUER (Apenas visível no Mobile) */}
      <button 
        onClick={toggleMenu}
        className="lg:hidden fixed top-4 left-4 z-[60] bg-[#0ea5e9] p-2 rounded-xl text-white shadow-lg active:scale-95 transition-all"
      >
        {isOpen ? <X size={24} /> : <Menu size={24} />}
      </button>

      {/* OVERLAY (Escurece o fundo quando o menu abre no mobile) */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[50] lg:hidden"
          onClick={toggleMenu}
        />
      )}

      {/* SIDEBAR */}
      <aside className={`
        fixed inset-y-0 left-0 z-[55] w-64 bg-[#111827] flex flex-col shrink-0 transition-transform duration-300 ease-in-out
        lg:relative lg:translate-x-0
        ${isOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        <div className="p-6 flex flex-col items-center">
          <img 
            src="./img/lg_pgs01.png" 
            alt="AgroRent Logo" 
            className="w-32 mb-8"
          />
          <div className="w-full h-[1px] bg-slate-800/50 mb-4" />
        </div>

        <nav className="flex-1 px-3 space-y-1 overflow-y-auto custom-scrollbar">
          {menuItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              onClick={() => setIsOpen(false)} // Fecha ao clicar num link (mobile)
              className={({ isActive }) => `
                flex items-center gap-3 px-4 py-3.5 rounded-xl text-[10px] font-black tracking-widest transition-all
                ${isActive 
                  ? 'bg-[#0ea5e9] text-white shadow-lg shadow-cyan-900/40' 
                  : 'text-slate-400 hover:bg-slate-800/50 hover:text-slate-200'}
              `}
            >
              {item.icon}
              {item.label}
            </NavLink>
          ))}
        </nav>

        {/* RODAPÉ DA SIDEBAR */}
        <div className="p-4 border-t border-slate-800/50 text-center">
          <p className="text-[8px] font-black text-slate-600 uppercase tracking-tighter">
            Fazenda Kwanza © 2026
          </p>
        </div>
      </aside>
    </>
  );
}
