// ── Layout do painel administrativo ──────────────────────────────────────────
// Sidebar fixa (desktop, colapsável) / drawer (mobile) + conteúdo com <Outlet />.
import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { Menu } from 'lucide-react';
import Sidebar from './Sidebar';

const COLLAPSED_KEY = 'sidebar-collapsed';

export default function AdminLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  // Preferência de colapso persistida entre sessões (desktop only)
  const [collapsed, setCollapsed] = useState(
    () => localStorage.getItem(COLLAPSED_KEY) === '1'
  );

  const toggleCollapsed = () =>
    setCollapsed((c) => {
      localStorage.setItem(COLLAPSED_KEY, c ? '0' : '1');
      return !c;
    });

  return (
    <div className="min-h-screen bg-slate-100 transition-colors duration-200">
      <Sidebar
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        collapsed={collapsed}
        onToggleCollapse={toggleCollapsed}
      />

      {/* Área de conteúdo — deslocada à direita da sidebar no desktop */}
      <div className={`transition-[margin] duration-200 ease-out ${collapsed ? 'lg:ml-20' : 'lg:ml-64'}`}>

        {/* Topbar mobile */}
        <header className="lg:hidden sticky top-0 z-20 bg-white border-b border-slate-200 px-4 py-3 flex items-center gap-3">
          <button
            type="button"
            onClick={() => setSidebarOpen(true)}
            className="p-2 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
            aria-label="Abrir menu"
          >
            <Menu className="w-5 h-5 text-slate-700" />
          </button>
          <span className="font-semibold text-slate-800">GLR</span>
        </header>

        {/* Conteúdo das páginas */}
        <main className="p-4 sm:p-6 lg:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
