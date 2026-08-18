// ── Sidebar de navegação do painel administrativo ───────────────────────────
import { NavLink } from 'react-router-dom';
import { PackageOpen, X } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { navItemsDoUsuario } from '../../lib/perfil';
import { isAdmin } from '../../types';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function Sidebar({ isOpen, onClose }: SidebarProps) {
  const { user } = useAuth();

  const navItems = user ? navItemsDoUsuario(user) : [];

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
          fixed top-0 left-0 z-40 h-screen w-64
          bg-white text-slate-800 border-r border-slate-200
          flex flex-col
          transition-transform duration-200 ease-out
          lg:translate-x-0
          ${isOpen ? 'translate-x-0' : '-translate-x-full'}
        `}
        aria-label="Navegação principal"
      >
        <div className="flex items-center justify-between px-6 py-5 border-b border-slate-200">
          <div className="flex items-center gap-3">
            <PackageOpen className="w-6 h-6 text-blue-400" aria-hidden="true" />
            <span className="text-lg font-bold text-slate-900">GLR</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="lg:hidden p-1.5 rounded-lg transition-colors cursor-pointer hover:bg-slate-100 text-slate-500"
            aria-label="Fechar menu"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <nav className="flex-1 py-4 space-y-1">
          {navItems.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              onClick={onClose}
              className={({ isActive }) => {
                // Para rotas com query params comparamos o `to` completo
                const isItemAtivo = to === window.location.pathname + window.location.search;

                return `
                flex items-center gap-3 mx-3 px-4 py-2.5 rounded-lg
                text-sm font-medium transition-all duration-150
                ${isItemAtivo
                  ? 'bg-slate-900 text-white'
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                }
              `}}
            >
              <Icon className="w-5 h-5 shrink-0" aria-hidden="true" />
              {label}
            </NavLink>
          ))}
        </nav>

        {/* Mobile logout/profile info moved to PerfilButton, mas mostramos algo simplificado no mobile */}
        <div className="lg:hidden px-4 py-4 border-t border-slate-200">
          {user && (
            <div className="px-2 mb-2">
              <p className="text-sm font-medium truncate text-slate-900">{user.nome}</p>
              {isAdmin(user) && (
                <span className="inline-block mt-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-blue-100 text-blue-700">
                  Admin
                </span>
              )}
            </div>
          )}
        </div>
      </aside>
    </>
  );
}
