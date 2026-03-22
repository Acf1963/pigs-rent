import React, { useEffect, useState } from 'react';
import { TrendingUp, Box } from 'lucide-react';

// 1. Definimos a estrutura dos dados (Interface)
interface Lote {
  sk_lote: number;
  codigo_lote: string;
  fornecedor_origem: string;
  data_inicio_lote: string;
}

const Dashboard: React.FC = () => {
  // 2. IMPORTANTE: Dizemos ao TS que o estado é um array de Lote: <Lote[]>
  // Isso remove o erro de "type never"
  const [lotes, setLotes] = useState<Lote[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('http://localhost:3000/api/lotes')
      .then(res => res.json())
      .then((data: Lote[]) => {
        setLotes(data);
        setLoading(false);
      })
      .catch(err => {
        console.error("Erro ao carregar lotes:", err);
        setLoading(false);
      });
  }, []);

  if (loading) return <div className="p-10 text-center">A carregar dados do Pigs Rent...</div>;

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <header className="mb-8">
        <h1 className="text-3xl font-extrabold text-slate-800 flex items-center gap-3">
          <TrendingUp className="text-green-500" size={32} /> 
          Pigs Rent Dashboard
        </h1>
        <p className="text-slate-500 mt-2">Monitorização de Lotes e Rentabilidade</p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {lotes.map((lote) => (
          <div key={lote.sk_lote} className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 hover:border-green-300 transition-colors">
            <div className="flex justify-between items-start mb-4">
              <span className="bg-green-100 text-green-700 text-xs font-bold px-3 py-1 rounded-full">
                {lote.codigo_lote}
              </span>
              <Box className="text-slate-300" />
            </div>
            
            <h3 className="text-xl font-bold text-slate-800 mb-4">
              {lote.fornecedor_origem}
            </h3>

            <div className="pt-4 border-t border-slate-100 flex justify-between items-center text-sm text-slate-500">
              <span>Início do Lote:</span>
              <span className="font-medium text-slate-700">
                {new Date(lote.data_inicio_lote).toLocaleDateString('pt-PT')}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Dashboard;