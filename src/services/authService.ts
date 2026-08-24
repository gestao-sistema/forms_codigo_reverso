// ── Service Layer: Autenticação (Supabase Auth) ────────────────────────────────
//
// Usa a API de auth do Supabase (JWT nativo).
// Login: signInWithPassword com email interno `{username}@cr.internal`
// CRUD usuários: Edge Function `admin-usuarios` (service_role server-side).
// Sessão: JWT + refresh token, gerenciado pelo SDK Supabase.
// ─────────────────────────────────────────────────────────────────────────────

import { supabase } from '../lib/supabase';
import { LEGADO_PERFIL_TELAS } from '../types';
import type { Usuario, UsuarioAutenticado, CreateUsuarioPayload, UpdateUsuarioPayload, Tela } from '../types';

export class AuthError extends Error {}

export interface IAuthService {
  login(usuario: string, senha: string): Promise<UsuarioAutenticado>;
  logout(): Promise<void>;
  /** Lê sessão atual (async via Supabase). null se deslogado. */
  getSessao(): Promise<UsuarioAutenticado | null>;
  /** Escuta mudanças de estado (mount inicial + refresh). Retorna unsubscribe. */
  onMudancaSessao(cb: (user: UsuarioAutenticado | null) => void): () => void;
  listarUsuarios(): Promise<Usuario[]>;
  criarUsuario(data: CreateUsuarioPayload): Promise<Usuario>;
  atualizarUsuario(id: string, data: UpdateUsuarioPayload): Promise<Usuario>;
  removerUsuario(id: string): Promise<void>;
  /** Altera a própria senha (usuário logado). */
  alterarSenha(senhaAtual: string, novaSenha: string): Promise<void>;
}

// ── Helpers ─────────────────────────────────────────────────────────────────────

/**
 * Extrai a mensagem de erro real do corpo da resposta quando a Edge Function
 * devolve non-2xx (o SDK só expõe "Edge Function returned a non-2xx status code").
 */
async function msgErroFuncoes(error: unknown): Promise<string> {
  const ctx = (error as any)?.context;
  if (ctx?.json) {
    try {
      const body = await ctx.json();
      if (body?.error) return body.error;
    } catch { /* corpo não é JSON */ }
  }
  return (error as any)?.message ?? 'Erro desconhecido.';
}

/**
 * Normaliza telas vindas do metadata. Se vier `perfil` legado (sem `telas`),
 * migra para as telas equivalentes.
 */
function normalizarTelas(md: Record<string, any> = {}): Tela[] {
  if (Array.isArray(md.telas) && md.telas.length > 0) return md.telas as Tela[];
  const legado = md.perfil ?? 'Alinare';
  return LEGADO_PERFIL_TELAS[legado] ?? LEGADO_PERFIL_TELAS.Alinare;
}

/** Converte User do Supabase em UsuarioAutenticado (shape mantido para a app) */
function toSession(u: any): UsuarioAutenticado {
  return {
    id: u.id,
    nome: u.user_metadata?.nome ?? u.email,
    usuario: u.user_metadata?.usuario ?? u.email?.split('@')[0],
    telas: normalizarTelas(u.user_metadata),
  } as UsuarioAutenticado;
}

function toUsuario(u: any): Usuario {
  return {
    id: u.id,
    nome: u.user_metadata?.nome ?? u.nome ?? '',
    usuario: u.user_metadata?.usuario ?? u.usuario ?? '',
    telas: normalizarTelas(u.user_metadata ?? u),
  };
}

// ── Implementação ──────────────────────────────────────────────────────────────

const authService: IAuthService = {
  async login(usuario, senha) {
    const email = `${usuario.trim().toLowerCase()}@cr.internal`;

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password: senha,
    });

    if (error || !data.user) {
      throw new AuthError('Usuário ou senha inválidos.');
    }

    return toSession(data.user);
  },

  async logout() {
    await supabase.auth.signOut();
  },

  async getSessao() {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) return null;
    return toSession(session.user);
  },

  onMudancaSessao(cb) {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      cb(session?.user ? toSession(session.user) : null);
    });
    return () => subscription.unsubscribe();
  },

  async listarUsuarios() {
    const { data, error } = await supabase.functions.invoke('admin-usuarios', {
      body: { action: 'list' },
    });

    if (error) {
      const msg = await msgErroFuncoes(error);
      // Fallback local caso a Edge Function esteja fora do ar
      if (msg.includes('fetch') || msg.includes('network') || msg.includes('ECONNREFUSED')) {
        throw new AuthError('Serviço de usuários indisponível no momento.');
      }
      throw new AuthError(msg);
    }
    return (data?.data ?? []).map((u: any) => toUsuario(u));
  },

  async criarUsuario(data) {
    const { data: result, error } = await supabase.functions.invoke('admin-usuarios', {
      body: { action: 'create', payload: { ...data, usuario: data.usuario.trim().toLowerCase() } },
    });

    if (error) throw new AuthError(await msgErroFuncoes(error));
    return toUsuario(result.data);
  },

  async atualizarUsuario(id, data: UpdateUsuarioPayload) {
    const payload: any = { id };
    if (data.nome) payload.nome = data.nome;
    if (data.telas) payload.telas = data.telas;
    if (data.usuario) payload.usuario = data.usuario.trim().toLowerCase();
    if (data.senha) payload.senha = data.senha;

    const { data: result, error } = await supabase.functions.invoke('admin-usuarios', {
      body: { action: 'update', payload },
    });

    if (error) throw new AuthError(await msgErroFuncoes(error));
    return toUsuario(result.data);
  },

  async removerUsuario(id) {
    const { error } = await supabase.functions.invoke('admin-usuarios', {
      body: { action: 'delete', payload: { id } },
    });

    if (error) throw new AuthError(error.message);
  },

  async alterarSenha(senhaAtual: string, novaSenha: string) {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session?.user) throw new AuthError('Sessão expirada. Faça login novamente.');

    // Verifica senha atual re-autenticando
    const { error: authError } = await supabase.auth.signInWithPassword({
      email: session.user.email!,
      password: senhaAtual,
    });
    if (authError) throw new AuthError('Senha atual incorreta.');

    const { error } = await supabase.auth.updateUser({ password: novaSenha });
    if (error) throw new AuthError(error.message);
  },
};

export default authService;
