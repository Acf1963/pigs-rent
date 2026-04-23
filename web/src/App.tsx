import { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { auth } from './lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';

// Componentes
import LoginPage from './components/LoginPage';
import Navbar from './components/Navbar';

// Páginas
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

      // --- LÓGICA DE BLINDAGEM DE INSTALAÇÃO (PWA) ---
      const ADMIN_EMAIL = 'acfs1963@gmail.com';
      const manifestLink = document.querySelector('link[rel="manifest"]');

      if (currentUser && currentUser.email === ADMIN_EMAIL) {
        // Se for o António, injeta o manifest para permitir instalar
        if (!manifestLink) {
          const link = document.createElement('link');
          link.rel = 'manifest';
          link.href = '/manifest.json';
          document.head.appendChild(link);
        }
      } else {
        // Se for Demo ou deslogado, remove o manifest (bloqueia instalação)
        if (manifestLink) manifestLink.remove();
      }
    });

    // Bloqueio de pop-up automático para utilizadores não-admin
    const handleBeforeInstall = (e: any) => {
      if (auth.currentUser?.email !== 'acfs1963@gmail.com') {
        e.preventDefault();
        return false;
      }
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstall);

    return () => {
      unsubscribe();
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
    };
  }, []);

  // Ecrã de loading com as cores do sistema
  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0f18] flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-[#54bece]/20 border-t-[#54bece] rounded-full animate-spin"></div>
      </div>
    );
  }

  // Proteção de Rota: Se não houver user, força o Login
  if (!user) {
    return <LoginPage />;
  }

  return (
    <BrowserRouter>
      <div className="min-h-screen bg-[#0a0f18] flex flex-col font-sans">
        
        {/* Navbar no topo com lógica de perfil (Admin ou Demo) */}
        <Navbar />
        
        {/* Aviso discreto para Modo de Demonstração */}
        {user.email === 'demo@matadouro.ao' && (
          <div className="bg-amber-500/10 border-b border-amber-500/20 py-1 text-center">
            <span className="text-[9px] font-black text-amber-500 uppercase tracking-[0.2em]">
              Modo de Demonstração • Apenas Visualização
            </span>
          </div>
        )}
        
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

        <footer className="p-4 text-center border-t border-white/5 bg-[#111827]/30">
          <p className="text-[10px] font-black text-slate-600 uppercase tracking-widest">
            Fazenda Kwanza © 2026 | Sistema de Gestão Pecuária
          </p>
        </footer>
      </div>
    </BrowserRouter>
  );
}

export default App;
