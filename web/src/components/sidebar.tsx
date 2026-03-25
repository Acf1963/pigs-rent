import { 
  LayoutDashboard, 
  Package, 
  Gavel, 
  Syringe, 
  Pizza, 
  DollarSign, 
  LogOut 
} from 'lucide-react';

interface SidebarProps {
  activePage: string;
  setActivePage: (page: string) => void;
}

export function Sidebar({ activePage, setActivePage }: SidebarProps) {
  // Lista de navegação atualizada para o Pigs Rent
  const menuItems = [
    { name: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { name: 'lotes', label: 'Gestão de Lotes', icon: Package },
    { name: 'abates', label: 'Abates', icon: Gavel },
    { name: 'saude', label: 'Saúde Animal', icon: Syringe },
    { name: 'alimentacao', label: 'Alimentação', icon: Pizza }, // No lugar de Rendas
    { name: 'comercial', label: 'Comercial', icon: DollarSign }, // Novo item Comercial
  ];

  return (
    <aside className="w-72 min-h-screen bg-[#0f172a] text-slate-300 p-6 flex flex-col shadow-2xl">
      <div className="mb-12 px-2">
        <h1 className="text-3xl font-black text-white italic tracking-tighter">
          Pigs <span className="text-cyan-400">Rent</span>
        </h1>
        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.2em] mt-1">
          Gestão de Suinicultura
        </p>
      </div>

      <nav className="flex-1 space-y-2">
        {menuItems.map((item) => (
          <button
            key={item.name}
            onClick={() => setActivePage(item.name)}
            className={`w-full flex items-center gap-4 px-5 py-4 rounded-2xl transition-all duration-200 ${
              activePage === item.name 
                ? 'bg-cyan-950/50 text-white font-bold shadow-lg border-l-4 border-cyan-400' 
                : 'hover:bg-slate-900 text-slate-400 hover:text-slate-200'
            }`}
          >
            <item.icon size={22} className={activePage === item.name ? 'text-cyan-400' : 'text-slate-500'} />
            <span className="text-sm tracking-tight">{item.label}</span>
          </button>
        ))}
      </nav>

      <div className="pt-6 border-t border-slate-800/50 mt-6">
        <button className="w-full flex items-center gap-4 px-5 py-4 rounded-2xl text-red-400 hover:bg-red-500/10 transition-colors group">
          <LogOut size={22} className="group-hover:translate-x-1 transition-transform" />
          <span className="text-sm font-bold">Sair do Sistema</span>
        </button>
      </div>
    </aside>
  );
}
