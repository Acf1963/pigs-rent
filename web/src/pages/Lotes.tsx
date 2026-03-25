import { useState } from 'react';
import { 
  FilePlus, 
  Database, 
  Table, 
  ArrowRight, 
  CheckCircle2, 
  Loader2 
} from 'lucide-react';
import { LoteForm } from '../forms/LoteForm';
import { ExcelImporter } from '../forms/ExcelImporter';
import { excelMapper } from '../lib/excelMapper';
import { dataService } from '../lib/dataService';
import { Lote } from '../types/lote';

type TabType = 'manual' | 'import' | 'lista';

export default function LotesPage() {
  const [activeTab, setActiveTab] = useState<TabType>('manual');
  const [dadosParaProcessar, setDadosParaProcessar] = useState<Lote[]>([]);
  const [loading, setLoading] = useState(false);
  const [sucesso, setSucesso] = useState(false);

  const handleExcelRead = (rawArray: any[]) => {
    const dadosLimpos = excelMapper.lotes(rawArray);
    setDadosParaProcessar(dadosLimpos);
    setSucesso(false);
  };

  const handleConfirmarImportacao = async () => {
    setLoading(true);
    try {
      await dataService.saveBulk('lotes', dadosParaProcessar);
      setSucesso(true);
      setDadosParaProcessar([]);
      setTimeout(() => setSucesso(false), 4000);
    } catch (error) {
      console.error("Erro ao importar lotes:", error);
      alert("Erro na ligação ao Firebase. Verifica a consola.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 p-6 md:p-10">
      <header className="max-w-6xl mx-auto mb-10">
        <h1 className="text-3xl font-bold text-slate-800 tracking-tight">Gestão de Lotes</h1>
        <p className="text-slate-500 mt-2">Registo de entradas e logística da Fazenda Quanza.</p>
      </header>

      <main className="max-w-6xl mx-auto">
        <div className="flex bg-slate-200/50 p-1.5 rounded-2xl w-fit mb-10 border border-slate-200">
          {[
            { id: 'manual', label: 'Manual', icon: <FilePlus size={18} /> },
            { id: 'import', label: 'Importar Excel', icon: <Table size={18} /> },
            { id: 'lista', label: 'Inventário', icon: <Database size={18} /> }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as TabType)}
              className={`flex items-center gap-2 px-6 py-3 rounded-xl font-bold transition-all ${
                activeTab === tab.id 
                ? 'bg-white text-cyan-600 shadow-sm' 
                : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              {tab.icon} {tab.label}
            </button>
          ))}
        </div>

        <section className="min-h-[450px]">
          {activeTab === 'manual' && <LoteForm />}

          {activeTab === 'import' && (
            <div className="bg-white p-10 rounded-3xl shadow-xl border border-slate-100">
              <div className="mb-6">
                <h3 className="text-xl font-bold text-slate-800">Importação de Lotes</h3>
                <p className="text-slate-500 text-sm">O ficheiro deve conter a coluna 'fornecedor'.</p>
              </div>

              <ExcelImporter tipo="LOTES" onDataImported={handleExcelRead} />

              {dadosParaProcessar.length > 0 && (
                <div className="mt-8 p-6 bg-cyan-50 rounded-2xl border border-cyan-200 border-dashed">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-cyan-800 font-bold text-lg">{dadosParaProcessar.length} Lotes detetados</p>
                      <p className="text-cyan-600 text-sm italic">Prontos para subir para o Pigs Rent</p>
                    </div>
                    <button 
                      onClick={handleConfirmarImportacao}
                      disabled={loading}
                      className="bg-cyan-600 text-white px-8 py-4 rounded-2xl font-bold flex items-center gap-3 hover:bg-cyan-700 transition-all disabled:opacity-50"
                    >
                      {loading ? <Loader2 className="animate-spin" /> : <ArrowRight size={22} />}
                      Gravar na Cloud
                    </button>
                  </div>
                </div>
              )}

              {sucesso && (
                <div className="mt-6 p-4 bg-emerald-100 text-emerald-700 rounded-xl flex items-center gap-3 font-bold border border-emerald-200 animate-in fade-in zoom-in">
                  <CheckCircle2 size={24} /> Lotes importados com sucesso!
                </div>
              )}
            </div>
          )}

          {activeTab === 'lista' && (
            <div className="bg-white p-12 rounded-3xl shadow-xl border border-slate-100 text-center">
              <Database className="mx-auto text-slate-200 mb-4" size={48} />
              <p className="text-slate-400 italic">Consulta de inventário em tempo real (Firestore)...</p>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
