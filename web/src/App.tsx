import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import { LayoutDashboard, ClipboardList, PiggyBank } from 'lucide-react';

export default function App() {
  return (
    <Router>
      <div className="flex h-screen bg-gray-100">
        {/* Sidebar Lateral */}
        <aside className="w-64 bg-slate-900 text-white p-6 shadow-xl">
          <div className="mb-10">
            <h1 className="text-2xl font-bold text-cyan-400 tracking-tight">Pigs Rent</h1>
            <p className="text-xs text-slate-400 uppercase tracking-widest mt-1">Gestão de Agronegócio</p>
          </div>
          
          <nav className="space-y-2">
            <Link 
              to="/" 
              className="flex items-center gap-3 p-3 rounded-lg hover:bg-slate-800 hover:text-cyan-300 transition-all"
            >
              <LayoutDashboard size={20}/> 
              <span className="font-medium">Dashboard</span>
            </Link>
            
            <Link 
              to="/lotes" 
              className="flex items-center gap-3 p-3 rounded-lg hover:bg-slate-800 hover:text-cyan-300 transition-all"
            >
              <ClipboardList size={20}/> 
              <span className="font-medium">Gestão de Lotes</span>
            </Link>

            {/* Inclusão do PiggyBank para resolver o aviso do TS e preparar o financeiro */}
            <Link 
              to="/rendas" 
              className="flex items-center gap-3 p-3 rounded-lg hover:bg-slate-800 hover:text-cyan-300 transition-all"
            >
              <PiggyBank size={20}/> 
              <span className="font-medium">Rendas</span>
            </Link>
          </nav>
        </aside>

        {/* Área de Conteúdo Principal */}
        <main className="flex-1 overflow-y-auto bg-slate-50">
          <header className="bg-white border-b border-slate-200 p-6 flex justify-between items-center">
            <h2 className="text-xl font-semibold text-slate-700">Painel de Controlo</h2>
            <div className="text-sm text-slate-500">Luanda, Angola</div>
          </header>

          <div className="p-8">
            <Routes>
              <Route 
                path="/" 
                element={
                  <div className="bg-white p-8 rounded-xl shadow-sm border border-slate-200">
                    <h3 className="text-2xl font-bold text-slate-800">Bem-vindo, António!</h3>
                    <p className="text-slate-600 mt-2">Visão geral da rentabilidade da Fazenda Quanza.</p>
                  </div>
                } 
              />
              <Route 
                path="/lotes" 
                element={
                  <div className="bg-white p-8 rounded-xl shadow-sm border border-slate-200">
                    <h3 className="text-2xl font-bold text-slate-800">Lotes Ativos</h3>
                    <p className="text-slate-600 mt-2">Listagem detalhada de animais e fornecedores.</p>
                  </div>
                } 
              />
              <Route 
                path="/rendas" 
                element={
                  <div className="bg-white p-8 rounded-xl shadow-sm border border-slate-200">
                    <h3 className="text-2xl font-bold text-slate-800">Controlo Financeiro</h3>
                    <p className="text-slate-600 mt-2">Monitorização de pagamentos e rendas pendentes.</p>
                  </div>
                } 
              />
            </Routes>
          </div>
        </main>
      </div>
    </Router>
  );
}
