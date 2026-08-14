// ── Service Layer: Autenticação (Supabase) ────────────────────────────────────
//
// Usuários na tabela `usuarios` do Supabase. Login é feito no Supabase e
// a sessão persiste no localStorage do Supabase Auth.
// Componentes NUNCA acessam o banco diretamente — sempre via este serviço.
// ─────────────────────────────────────────────────────────────────────────────

import { supabase } from '../lib/supabase';
import type { Usuario, UsuarioAutenticado, Perfil } from '../types';

export class AuthError extends Error {}

export interface IAuthService {
  login(usuario: string, senha: string): Promise<UsuarioAutenticado>;
  logout(): Promise<void>;
  /** Lê sessão atual (síncrono). null se deslogado. */
  getSessao(): UsuarioAutenticado | null;
  listarUsuarios(): Promise<Usuario[]>;
  criarUsuario(data: Omit<Usuario, 'id'>): Promise<Usuario>;
  atualizarUsuario(id: string, data: Partial<Omit<Usuario, 'id'>>): Promise<Usuario>;
  removerUsuario(id: string): Promise<void>;
}

// ── Mapa linha → objeto Usuario ───────────────────────────────────────────────

interface UsuarioRow {
  id: string;
  nome: string;
  usuario: string;
  perfil: Perfil;
}

const semSenha = (u: Usuario): UsuarioAutenticado => {
  const { senha: _senha, ...rest } = u;
  return rest;
};

// ── Implementação ─────────────────────────────────────────────────────────────

const authService: IAuthService = {
  async login(usuario, senha) {
    const { data, error } = await supabase
      .from('usuarios')
      .select('*')
      .eq('usuario', usuario.trim())
      .single();

    if (error || !data) throw new AuthError('Usuário ou senha inválidos.');
    if (data.senha !== senha) throw new AuthError('Usuário ou senha inválidos.');

    const sessao = semSenha(data as Usuario);
    localStorage.setItem('cr_sessao', JSON.stringify(sessao));
    return sessao;
  },

  async logout() {
    localStorage.removeItem('cr_sessao');
  },

  getSessao() {
    const raw = localStorage.getItem('cr_sessao');
    if (!raw) return null;
    try {
      return JSON.parse(raw) as UsuarioAutenticado;
    } catch {
      return null;
    }
  },

  async listarUsuarios() {
    const { data, error } = await supabase
      .from('usuarios')
      .select('id, nome, usuario, perfil')
      .order('nome');
    if (error) throw new AuthError(error.message);
    // senha não volta na listagem; preenche vazio p/ compat de tipo
    return (data as UsuarioRow[]).map((r) => ({ ...r, senha: '' }));
  },

  async criarUsuario(data) {
    const { data: existente } = await supabase
      .from('usuarios')
      .select('id')
      .eq('usuario', data.usuario.trim())
      .maybeSingle();
    if (existente) throw new AuthError('Já existe um usuário com esse login.');

    const { data: novo, error } = await supabase
      .from('usuarios')
      .insert({ ...data, usuario: data.usuario.trim() })
      .select()
      .single();
    if (error) throw new AuthError(error.message);
    return novo as Usuario;
  },

  async atualizarUsuario(id, data) {
    // Admin padrão (login 'admin') não pode ter login/perfil alterados
    const { data: atual } = await supabase
      .from('usuarios')
      .select('usuario')
      .eq('id', id)
      .single();
    if (atual?.usuario === 'admin' && (data.usuario || data.perfil)) {
      throw new AuthError('Não é possível alterar login ou perfil do administrador padrão.');
    }
    // Login duplicado (exceto ele mesmo)
    if (data.usuario) {
      const { data: dup } = await supabase
        .from('usuarios')
        .select('id')
        .eq('usuario', data.usuario.trim())
        .neq('id', id)
        .maybeSingle();
      if (dup) throw new AuthError('Já existe um usuário com esse login.');
    }

    const payload: Record<string, unknown> = { ...data };
    if (data.usuario) payload.usuario = data.usuario.trim();
    // senha vazia não sobrescreve
    if (!payload.senha) delete payload.senha;

    const { data: atualizado, error } = await supabase
      .from('usuarios')
      .update(payload)
      .eq('id', id)
      .select()
      .single();
    if (error) throw new AuthError(error.message);
    return atualizado as Usuario;
  },

  async removerUsuario(id) {
    const { data: alvo } = await supabase
      .from('usuarios')
      .select('usuario')
      .eq('id', id)
      .single();
    if (alvo?.usuario === 'admin') {
      throw new AuthError('Não é possível remover o administrador padrão.');
    }

    const { error } = await supabase.from('usuarios').delete().eq('id', id);
    if (error) throw new AuthError(error.message);
  },
};

export default authService;
