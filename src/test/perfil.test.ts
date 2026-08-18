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
  it('só status → /admin/status', () => {
    expect(homeDoUsuario(usuario(['status']))).toBe('/admin/status');
  });
});

describe('navItemsDoUsuario', () => {
  it('admin vê todos os itens', () => {
    const items = navItemsDoUsuario(usuario(['usuarios']));
    // Admin vê tudo: 10 telas (dashboard, lista, formularios, status, usuarios)
    expect(items.length).toBe(10);
    expect(items.map(i => i.to)).toEqual([
      '/admin/dashboard',
      '/admin/dashboard?empresa=Alinare',
      '/admin/dashboard?empresa=Novitah',
      '/admin/lista',
      '/admin/lista?empresa=Alinare',
      '/admin/lista?empresa=Novitah',
      '/admin/alinare',
      '/admin/novitah',
      '/admin/status',
      '/admin/usuarios',
    ]);
    items.forEach(i => expect(i.icon).toBeTruthy());
  });

  it('user com telas parciais vê apenas as autorizadas', () => {
    const items = navItemsDoUsuario(usuario(['dashboard-alinare', 'formulario-alinare', 'status']));
    expect(items.map(i => i.to)).toEqual([
      '/admin/dashboard?empresa=Alinare',
      '/admin/alinare',
      '/admin/status',
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
