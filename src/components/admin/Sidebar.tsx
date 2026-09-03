// ── Sidebar de navegação do painel administrativo ───────────────────────────
import { NavLink } from 'react-router-dom';
import { PackageOpen, X, ChevronLeft, ChevronRight } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { navItemsDoUsuario } from '../../lib/perfil';
import PerfilButton from '../auth/PerfilButton';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
  collapsed: boolean;
  onToggleCollapse: () => void;
}

export default function Sidebar({ isOpen, onClose, collapsed, onToggleCollapse }: SidebarProps) {
  const { user } = useAuth();

  const navItems = user ? navItemsDoUsuario(user) : [];

  const sidebarWidth = collapsed ? 'w-20' : 'w-64';

  return (
    <>
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-30 lg:hidden"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      <aside
        className={`
          fixed top-0 left-0 z-40 h-screen
          bg-white text-slate-800 border-r border-slate-200
          flex flex-col
          transition-all duration-200 ease-out
          lg:translate-x-0
          ${isOpen ? 'translate-x-0' : '-translate-x-full'}
          ${sidebarWidth}
        `}
        aria-label="Navegação principal"
      >
        <div className="flex items-center justify-between px-4 py-5 border-b border-slate-200">
          <div className="flex items-center gap-3">
            <PackageOpen className="w-6 h-6 text-blue-400 shrink-0" aria-hidden="true" />
            {!collapsed && <span className="text-lg font-bold text-slate-900">GLR</span>}
          </div>
          <div className="flex items-center gap-2">
            {/* Botão toggle colapso (desktop only) */}
            <button
              type="button"
              onClick={onToggleCollapse}
              className="lg:flex hidden p-1.5 rounded-lg transition-colors cursor-pointer hover:bg-slate-100 text-slate-500"
              aria-label={collapsed ? 'Expandir sidebar' : 'Colapsar sidebar'}
              title={collapsed ? 'Expandir sidebar' : 'Colapsar sidebar'}
            >
              {collapsed ? (
                <ChevronRight className="w-5 h-5" />
              ) : (
                <ChevronLeft className="w-5 h-5" />
              )}
            </button>
            {/* Botão fechar (mobile only) */}
            <button
              type="button"
              onClick={onClose}
              className="lg:hidden p-1.5 rounded-lg transition-colors cursor-pointer hover:bg-slate-100 text-slate-500"
              aria-label="Fechar menu"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <nav className="flex-1 py-4 space-y-1 overflow-y-auto">
          {navItems.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              onClick={onClose}
              className={() => {
                // Para rotas com query params comparamos o `to` completo
                const isItemAtivo = to === window.location.pathname + window.location.search;

                return `
                flex items-center gap-3 mx-3 px-3 py-2.5 rounded-lg
                text-sm font-medium transition-all duration-150
                ${isItemAtivo
                  ? 'bg-slate-900 text-white'
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                }
                ${collapsed ? 'justify-center' : ''}
              `}}
              title={collapsed ? label : undefined}
            >
              <Icon className="w-5 h-5 shrink-0" aria-hidden="true" />
              {!collapsed && <span>{label}</span>}
            </NavLink>
          ))}
        </nav>

        {/* User Profile Footer */}
        <div className={`p-4 border-t border-slate-200 transition-all duration-200 ${collapsed ? 'px-2' : ''}`}>
          {collapsed ? (
            <div className="flex justify-center">
              <PerfilButton collapsed={true} />
            </div>
          ) : (
            <PerfilButton collapsed={false} />
          )}
        </div>
      </aside>
    </>
  );
}