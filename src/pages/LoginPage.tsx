// ── Tela de login ────────────────────────────────────────────────────────────
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { LogIn, Loader2, PackageOpen } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { homeDoPerfil } from '../lib/perfil';

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [usuario, setUsuario] = useState('');
  const [senha, setSenha] = useState('');
  const [erro, setErro] = useState('');
  const [enviando, setEnviando] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErro('');
    setEnviando(true);
    try {
      const sessao = await login(usuario, senha);
      toast.success(`Bem-vindo, ${sessao.nome}.`);
      navigate(homeDoPerfil(sessao.perfil), { replace: true });
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Falha ao entrar.';
      setErro(msg);
      toast.error(msg);
    } finally {
      setEnviando(false);
    }
  };

  const inputCls =
    'h-11 w-full px-3 rounded-lg border border-slate-300 bg-white text-sm text-slate-900 ' +
    'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors';

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-100 px-4">
      <div className="w-full max-w-sm bg-white rounded-2xl shadow-sm border border-slate-200 p-8">
        <div className="flex flex-col items-center mb-6">
          <div className="w-12 h-12 rounded-xl bg-slate-800 flex items-center justify-center mb-3">
            <PackageOpen className="w-6 h-6 text-blue-400" />
          </div>
          <h1 className="text-xl font-bold text-slate-900">Gestão de Logística Reversa</h1>
          <p className="text-sm text-slate-500 mt-1">Entre com suas credenciais</p>
        </div>

        <form onSubmit={onSubmit} className="space-y-4">
          <div className="flex flex-col">
            <label htmlFor="usuario" className="text-xs font-medium text-slate-500 mb-1">
              Usuário
            </label>
            <input
              id="usuario"
              type="text"
              autoComplete="username"
              value={usuario}
              onChange={(e) => setUsuario(e.target.value)}
              className={inputCls}
              required
            />
          </div>

          <div className="flex flex-col">
            <label htmlFor="senha" className="text-xs font-medium text-slate-500 mb-1">
              Senha
            </label>
            <input
              id="senha"
              type="password"
              autoComplete="current-password"
              value={senha}
              onChange={(e) => setSenha(e.target.value)}
              className={inputCls}
              required
            />
          </div>

          {erro && <p className="text-sm text-red-600">{erro}</p>}

          <button
            type="submit"
            disabled={enviando}
            className="h-11 w-full rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 transition-colors flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer"
          >
            {enviando ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <LogIn className="w-4 h-4" />
            )}
            Entrar
          </button>
        </form>
      </div>
    </div>
  );
}
