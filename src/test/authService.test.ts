import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../lib/supabase', () => ({
  supabase: {
    auth: {
      signInWithPassword: vi.fn(),
      signOut: vi.fn(),
      getSession: vi.fn(),
      onAuthStateChange: vi.fn(),
    },
    functions: {
      invoke: vi.fn(),
    },
  },
}));

import { supabase } from '../lib/supabase';
import authService, { AuthError } from '../services/authService';

const mockUser = {
  id: 'uuid-1',
  email: 'admin@cr.internal',
  user_metadata: { nome: 'Administrador', usuario: 'admin', perfil: 'ADMIN' },
};

beforeEach(() => {
  vi.resetAllMocks();
});

describe('authService.login', () => {
  it('sucesso: chama signInWithPassword e retorna UsuarioAutenticado', async () => {
    (supabase.auth.signInWithPassword as any).mockResolvedValue({
      data: { user: mockUser },
      error: null,
    });

    const sessao = await authService.login('admin', 'admin123');

    expect(supabase.auth.signInWithPassword).toHaveBeenCalledWith({
      email: 'admin@cr.internal',
      password: 'admin123',
    });
    expect(sessao).toEqual({
      id: 'uuid-1',
      nome: 'Administrador',
      usuario: 'admin',
      perfil: 'ADMIN',
    });
  });

  it('erro: lança AuthError', async () => {
    (supabase.auth.signInWithPassword as any).mockResolvedValue({
      data: { user: null },
      error: { message: 'Invalid login credentials' },
    });

    await expect(authService.login('admin', 'errada')).rejects.toThrow(AuthError);
  });
});

describe('authService.logout', () => {
  it('chama signOut', async () => {
    await authService.logout();
    expect(supabase.auth.signOut).toHaveBeenCalled();
  });
});

describe('authService.getSessao', () => {
  it('sem sessão: retorna null', async () => {
    (supabase.auth.getSession as any).mockResolvedValue({ data: { session: null } });
    expect(await authService.getSessao()).toBeNull();
  });

  it('com sessão: retorna usuário', async () => {
    (supabase.auth.getSession as any).mockResolvedValue({
      data: { session: { user: mockUser } },
    });
    expect(await authService.getSessao()).toEqual({
      id: 'uuid-1',
      nome: 'Administrador',
      usuario: 'admin',
      perfil: 'ADMIN',
    });
  });
});

describe('CRUD via Edge Function', () => {
  it('listarUsuarios: invoca function', async () => {
    (supabase.functions.invoke as any).mockResolvedValue({
      data: { data: [{ id: '1', user_metadata: { nome: 'A', usuario: 'a', perfil: 'Alinare' } }] },
      error: null,
    });

    const res = await authService.listarUsuarios();
    expect(supabase.functions.invoke).toHaveBeenCalledWith('admin-usuarios', {
      body: { action: 'list' },
    });
    expect(res).toHaveLength(1);
    expect(res[0].nome).toBe('A');
  });

  it('criarUsuario: invoca function e formata payload', async () => {
    (supabase.functions.invoke as any).mockResolvedValue({
      data: { data: { id: '2', user_metadata: { nome: 'N', usuario: 'n', perfil: 'ADMIN' } } },
      error: null,
    });

    const res = await authService.criarUsuario({ nome: 'N', usuario: 'N ', senha: '123', perfil: 'ADMIN' });

    expect(supabase.functions.invoke).toHaveBeenCalledWith('admin-usuarios', {
      body: { action: 'create', payload: { nome: 'N', usuario: 'n', senha: '123', perfil: 'ADMIN' } },
    });
    expect(res.usuario).toBe('n');
  });

  it('atualizarUsuario: invoca function', async () => {
    (supabase.functions.invoke as any).mockResolvedValue({
      data: { data: { id: 'uuid-1', user_metadata: { nome: 'Novo' } } },
      error: null,
    });

    await authService.atualizarUsuario('uuid-1', { nome: 'Novo', usuario: ' Admin ' });

    expect(supabase.functions.invoke).toHaveBeenCalledWith('admin-usuarios', {
      body: { action: 'update', payload: { id: 'uuid-1', nome: 'Novo', usuario: 'admin' } },
    });
  });

  it('removerUsuario: invoca function', async () => {
    (supabase.functions.invoke as any).mockResolvedValue({ data: {}, error: null });
    await authService.removerUsuario('uuid-1');
    expect(supabase.functions.invoke).toHaveBeenCalledWith('admin-usuarios', {
      body: { action: 'delete', payload: { id: 'uuid-1' } },
    });
  });
});
