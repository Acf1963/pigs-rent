import { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { Package, Beef, Utensils, Activity, PieChart, Menu, X, LogOut } from 'lucide-react';

const menuItems = [
  { path: '/lotes', icon: Package, label: 'Lotes' },
  { path: '/alimentacao', icon: Utensils, label: 'Alimentação' },
  { path: '/abates', icon: Beef, label: 'Abates' },
  { path: '/maneio', icon: Activity, label: 'Maneio' },
  { path: '/vendas', icon: PieChart, label: 'Vendas' },
];

export default function Sidebar() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      {/* Botão Hamburger (Apenas Mobile) */}
      <button 
        onClick={() => setIsOpen(true)}
        className="lg:hidden fixed top-4 left-4 z-50 p-2 bg-slate-800 text-cyan-500 rounded-lg border border-slate-700 shadow-lg"
      >
        <Menu size={24} />
      </button>

      {/* Overlay (Fundo escuro ao abrir no mobile) */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 lg:hidden"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Sidebar Principal */}
      <aside className={`
        fixed top-0 left-0 h-full w-64 bg-[#1a1d26] border-r border-slate-800 z-50 transition-transform duration-300
        ${isOpen ? 'translate-x-0' : '-translate-x-full'}
        lg:translate-x-0 lg:static lg:block
      `}>
        <div className="p-6 flex flex-col h-full">
          <div className="flex justify-between items-center mb-10">
            <h2 className="text-xl font-black text-white tracking-tighter italic">
              AGRO <span className="text-cyan-500">PRO</span>
            </h2>
            <button onClick={() => setIsOpen(false)} className="lg:hidden text-slate-400">
              <X size={20} />
            </button>
          </div>

          <nav className="flex-1 space-y-2">
            {menuItems.map((item) => (
              <NavLink
                key={item.path}
                to={item.path}
                onClick={() => setIsOpen(false)}
                className={({ isActive }) => `
                  flex items-center gap-3 px-4 py-3 rounded-xl font-bold text-sm transition-all
                  ${isActive 
                    ? 'bg-cyan-600/10 text-cyan-400 border border-cyan-600/20' 
                    : 'text-slate-400 hover:bg-slate-800 hover:text-slate-100'}
                `}
              >
                <item.icon size={20} />
                {item.label}
              </NavLink>
            ))}
          </nav>

          <div className="mt-auto pt-6 border-t border-slate-800">
            <button className="flex items-center gap-3 px-4 py-3 w-full text-slate-500 hover:text-red-400 font-bold text-sm transition-colors">
              <LogOut size={20} />
              Sair
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}
