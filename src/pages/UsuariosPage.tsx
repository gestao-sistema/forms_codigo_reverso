// ── Gerenciamento de Usuários (admin only) ───────────────────────────────────
import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { Loader2, Plus, Pencil, Trash2, X, UserPlus } from 'lucide-react';
import authService from '../services/authService';
import type { Usuario, Perfil, UpdateUsuarioPayload } from '../types';
import { PERFIL_LABEL } from '../types';

type FormState = {
  id?: string;
  nome: string;
  usuario: string;
  senha: string;
  perfil: Perfil;
};

const VAZIO: FormState = { nome: '', usuario: '', senha: '', perfil: 'Alinare' };
const PERFIS: Perfil[] = ['ADMIN', 'Alinare', 'Novitah', 'Expedicao'];

export default function UsuariosPage() {
  const [lista, setLista] = useState<Usuario[]>([]);
  const [loading, setLoading] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [abrirForm, setAbrirForm] = useState(false);
  const [form, setForm] = useState<FormState>(VAZIO);
  const [modoEdicao, setModoEdicao] = useState(false);

  const carregar = async () => {
    setLoading(true);
    try {
      const dados = await authService.listarUsuarios();
      setLista(dados);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro ao carregar usuários.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    carregar();
  }, []);

  const abrirNovo = () => {
    setForm(VAZIO);
    setModoEdicao(false);
    setAbrirForm(true);
  };

  const abrirEditar = (u: Usuario) => {
    setForm({ id: u.id, nome: u.nome, usuario: u.usuario, senha: '', perfil: u.perfil });
    setModoEdicao(true);
    setAbrirForm(true);
  };

  const fecharForm = () => {
    setAbrirForm(false);
    setForm(VAZIO);
    setModoEdicao(false);
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSalvando(true);
    try {
      if (modoEdicao && form.id) {
        const payload: UpdateUsuarioPayload = {
          nome: form.nome,
          usuario: form.usuario,
          perfil: form.perfil,
        };
        if (form.senha) payload.senha = form.senha;
        await authService.atualizarUsuario(form.id, payload);
        toast.success('Usuário atualizado.');
      } else {
        await authService.criarUsuario({
          nome: form.nome,
          usuario: form.usuario,
          senha: form.senha,
          perfil: form.perfil,
        });
        toast.success('Usuário criado.');
      }
      fecharForm();
      await carregar();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro ao salvar usuário.');
    } finally {
      setSalvando(false);
    }
  };

  const onRemover = async (u: Usuario) => {
    if (!confirm(`Remover o usuário "${u.nome}"?`)) return;
    try {
      await authService.removerUsuario(u.id);
      toast.success('Usuário removido.');
      await carregar();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro ao remover usuário.');
    }
  };

  const inputCls =
    'h-10 w-full px-3 rounded-lg border border-slate-300 bg-white text-sm text-slate-900 ' +
    'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors';

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Usuários</h1>
          <p className="text-sm text-slate-500">Gerencie logins e perfis de acesso.</p>
        </div>
        <button
          type="button"
          onClick={abrirNovo}
          className="h-10 px-4 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 transition-colors flex items-center gap-2 cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          Novo usuário
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
          </div>
        ) : lista.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-slate-400">
            <UserPlus className="w-8 h-8 mb-2" />
            <p className="text-sm">Nenhum usuário cadastrado.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[640px]">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  <th className="px-5 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wider">Nome</th>
                  <th className="px-5 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wider">Login</th>
                  <th className="px-5 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wider">Perfil</th>
                  <th className="px-5 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wider text-center">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {lista.map((u) => (
                  <tr key={u.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="px-5 py-3 whitespace-nowrap text-sm font-medium text-slate-900">{u.nome}</td>
                    <td className="px-5 py-3 whitespace-nowrap text-sm text-slate-700">{u.usuario}</td>
                    <td className="px-5 py-3 whitespace-nowrap">
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-700">
                        {PERFIL_LABEL[u.perfil]}
                      </span>
                    </td>
                    <td className="px-5 py-3 whitespace-nowrap text-center">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          type="button"
                          onClick={() => abrirEditar(u)}
                          className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-200 hover:text-slate-700 transition-colors cursor-pointer"
                          aria-label={`Editar ${u.nome}`}
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => onRemover(u)}
                          disabled={u.usuario === 'admin'}
                          className="p-1.5 rounded-lg text-slate-500 hover:bg-red-100 hover:text-red-600 transition-colors disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
                          aria-label={`Remover ${u.nome}`}
                          title={u.usuario === 'admin' ? 'Administrador padrão não pode ser removido' : 'Remover'}
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {abrirForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
          <div className="w-full max-w-md bg-white rounded-2xl shadow-xl border border-slate-200">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
              <h2 className="text-lg font-semibold text-slate-900">
                {modoEdicao ? 'Editar usuário' : 'Novo usuário'}
              </h2>
              <button
                type="button"
                onClick={fecharForm}
                className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors cursor-pointer"
                aria-label="Fechar"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={onSubmit} className="px-6 py-5 space-y-4">
              <div className="flex flex-col">
                <label htmlFor="u-nome" className="text-xs font-medium text-slate-500 mb-1">Nome</label>
                <input id="u-nome" type="text" value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} className={inputCls} required />
              </div>
              <div className="flex flex-col">
                <label htmlFor="u-login" className="text-xs font-medium text-slate-500 mb-1">Login</label>
                <input id="u-login" type="text" value={form.usuario} onChange={(e) => setForm({ ...form, usuario: e.target.value })} className={inputCls} required />
              </div>
              <div className="flex flex-col">
                <label htmlFor="u-senha" className="text-xs font-medium text-slate-500 mb-1">
                  {modoEdicao ? 'Nova senha (deixe vazio para manter)' : 'Senha'}
                </label>
                <input id="u-senha" type="password" value={form.senha} onChange={(e) => setForm({ ...form, senha: e.target.value })} className={inputCls} required={!modoEdicao} />
              </div>
              <div className="flex flex-col">
                <label htmlFor="u-perfil" className="text-xs font-medium text-slate-500 mb-1">Perfil</label>
                <select id="u-perfil" value={form.perfil} onChange={(e) => setForm({ ...form, perfil: e.target.value as Perfil })} className={inputCls}>
                  {PERFIS.map((p) => (
                    <option key={p} value={p}>{PERFIL_LABEL[p]}</option>
                  ))}
                </select>
              </div>
              <div className="flex items-center justify-end gap-2 pt-2">
                <button type="button" onClick={fecharForm} className="h-10 px-4 rounded-lg border border-slate-300 text-slate-700 text-sm font-medium hover:bg-slate-50 transition-colors cursor-pointer">
                  Cancelar
                </button>
                <button type="submit" disabled={salvando} className="h-10 px-4 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 transition-colors flex items-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer">
                  {salvando && <Loader2 className="w-4 h-4 animate-spin" />}
                  Salvar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
