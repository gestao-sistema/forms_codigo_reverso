import { describe, it, expect } from 'vitest';
import { homeDoPerfil, navItemsDoPerfil } from '../lib/perfil';
import type { Perfil } from '../types';

describe('homeDoPerfil', () => {
  it('Alinare → /admin/alinare', () => {
    expect(homeDoPerfil('Alinare')).toBe('/admin/alinare');
  });
  it('Novitah → /admin/novitah', () => {
    expect(homeDoPerfil('Novitah')).toBe('/admin/novitah');
  });
  it('ADMIN → /admin/dashboard', () => {
    expect(homeDoPerfil('ADMIN')).toBe('/admin/dashboard');
  });
  it('Expedicao → /admin/dashboard', () => {
    expect(homeDoPerfil('Expedicao')).toBe('/admin/dashboard');
  });
});

describe('navItemsDoPerfil', () => {
  it('ADMIN tem 5 itens com rotas corretas', () => {
    const items = navItemsDoPerfil('ADMIN');
    expect(items).toHaveLength(5);
    const paths = items.map(i => i.to);
    expect(paths).toEqual([
      '/admin/dashboard',
      '/admin/lista',
      '/admin/alinare',
      '/admin/novitah',
      '/admin/usuarios',
    ]);
    items.forEach(i => expect(i.icon).toBeTruthy());
  });

  it('Expedicao tem 2 itens: Dashboard e Lista', () => {
    const items = navItemsDoPerfil('Expedicao');
    expect(items).toHaveLength(2);
    expect(items.map(i => i.to)).toEqual(['/admin/dashboard', '/admin/lista']);
  });

  it('Alinare tem 3 itens: Formulário, Status, Dashboard', () => {
    const items = navItemsDoPerfil('Alinare');
    expect(items).toHaveLength(3);
    expect(items.map(i => i.to)).toEqual(['/admin/alinare', '/admin/status', '/admin/dashboard']);
    expect(items[0].label).toBe('Formulário');
  });

  it('Novitah tem 3 itens: Formulário, Status, Dashboard', () => {
    const items = navItemsDoPerfil('Novitah');
    expect(items).toHaveLength(3);
    expect(items.map(i => i.to)).toEqual(['/admin/novitah', '/admin/status', '/admin/dashboard']);
    expect(items[0].label).toBe('Formulário');
  });

  it('todos os perfis retornam itens com icon definido', () => {
    const perfis: Perfil[] = ['ADMIN', 'Alinare', 'Novitah', 'Expedicao'];
    perfis.forEach(p => {
      navItemsDoPerfil(p).forEach(item => {
        expect(item.icon).toBeTruthy();
        expect(typeof item.label).toBe('string');
        expect(item.label.length).toBeGreaterThan(0);
      });
    });
  });
});
