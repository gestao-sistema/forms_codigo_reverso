// ── Layout do painel administrativo ──────────────────────────────────────────
// Sidebar fixa (desktop) / drawer (mobile) + área de conteúdo com <Outlet />.
import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { Menu } from 'lucide-react';
import Sidebar from './Sidebar';
import { useAuth } from '../../context/AuthContext';

export default function AdminLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { user } = useAuth();

  // Customização de fundo de tela e cabeçalho conforme perfil
  const bgLayout =
    user?.perfil === 'Alinare'
      ? 'bg-[#F8F9FA]' // Cinza frio Alinare
      : user?.perfil === 'Novitah'
      ? 'bg-[#FDF8F7]' // Rose quente suave Novitah
      : 'bg-slate-100'; // Default admin

  const textHeader =
    user?.perfil === 'Alinare'
      ? 'text-[#2B2D42]'
      : user?.perfil === 'Novitah'
      ? 'text-[#A67B7B]'
      : 'text-slate-800';

  const labelPainel =
    user?.perfil === 'Alinare'
      ? 'Painel Alinare'
      : user?.perfil === 'Novitah'
      ? 'Painel Novitah'
      : 'Painel Reverso';

  return (
    <div className={`min-h-screen ${bgLayout} transition-colors duration-200`}>
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      {/* Área de conteúdo — deslocada à direita da sidebar no desktop */}
      <div className="lg:ml-64">

        {/* Topbar mobile com botão de menu */}
        <header className="lg:hidden sticky top-0 z-20 bg-white border-b border-slate-200 px-4 py-3 flex items-center gap-3">
          <button
            type="button"
            onClick={() => setSidebarOpen(true)}
            className="p-2 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
            aria-label="Abrir menu"
          >
            <Menu className="w-5 h-5 text-slate-700" />
          </button>
          <span className={`font-semibold ${textHeader}`}>{labelPainel}</span>
        </header>

        {/* Conteúdo das páginas */}
        <main className="p-4 sm:p-6 lg:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
