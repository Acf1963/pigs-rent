import { useState, useEffect } from 'react';
import { db } from '../lib/firebase';
import { collection, addDoc, query, onSnapshot, orderBy } from 'firebase/firestore';
// Agora o FileDown será usado no botão de Excel
import { FileUp, FileDown, FileText, ClipboardList } from 'lucide-react';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import 'jspdf-autotable';

export default function LotesPage() {
  const [lotes, setLotes] = useState<any[]>([]);
  const [isImporting, setIsImporting] = useState(false);

  useEffect(() => {
    const q = query(collection(db, "lotes"), orderBy("dataEntrada", "desc"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setLotes(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });
    return () => unsubscribe();
  }, []);

  const handleImportExcel = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsImporting(true);
    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const data = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]]);

        for (const item of data as any[]) {
          await addDoc(collection(db, "lotes"), {
            numero: item.numero || item.lote || 'N/A',
            quantidade: Number(item.quantidade) || 0,
            peso: Number(item.peso) || 0,
            dataEntrada: new Date().toISOString(),
            status: 'Ativo'
          });
        }
        alert("Lotes importados com sucesso!");
      } catch (err) {
        alert("Erro ao importar.");
      } finally {
        setIsImporting(false);
      }
    };
    reader.readAsBinaryString(file);
  };

  // Função que usa o ícone FileDown
  const exportToExcel = () => {
    const ws = XLSX.utils.json_to_sheet(lotes);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Lotes");
    XLSX.writeFile(wb, "PigsRent_Lotes.xlsx");
  };

  const exportToPDF = () => {
    const doc = new jsPDF();
    doc.text("Pigs Rent - Inventário de Lotes", 14, 20);
    (doc as any).autoTable({
      startY: 30,
      head: [['Lote', 'Qtd', 'Peso (kg)', 'Data']],
      body: lotes.map(l => [l.numero, l.quantidade, l.peso, new Date(l.dataEntrada).toLocaleDateString('pt-PT')]),
      headStyles: { fillColor: [8, 145, 178] }
    });
    doc.save("Relatorio_Lotes.pdf");
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center bg-white p-6 rounded-2xl border shadow-sm">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-cyan-600 text-white rounded-lg"><ClipboardList size={24} /></div>
          <h1 className="text-2xl font-bold text-slate-800">Lotes Ativos</h1>
        </div>

        <div className="flex gap-2">
          <label className="flex items-center gap-2 bg-slate-50 border px-4 py-2 rounded-lg text-xs font-bold cursor-pointer hover:bg-slate-100 transition-all">
            <FileUp size={16} className="text-cyan-600" />
            {isImporting ? "A carregar..." : "Importar"}
            <input type="file" onChange={handleImportExcel} className="hidden" />
          </label>
          
          {/* Botão que usa o FileDown para limpar o aviso 6133 */}
          <button onClick={exportToExcel} className="flex items-center gap-2 bg-emerald-600 text-white px-4 py-2 rounded-lg text-xs font-bold hover:bg-emerald-700 transition-all">
            <FileDown size={16} /> Excel
          </button>

          <button onClick={exportToPDF} className="flex items-center gap-2 bg-slate-900 text-white px-4 py-2 rounded-lg text-xs font-bold hover:bg-slate-800 transition-all">
            <FileText size={16} className="text-red-400" /> PDF
          </button>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
        <table className="w-full text-left">
          <thead className="bg-slate-50 border-b text-[10px] uppercase font-black text-slate-400 tracking-widest">
            <tr>
              <th className="px-6 py-4">ID Lote</th>
              <th className="px-6 py-4">Qtd (Cab)</th>
              <th className="px-6 py-4">Peso (kg)</th>
              <th className="px-6 py-4">Data Registo</th>
              <th className="px-6 py-4">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y text-sm">
            {lotes.map((lote) => (
              <tr key={lote.id} className="hover:bg-slate-50/50 transition-colors">
                <td className="px-6 py-4 font-bold text-slate-700">{lote.numero}</td>
                <td className="px-6 py-4">{lote.quantidade} cab.</td>
                <td className="px-6 py-4">{lote.peso} kg</td>
                <td className="px-6 py-4 text-slate-400">{new Date(lote.dataEntrada).toLocaleDateString('pt-PT')}</td>
                <td className="px-6 py-4">
                  <span className="px-2 py-1 rounded-full text-[10px] font-black bg-emerald-100 text-emerald-700 uppercase">
                    {lote.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
