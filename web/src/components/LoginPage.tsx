import { useState } from 'react';
import { auth } from '../lib/firebase';
import { signInWithEmailAndPassword, signOut } from 'firebase/auth';
import { Lock, LogIn, AlertCircle } from 'lucide-react';

// BLINDAGEM: Apenas estes emails podem entrar no sistema
const AUTHORIZED_USERS = [
  'acfs1963@gmail.com', // O teu email principal
];

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const userEmail = userCredential.user.email?.toLowerCase();

      if (!userEmail || !AUTHORIZED_USERS.includes(userEmail)) {
        await signOut(auth);
        setError('ACESSO NEGADO: Esta instalação não está autorizada para este utilizador.');
        setLoading(false);
        return;
      }
    } catch (err: any) {
      setError('Falha na autenticação. Verifica as tuas credenciais.');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0f18] flex items-center justify-center p-4 font-sans">
      <div className="bg-[#111827] p-10 rounded-[2.5rem] border border-white/5 w-full max-w-md shadow-2xl relative overflow-hidden text-center">
        
        {/* Decoração de Fundo */}
        <div className="absolute -top-24 -right-24 w-48 h-48 bg-[#0ea5e9]/10 rounded-full blur-3xl" />
        
        {/* HEADER COM LOGOTIPO DO NAVBAR */}
        <div className="relative mb-10 flex flex-col items-center">
          <div className="mb-4">
            <img 
              src="./img/lg_pgs01.png" 
              alt="Fazenda Kwanza Logo" 
              className="h-24 w-auto drop-shadow-[0_0_15px_rgba(14,165,233,0.3)]" 
            />
          </div>
          
          <h2 className="text-3xl font-black text-[#54bece] uppercase tracking-tighter italic">
            Matadouro <span className="text-[#54bece]">Gest Pro</span>
          </h2>
          <p className="text-slate-500 text-[10px] font-black uppercase tracking-[0.3em] mt-3">
            Portal de Gestão • Luanda
          </p>
        </div>

        {/* FORMULÁRIO */}
        <form onSubmit={handleLogin} className="space-y-5 relative text-left">
          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-500 uppercase ml-1">Utilizador Autorizado</label>
            <input 
              type="email" 
              placeholder="teu-email@exemplo.com"
              className="w-full bg-[#0a0f18] border border-white/10 p-4 rounded-2xl text-white outline-none focus:border-[#0ea5e9] transition-all font-medium placeholder:text-slate-700"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-500 uppercase ml-1">Senha de Acesso</label>
            <input 
              type="password" 
              placeholder="••••••••"
              className="w-full bg-[#0a0f18] border border-white/10 p-4 rounded-2xl text-white outline-none focus:border-[#0ea5e9] transition-all font-medium placeholder:text-slate-700"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          {error && (
            <div className="flex items-start gap-3 bg-red-500/10 border border-red-500/20 p-4 rounded-2xl animate-in fade-in zoom-in duration-300">
              <AlertCircle className="text-red-500 shrink-0" size={18} />
              <p className="text-red-500 text-[10px] font-black uppercase leading-tight">{error}</p>
            </div>
          )}

          <button 
            type="submit"
            disabled={loading}
            className={`w-full bg-[#0ea5e9] hover:bg-[#0284c7] text-white font-black py-5 rounded-2xl flex items-center justify-center gap-3 transition-all uppercase text-sm shadow-lg shadow-cyan-900/40 ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            {loading ? (
              <div className="w-6 h-6 border-4 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <>
                <LogIn size={20} /> Autenticar no Sistema
              </>
            )}
          </button>
        </form>
        
        <div className="mt-8 pt-8 border-t border-white/5 text-center">
          <p className="text-slate-600 text-[9px] uppercase font-bold tracking-[0.2em] flex items-center justify-center gap-2">
            <Lock size={12} /> Dispositivo Protegido por Whitelist
          </p>
        </div>
      </div>
    </div>
  );
}
