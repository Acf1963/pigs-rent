import { useState } from 'react';
import * as XLSX from 'xlsx'; // Certifica-te que tens a lib xlsx instalada
import { FileSpreadsheet, Upload } from 'lucide-react';

// 1. DEFINIÇÃO DA INTERFACE (Resolve o erro 2322)
interface ExcelImporterProps {
  onImport: (dados: any[]) => void;
}

export function ExcelImporter({ onImport }: ExcelImporterProps) {
  const [loading, setLoading] = useState(false);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setLoading(true);
    const reader = new FileReader();

    reader.onload = (evt) => {
      const bstr = evt.target?.result;
      const wb = XLSX.read(bstr, { type: 'binary' });
      const wsname = wb.SheetNames[0];
      const ws = wb.Sheets[wsname];
      const data = XLSX.utils.sheet_to_json(ws);
      
      // Envia os dados para o Lotes.tsx
      onImport(data);
      setLoading(false);
    };

    reader.readAsBinaryString(file);
  };

  return (
    <div className="flex flex-col items-center justify-center gap-4">
      <div className="p-4 bg-cyan-50 rounded-full text-cyan-600 mb-2">
        <FileSpreadsheet size={40} />
      </div>
      <div>
        <h4 className="text-lg font-bold text-slate-800">Importação de Lotes</h4>
        <p className="text-sm text-slate-500 mb-6">Selecione o ficheiro .xlsx da Fazenda Quanza</p>
      </div>
      
      <label className="cursor-pointer bg-cyan-600 hover:bg-cyan-700 text-white px-8 py-4 rounded-2xl font-bold flex items-center gap-2 transition-all shadow-lg shadow-cyan-100">
        <Upload size={20} />
        {loading ? 'A processar...' : 'Selecionar Ficheiro'}
        <input 
          type="file" 
          accept=".xlsx, .xls" 
          className="hidden" 
          onChange={handleFileUpload} 
        />
      </label>
    </div>
  );
}
