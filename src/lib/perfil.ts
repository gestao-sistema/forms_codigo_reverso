// ── Helpers de perfil: rota inicial e itens de navegação ─────────────────────
import { BarChart3, ClipboardList, FileText, ListChecks, Users } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { Tela, UsuarioAutenticado } from '../types';
import { isAdmin } from '../types';

/** Rota (path) para onde o usuário vai ao logar / ao acessar rota inválida. */
export function homeDoUsuario(user: UsuarioAutenticado): string {
  if (isAdmin(user)) return '/admin/dashboard';

  // Prioriza dashboards, depois listas, depois formulários, depois status
  if (user.telas.includes('dashboard-geral')) return '/admin/dashboard';
  if (user.telas.includes('dashboard-alinare')) return '/admin/dashboard?empresa=Alinare';
  if (user.telas.includes('dashboard-novitah')) return '/admin/dashboard?empresa=Novitah';
  if (user.telas.includes('lista-geral')) return '/admin/lista';
  if (user.telas.includes('lista-alinare')) return '/admin/lista?empresa=Alinare';
  if (user.telas.includes('lista-novitah')) return '/admin/lista?empresa=Novitah';
  if (user.telas.includes('formulario-alinare')) return '/admin/alinare';
  if (user.telas.includes('formulario-novitah')) return '/admin/novitah';
  if (user.telas.includes('status')) return '/admin/status';

  return '/admin/dashboard';
}

export interface NavItem {
  to: string;
  label: string;
  icon: LucideIcon;
}

/** Mapa tela → item de navegação. Ordem = ordem exibida na sidebar. */
const NAV_MAP: Record<Tela, NavItem> = {
  'dashboard-geral': { to: '/admin/dashboard', label: 'Dashboard Geral', icon: BarChart3 },
  'dashboard-alinare': { to: '/admin/dashboard?empresa=Alinare', label: 'Dashboard Alinare', icon: BarChart3 },
  'dashboard-novitah': { to: '/admin/dashboard?empresa=Novitah', label: 'Dashboard Novitah', icon: BarChart3 },
  'formulario-alinare': { to: '/admin/alinare', label: 'Formulário Alinare', icon: FileText },
  'formulario-novitah': { to: '/admin/novitah', label: 'Formulário Novitah', icon: FileText },
  'lista-geral': { to: '/admin/lista', label: 'Lista Geral', icon: ClipboardList },
  'lista-alinare': { to: '/admin/lista?empresa=Alinare', label: 'Lista Alinare', icon: ClipboardList },
  'lista-novitah': { to: '/admin/lista?empresa=Novitah', label: 'Lista Novitah', icon: ClipboardList },
  status: { to: '/admin/status', label: 'Status', icon: ListChecks },
  usuarios: { to: '/admin/usuarios', label: 'Usuários', icon: Users },
};

/** Ordem de exibição na sidebar. */
const ORDEM_NAV: Tela[] = [
  'dashboard-geral',
  'dashboard-alinare',
  'dashboard-novitah',
  'lista-geral',
  'lista-alinare',
  'lista-novitah',
  'formulario-alinare',
  'formulario-novitah',
  'status',
  'usuarios',
];

/** Itens da sidebar conforme telas permitidas do usuário logado. */
export function navItemsDoUsuario(user: UsuarioAutenticado): NavItem[] {
  const telas = isAdmin(user)
    ? ORDEM_NAV // admin vê tudo
    : user.telas.filter((t) => t !== 'usuarios'); // admin-only

  return ORDEM_NAV.filter((t) => telas.includes(t)).map((t) => NAV_MAP[t]);
}

/** Mapeia pathname + query → tela correspondente (para active state da sidebar). */
export function telaDaRota(pathname: string, search: string): Tela | null {
  const empresa = new URLSearchParams(search).get('empresa');
  switch (pathname) {
    case '/admin/dashboard':
      return empresa === 'Alinare'
        ? 'dashboard-alinare'
        : empresa === 'Novitah'
        ? 'dashboard-novitah'
        : 'dashboard-geral';
    case '/admin/lista':
      return empresa === 'Alinare'
        ? 'lista-alinare'
        : empresa === 'Novitah'
        ? 'lista-novitah'
        : 'lista-geral';
    case '/admin/alinare':
      return 'formulario-alinare';
    case '/admin/novitah':
      return 'formulario-novitah';
    case '/admin/status':
      return 'status';
    case '/admin/usuarios':
      return 'usuarios';
    default:
      return null;
  }
}

/** Rota de uma tela específica. */
export function rotaDaTela(tela: Tela): string {
  return NAV_MAP[tela].to;
}
