// ── Contexto de autenticação ─────────────────────────────────────────────────
// Fonte única da sessão (Supabase Auth). Telas consomem via useAuth().
import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import authService from '../services/authService';
import type { UsuarioAutenticado } from '../types';

interface AuthContextValue {
  user: UsuarioAutenticado | null;
  isLoading: boolean;
  login: (usuario: string, senha: string) => Promise<UsuarioAutenticado>;
  logout: () => Promise<void>;
  alterarSenha: (senhaAtual: string, novaSenha: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UsuarioAutenticado | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Restaura sessão (async via Supabase) e observa mudanças
  useEffect(() => {
    let active = true;

    authService.getSessao().then((sessao) => {
      if (active) {
        setUser(sessao);
        setIsLoading(false);
      }
    });

    const unsub = authService.onMudancaSessao((u) => {
      if (active) setUser(u);
    });

    return () => {
      active = false;
      unsub();
    };
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
      async alterarSenha(senhaAtual, novaSenha) {
        await authService.alterarSenha(senhaAtual, novaSenha);
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
