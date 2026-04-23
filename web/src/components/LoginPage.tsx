import { useState } from 'react';
import { auth } from '../lib/firebase';
import { signInWithEmailAndPassword, signOut } from 'firebase/auth';
import { LogIn, AlertCircle, Eye, EyeOff, MonitorPlay, ShieldCheck } from 'lucide-react';

const ADMIN_EMAIL = 'acfs1963@gmail.com';
const DEMO_EMAIL = 'demo@matadouro.ao';

const AUTHORIZED_USERS = [ADMIN_EMAIL, DEMO_EMAIL];

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const processLogin = async (uEmail: string, uPass: string) => {
    setError('');
    setLoading(true);

    try {
      const userCredential = await signInWithEmailAndPassword(auth, uEmail, uPass);
      const authenticatedEmail = userCredential.user.email?.toLowerCase();

      // Blindagem de entrada
      if (!authenticatedEmail || !AUTHORIZED_USERS.includes(authenticatedEmail)) {
        await signOut(auth);
        setError('ACESSO NEGADO: Dispositivo ou conta não autorizada.');
        setLoading(false);
        return;
      }
    } catch (err: any) {
      setError('Falha na autenticação. Verifique as suas credenciais.');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0f18] flex items-center justify-center p-4 font-sans text-center">
      <div className="bg-[#111827] p-10 rounded-[2.5rem] border border-white/5 w-full max-w-md shadow-2xl relative overflow-hidden">
        
        {/* Efeito de brilho de fundo */}
        <div className="absolute -top-24 -right-24 w-48 h-48 bg-[#54bece]/10 rounded-full blur-3xl" />
        
        <div className="relative mb-10 flex flex-col items-center">
          <div className="mb-4">
            <img 
              src="./img/lg_pgs01.png" 
              alt="Fazenda Kwanza Logo" 
              className="h-24 w-auto drop-shadow-[0_0_15px_rgba(84,190,206,0.3)]" 
            />
          </div>
          
          <h2 className="text-3xl font-black text-[#54bece] uppercase tracking-tighter italic">
            Matadouro <span className="text-[#54bece]">Gest Pro</span>
          </h2>
          <p className="text-slate-500 text-[10px] font-black uppercase tracking-[0.3em] mt-3">
            Portal de Gestão • Luanda
          </p>
        </div>

        <form 
          onSubmit={(e) => { e.preventDefault(); processLogin(email, password); }} 
          className="space-y-5 relative text-left"
        >
          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-500 uppercase ml-1">Utilizador</label>
            <input 
              type="email" 
              placeholder="exemplo@gmail.com"
              className="w-full bg-[#0a0f18] border border-white/10 p-4 rounded-2xl text-white outline-none focus:border-[#54bece] transition-all font-medium placeholder:text-slate-700"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-500 uppercase ml-1">Senha de Acesso</label>
            <div className="relative">
              <input 
                type={showPassword ? "text" : "password"} 
                placeholder="••••••••"
                className="w-full bg-[#0a0f18] border border-white/10 p-4 pr-12 rounded-2xl text-white outline-none focus:border-[#54bece] transition-all font-medium placeholder:text-slate-700"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 hover:text-[#54bece] transition-colors"
              >
                {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </div>
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
            className={`w-full bg-[#54bece] hover:bg-[#43a9b9] text-[#0a0f18] font-black py-5 rounded-2xl flex items-center justify-center gap-3 transition-all uppercase text-sm shadow-lg shadow-cyan-900/20 ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            {loading ? (
              <div className="w-6 h-6 border-4 border-[#0a0f18]/30 border-t-[#0a0f18] rounded-full animate-spin" />
            ) : (
              <>
                <LogIn size={20} /> Entrar no Sistema
              </>
            )}
          </button>
        </form>
        
        <div className="relative my-8">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-white/5"></div>
          </div>
          <div className="relative flex justify-center text-[10px] uppercase">
            <span className="bg-[#111827] px-4 text-slate-600 font-bold">Modo de Avaliação</span>
          </div>
        </div>

        <button 
          onClick={() => processLogin(DEMO_EMAIL, 'demo1234')}
          type="button"
          className="w-full bg-slate-800/30 hover:bg-slate-800/60 text-slate-300 font-bold py-4 rounded-2xl flex items-center justify-center gap-3 transition-all uppercase text-[11px] border border-white/5"
        >
          <MonitorPlay size={18} /> Aceder como Demonstração
        </button>

        <div className="mt-8 pt-8 border-t border-white/5 text-center">
          <p className="text-slate-600 text-[9px] uppercase font-bold tracking-[0.2em] flex items-center justify-center gap-2">
            <ShieldCheck size={12} className="text-[#54bece]/50" /> Proteção Whitelist Ativa
          </p>
        </div>
      </div>
    </div>
  );
}
