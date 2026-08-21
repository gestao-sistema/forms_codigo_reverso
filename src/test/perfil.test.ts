import { describe, it, expect } from 'vitest';
import { homeDoUsuario, navItemsDoUsuario } from '../lib/perfil';
import type { UsuarioAutenticado, Tela } from '../types';

function usuario(telas: Tela[]): UsuarioAutenticado {
  return { id: '1', nome: 'User', usuario: 'user', telas };
}

describe('homeDoUsuario', () => {
  it('admin (com tela usuarios) → /admin/dashboard', () => {
    expect(homeDoUsuario(usuario(['usuarios', 'dashboard-geral']))).toBe('/admin/dashboard');
  });
  it('dashboard-alinare → dashboard com query', () => {
    expect(homeDoUsuario(usuario(['dashboard-alinare']))).toBe('/admin/dashboard?empresa=Alinare');
  });
  it('dashboard-novitah → dashboard com query', () => {
    expect(homeDoUsuario(usuario(['dashboard-novitah']))).toBe('/admin/dashboard?empresa=Novitah');
  });
  it('só formulario-alinare → /admin/alinare', () => {
    expect(homeDoUsuario(usuario(['formulario-alinare']))).toBe('/admin/alinare');
  });
  it('só lista-geral → /admin/lista', () => {
    expect(homeDoUsuario(usuario(['lista-geral']))).toBe('/admin/lista');
  });
  it('só status-geral → /admin/status', () => {
    expect(homeDoUsuario(usuario(['status-geral']))).toBe('/admin/status');
  });
  it('status-alinare → status com query', () => {
    expect(homeDoUsuario(usuario(['status-alinare']))).toBe('/admin/status?empresa=Alinare');
  });
});

describe('navItemsDoUsuario', () => {
  it('admin vê apenas itens gerais (sem variações por empresa)', () => {
    const items = navItemsDoUsuario(usuario(['usuarios']));
    expect(items.length).toBe(7);
    expect(items.map(i => i.to)).toEqual([
      '/admin/dashboard',
      '/admin/lista',
      '/admin/alinare',
      '/admin/novitah',
      '/admin/status',
      '/admin/kanban',
      '/admin/usuarios',
    ]);
    items.forEach(i => expect(i.icon).toBeTruthy());
  });

  it('user com telas parciais vê apenas as autorizadas', () => {
    const items = navItemsDoUsuario(usuario(['dashboard-alinare', 'formulario-alinare', 'status-alinare']));
    expect(items.map(i => i.to)).toEqual([
      '/admin/dashboard?empresa=Alinare',
      '/admin/alinare',
      '/admin/status?empresa=Alinare',
    ]);
  });

  it('user sem tela usuarios não vê item de usuários', () => {
    const items = navItemsDoUsuario(usuario(['dashboard-geral', 'lista-geral']));
    expect(items.map(i => i.to)).not.toContain('/admin/usuarios');
  });

  it('todos os itens retornam icon definido e label não vazio', () => {
    const telas: Tela[] = ['dashboard-geral', 'lista-alinare', 'formulario-novitah'];
    navItemsDoUsuario(usuario(telas)).forEach(item => {
      expect(item.icon).toBeTruthy();
      expect(typeof item.label).toBe('string');
      expect(item.label.length).toBeGreaterThan(0);
    });
  });
});
