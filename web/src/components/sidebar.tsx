import { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { LayoutGrid, Package, Beef, Utensils, Activity, PieChart, Menu, X, LogOut } from 'lucide-react';

const menuItems = [
  { path: '/', icon: LayoutGrid, label: 'Dashboard' },
  { path: '/lotes', icon: Package, label: 'Gestão de Lotes' },
  { path: '/abates', icon: Beef, label: 'Abates' },
  { path: '/maneio', icon: Activity, label: 'Maneio Sanitário' },
  { path: '/alimentacao', icon: Utensils, label: 'Alimentação' },
  { path: '/vendas', icon: PieChart, label: 'Vendas' },
];

export default function Sidebar() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      {/* Botão Hamburger (Apenas Visível no Mobile) */}
      <button 
        onClick={() => setIsOpen(true)}
        className="lg:hidden fixed top-4 left-4 z-[60] p-2 bg-[#1a1d26] text-cyan-500 rounded-lg border border-slate-800 shadow-xl"
      >
        <Menu size={24} />
      </button>

      {/* Overlay Escuro para Mobile */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[55] lg:hidden" 
          onClick={() => setIsOpen(false)} 
        />
      )}

      <aside className={`
        fixed top-0 left-0 h-full w-64 bg-[#1a1d26] border-r border-slate-800 z-[58] transition-transform duration-300 ease-in-out
        ${isOpen ? 'translate-x-0' : '-translate-x-full'}
        lg:translate-x-0 lg:static lg:block
      `}>
        <div className="p-6 flex flex-col h-full">
          
          {/* LOGO ORIGINAL RESTAURADO */}
          <div className="flex flex-col items-center mb-10">
            <div className="flex justify-between items-center w-full lg:justify-center mb-4">
              <img 
                src="/img/lg_pgs01.png" 
                alt="Matadouro Gest Pro" 
                className="w-32 h-auto object-contain"
              />
              <button onClick={() => setIsOpen(false)} className="lg:hidden text-slate-400">
                <X size={24} />
              </button>
            </div>
            <div className="text-center">
              <h2 className="text-[11px] font-black text-white uppercase tracking-[0.2em]">Matadouro Gest Pro</h2>
              <p className="text-[7px] text-cyan-500 font-bold uppercase mt-1">Gestão de Alta Performance</p>
            </div>
          </div>

          {/* NAVEGAÇÃO COM CORREÇÃO DE isActive */}
          <nav className="flex-1 space-y-2 overflow-y-auto pr-2 custom-scrollbar">
            {menuItems.map((item) => (
              <NavLink
                key={item.path}
                to={item.path}
                onClick={() => setIsOpen(false)}
                className={({ isActive }) => `
                  flex items-center gap-3 px-4 py-3 rounded-xl font-bold text-sm transition-all
                  ${isActive 
                    ? 'bg-[#008cb4] text-white shadow-lg shadow-cyan-900/40' 
                    : 'text-slate-400 hover:bg-slate-800/50 hover:text-slate-100'}
                `}
              >
                {({ isActive }) => (
                  <>
                    <item.icon 
                      size={18} 
                      className={isActive ? 'text-white' : 'text-cyan-500'} 
                    />
                    <span>{item.label}</span>
                  </>
                )}
              </NavLink>
            ))}
          </nav>

          {/* RODAPÉ DO MENU */}
          <div className="mt-auto pt-6 border-t border-slate-800">
            <button className="flex items-center gap-3 px-4 py-3 w-full text-slate-500 hover:text-red-400 font-bold text-sm transition-colors uppercase tracking-widest text-[10px]">
              <LogOut size={18} />
              Sair do Sistema
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}
