import { useState } from 'react';
import { 
  PlusCircle, 
  FileSpreadsheet, 
  ListFilter, 
  ChevronRight,
  ClipboardList,
  CheckCircle2
} from 'lucide-react';

// Imports alinhados com a estrutura src/ e nomes de ficheiros reais
import { LoteForm } from '../forms/LoteForm';
import { ExcelImporter } from '../forms/ExcelImporter'; // 1 "L" conforme o ficheiro
import { excelMapper } from '../lib/excelMapper';
import { dataService } from '../lib/dataService';
import { Lote } from '../types/lote';

type TabType = 'manual' | 'import' | 'lista';

export default function LotesPage() {
  const [activeTab, setActiveTab] = useState<TabType>('manual');
  const [dadosParaProcessar, setDadosParaProcessar] = useState<Lote[]>([]);
  const [loading, setLoading] = useState(false);
  const [sucesso, setSucesso] = useState(false);

  const handleImportacaoConcluida = (dados: any[]) => {
    const mapeados = excelMapper.mapLotes(dados);
    setDadosParaProcessar(mapeados);
    setActiveTab('lista');
  };

  const confirmarGravacaoLote = async () => {
    setLoading(true);
    try {
      await dataService.saveBulk('lotes', dadosParaProcessar);
      setSucesso(true);
      setDadosParaProcessar([]);
      setTimeout(() => {
        setSucesso(false);
        setActiveTab('manual');
      }, 3000);
    } catch (error) {
      console.error("Erro ao gravar lotes em massa:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-8">
      <header className="max-w-6xl mx-auto mb-8">
        <h1 className="text-2xl md:text-3xl font-bold text-slate-800 flex items-center gap-3">
          <ClipboardList className="text-cyan-600" /> Gestão de Lotes
        </h1>
        <p className="text-slate-500 mt-2">Registe a entrada de novos animais para a Fazenda Quanza.</p>
      </header>

      <main className="max-w-6xl mx-auto">
        {/* Navegação entre Abas */}
        <div className="flex flex-wrap gap-2 mb-8 bg-slate-200/50 p-1 rounded-2xl w-fit">
          <button
            onClick={() => setActiveTab('manual')}
            className={`flex items-center gap-2 px-6 py-3 rounded-xl font-bold transition-all ${
              activeTab === 'manual' ? 'bg-white text-cyan-600 shadow-sm' : 'text-slate-500'
            }`}
          >
            <PlusCircle size={18} /> Registo Manual
          </button>
          <button
            onClick={() => setActiveTab('import')}
            className={`flex items-center gap-2 px-6 py-3 rounded-xl font-bold transition-all ${
              activeTab === 'import' ? 'bg-white text-cyan-600 shadow-sm' : 'text-slate-500'
            }`}
          >
            <FileSpreadsheet size={18} /> Importar Excel
          </button>
          {dadosParaProcessar.length > 0 && (
            <button
              onClick={() => setActiveTab('lista')}
              className={`flex items-center gap-2 px-6 py-3 rounded-xl font-bold transition-all ${
                activeTab === 'lista' ? 'bg-white text-orange-600 shadow-sm' : 'text-orange-500'
              }`}
            >
              <ListFilter size={18} /> Validar ({dadosParaProcessar.length})
            </button>
          )}
        </div>

        {/* Conteúdo das Abas */}
        <div className="transition-all duration-300">
          {activeTab === 'manual' && <LoteForm />}

          {activeTab === 'import' && (
            <div className="bg-white p-12 rounded-3xl border-2 border-dashed border-slate-200 text-center">
              {/* CORRIGIDO: Agora usa o nome correto com 1 "L" */}
              <ExcelImporter onImport={handleImportacaoConcluida} />
            </div>
          )}

          {activeTab === 'lista' && (
            <div className="bg-white rounded-3xl shadow-xl overflow-hidden border border-slate-100">
              <div className="p-6 bg-slate-50 border-b border-slate-100 flex justify-between items-center">
                <h3 className="font-bold text-slate-700">Pré-visualização da Importação</h3>
                <button 
                  onClick={confirmarGravacaoLote}
                  disabled={loading}
                  className="bg-cyan-600 text-white px-8 py-3 rounded-xl font-bold hover:bg-cyan-700 transition-all flex items-center gap-2"
                >
                  {loading ? 'A processar...' : 'Confirmar e Gravar'}
                  <ChevronRight size={18} />
                </button>
              </div>
              
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead className="bg-slate-50 text-slate-400 text-[10px] uppercase font-bold tracking-widest">
                    <tr>
                      <th className="px-6 py-4">Código</th>
                      <th className="px-6 py-4">Fornecedor</th>
                      <th className="px-6 py-4">Peso Entrada</th>
                      <th className="px-6 py-4 text-right">Custo Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {dadosParaProcessar.map((lote: Lote, i) => (
                      <tr key={i} className="text-sm text-slate-600 hover:bg-slate-50">
                        <td className="px-6 py-4 font-bold text-slate-800">{lote.codigo}</td>
                        <td className="px-6 py-4">{lote.fornecedor}</td>
                        <td className="px-6 py-4">{lote.peso_chegada_kg} kg</td>
                        <td className="px-6 py-4 text-right font-mono text-emerald-600 font-bold">
                          {lote.custo_aquisicao_total_kz?.toLocaleString()} Kz
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {sucesso && (
            <div className="mt-6 p-4 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-2xl flex items-center gap-3 animate-bounce">
              <CheckCircle2 /> Dados importados com sucesso para o Firestore!
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
