import { useState, useRef } from 'react';
import { Upload, FileSpreadsheet, X, CheckCircle } from 'lucide-react'; // Removido AlertCircle
import * as XLSX from 'xlsx';

interface ExcelImporterProps {
  tipo: 'LOTES' | 'ANIMAIS' | 'MANEJO' | 'SAUDE';
  onDataImported: (data: any[]) => void;
}

export function ExcelImporter({ tipo, onDataImported }: ExcelImporterProps) {
  const [fileName, setFileName] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const processFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const bstr = e.target?.result;
      const wb = XLSX.read(bstr, { type: 'binary' });
      const wsname = wb.SheetNames[0];
      const ws = wb.Sheets[wsname];
      const data = XLSX.utils.sheet_to_json(ws);
      
      setFileName(file.name);
      onDataImported(data);
    };
    reader.readAsBinaryString(file);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processFile(file);
  };

  const clearFile = () => {
    setFileName(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
    onDataImported([]);
  };

  return (
    <div className="w-full">
      {!fileName ? (
        <div 
          onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={(e) => {
            e.preventDefault();
            setIsDragging(false);
            const file = e.dataTransfer.files[0];
            if (file) processFile(file);
          }}
          onClick={() => fileInputRef.current?.click()}
          className={`border-2 border-dashed rounded-3xl p-10 transition-all cursor-pointer flex flex-col items-center justify-center gap-4 ${
            isDragging ? 'border-cyan-500 bg-cyan-50' : 'border-slate-200 hover:border-slate-300 bg-slate-50'
          }`}
        >
          <input 
            type="file" 
            ref={fileInputRef} 
            onChange={handleFileChange} 
            className="hidden" 
            accept=".xlsx, .xls, .csv" 
          />
          <div className="bg-white p-4 rounded-2xl shadow-sm text-cyan-600">
            <Upload size={32} />
          </div>
          <div className="text-center">
            <p className="text-slate-700 font-bold">Clique ou arraste o Excel de {tipo}</p>
            <p className="text-slate-400 text-sm mt-1">Formatos suportados: .xlsx, .xls, .csv</p>
          </div>
        </div>
      ) : (
        <div className="flex items-center justify-between p-4 bg-emerald-50 border border-emerald-100 rounded-2xl animate-in fade-in zoom-in duration-300">
          <div className="flex items-center gap-4">
            <div className="bg-white p-2 rounded-xl text-emerald-600 shadow-sm">
              <FileSpreadsheet size={24} />
            </div>
            <div>
              <p className="text-emerald-900 font-bold text-sm">{fileName}</p>
              <div className="flex items-center gap-1 text-emerald-600 text-xs">
                <CheckCircle size={12} /> Ficheiro carregado com sucesso
              </div>
            </div>
          </div>
          <button 
            onClick={clearFile}
            className="p-2 hover:bg-emerald-100 rounded-full text-emerald-700 transition-colors"
          >
            <X size={20} />
          </button>
        </div>
      )}
    </div>
  );
}
