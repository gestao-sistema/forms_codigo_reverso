// ── Service Layer: Autenticação (mock localStorage) ──────────────────────────
//
// Espelha o padrão de apiService: interface pública + implementação injetável.
// Para plugar Supabase Auth: implementar IAuthService e exportar no lugar.
// Componentes NUNCA acessam localStorage direto — sempre via este serviço.
// ─────────────────────────────────────────────────────────────────────────────

import type { Usuario, UsuarioAutenticado } from '../types';

const LS_USUARIOS = 'cr_usuarios';
const LS_SESSAO = 'cr_sessao';

const delay = (ms = 400) => new Promise<void>((r) => setTimeout(r, ms));
const uuid = (): string => crypto.randomUUID();

export class AuthError extends Error {}

export interface IAuthService {
  login(usuario: string, senha: string): Promise<UsuarioAutenticado>;
  logout(): Promise<void>;
  /** Lê sessão atual do storage (síncrono). null se deslogado. */
  getSessao(): UsuarioAutenticado | null;
  listarUsuarios(): Promise<Usuario[]>;
  criarUsuario(data: Omit<Usuario, 'id'>): Promise<Usuario>;
  atualizarUsuario(id: string, data: Partial<Omit<Usuario, 'id'>>): Promise<Usuario>;
  removerUsuario(id: string): Promise<void>;
}

// ── Seed inicial (dev). TODO: hash de senha ao integrar backend. ─────────────
const SEED: Usuario[] = [
  { id: uuid(), nome: 'Administrador',    usuario: 'admin',     senha: 'admin123',     perfil: 'ADMIN' },
  { id: uuid(), nome: 'Operador Alinare', usuario: 'alinare',   senha: 'alinare123',   perfil: 'Alinare' },
  { id: uuid(), nome: 'Operador Novitah', usuario: 'novitah',   senha: 'novitah123',   perfil: 'Novitah' },
  { id: uuid(), nome: 'Expedição',        usuario: 'expedicao', senha: 'expedicao123', perfil: 'Expedicao' },
];

function lerUsuarios(): Usuario[] {
  const raw = localStorage.getItem(LS_USUARIOS);
  if (!raw) {
    localStorage.setItem(LS_USUARIOS, JSON.stringify(SEED));
    return [...SEED];
  }
  try {
    return JSON.parse(raw) as Usuario[];
  } catch {
    localStorage.setItem(LS_USUARIOS, JSON.stringify(SEED));
    return [...SEED];
  }
}

function gravarUsuarios(lista: Usuario[]): void {
  localStorage.setItem(LS_USUARIOS, JSON.stringify(lista));
}

const semSenha = (u: Usuario): UsuarioAutenticado => {
  const { senha: _senha, ...rest } = u;
  return rest;
};

const authService: IAuthService = {
  async login(usuario, senha) {
    await delay();
    const encontrado = lerUsuarios().find(
      (u) => u.usuario === usuario.trim() && u.senha === senha
    );
    if (!encontrado) {
      throw new AuthError('Usuário ou senha inválidos.');
    }
    const sessao = semSenha(encontrado);
    localStorage.setItem(LS_SESSAO, JSON.stringify(sessao));
    return sessao;
  },

  async logout() {
    await delay(150);
    localStorage.removeItem(LS_SESSAO);
  },

  getSessao() {
    const raw = localStorage.getItem(LS_SESSAO);
    if (!raw) return null;
    try {
      return JSON.parse(raw) as UsuarioAutenticado;
    } catch {
      return null;
    }
  },

  async listarUsuarios() {
    await delay(200);
    return lerUsuarios();
  },

  async criarUsuario(data) {
    await delay(300);
    const lista = lerUsuarios();
    if (lista.some((u) => u.usuario === data.usuario.trim())) {
      throw new AuthError('Já existe um usuário com esse login.');
    }
    const novo: Usuario = { ...data, usuario: data.usuario.trim(), id: uuid() };
    gravarUsuarios([...lista, novo]);
    return novo;
  },

  async atualizarUsuario(id, data) {
    await delay(300);
    const lista = lerUsuarios();
    const i = lista.findIndex((u) => u.id === id);
    if (i === -1) throw new AuthError('Usuário não encontrado.');
    // Admin padrão (login 'admin') não pode ter login/perfil alterados
    if (lista[i].usuario === 'admin' && (data.usuario || data.perfil)) {
      throw new AuthError('Não é possível alterar login ou perfil do administrador padrão.');
    }
    // Login duplicado (exceto ele mesmo)
    if (data.usuario && lista.some((u) => u.usuario === data.usuario!.trim() && u.id !== id)) {
      throw new AuthError('Já existe um usuário com esse login.');
    }
    const atualizado: Usuario = { ...lista[i], ...data };
    if (data.usuario) atualizado.usuario = data.usuario.trim();
    gravarUsuarios([...lista.slice(0, i), atualizado, ...lista.slice(i + 1)]);
    return atualizado;
  },

  async removerUsuario(id) {
    await delay(300);
    const lista = lerUsuarios();
    const alvo = lista.find((u) => u.id === id);
    if (alvo && alvo.usuario === 'admin') {
      throw new AuthError('Não é possível remover o administrador padrão.');
    }
    gravarUsuarios(lista.filter((u) => u.id !== id));
  },
};

export default authService;
