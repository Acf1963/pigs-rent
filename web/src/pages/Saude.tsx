import { useState, useEffect, ChangeEvent } from 'react'; // Adicionado ChangeEvent
import { db } from '../lib/firebase';
import { collection, addDoc, query, onSnapshot, orderBy } from 'firebase/firestore';
import { Syringe, FileUp, FileDown, FileText, Calendar, AlertCircle } from 'lucide-react';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import 'jspdf-autotable';

export default function SaudePage() {
  const [tratamentos, setTratamentos] = useState<any[]>([]);
  const [isImporting, setIsImporting] = useState(false);

  // 1. ESCUTAR DADOS DO FIREBASE EM TEMPO REAL
  useEffect(() => {
    const q = query(collection(db, "saude"), orderBy("dataAplicacao", "desc"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setTratamentos(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });
    return () => unsubscribe();
  }, []);

  // 2. IMPORTAR EXCEL ( MANEJO SANITÁRIO )
  const handleImportExcel = (e: ChangeEvent<HTMLInputElement>) => {
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
          await addDoc(collection(db, "saude"), {
            lote: item.lote || 'N/A',
            medicamento: item.medicamento || 'N/A',
            diasCarencia: Number(item.diasCarencia) || 0,
            dataAplicacao: new Date().toISOString()
          });
        }
        alert("Dados sanitários importados com sucesso!");
      } catch (error) {
        console.error("Erro na importação:", error);
        alert("Erro ao ler o ficheiro Excel de saúde.");
      } finally {
        setIsImporting(false);
        e.target.value = ''; // Limpa o input para permitir nova importação do mesmo arquivo
      }
    };
    reader.readAsBinaryString(file);
  };

  // 3. EXPORTAR PARA EXCEL
  const exportToExcel = () => {
    const dataToExport = tratamentos.map(t => ({
      Lote: t.lote,
      Medicamento: t.medicamento,
      Data_Aplicacao: new Date(t.dataAplicacao).toLocaleDateString('pt-PT'),
      Carencia_Dias: t.diasCarencia
    }));

    const ws = XLSX.utils.json_to_sheet(dataToExport);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Saude_PigsRent");
    XLSX.writeFile(wb, `PigsRent_Saude_${new Date().getTime()}.xlsx`);
  };

  // 4. EXPORTAR PARA PDF
  const exportToPDF = () => {
    const doc = new jsPDF();
    
    doc.setFontSize(18);
    doc.setTextColor(15, 23, 42); 
    doc.text("PIGS RENT - Relatório Sanitário e Vacinação", 14, 20);
    
    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text(`Gerado em: ${new Date().toLocaleString('pt-PT')}`, 14, 28);

    (doc as any).autoTable({
      startY: 35,
      head: [['Lote', 'Medicamento / Vacina', 'Data Aplicação', 'Carência']],
      body: tratamentos.map(t => [
        t.lote, 
        t.medicamento, 
        new Date(t.dataAplicacao).toLocaleDateString('pt-PT'),
        t.diasCarencia > 0 ? `${t.diasCarencia} dias` : 'Livre'
      ]),
      headStyles: { fillColor: [8, 145, 178] },
      alternateRowStyles: { fillColor: [248, 250, 252] },
      margin: { top: 35 }
    });

    doc.save("PigsRent_Relatorio_Saude.pdf");
  };

  return (
    <div className="space-y-6 text-slate-900 font-sans">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 p-6">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-cyan-100 text-cyan-700 rounded-2xl">
            <Syringe size={28} />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Saúde Animal</h1>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Controlo de Vacinas e Carências</p>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <label className="flex items-center gap-2 bg-white border border-slate-200 px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-50 cursor-pointer shadow-sm transition-all active:scale-95">
            <FileUp size={16} className="text-cyan-600" />
            {isImporting ? "A processar..." : "Importar Excel"}
            <input type="file" accept=".xlsx, .xls" onChange={handleImportExcel} className="hidden" />
          </label>

          <button onClick={exportToExcel} className="flex items-center gap-2 bg-white border border-slate-200 px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-50 shadow-sm transition-all active:scale-95">
            <FileDown size={16} className="text-emerald-600" /> Excel
          </button>

          <button onClick={exportToPDF} className="flex items-center gap-2 bg-slate-900 text-white px-4 py-2 rounded-xl text-xs font-bold hover:bg-slate-800 shadow-lg transition-all active:scale-95">
            <FileText size={16} className="text-red-400" /> PDF
          </button>
        </div>
      </div>

      {/* Listagem de Tratamentos */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm mx-6">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/50 border-b border-slate-100">
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Lote Afetado</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Tratamento</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Data Aplicação</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Status Carência</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50 text-sm">
              {tratamentos.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-6 py-12 text-center text-slate-400 italic">
                    Nenhum registo sanitário encontrado no Firebase.
                  </td>
                </tr>
              ) : (
                tratamentos.map((t) => (
                  <tr key={t.id} className="hover:bg-slate-50/80 transition-colors group">
                    <td className="px-6 py-4 font-bold text-slate-700">{t.lote}</td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col">
                        <span className="font-medium text-slate-600">{t.medicamento}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-slate-400 flex items-center gap-2">
                      <Calendar size={14} />
                      {new Date(t.dataAplicacao).toLocaleDateString('pt-PT')}
                    </td>
                    <td className="px-6 py-4 text-slate-400 flex items-center gap-2">
                        <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase ${
                        t.diasCarencia > 0 
                            ? 'bg-amber-100 text-amber-700' 
                            : 'bg-emerald-100 text-emerald-700'
                        }`}>
                        <AlertCircle size={10} />
                        {t.diasCarencia > 0 ? `${t.diasCarencia} dias restantes` : 'Livre para Abate'}
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
