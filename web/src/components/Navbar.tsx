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
    } catch (error) {
      console.error(error);
    }
  };

  return (
    <nav className="bg-[#111827] border-b border-white/5 sticky top-0 z-[100] w-full shadow-2xl">
      <div className="max-w-[1600px] mx-auto px-4 md:px-6">
        <div className="flex items-center justify-between h-20">
          
          {/* LOGO E NOME */}
          <div className="flex items-center gap-3">
            <img src="./img/lg_pgs01.png" alt="Logo" className="h-14 w-auto md:h-16" />
            
            <div className="flex flex-col">
              <span className="text-[#54bece] font-black text-lg md:text-xl tracking-tighter leading-none uppercase italic">
                Matadouro <span className="text-[#54bece]">Gest Pro</span>
              </span>
              <span className="text-[8px] md:text-[9px] text-slate-500 font-bold tracking-[0.2em] uppercase mt-1">
                Fazenda Kwanza • Luanda
              </span>
            </div>
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
                    ? 'bg-[#54bece] text-[#0a0f18] shadow-lg shadow-cyan-500/20' 
                    : 'text-slate-400 hover:bg-white/5 hover:text-slate-200'}
                `}
              >
                {item.icon}
                {item.label}
              </NavLink>
            ))}
          </div>

          {/* BOTÕES DE AÇÃO */}
          <div className="flex items-center gap-2">
            <button
              onClick={handleLogout}
              className="text-red-400/70 hover:text-red-400 hover:bg-red-500/10 p-2.5 rounded-xl transition-all"
              title="Sair"
            >
              <LogOut size={22} />
            </button>
            
            {/* Botão de Menu para Smartphone */}
            <button 
              className="xl:hidden bg-white/5 p-2.5 rounded-xl text-[#54bece] active:scale-95 transition-transform" 
              onClick={() => setIsOpen(!isOpen)}
            >
              {isOpen ? <X size={26} /> : <Menu size={26} />}
            </button>
          </div>
        </div>
      </div>

      {/* MENU MOBILE DROP DOWN */}
      {isOpen && (
        <div className="xl:hidden bg-[#0d1421] border-t border-white/5 p-4 absolute top-20 left-0 w-full shadow-2xl animate-in slide-in-from-top duration-300">
          <div className="grid grid-cols-1 gap-2">
            {menuItems.map((item) => (
              <NavLink
                key={item.path}
                to={item.path}
                onClick={() => setIsOpen(false)}
                className={({ isActive }) => `
                  flex items-center gap-4 p-5 rounded-2xl font-black text-[11px] uppercase tracking-widest transition-all
                  ${isActive 
                    ? 'bg-[#54bece] text-[#0a0f18]' 
                    : 'bg-white/[0.02] text-slate-400 border border-white/5 shadow-inner'}
                `}
              >
                <span className="flex-shrink-0">
                  {item.icon}
                </span>
                {item.label}
              </NavLink>
            ))}
          </div>
          
          <div className="mt-4 p-4 text-center">
             <p className="text-[8px] text-slate-600 font-bold uppercase tracking-[0.3em]">
               Utilizador: <span className="text-slate-400">{auth.currentUser?.email}</span>
             </p>
          </div>
        </div>
      )}
    </nav>
  );
}
