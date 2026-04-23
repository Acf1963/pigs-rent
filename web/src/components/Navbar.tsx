import { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { auth } from '../lib/firebase';
import { signOut } from 'firebase/auth';
import { 
  LayoutDashboard, ClipboardList, Utensils, HeartPulse, 
  Skull, ShoppingBag, DollarSign, Users, Settings, LogOut, Menu, X 
} from 'lucide-react';

export default function Navbar() {
  const [isOpen, setIsOpen] = useState(false);
  const navigate = useNavigate();

  const menuItems = [
    { path: '/', icon: <LayoutDashboard size={18} />, label: 'DASHBOARD' },
    { path: '/lotes', icon: <ClipboardList size={18} />, label: 'LOTES' },
    { path: '/alimentacao', icon: <Utensils size={18} />, label: 'ALIMENTAÇÃO' },
    { path: '/saude', icon: <HeartPulse size={18} />, label: 'SAÚDE' },
    { path: '/abates', icon: <Skull size={18} />, label: 'ABATES' },
    { path: '/vendas', icon: <ShoppingBag size={18} />, label: 'VENDAS' },
    { path: '/comercial', icon: <DollarSign size={18} />, label: 'COMERCIAL' },
    { path: '/lotes-detalhe', icon: <Users size={18} />, label: 'ANIMAIS' },
    { path: '/settings', icon: <Settings size={18} />, label: 'CONFIG' },
  ];

  const handleLogout = async () => {
    try {
      await signOut(auth);
      navigate('/');
    } catch (error) { console.error(error); }
  };

  return (
    <nav className="bg-[#111827] border-b border-white/5 sticky top-0 z-[100] w-full">
      <div className="max-w-[1600px] mx-auto px-6">
        <div className="flex items-center justify-between h-20">
          
          {/* LOGO E NOME */}
          <div className="flex items-center gap-4">
            <img src="./img/lg_pgs01.png" alt="Logo" className="h-20" />
            
            {/* NOME DO SISTEMA EM CYAN */}
            <div className="flex flex-col">
              <span className="text-[#54bece] font-black text-xl tracking-tighter leading-none uppercase">
                Matadouro Gest Pro
              </span>
              <span className="text-[9px] text-slate-500 font-bold tracking-[0.2em] uppercase">
                Sistema de Gestão
              </span>
            </div>

            <div className="h-8 w-[1px] bg-white/10 hidden md:block ml-2" />
          </div>

          {/* MENU DESKTOP */}
          <div className="hidden xl:flex items-center gap-1">
            {menuItems.map((item) => (
              <NavLink
                key={item.path}
                to={item.path}
                className={({ isActive }) => `
                  flex items-center gap-2 px-3 py-2 rounded-lg text-[9px] font-black tracking-widest transition-all
                  ${isActive 
                    ? 'bg-[#0ea5e9] text-white shadow-lg shadow-cyan-900/40' 
                    : 'text-slate-400 hover:bg-white/5 hover:text-slate-200'}
                `}
              >
                {item.icon}
                {item.label}
              </NavLink>
            ))}
          </div>

          {/* BOTÕES DE AÇÃO */}
          <div className="flex items-center gap-4">
            <button
              onClick={handleLogout}
              className="text-red-400 hover:bg-red-500/10 p-2 rounded-lg transition-all"
              title="Sair da Aplicação"
            >
              <LogOut size={20} />
            </button>
            
            {/* Botão Mobile */}
            <button className="xl:hidden text-white" onClick={() => setIsOpen(!isOpen)}>
              {isOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>
        </div>
      </div>

      {/* MENU MOBILE DROP DOWN */}
      {isOpen && (
        <div className="xl:hidden bg-[#111827] border-t border-white/5 p-4 space-y-2">
          {menuItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              onClick={() => setIsOpen(false)}
              className="flex items-center gap-3 p-4 text-slate-400 font-bold text-xs uppercase"
            >
              {item.icon} {item.label}
            </NavLink>
          ))}
        </div>
      )}
    </nav>
  );
}
