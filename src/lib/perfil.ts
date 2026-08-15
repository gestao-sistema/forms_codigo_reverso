// ── Helpers de perfil: rota inicial e itens de navegação ─────────────────────
import { BarChart3, ClipboardList, FileText, ListChecks, Users } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { Perfil } from '../types';

/** Rota para onde o usuário vai ao logar / ao acessar rota inválida. */
export function homeDoPerfil(perfil: Perfil): string {
  switch (perfil) {
    case 'Alinare':
      return '/admin/alinare';
    case 'Novitah':
      return '/admin/novitah';
    case 'ADMIN':
    case 'Expedicao':
    default:
      return '/admin/dashboard';
  }
}

export interface NavItem {
  to: string;
  label: string;
  icon: LucideIcon;
}

/** Itens da sidebar conforme perfil logado. */
export function navItemsDoPerfil(perfil: Perfil): NavItem[] {
  switch (perfil) {
    case 'ADMIN':
      return [
        { to: '/admin/dashboard', label: 'Dashboard', icon: BarChart3 },
        { to: '/admin/lista', label: 'Lista', icon: ClipboardList },
        { to: '/admin/alinare', label: 'Formulário Alinare', icon: FileText },
        { to: '/admin/novitah', label: 'Formulário Novitah', icon: FileText },
        { to: '/admin/usuarios', label: 'Usuários', icon: Users },
      ];
    case 'Expedicao':
      return [
        { to: '/admin/dashboard', label: 'Dashboard', icon: BarChart3 },
        { to: '/admin/lista', label: 'Lista', icon: ClipboardList },
      ];
    case 'Alinare':
      return [
        { to: '/admin/alinare', label: 'Formulário', icon: FileText },
        { to: '/admin/status', label: 'Status', icon: ListChecks },
        { to: '/admin/dashboard', label: 'Dashboard', icon: BarChart3 },
      ];
    case 'Novitah':
      return [
        { to: '/admin/novitah', label: 'Formulário', icon: FileText },
        { to: '/admin/status', label: 'Status', icon: ListChecks },
        { to: '/admin/dashboard', label: 'Dashboard', icon: BarChart3 },
      ];
  }
}
