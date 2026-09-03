// ── Botão de perfil no header (desktop) ─────────────────────────────────────
// Dropdown: nome, badge Admin, "Alterar senha", "Sair"
// collapsed=true: versão compacta só ícone
import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { ChevronDown, KeyRound, LogOut, UserCircle } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { isAdmin } from '../../types';

interface PerfilButtonProps {
  collapsed?: boolean;
}

export default function PerfilButton({ collapsed = false }: PerfilButtonProps) {
  const { user, logout, alterarSenha } = useAuth();
  const navigate = useNavigate();

  const [aberto, setAberto] = useState(false);
  const [mostrarModalSenha, setMostrarModalSenha] = useState(false);
  const [senhaAtual, setSenhaAtual] = useState('');
  const [novaSenha, setNovaSenha] = useState('');
  const [confirmarSenha, setConfirmarSenha] = useState('');
  const [salvando, setSalvando] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Fecha dropdown ao clicar fora
  useEffect(() => {
    if (!aberto) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setAberto(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [aberto]);

  const handleLogout = async () => {
    setAberto(false);
    await logout();
    navigate('/login', { replace: true });
  };

  const abrirModal = () => {
    setAberto(false);
    setSenhaAtual('');
    setNovaSenha('');
    setConfirmarSenha('');
    setMostrarModalSenha(true);
  };

  const fecharModal = () => {
    setMostrarModalSenha(false);
    setSenhaAtual('');
    setNovaSenha('');
    setConfirmarSenha('');
  };

  const onSubmitSenha = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!senhaAtual) {
      toast.error('Informe a senha atual.');
      return;
    }
    if (novaSenha.length < 6) {
      toast.error('A senha deve ter pelo menos 6 caracteres.');
      return;
    }
    if (novaSenha !== confirmarSenha) {
      toast.error('As senhas não conferem.');
      return;
    }
    setSalvando(true);
    try {
      await alterarSenha(senhaAtual, novaSenha);
      toast.success('Senha atualizada com sucesso.');
      fecharModal();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro ao alterar senha.');
    } finally {
      setSalvando(false);
    }
  };

  if (!user) return null;

  const inputCls =
    'h-10 w-full px-3 rounded-lg border border-slate-300 bg-white text-sm text-slate-900 ' +
    'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors';

  return (
    <>
      {/* Botão dropdown */}
      <div ref={ref} className="relative">
        <button
          type="button"
          onClick={() => setAberto(!aberto)}
          title={collapsed ? user.nome : undefined}
          className={`flex items-center rounded-lg hover:bg-slate-100 transition-colors cursor-pointer ${
            collapsed ? 'justify-center p-2' : 'gap-2 px-3 py-2'
          }`}
        >
          {collapsed ? (
            <UserCircle className="w-6 h-6 text-slate-500" aria-hidden="true" />
          ) : (
            <>
              <span className="text-sm font-medium text-slate-700">{user.nome}</span>
              {isAdmin(user) && (
                <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-blue-100 text-blue-700">
                  Admin
                </span>
              )}
              <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${aberto ? 'rotate-180' : ''}`} />
            </>
          )}
        </button>

        {aberto && (
          <div className={`absolute bottom-full mb-1 w-56 bg-white rounded-xl shadow-lg border border-slate-200 py-1 z-50 ${
            collapsed ? 'left-0' : 'right-0'
          }`}>
            <div className="px-4 py-2 border-b border-slate-100">
              <p className="text-sm font-semibold text-slate-900 truncate">{user.nome}</p>
              <p className="text-xs text-slate-500 truncate">@{user.usuario}</p>
            </div>
            <button
              type="button"
              onClick={abrirModal}
              className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer"
            >
              <KeyRound className="w-4 h-4 text-slate-400" />
              Alterar senha
            </button>
            <button
              type="button"
              onClick={handleLogout}
              className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors cursor-pointer"
            >
              <LogOut className="w-4 h-4" />
              Sair
            </button>
          </div>
        )}
      </div>

      {/* Modal de alteração de senha */}
      {mostrarModalSenha && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
          <div className="w-full max-w-sm bg-white rounded-2xl shadow-xl border border-slate-200">
            <div className="px-6 py-4 border-b border-slate-200">
              <h2 className="text-lg font-semibold text-slate-900">Alterar senha</h2>
            </div>
            <form onSubmit={onSubmitSenha} className="px-6 py-5 space-y-4">
              <div className="flex flex-col">
                <label htmlFor="senha-atual" className="text-xs font-medium text-slate-500 mb-1">
                  Senha atual
                </label>
                <input
                  id="senha-atual"
                  type="password"
                  value={senhaAtual}
                  onChange={(e) => setSenhaAtual(e.target.value)}
                  className={inputCls}
                  required
                  autoFocus
                />
              </div>
              <div className="flex flex-col">
                <label htmlFor="nova-senha" className="text-xs font-medium text-slate-500 mb-1">
                  Nova senha
                </label>
                <input
                  id="nova-senha"
                  type="password"
                  value={novaSenha}
                  onChange={(e) => setNovaSenha(e.target.value)}
                  className={inputCls}
                  required
                  minLength={6}
                />
              </div>
              <div className="flex flex-col">
                <label htmlFor="confirmar-senha" className="text-xs font-medium text-slate-500 mb-1">
                  Confirmar nova senha
                </label>
                <input
                  id="confirmar-senha"
                  type="password"
                  value={confirmarSenha}
                  onChange={(e) => setConfirmarSenha(e.target.value)}
                  className={inputCls}
                  required
                  minLength={6}
                />
              </div>
              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={fecharModal}
                  className="h-10 px-4 rounded-lg border border-slate-300 text-slate-700 text-sm font-medium hover:bg-slate-50 transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={salvando}
                  className="h-10 px-4 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 transition-colors flex items-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer"
                >
                  {salvando ? 'Salvando...' : 'Salvar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
