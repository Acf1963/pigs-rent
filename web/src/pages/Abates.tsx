import { useState, useEffect } from 'react'; 
import { 
  collection, 
  query, 
  orderBy, 
  onSnapshot, 
  deleteDoc, 
  doc 
} from 'firebase/firestore'; 
import { db } from '../lib/firebase';
import { 
  Plus, 
  FileText, 
  Trash2, 
  Gavel, 
  TrendingUp, 
  Search 
} from 'lucide-react'; 
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface Abate {
  id: string;
  lote: string;
  quantidade: number;
  pesoVivo: number;
  pesoCarcaca: number;
  rendimento: number;
  cliente: string;
  dataAbate: string;
}

export default function Abates() {
  const [abates, setAbates] = useState<Abate[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    const q = query(collection(db, 'abates'), orderBy('dataAbate', 'desc'));
    
    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const docs: Abate[] = [];
      querySnapshot.forEach((doc) => {
        docs.push({ id: doc.id, ...doc.data() } as Abate);
      });
      setAbates(docs);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const handleDelete = async (id: string) => {
    if (window.confirm('Tem certeza que deseja excluir este registro de abate?')) {
      try {
        await deleteDoc(doc(db, 'abates', id));
      } catch (error) {
        console.error("Erro ao excluir documento: ", error);
      }
    }
  };

  const filteredAbates = abates.filter(abate => 
    abate.lote.toLowerCase().includes(searchTerm.toLowerCase()) ||
    abate.cliente.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="p-6 bg-slate-50 min-h-screen font-sans">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-slate-800 flex items-center gap-3">
              <Gavel className="w-10 h-10 text-orange-600" />
              Controlo de Abates
            </h1>
            <p className="text-slate-500 text-sm mt-1 font-medium">Histórico de rendimento de carcaça - Pigs Rent</p>
          </div>
          <button className="bg-orange-600 hover:bg-orange-700 text-white px-6 py-3 rounded-2xl flex items-center gap-2 transition-all shadow-lg shadow-orange-100 font-bold text-sm">
            <Plus className="w-5 h-5" />
            Novo Registro
          </button>
        </div>

        {/* Barra de Busca e Filtros */}
        <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 mb-8 flex flex-col md:flex-row gap-4 items-center">
          <div className="relative flex-1 w-full">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Buscar por lote ou cliente..."
              className="w-full pl-12 pr-4 py-3 border border-slate-100 rounded-2xl bg-slate-50 focus:outline-none focus:ring-2 focus:ring-orange-500/20 transition-all text-slate-600 font-medium"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="flex gap-2 w-full md:w-auto">
            <button className="flex-1 md:flex-none bg-slate-800 text-white px-6 py-3 rounded-2xl flex items-center justify-center gap-2 hover:bg-slate-900 transition-colors font-bold text-sm">
              <FileText className="w-5 h-5" />
              Exportar PDF
            </button>
          </div>
        </div>

        {/* Tabela de Abates */}
        <div className="bg-white rounded-[2rem] shadow-sm border border-slate-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/50 border-b border-slate-100">
                  <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Data</th>
                  <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Lote</th>
                  <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Qtd</th>
                  <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Peso Vivo (kg)</th>
                  <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Carcaça (kg)</th>
                  <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Rendimento</th>
                  <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {loading ? (
                  <tr>
                    <td colSpan={7} className="px-8 py-12 text-center text-slate-400 italic">Carregando dados do Firebase...</td>
                  </tr>
                ) : filteredAbates.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-8 py-12 text-center text-slate-400 italic">Nenhum registro de abate encontrado.</td>
                  </tr>
                ) : (
                  filteredAbates.map((abate) => (
                    <tr key={abate.id} className="hover:bg-slate-50/50 transition-colors group">
                      <td className="px-8 py-5 text-sm font-medium text-slate-500">
                        {format(new Date(abate.dataAbate), 'dd/MM/yyyy', { locale: ptBR })}
                      </td>
                      <td className="px-8 py-5 text-sm font-bold text-slate-800">{abate.lote}</td>
                      <td className="px-8 py-5 text-sm text-slate-600 font-semibold">{abate.quantidade}</td>
                      <td className="px-8 py-5 text-sm text-slate-600">{abate.pesoVivo.toLocaleString()} kg</td>
                      <td className="px-8 py-5 text-sm text-slate-600 font-bold">{abate.pesoCarcaca.toLocaleString()} kg</td>
                      <td className="px-8 py-5 text-sm">
                        <span className="flex items-center gap-1 text-emerald-600 font-black bg-emerald-50 px-3 py-1 rounded-lg w-fit">
                          <TrendingUp className="w-4 h-4" />
                          {abate.rendimento}%
                        </span>
                      </td>
                      <td className="px-8 py-5 text-sm text-center">
                        <button 
                          onClick={() => handleDelete(abate.id)}
                          className="text-slate-300 hover:text-red-500 transition-colors"
                          title="Eliminar Registro"
                        >
                          <Trash2 className="w-5 h-5" />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
