// ── Sidebar de navegação do painel administrativo ───────────────────────────
import { NavLink, useNavigate } from 'react-router-dom';
import { PackageOpen, X, LogOut } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { navItemsDoPerfil } from '../../lib/perfil';
import { PERFIL_LABEL } from '../../types';

import alinareLogoSrc from '../../assets/alinare_logo.jpg';
import novitahLogoSrc from '../../assets/novitah_logo.jpg';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function Sidebar({ isOpen, onClose }: SidebarProps) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const navItems = user ? navItemsDoPerfil(user.perfil) : [];

  const handleLogout = async () => {
    await logout();
    navigate('/login', { replace: true });
  };

  // Identidade da marca por perfil
  const logoEmpresa =
    user?.perfil === 'Alinare'
      ? alinareLogoSrc
      : user?.perfil === 'Novitah'
      ? novitahLogoSrc
      : null;

  const corAtiva =
    user?.perfil === 'Alinare'
      ? 'bg-[#2B2D42] text-white'
      : user?.perfil === 'Novitah'
      ? 'bg-[#A67B7B] text-white'
      : 'bg-slate-900 text-white';

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
            {logoEmpresa ? (
              <img
                src={logoEmpresa}
                alt={user?.perfil}
                className="h-8 w-auto rounded object-contain bg-white p-0.5"
              />
            ) : (
              <PackageOpen className="w-6 h-6 text-blue-400" aria-hidden="true" />
            )}
            <span className="text-lg font-bold text-slate-900">
              {user?.perfil === 'Alinare' || user?.perfil === 'Novitah'
                ? user.perfil
                : 'Reverso'}
            </span>
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
              end
              onClick={onClose}
              className={({ isActive }) => `
                flex items-center gap-3 mx-3 px-4 py-2.5 rounded-lg
                text-sm font-medium transition-all duration-150
                ${isActive
                  ? corAtiva
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                }
              `}
            >
              <Icon className="w-5 h-5 shrink-0" aria-hidden="true" />
              {label}
            </NavLink>
          ))}
        </nav>

        <div className="px-4 py-4 border-t border-slate-200 space-y-3">
          {user && (
            <div className="px-2">
              <p className="text-sm font-medium truncate text-slate-900">{user.nome}</p>
              <p className="text-xs text-slate-500">{PERFIL_LABEL[user.perfil]}</p>
            </div>
          )}
          <button
            type="button"
            onClick={handleLogout}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors cursor-pointer text-slate-600 hover:bg-slate-100 hover:text-slate-900"
          >
            <LogOut className="w-4 h-4" />
            Sair
          </button>
        </div>
      </aside>
    </>
  );
}
