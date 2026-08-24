// ── Helpers de perfil: rota inicial e itens de navegação ─────────────────────
import { BarChart3, ClipboardList, FileText, ListChecks, Users, SquareKanban } from 'lucide-react';
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
  if (user.telas.includes('status-geral')) return '/admin/status';
  if (user.telas.includes('status-alinare')) return '/admin/status?empresa=Alinare';
  if (user.telas.includes('status-novitah')) return '/admin/status?empresa=Novitah';

  // Kanban como última opção antes do fallback
  if (user.telas.includes('kanban') || user.telas.includes('kanban-edit')) {
    return '/admin/kanban';
  }

  return '/admin/dashboard';
}

export interface NavItem {
  to: string;
  label: string;
  icon: LucideIcon;
}

/** Mapa tela → item de navegação. Ordem = ordem exibida na sidebar. */
const NAV_MAP: Record<Tela, NavItem> = {
  'dashboard-geral': { to: '/admin/dashboard', label: 'Dashboard', icon: BarChart3 },
  'dashboard-alinare': { to: '/admin/dashboard?empresa=Alinare', label: 'Dashboard', icon: BarChart3 },
  'dashboard-novitah': { to: '/admin/dashboard?empresa=Novitah', label: 'Dashboard', icon: BarChart3 },
  'formulario-alinare': { to: '/admin/alinare', label: 'Formulário Alinare', icon: FileText },
  'formulario-novitah': { to: '/admin/novitah', label: 'Formulário Novitah', icon: FileText },
  'lista-geral': { to: '/admin/lista', label: 'Lista', icon: ClipboardList },
  'lista-alinare': { to: '/admin/lista?empresa=Alinare', label: 'Lista', icon: ClipboardList },
  'lista-novitah': { to: '/admin/lista?empresa=Novitah', label: 'Lista', icon: ClipboardList },
  'status-geral': { to: '/admin/status', label: 'Status', icon: ListChecks },
  'status-alinare': { to: '/admin/status?empresa=Alinare', label: 'Status', icon: ListChecks },
  'status-novitah': { to: '/admin/status?empresa=Novitah', label: 'Status', icon: ListChecks },
  kanban: { to: '/admin/kanban', label: 'Kanban', icon: SquareKanban },
  // Permissão de edição, não uma tela navegável — mesma rota do Kanban.
  'kanban-edit': { to: '/admin/kanban', label: 'Kanban', icon: SquareKanban },
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
  'status-geral',
  'status-alinare',
  'status-novitah',
  'kanban',
  'usuarios',
];

/** Sidebar do admin: só gerais + formulários (sem variações empresa). */
const ORDEM_NAV_ADMIN: Tela[] = [
  'dashboard-geral',
  'lista-geral',
  'formulario-alinare',
  'formulario-novitah',
  'status-geral',
  'kanban',
  'usuarios',
];

/** Itens da sidebar conforme telas permitidas do usuário logado. */
export function navItemsDoUsuario(user: UsuarioAutenticado): NavItem[] {
  if (isAdmin(user)) {
    return ORDEM_NAV_ADMIN.map((t) => NAV_MAP[t]);
  }

  const telas: Tela[] = user.telas.filter((t) => t !== 'usuarios');
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
      return empresa === 'Alinare'
        ? 'status-alinare'
        : empresa === 'Novitah'
        ? 'status-novitah'
        : 'status-geral';
    case '/admin/kanban':
      return 'kanban';
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
