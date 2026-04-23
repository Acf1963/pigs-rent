import { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { auth } from './lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';

// Componentes
import LoginPage from './components/LoginPage';
import Navbar from './components/Navbar'; // Nome alterado de Sidebar para Navbar

// Páginas (Conforme a tua estrutura de pastas)
import DashboardPage from './pages/Dashboard';
import Settings from './pages/Settings';
import Lotes from './pages/Lotes';
import Alimentacao from './pages/Alimentacao';
import Saude from './pages/Saude';
import Abates from './pages/Abates';
import Vendas from './pages/Vendas';
import Comercial from './pages/Comercial';
import LotesDetalhe from './pages/LotesDetalhe';

function App() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  // Ecrã de loading durante a verificação do Firebase
  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0f18] flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-emerald-500/20 border-t-emerald-500 rounded-full animate-spin"></div>
      </div>
    );
  }

  // Proteção de Rota: Se não houver user, força o Login
  if (!user) {
    return <LoginPage />;
  }

  return (
    <BrowserRouter>
      {/* Estrutura Vertical (Coluna) para o Menu de Topo */}
      <div className="min-h-screen bg-[#0a0f18] flex flex-col">
        
        {/* O Menu agora fica no topo e fixo */}
        <Navbar />
        
        {/* O conteúdo principal expande-se para ocupar o resto do ecrã */}
        <main className="flex-1 overflow-y-auto p-4 md:p-8">
          <div className="max-w-[1600px] mx-auto">
            <Routes>
              {/* Rotas Principais */}
              <Route path="/" element={<DashboardPage />} />
              <Route path="/settings" element={<Settings />} />
              
              {/* Rotas de Gestão */}
              <Route path="/lotes" element={<Lotes />} />
              <Route path="/alimentacao" element={<Alimentacao />} />
              <Route path="/saude" element={<Saude />} />
              <Route path="/abates" element={<Abates />} />
              <Route path="/vendas" element={<Vendas />} />
              <Route path="/comercial" element={<Comercial />} />
              <Route path="/lotes-detalhe" element={<LotesDetalhe />} />

              {/* Fallback de Segurança */}
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </div>
        </main>

        {/* Rodapé opcional ou créditos */}
        <footer className="p-4 text-center border-t border-white/5">
          <p className="text-[10px] font-black text-slate-600 uppercase tracking-widest">
            Fazenda Kwanza © 2026 | Sistema de Gestão Pecuária
          </p>
        </footer>
      </div>
    </BrowserRouter>
  );
}

export default App;
