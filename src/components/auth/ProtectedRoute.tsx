// ── Guarda de rota por perfil ────────────────────────────────────────────────
import type { ReactNode } from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { homeDoPerfil } from '../../lib/perfil';
import type { Perfil } from '../../types';

interface ProtectedRouteProps {
  /** Perfis autorizados. Ausente = qualquer usuário logado. */
  roles?: Perfil[];
  children?: ReactNode;
}

export default function ProtectedRoute({ roles, children }: ProtectedRouteProps) {
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

  if (roles && !roles.includes(user.perfil)) {
    return <Navigate to={homeDoPerfil(user.perfil)} replace />;
  }

  return children ? <>{children}</> : <Outlet />;
}
