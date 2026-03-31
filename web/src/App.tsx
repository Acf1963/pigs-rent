import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Sidebar from './components/sidebar';
import Dashboard from './pages/Dashboard';
import Lotes from './pages/Lotes';
import Alimentacao from './pages/Alimentacao';
import Saude from './pages/Saude';
import Abates from './pages/Abates';
import VendasPage from './pages/Vendas';
import ComercialPage from './pages/Comercial';
import LotesDetalhePage from './pages/LotesDetalhe';

export default function App() {
  return (
    <Router>
      <div className="flex h-screen bg-[#0f172a] text-slate-200 font-sans overflow-hidden">
        <Sidebar />
        <main className="flex-1 p-8 overflow-y-auto">
          <Routes>
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/lotes" element={<Lotes />} />
            <Route path="/alimentacao" element={<Alimentacao />} />
            <Route path="/saude" element={<Saude />} />
            <Route path="/abates" element={<Abates />} />
            <Route path="/vendas" element={<VendasPage />} />
            <Route path="/comercial" element={<ComercialPage />} />
            <Route path="/lotes-detalhe" element={<LotesDetalhePage />} />
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </main>
      </div>
    </Router>
  );
}
