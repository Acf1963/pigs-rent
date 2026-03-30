import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Sidebar from './components/sidebar'; // ALTERADO: 'S' maiúsculo para bater certo com o Linux
import Dashboard from './pages/Dashboard';
import LotesPage from './pages/Lotes';
import AlimentacaoPage from './pages/Alimentacao';
import SaudePage from './pages/Saude';
import AbatesPage from './pages/Abates';
import VendasPage from './pages/Vendas';

export default function App() {
  return (
    <Router>
      <div className="flex h-screen w-full bg-[#0f1117] overflow-hidden">
        {/* LADO ESQUERDO: Fixo e sólido */}
        <Sidebar />

        {/* LADO DIREITO: Flexível e com scroll próprio */}
        <main className="flex-1 h-full overflow-y-auto p-8">
          <div className="max-w-[1500px] mx-auto">
            <Routes>
              <Route path="/" element={<Dashboard />} />
              <Route path="/lotes" element={<LotesPage />} />
              <Route path="/alimentacao" element={<AlimentacaoPage />} />
              <Route path="/saude" element={<SaudePage />} />
              <Route path="/abates" element={<AbatesPage />} />
              <Route path="/vendas" element={<VendasPage />} />
              <Route path="*" element={<Navigate to="/" />} />
            </Routes>
          </div>
        </main>
      </div>
    </Router>
  );
}
