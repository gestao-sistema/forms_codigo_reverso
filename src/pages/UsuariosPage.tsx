// ── Gerenciamento de Usuários (admin only) ───────────────────────────────────
import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { Loader2, Plus, Pencil, Trash2, X, UserPlus } from 'lucide-react';
import authService from '../services/authService';
import { useAuth } from '../context/AuthContext';
import { TELAS, TELA_LABEL, isAdmin } from '../types';
import type { Usuario, Tela, UpdateUsuarioPayload } from '../types';

type FormState = {
  id?: string;
  nome: string;
  usuario: string;
  senha: string;
  telas: Tela[];
};

const VAZIO: FormState = { nome: '', usuario: '', senha: '', telas: [] };

export default function UsuariosPage() {
  const { user } = useAuth();
  const [lista, setLista] = useState<Usuario[]>([]);
  const [loading, setLoading] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [abrirForm, setAbrirForm] = useState(false);
  const [form, setForm] = useState<FormState>(VAZIO);
  const [modoEdicao, setModoEdicao] = useState(false);

  const editarSelf = modoEdicao && form.id === user?.id;
  const isAdminDefault = form.usuario === 'admin' && modoEdicao;

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
    setForm({ id: u.id, nome: u.nome, usuario: u.usuario, senha: '', telas: u.telas ?? [] });
    setModoEdicao(true);
    setAbrirForm(true);
  };

  const fecharForm = () => {
    setAbrirForm(false);
    setForm(VAZIO);
    setModoEdicao(false);
  };

  const toggleTela = (tela: Tela) => {
    setForm((prev) => {
      const tem = prev.telas.includes(tela);
      return {
        ...prev,
        telas: tem ? prev.telas.filter((t) => t !== tela) : [...prev.telas, tela],
      };
    });
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!form.telas || form.telas.length === 0) {
      toast.error('Selecione ao menos uma tela de acesso.');
      return;
    }

    setSalvando(true);
    try {
      if (modoEdicao && form.id) {
        const payload: UpdateUsuarioPayload = { nome: form.nome };
        if (!isAdminDefault) payload.usuario = form.usuario;
        if (!editarSelf && !isAdminDefault) payload.telas = form.telas;
        if (form.senha) payload.senha = form.senha;
        await authService.atualizarUsuario(form.id, payload);
        toast.success('Usuário atualizado.');
      } else {
        await authService.criarUsuario({
          nome: form.nome,
          usuario: form.usuario,
          senha: form.senha,
          telas: form.telas,
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

  const checkboxCls =
    'h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer';

  // Agrupamentos das telas p/ UI
  const grupos: { titulo: string; telas: Tela[] }[] = [
    { titulo: 'Dashboards', telas: ['dashboard-geral', 'dashboard-alinare', 'dashboard-novitah'] },
    { titulo: 'Formulários', telas: ['formulario-alinare', 'formulario-novitah'] },
    { titulo: 'Listas', telas: ['lista-geral', 'lista-alinare', 'lista-novitah'] },
    { titulo: 'Status', telas: ['status'] },
    { titulo: 'Administração', telas: ['usuarios'] },
  ];

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Usuários</h1>
          <p className="text-sm text-slate-500">Gerencie logins e telas de acesso.</p>
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
                  <th className="px-5 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wider">Acesso</th>
                  <th className="px-5 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wider text-center">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {lista.map((u) => (
                  <tr key={u.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="px-5 py-3 whitespace-nowrap text-sm font-medium text-slate-900">{u.nome}</td>
                    <td className="px-5 py-3 whitespace-nowrap text-sm text-slate-700">{u.usuario}</td>
                    <td className="px-5 py-3">
                      <div className="flex flex-wrap gap-1">
                        {isAdmin(u) ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-700">
                            Admin
                          </span>
                        ) : (
                          <>
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-700">
                              {u.telas.length} tela{u.telas.length !== 1 ? 's' : ''}
                            </span>
                            {u.telas.slice(0, 3).map((t) => (
                              <span
                                key={t}
                                className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-600"
                              >
                                {TELA_LABEL[t]}
                              </span>
                            ))}
                            {u.telas.length > 3 && (
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-slate-50 text-slate-500">
                                +{u.telas.length - 3}
                              </span>
                            )}
                          </>
                        )}
                      </div>
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
          <div className="w-full max-w-lg bg-white rounded-2xl shadow-xl border border-slate-200 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 sticky top-0 bg-white rounded-t-2xl">
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
                <input
                  id="u-login"
                  type="text"
                  value={form.usuario}
                  onChange={(e) => setForm({ ...form, usuario: e.target.value })}
                  className={inputCls + (isAdminDefault ? ' bg-slate-50 text-slate-500' : '')}
                  required
                  readOnly={isAdminDefault}
                />
              </div>
              <div className="flex flex-col">
                <label htmlFor="u-senha" className="text-xs font-medium text-slate-500 mb-1">
                  {modoEdicao ? 'Nova senha (deixe vazio para manter)' : 'Senha'}
                </label>
                <input id="u-senha" type="password" value={form.senha} onChange={(e) => setForm({ ...form, senha: e.target.value })} className={inputCls} required={!modoEdicao} minLength={modoEdicao ? undefined : 6} />
              </div>

              {/* Checklist de telas */}
              <div className="flex flex-col">
                <label className="text-xs font-medium text-slate-500 mb-2">
                  Telas de acesso {editarSelf && <span className="text-slate-400">(não editável — próprio usuário)</span>}
                </label>
                {editarSelf ? (
                  <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-500">
                    {isAdmin(user) ? 'Administrador (acesso total)' : `${user?.telas.length || 0} tela(s) selecionada(s)`}
                  </div>
                ) : (
                  <div className="space-y-3 rounded-lg border border-slate-200 p-3">
                    {grupos.map((grupo) => (
                      <div key={grupo.titulo}>
                        <p className="text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">{grupo.titulo}</p>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                          {grupo.telas.map((tela) => (
                            <label key={tela} className="flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-slate-50 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={form.telas.includes(tela)}
                                onChange={() => toggleTela(tela)}
                                className={checkboxCls}
                              />
                              <span className="text-sm text-slate-700">{TELA_LABEL[tela]}</span>
                            </label>
                          ))}
                        </div>
                      </div>
                    ))}
                    {form.telas.length === 0 && (
                      <p className="text-xs text-amber-600">Selecione ao menos uma tela.</p>
                    )}
                  </div>
                )}
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button type="button" onClick={fecharForm} className="h-10 px-4 rounded-lg border border-slate-300 text-slate-700 text-sm font-medium hover:bg-slate-50 transition-colors cursor-pointer">
                  Cancelar
                </button>
                <button type="submit" disabled={salvando || (!editarSelf && form.telas.length === 0)} className="h-10 px-4 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 transition-colors flex items-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer">
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
