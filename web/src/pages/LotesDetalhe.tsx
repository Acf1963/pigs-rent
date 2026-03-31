import { useState, useEffect } from 'react';
import { db } from '../lib/firebase';
import { collection, addDoc, onSnapshot, query, where, deleteDoc, doc, orderBy } from 'firebase/firestore';
import { 
  Users, 
  Plus, 
  Trash2, 
  Tag, 
  Scale, 
  Dna,
  Filter,
  Check
} from 'lucide-react';

export default function LotesDetalhePage() {
  const [animais, setAnimais] = useState<any[]>([]);
  const [lotes, setLotes] = useState<any[]>([]);
  const [selectedLote, setSelectedLote] = useState<string>('');
  
  const [formData, setFormData] = useState({
    brinco: '',
    raca: '',
    sexo: 'Macho',
    pesoEntrada: '',
    dataEntrada: new Date().toISOString().split('T')[0]
  });

  // 1. Carregar a lista de Lotes para o filtro e select
  useEffect(() => {
    const unsubLotes = onSnapshot(collection(db, 'lotes'), (snap) => {
      setLotes(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });
    return () => unsubLotes();
  }, []);

  // 2. Carregar animais (Filtrados por lote se houver seleção)
  useEffect(() => {
    let q = query(collection(db, 'animais'), orderBy('brinco', 'asc'));
    
    if (selectedLote) {
      q = query(collection(db, 'animais'), where('loteId', '==', selectedLote));
    }

    const unsubAnimais = onSnapshot(q, (snap) => {
      setAnimais(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });
    return () => unsubAnimais();
  }, [selectedLote]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedLote) {
      alert("Selecione um lote primeiro!");
      return;
    }

    await addDoc(collection(db, 'animais'), {
      ...formData,
      loteId: selectedLote,
      pesoEntrada: parseFloat(formData.pesoEntrada),
      createdAt: new Date().toISOString()
    });

    setFormData({ ...formData, brinco: '', pesoEntrada: '' });
  };

  return (
    <div className="h-[calc(100vh-2rem)] flex flex-col space-y-6 overflow-hidden text-white">
      {/* HEADER */}
      <header className="flex justify-between items-center shrink-0">
        <div className="flex items-center gap-3">
          <div className="bg-cyan-500/20 p-2 rounded-lg border border-cyan-500/30">
            <Users className="text-cyan-400" size={32} />
          </div>
          <div>
            <h1 className="text-3xl font-black uppercase tracking-tighter">Identificação Individual</h1>
            <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Composição de Animais por Lote</p>
          </div>
        </div>

        {/* FILTRO DE LOTE */}
        <div className="flex items-center gap-3 bg-[#161922] p-2 rounded-2xl border border-slate-800">
          <Filter size={16} className="text-slate-500 ml-2" />
          <select 
            className="bg-transparent text-cyan-400 font-black text-xs outline-none uppercase pr-4"
            value={selectedLote}
            onChange={(e) => setSelectedLote(e.target.value)}
          >
            <option value="">TODOS OS LOTES</option>
            {lotes.map(l => <option key={l.id} value={l.loteId}>{l.loteId}</option>)}
          </select>
        </div>
      </header>

      {/* FORMULÁRIO DE CADASTRO RÁPIDO */}
      <div className="bg-[#161922] rounded-[2rem] border border-slate-800/50 p-6 shrink-0 shadow-2xl">
        <form onSubmit={handleSubmit} className="grid grid-cols-12 gap-4 items-end">
          <div className="col-span-2 space-y-1">
            <label className="text-[8px] font-black text-slate-500 uppercase px-1">Nº Brinco / ID</label>
            <div className="relative">
              <Tag className="absolute left-3 top-3 text-slate-600" size={14} />
              <input 
                required 
                className="w-full bg-[#0f121a] border border-slate-800 p-2.5 pl-9 rounded-xl text-white outline-none text-xs" 
                placeholder="Ex: 1024"
                value={formData.brinco}
                onChange={e => setFormData({...formData, brinco: e.target.value.toUpperCase()})}
              />
            </div>
          </div>

          <div className="col-span-3 space-y-1">
            <label className="text-[8px] font-black text-slate-500 uppercase px-1">Raça / Linhagem</label>
            <div className="relative">
              <Dna className="absolute left-3 top-3 text-slate-600" size={14} />
              <input 
                required 
                className="w-full bg-[#0f121a] border border-slate-800 p-2.5 pl-9 rounded-xl text-white outline-none text-xs uppercase" 
                placeholder="Ex: Large White"
                value={formData.raca}
                onChange={e => setFormData({...formData, raca: e.target.value})}
              />
            </div>
          </div>

          <div className="col-span-2 space-y-1">
            <label className="text-[8px] font-black text-slate-500 uppercase px-1">Sexo</label>
            <select 
              className="w-full bg-[#0f121a] border border-slate-800 p-2.5 rounded-xl text-white outline-none text-xs font-bold"
              value={formData.sexo}
              onChange={e => setFormData({...formData, sexo: e.target.value})}
            >
              <option value="Macho">MACHO</option>
              <option value="Fêmea">FÊMEA</option>
            </select>
          </div>

          <div className="col-span-2 space-y-1">
            <label className="text-[8px] font-black text-emerald-500 uppercase px-1">Peso Entrada (Kg)</label>
            <div className="relative">
              <Scale className="absolute left-3 top-3 text-emerald-900" size={14} />
              <input 
                type="number" 
                step="0.1" 
                required 
                className="w-full bg-[#0f121a] border border-slate-800 p-2.5 pl-9 rounded-xl text-emerald-500 outline-none text-xs font-bold"
                value={formData.pesoEntrada}
                onChange={e => setFormData({...formData, pesoEntrada: e.target.value})}
              />
            </div>
          </div>

          <div className="col-span-3 flex gap-2">
            <button 
              type="submit" 
              className="flex-1 bg-cyan-600 hover:bg-cyan-500 text-white font-black text-[10px] py-3 rounded-xl transition-all shadow-lg uppercase flex items-center justify-center gap-2"
            >
              <Plus size={16} /> Adicionar Animal
            </button>
          </div>
        </form>
      </div>

      {/* TABELA DE ANIMAIS */}
      <div className="flex-1 min-h-0 bg-[#161922] rounded-[2rem] border border-slate-800/50 shadow-2xl overflow-hidden flex flex-col">
        <div className="overflow-auto flex-1 custom-scrollbar"> 
          <table className="w-full text-left text-[10px]">
            <thead className="bg-black/30 text-slate-500 font-black uppercase text-[8px] sticky top-0 z-10 backdrop-blur-md">
              <tr>
                <th className="p-4">BRINCO</th>
                <th className="p-4">LOTE ATUAL</th>
                <th className="p-4">RAÇA</th>
                <th className="p-4">SEXO</th>
                <th className="p-4 text-center">PESO INICIAL</th>
                <th className="p-4">DATA ENTRADA</th>
                <th className="p-4 text-center">AÇÕES</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/30">
              {animais.map((a) => (
                <tr key={a.id} className="hover:bg-slate-800/10 h-[55px] transition-colors group">
                  <td className="p-4">
                    <span className="bg-slate-800 text-white px-3 py-1.5 rounded-lg font-black text-xs border border-slate-700 group-hover:border-cyan-500 transition-colors">
                      {a.brinco}
                    </span>
                  </td>
                  <td className="p-4 font-black text-cyan-500 uppercase">{a.loteId}</td>
                  <td className="p-4 text-slate-300 font-medium uppercase">{a.raca}</td>
                  <td className="p-4">
                    <span className={`text-[9px] font-black px-2 py-1 rounded-full border ${a.sexo === 'Macho' ? 'text-blue-400 border-blue-400/20 bg-blue-400/5' : 'text-pink-400 border-pink-400/20 bg-pink-400/5'}`}>
                      {a.sexo.toUpperCase()}
                    </span>
                  </td>
                  <td className="p-4 text-emerald-400 font-black text-center text-xs">{a.pesoEntrada} Kg</td>
                  <td className="p-4 text-slate-500 font-bold">{a.dataEntrada?.split('-').reverse().join('/')}</td>
                  <td className="p-4 text-center">
                    <button 
                      onClick={() => { if(confirm('Remover animal?')) deleteDoc(doc(db, 'animais', a.id)) }}
                      className="text-slate-600 hover:text-red-500 p-2 transition-colors"
                    >
                      <Trash2 size={16}/>
                    </button>
                  </td>
                </tr>
              ))}
              {animais.length === 0 && (
                <tr>
                  <td colSpan={7} className="p-20 text-center text-slate-600 italic uppercase font-black tracking-widest text-xs">
                    Nenhum animal identificado {selectedLote ? `no lote ${selectedLote}` : ''}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        
        {/* RESUMO NO RODAPÉ DA TABELA */}
        <div className="p-4 bg-black/20 border-t border-slate-800/50 flex justify-between items-center shrink-0">
          <div className="flex gap-6">
            <div className="flex flex-col">
              <span className="text-[8px] font-black text-slate-500 uppercase">Total Animais</span>
              <span className="text-sm font-black text-white">{animais.length} Cabeças</span>
            </div>
            <div className="flex flex-col">
              <span className="text-[8px] font-black text-slate-500 uppercase">Média Peso Entrada</span>
              <span className="text-sm font-black text-emerald-400">
                {animais.length > 0 ? (animais.reduce((acc, a) => acc + (a.pesoEntrada || 0), 0) / animais.length).toFixed(1) : 0} Kg
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2 text-slate-500 text-[10px] font-black">
            <Check size={14} className="text-emerald-500" /> DADOS SINCRONIZADOS COM FIREBASE
          </div>
        </div>
      </div>
    </div>
  );
}
