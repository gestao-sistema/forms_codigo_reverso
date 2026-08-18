// ── Guarda de rota por perfil ────────────────────────────────────────────────
import type { ReactNode } from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { homeDoUsuario } from '../../lib/perfil';
import type { Tela } from '../../types';
import { isAdmin } from '../../types';

interface ProtectedRouteProps {
  /** Telas autorizadas para a rota. Ausente = qualquer usuário logado. */
  telas?: Tela[];
  children?: ReactNode;
}

export default function ProtectedRoute({ telas, children }: ProtectedRouteProps) {
  const { user, isLoading } = useAuth();

  // Evita flicker enquanto restaura sessão
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-100">
        <div className="w-8 h-8 rounded-full border-4 border-slate-200 border-t-blue-500 animate-spin" />
      </div>
    );
  }

  if (!user) return <Navigate to="/login" replace />;

  if (telas && telas.length > 0) {
    // Admin tem acesso a tudo
    if (isAdmin(user)) return children ? <>{children}</> : <Outlet />;

    const temAcesso = telas.some((t) => user.telas.includes(t));
    if (!temAcesso) {
      return <Navigate to={homeDoUsuario(user)} replace />;
    }
  }

  return children ? <>{children}</> : <Outlet />;
}
