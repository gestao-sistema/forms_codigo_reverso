// ── Contexto de autenticação ─────────────────────────────────────────────────
// Fonte única da sessão. Telas consomem via useAuth(); nunca tocam localStorage.
import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import authService from '../services/authService';
import type { UsuarioAutenticado } from '../types';

interface AuthContextValue {
  user: UsuarioAutenticado | null;
  isLoading: boolean;
  login: (usuario: string, senha: string) => Promise<UsuarioAutenticado>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UsuarioAutenticado | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Restaura sessão do storage na montagem
  useEffect(() => {
    setUser(authService.getSessao());
    setIsLoading(false);
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      isLoading,
      async login(usuario, senha) {
        const sessao = await authService.login(usuario, senha);
        setUser(sessao);
        return sessao;
      },
      async logout() {
        await authService.logout();
        setUser(null);
      },
    }),
    [user, isLoading]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth deve ser usado dentro de <AuthProvider>.');
  return ctx;
}
