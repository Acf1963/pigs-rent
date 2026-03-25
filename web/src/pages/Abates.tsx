import { useState, useEffect } from 'react'; // Removido o import do 'React' não utilizado
import { 
  collection, 
  query, 
  orderBy, 
  onSnapshot, 
  deleteDoc, 
  doc 
} from 'firebase/firestore'; // Removido 'addDoc' e 'Timestamp'
import { db } from '../lib/firebase';
import { 
  Plus, 
  FileText, 
  Trash2, 
  Gavel, 
  TrendingUp, 
  Search 
} from 'lucide-react'; // Removidos 'FileDown' e 'TrendingDown'
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

  // Listener em tempo real para os registros de abates
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
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
          <Gavel className="w-8 h-8 text-orange-600" />
          Controle de Abates
        </h1>
        <button className="bg-orange-600 hover:bg-orange-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors">
          <Plus className="w-5 h-5" />
          Novo Registro
        </button>
      </div>

      {/* Barra de Busca e Filtros */}
      <div className="bg-white p-4 rounded-xl shadow-sm mb-6 flex flex-col md:flex-row gap-4 items-center">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
          <input
            type="text"
            placeholder="Buscar por lote ou cliente..."
            className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="flex gap-2 w-full md:w-auto">
          <button className="flex-1 md:flex-none border border-gray-200 px-4 py-2 rounded-lg flex items-center justify-center gap-2 hover:bg-gray-50">
            <FileText className="w-5 h-5 text-gray-600" />
            Exportar PDF
          </button>
        </div>
      </div>

      {/* Tabela de Abates */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="px-6 py-4 text-sm font-semibold text-gray-600">Data</th>
                <th className="px-6 py-4 text-sm font-semibold text-gray-600">Lote</th>
                <th className="px-6 py-4 text-sm font-semibold text-gray-600">Qtd</th>
                <th className="px-6 py-4 text-sm font-semibold text-gray-600">Peso Vivo (kg)</th>
                <th className="px-6 py-4 text-sm font-semibold text-gray-600">Carcaça (kg)</th>
                <th className="px-6 py-4 text-sm font-semibold text-gray-600">Rendimento</th>
                <th className="px-6 py-4 text-sm font-semibold text-gray-600">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-6 py-8 text-center text-gray-500">Carregando dados...</td>
                </tr>
              ) : filteredAbates.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-8 text-center text-gray-500">Nenhum registro encontrado.</td>
                </tr>
              ) : (
                filteredAbates.map((abate) => (
                  <tr key={abate.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {format(new Date(abate.dataAbate), 'dd/MM/yyyy', { locale: ptBR })}
                    </td>
                    <td className="px-6 py-4 text-sm font-medium text-gray-900">{abate.lote}</td>
                    <td className="px-6 py-4 text-sm text-gray-600">{abate.quantidade}</td>
                    <td className="px-6 py-4 text-sm text-gray-600">{abate.pesoVivo.toLocaleString()}</td>
                    <td className="px-6 py-4 text-sm text-gray-600">{abate.pesoCarcaca.toLocaleString()}</td>
                    <td className="px-6 py-4 text-sm">
                      <span className="flex items-center gap-1 text-green-600 font-medium">
                        <TrendingUp className="w-4 h-4" />
                        {abate.rendimento}%
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm">
                      <button 
                        onClick={() => handleDelete(abate.id)}
                        className="text-red-500 hover:text-red-700 p-1 rounded-md transition-colors"
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
  );
}
