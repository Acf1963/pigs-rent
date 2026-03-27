import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Sidebar from './components/sidebar';

// Importação de todas as páginas do sistema
import Dashboard from './pages/Dashboard'; 
import LotesPage from './pages/Lotes';
import AbatesPage from './pages/Abates';
import SaudePage from './pages/Saude';       
import VendasPage from './pages/Vendas';
import AlimentacaoPage from './pages/Alimentacao';

function App() {
  return (
    <Router>
      {/* Estrutura principal: Sidebar fixa à esquerda, conteúdo dinâmico à direita */}
      <div className="flex h-screen w-full bg-[#0f1117] overflow-hidden text-slate-100 font-sans">
        
        {/* Componente de Navegação Lateral (Cyan Style) */}
        <Sidebar /> 

        {/* Área de Visualização das Páginas com scroll independente */}
        <main className="flex-1 h-full overflow-auto bg-[#0f1117] relative">
          <Routes>
            {/* Rota Principal: Dashboard */}
            <Route path="/" element={<Dashboard />} />
            
            {/* Módulo de Produção e Lotes */}
            <Route path="/lotes" element={<LotesPage />} />
            
            {/* Módulo de Performance: Abates e Rendimento */}
            <Route path="/abates" element={<AbatesPage />} />
            
            {/* Módulo Clínico: Maneio Sanitário (utiliza Saude.tsx) */}
            <Route path="/maneio" element={<SaudePage />} />
            
            {/* Módulo de Nutrição: Alimentação e Conversão */}
            <Route path="/alimentacao" element={<AlimentacaoPage />} />
            
            {/* Módulo Comercial: Vendas e Saídas */}
            <Route path="/vendas" element={<VendasPage />} />
            
            {/* Área de Definições do Sistema */}
            <Route path="/configuracoes" element={
              <div className="p-10 text-cyan-500 font-bold uppercase tracking-[0.2em] animate-pulse">
                Configurações Matadouro Gest Pro
              </div>
            } />

            {/* Tratamento de rotas inexistentes (404) */}
            <Route path="*" element={
              <div className="p-10 text-slate-500 font-black uppercase tracking-widest text-center mt-20">
                Página não encontrada ou em desenvolvimento.
              </div>
            } />
          </Routes>
        </main>
      </div>
    </Router>
  );
}

export default App;
