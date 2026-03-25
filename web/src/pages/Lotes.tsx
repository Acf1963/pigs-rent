import { useState, useEffect } from 'react';
import { db } from '../lib/firebase';
import { collection, addDoc, query, onSnapshot, orderBy } from 'firebase/firestore';
import { FileUp, FileDown, FileText, ClipboardList } from 'lucide-react';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import 'jspdf-autotable';

export default function LotesPage() {
  const [lotes, setLotes] = useState<any[]>([]);
  const [isImporting, setIsImporting] = useState(false);

  // 1. ESCUTAR DADOS DO FIREBASE EM TEMPO REAL
  useEffect(() => {
    const q = query(collection(db, "lotes"), orderBy("dataEntrada", "desc"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setLotes(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });
    return () => unsubscribe();
  }, []);

  // 2. IMPORTAR DO EXCEL ( SHEETJS )
  const handleImportExcel = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsImporting(true);
    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const data = XLSX.utils.sheet_to_json(ws);

        for (const item of data as any[]) {
          await addDoc(collection(db, "lotes"), {
            numero: item.numero || item.lote || 'Sem ID',
            quantidade: Number(item.quantidade) || 0,
            peso: Number(item.peso) || 0,
            dataEntrada: new Date().toISOString(),
            status: 'Ativo'
          });
        }
        alert("Importação de lotes concluída!");
      } catch (error) {
        console.error("Erro na importação:", error);
        alert("Erro ao ler o ficheiro Excel.");
      } finally {
        setIsImporting(false);
      }
    };
    reader.readAsBinaryString(file);
  };

  // 3. EXPORTAR PARA EXCEL
  const exportToExcel = () => {
    const dataToExport = lotes.map(l => ({
      Lote: l.numero,
      Quantidade: l.quantidade,
      Peso_KG: l.peso,
      Data_Entrada: new Date(l.dataEntrada).toLocaleDateString('pt-PT'),
      Status: l.status
    }));

    const ws = XLSX.utils.json_to_sheet(dataToExport);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Lotes Pigs Rent");
    XLSX.writeFile(wb, `PigsRent_Lotes_${new Date().getTime()}.xlsx`);
  };

  // 4. EXPORTAR PARA PDF ( JSPDF + AUTOTABLE )
  const exportToPDF = () => {
    const doc = new jsPDF();
    
    // Cabeçalho do PDF
    doc.setFontSize(18);
    doc.setTextColor(15, 23, 42); // Slate-900
    doc.text("PIGS RENT - Inventário de Lotes", 14, 20);
    
    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text(`Relatório gerado em: ${new Date().toLocaleString('pt-PT')}`, 14, 28);

    (doc as any).autoTable({
      startY: 35,
      head: [['Nº Lote', 'Qtd (cab)', 'Peso Inicial (kg)', 'Data Entrada']],
      body: lotes.map(l => [
        l.numero, 
        l.quantidade, 
        l.peso, 
        new Date(l.dataEntrada).toLocaleDateString('pt-PT')
      ]),
      headStyles: { fillColor: [8, 145, 178] }, // Cyan-600
      alternateRowStyles: { fillColor: [248, 250, 252] },
      margin: { top: 35 }
    });

    doc.save("PigsRent_Relatorio_Lotes.pdf");
  };

  return (
    <div className="space-y-6">
      {/* Top Bar */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-cyan-600 text-white rounded-lg shadow-lg shadow-cyan-200">
            <ClipboardList size={24} />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-800 tracking-tight">Gestão de Lotes</h1>
            <p className="text-xs text-slate-400 font-bold uppercase tracking-widest">Controlo de Inventário Local</p>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <label className="flex items-center gap-2 bg-white border border-slate-200 px-4 py-2 rounded-lg text-xs font-bold text-slate-600 hover:bg-slate-50 cursor-pointer shadow-sm transition-all active:scale-95">
            <FileUp size={16} className="text-cyan-600" />
            {isImporting ? "A processar..." : "Importar Excel"}
            <input type="file" accept=".xlsx, .xls" onChange={handleImportExcel} className="hidden" />
          </label>

          <button onClick={exportToExcel} className="flex items-center gap-2 bg-white border border-slate-200 px-4 py-2 rounded-lg text-xs font-bold text-slate-600 hover:bg-slate-50 shadow-sm transition-all active:scale-95">
            <FileDown size={16} className="text-emerald-600" /> Excel
          </button>

          <button onClick={exportToPDF} className="flex items-center gap-2 bg-slate-900 text-white px-4 py-2 rounded-lg text-xs font-bold hover:bg-slate-800 shadow-lg transition-all active:scale-95">
            <FileText size={16} className="text-red-400" /> PDF
          </button>
        </div>
      </div>

      {/* Tabela de Dados */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/50 border-b border-slate-100">
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Identificação</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Quantidade</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Peso Médio</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Data Registo</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Estado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50 text-sm">
              {lotes.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-slate-400 italic">
                    Aguardando dados ou importação de ficheiro...
                  </td>
                </tr>
              ) : (
                lotes.map((lote) => (
                  <tr key={lote.id} className="hover:bg-slate-50/80 transition-colors group">
                    <td className="px-6 py-4 font-bold text-slate-700">{lote.numero}</td>
                    <td className="px-6 py-4 text-slate-600">{lote.quantidade} cabeças</td>
                    <td className="px-6 py-4 text-slate-600">{lote.peso} kg</td>
                    <td className="px-6 py-4 text-slate-400">{new Date(lote.dataEntrada).toLocaleDateString('pt-PT')}</td>
                    <td className="px-6 py-4">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-black bg-emerald-100 text-emerald-700 uppercase">
                        {lote.status}
                      </span>
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
