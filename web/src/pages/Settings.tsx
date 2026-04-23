import { useState } from 'react';
import { UserPlus, Shield, Trash2 } from 'lucide-react';

interface UserAccess {
  id: string;
  email: string;
  role: 'admin' | 'tecnico' | 'visualizador';
  status: 'ativo' | 'pendente';
}

export default function Settings() {
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('tecnico');

  // Dados de exemplo (depois ligamos ao Firestore)
  const [users] = useState<UserAccess[]>([
    { id: '1', email: 'acfs1963@gmail.com', role: 'admin', status: 'ativo' },
    { id: '2', email: 'tecnico.viana@matadouro.com', role: 'tecnico', status: 'ativo' },
  ]);

  const handleAddUser = (e: React.FormEvent) => {
    e.preventDefault();
    console.log("Cadastrando:", { email, role });
    // Aqui virá a lógica de Firebase Auth
    setEmail('');
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div>
        <h1 className="text-3xl font-black text-white uppercase tracking-tighter italic">Configurações</h1>
        <p className="text-slate-500 text-xs uppercase tracking-widest mt-2">Gestão de Utilizadores e Permissões de Acesso</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Formulário de Cadastro */}
        <div className="bg-[#111827] p-6 rounded-[2rem] border border-white/5 shadow-xl h-fit">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 bg-emerald-500/10 rounded-lg">
              <UserPlus className="text-emerald-500" size={20} />
            </div>
            <h2 className="text-white font-bold uppercase text-sm">Novo Utilizador</h2>
          </div>

          <form onSubmit={handleAddUser} className="space-y-4">
            <div>
              <label className="text-[10px] font-black text-slate-500 uppercase ml-1">E-mail do Colaborador</label>
              <input 
                type="email" 
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="ex: operador@matadouro.com"
                className="w-full bg-[#0a0f18] border border-white/10 p-3 rounded-xl text-white outline-none focus:border-emerald-500 transition-all text-sm"
                required
              />
            </div>

            <div>
              <label className="text-[10px] font-black text-slate-500 uppercase ml-1">Nível de Acesso</label>
              <select 
                value={role}
                onChange={(e) => setRole(e.target.value)}
                className="w-full bg-[#0a0f18] border border-white/10 p-3 rounded-xl text-white outline-none focus:border-emerald-500 transition-all text-sm appearance-none"
              >
                <option value="admin">Administrador (Total)</option>
                <option value="tecnico">Técnico (Pesagem/Abate)</option>
                <option value="visualizador">Visualizador (Apenas Ver)</option>
              </select>
            </div>

            <button 
              type="submit"
              className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-black py-4 rounded-xl flex items-center justify-center gap-2 transition-all uppercase text-xs mt-2"
            >
              Conceder Acesso
            </button>
          </form>
        </div>

        {/* Lista de Utilizadores */}
        <div className="lg:col-span-2 bg-[#111827] rounded-[2rem] border border-white/5 overflow-hidden shadow-xl">
          <table className="w-full text-left">
            <thead className="bg-white/5">
              <tr>
                <th className="p-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Utilizador</th>
                <th className="p-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Cargo</th>
                <th className="p-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Estado</th>
                <th className="p-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {users.map((u) => (
                <tr key={u.id} className="hover:bg-white/[0.02] transition-colors">
                  <td className="p-5">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center text-xs font-bold text-slate-400">
                        {u.email[0].toUpperCase()}
                      </div>
                      <span className="text-white text-sm font-medium">{u.email}</span>
                    </div>
                  </td>
                  <td className="p-5">
                    <div className="flex items-center gap-2">
                      <Shield size={14} className={u.role === 'admin' ? 'text-amber-500' : 'text-blue-400'} />
                      <span className="text-slate-300 text-xs uppercase font-bold">{u.role}</span>
                    </div>
                  </td>
                  <td className="p-5">
                    <span className="px-3 py-1 bg-emerald-500/10 text-emerald-500 text-[9px] font-black uppercase rounded-full border border-emerald-500/20">
                      {u.status}
                    </span>
                  </td>
                  <td className="p-5 text-right">
                    <button className="text-slate-600 hover:text-red-500 transition-colors p-2">
                      <Trash2 size={18} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
