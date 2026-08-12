# Autenticação + Perfis de Acesso — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Adicionar login e controle de acesso por 4 perfis (ADMIN, Alinare, Novitah, Expedição) sobre a app existente, com auth atrás de interface trocável (mock localStorage agora, Supabase depois sem tocar telas).

**Architecture:** `AuthContext` + `IAuthService` (mock em localStorage) espelham o padrão já usado por `IApiService`. Rotas protegidas por `ProtectedRoute` com allow-list de perfis. Escopo de empresa é aplicado na camada de página (força `empresa` no filtro antes de chamar `apiService`), mantendo o mock agnóstico. Sidebar monta seus itens a partir do perfil logado.

**Tech Stack:** React 19, TypeScript, React Router v7, Tailwind v4, react-hook-form + zod, react-hot-toast, lucide-react. Vite 8.

## Global Constraints

- **Sem backend real:** persistência só em `localStorage`. Nenhuma dependência nova.
- **Provider trocável:** telas só falam com `useAuth()` / `apiService` — nunca com localStorage direto. Trocar mock por Supabase = nova implementação da interface.
- **Sem suíte de testes** configurada no projeto. Verificação de cada task = `npm run lint` + `npm run build` sem erros + checagem manual no navegador (`npm run dev`). Não inventar test runner.
- **Não é git repo.** Commits são opcionais; se o usuário rodar `git init`, usar as mensagens sugeridas. Caso contrário, pular o passo de commit.
- **Senhas em texto plano** no mock (dev only). Marcar com comentário `// TODO: hash ao integrar backend`.
- **Idioma:** UI e nomes de domínio em pt-BR, seguindo o código existente. Perfil interno `Expedicao` (sem cedilha em código); label exibido "Expedição".
- **Escopo travado:** Alinare/Novitah nunca acessam dados da outra empresa, nem por URL.

---

### Task 1: Tipos de domínio de auth + mapa de escopo

**Files:**
- Modify: `src/types/index.ts` (append ao fim)

**Interfaces:**
- Consumes: `Empresa` (já existe em `src/types/index.ts`).
- Produces:
  - `type Perfil = 'ADMIN' | 'Alinare' | 'Novitah' | 'Expedicao'`
  - `interface Usuario { id: string; nome: string; usuario: string; senha: string; perfil: Perfil }`
  - `type UsuarioAutenticado = Omit<Usuario, 'senha'>`
  - `const ESCOPO_EMPRESA: Record<Perfil, Empresa | null>`

- [ ] **Step 1: Adicionar tipos ao fim de `src/types/index.ts`**

```ts
// ── Autenticação e perfis de acesso ──────────────────────────────────────────

/** Perfis de acesso do sistema. `Expedicao` sem cedilha em código; label "Expedição". */
export type Perfil = 'ADMIN' | 'Alinare' | 'Novitah' | 'Expedicao';

/** Usuário do sistema (mock). Senha em texto plano — dev only. */
export interface Usuario {
  id: string;
  nome: string;
  /** Login único (username) */
  usuario: string;
  /** TODO: hash ao integrar backend */
  senha: string;
  perfil: Perfil;
}

/** Usuário autenticado exposto pela sessão — nunca carrega senha. */
export type UsuarioAutenticado = Omit<Usuario, 'senha'>;

/** Escopo de empresa por perfil. `null` = ambas (ADMIN, Expedicao). */
export const ESCOPO_EMPRESA: Record<Perfil, Empresa | null> = {
  ADMIN: null,
  Expedicao: null,
  Alinare: 'Alinare',
  Novitah: 'Novitah',
};

/** Label de exibição do perfil */
export const PERFIL_LABEL: Record<Perfil, string> = {
  ADMIN: 'Administrador',
  Alinare: 'Alinare',
  Novitah: 'Novitah',
  Expedicao: 'Expedição',
};
```

- [ ] **Step 2: Verificar compilação**

Run: `npm run build`
Expected: build sem erros de tipo.

- [ ] **Step 3: Commit (se git init feito)**

```bash
git add src/types/index.ts
git commit -m "feat(auth): tipos de perfil, usuario e escopo de empresa"
```

---

### Task 2: Helpers de perfil (home + nav)

**Files:**
- Create: `src/lib/perfil.ts`

**Interfaces:**
- Consumes: `Perfil` (Task 1).
- Produces:
  - `homeDoPerfil(perfil: Perfil): string`
  - `interface NavItem { to: string; label: string; icon: LucideIcon }`
  - `navItemsDoPerfil(perfil: Perfil): NavItem[]`

- [ ] **Step 1: Criar `src/lib/perfil.ts`**

```ts
// ── Helpers de perfil: rota inicial e itens de navegação ─────────────────────
import { BarChart3, ClipboardList, FileText, ListChecks, Users } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { Perfil } from '../types';

/** Rota para onde o usuário vai ao logar / ao acessar rota inválida. */
export function homeDoPerfil(perfil: Perfil): string {
  switch (perfil) {
    case 'Alinare':
      return '/alinare';
    case 'Novitah':
      return '/novitah';
    case 'ADMIN':
    case 'Expedicao':
    default:
      return '/admin/dashboard';
  }
}

export interface NavItem {
  to: string;
  label: string;
  icon: LucideIcon;
}

/** Itens da sidebar conforme perfil logado. */
export function navItemsDoPerfil(perfil: Perfil): NavItem[] {
  switch (perfil) {
    case 'ADMIN':
      return [
        { to: '/admin/dashboard', label: 'Dashboard', icon: BarChart3 },
        { to: '/admin/lista', label: 'Lista', icon: ClipboardList },
        { to: '/admin/usuarios', label: 'Usuários', icon: Users },
      ];
    case 'Expedicao':
      return [
        { to: '/admin/dashboard', label: 'Dashboard', icon: BarChart3 },
        { to: '/admin/lista', label: 'Lista', icon: ClipboardList },
      ];
    case 'Alinare':
      return [
        { to: '/alinare', label: 'Formulário', icon: FileText },
        { to: '/admin/status', label: 'Status', icon: ListChecks },
        { to: '/admin/dashboard', label: 'Dashboard', icon: BarChart3 },
      ];
    case 'Novitah':
      return [
        { to: '/novitah', label: 'Formulário', icon: FileText },
        { to: '/admin/status', label: 'Status', icon: ListChecks },
        { to: '/admin/dashboard', label: 'Dashboard', icon: BarChart3 },
      ];
  }
}
```

- [ ] **Step 2: Verificar compilação**

Run: `npm run build`
Expected: sem erros (confirma que os ícones existem em lucide-react@1.31).

Se algum ícone não existir nessa versão, substituir por um disponível (ex.: `List` no lugar de `ListChecks`, `File` no lugar de `FileText`) e ajustar.

- [ ] **Step 3: Commit (se git)**

```bash
git add src/lib/perfil.ts
git commit -m "feat(auth): helpers homeDoPerfil e navItemsDoPerfil"
```

---

### Task 3: authService (IAuthService + mock localStorage)

**Files:**
- Create: `src/services/authService.ts`

**Interfaces:**
- Consumes: `Usuario`, `UsuarioAutenticado` (Task 1).
- Produces:
  - `interface IAuthService { login, logout, getSessao, listarUsuarios, criarUsuario, atualizarUsuario, removerUsuario }`
  - `default authService: IAuthService`
  - `class AuthError extends Error`

- [ ] **Step 1: Criar `src/services/authService.ts`**

```ts
// ── Service Layer: Autenticação (mock localStorage) ──────────────────────────
//
// Espelha o padrão de apiService: interface pública + implementação injetável.
// Para plugar Supabase Auth: implementar IAuthService e exportar no lugar.
// Componentes NUNCA acessam localStorage direto — sempre via este serviço.
// ─────────────────────────────────────────────────────────────────────────────

import type { Usuario, UsuarioAutenticado } from '../types';

const LS_USUARIOS = 'cr_usuarios';
const LS_SESSAO = 'cr_sessao';

const delay = (ms = 400) => new Promise<void>((r) => setTimeout(r, ms));
const uuid = (): string => crypto.randomUUID();

export class AuthError extends Error {}

export interface IAuthService {
  login(usuario: string, senha: string): Promise<UsuarioAutenticado>;
  logout(): Promise<void>;
  /** Lê sessão atual do storage (síncrono). null se deslogado. */
  getSessao(): UsuarioAutenticado | null;
  listarUsuarios(): Promise<Usuario[]>;
  criarUsuario(data: Omit<Usuario, 'id'>): Promise<Usuario>;
  atualizarUsuario(id: string, data: Partial<Omit<Usuario, 'id'>>): Promise<Usuario>;
  removerUsuario(id: string): Promise<void>;
}

// ── Seed inicial (dev). TODO: hash de senha ao integrar backend. ─────────────
const SEED: Usuario[] = [
  { id: uuid(), nome: 'Administrador',    usuario: 'admin',     senha: 'admin123',     perfil: 'ADMIN' },
  { id: uuid(), nome: 'Operador Alinare', usuario: 'alinare',   senha: 'alinare123',   perfil: 'Alinare' },
  { id: uuid(), nome: 'Operador Novitah', usuario: 'novitah',   senha: 'novitah123',   perfil: 'Novitah' },
  { id: uuid(), nome: 'Expedição',        usuario: 'expedicao', senha: 'expedicao123', perfil: 'Expedicao' },
];

function lerUsuarios(): Usuario[] {
  const raw = localStorage.getItem(LS_USUARIOS);
  if (!raw) {
    localStorage.setItem(LS_USUARIOS, JSON.stringify(SEED));
    return [...SEED];
  }
  try {
    return JSON.parse(raw) as Usuario[];
  } catch {
    localStorage.setItem(LS_USUARIOS, JSON.stringify(SEED));
    return [...SEED];
  }
}

function gravarUsuarios(lista: Usuario[]): void {
  localStorage.setItem(LS_USUARIOS, JSON.stringify(lista));
}

const semSenha = (u: Usuario): UsuarioAutenticado => {
  const { senha: _senha, ...rest } = u;
  return rest;
};

const authService: IAuthService = {
  async login(usuario, senha) {
    await delay();
    const encontrado = lerUsuarios().find(
      (u) => u.usuario === usuario.trim() && u.senha === senha
    );
    if (!encontrado) {
      throw new AuthError('Usuário ou senha inválidos.');
    }
    const sessao = semSenha(encontrado);
    localStorage.setItem(LS_SESSAO, JSON.stringify(sessao));
    return sessao;
  },

  async logout() {
    await delay(150);
    localStorage.removeItem(LS_SESSAO);
  },

  getSessao() {
    const raw = localStorage.getItem(LS_SESSAO);
    if (!raw) return null;
    try {
      return JSON.parse(raw) as UsuarioAutenticado;
    } catch {
      return null;
    }
  },

  async listarUsuarios() {
    await delay(200);
    return lerUsuarios();
  },

  async criarUsuario(data) {
    await delay(300);
    const lista = lerUsuarios();
    if (lista.some((u) => u.usuario === data.usuario.trim())) {
      throw new AuthError('Já existe um usuário com esse login.');
    }
    const novo: Usuario = { ...data, usuario: data.usuario.trim(), id: uuid() };
    gravarUsuarios([...lista, novo]);
    return novo;
  },

  async atualizarUsuario(id, data) {
    await delay(300);
    const lista = lerUsuarios();
    const i = lista.findIndex((u) => u.id === id);
    if (i === -1) throw new AuthError('Usuário não encontrado.');
    // Login duplicado (exceto ele mesmo)
    if (data.usuario && lista.some((u) => u.usuario === data.usuario!.trim() && u.id !== id)) {
      throw new AuthError('Já existe um usuário com esse login.');
    }
    const atualizado: Usuario = { ...lista[i], ...data };
    if (data.usuario) atualizado.usuario = data.usuario.trim();
    gravarUsuarios([...lista.slice(0, i), atualizado, ...lista.slice(i + 1)]);
    return atualizado;
  },

  async removerUsuario(id) {
    await delay(300);
    const lista = lerUsuarios();
    const alvo = lista.find((u) => u.id === id);
    if (alvo && alvo.usuario === 'admin') {
      throw new AuthError('Não é possível remover o administrador padrão.');
    }
    gravarUsuarios(lista.filter((u) => u.id !== id));
  },
};

export default authService;
```

- [ ] **Step 2: Verificar compilação**

Run: `npm run build`
Expected: sem erros. (`_senha` intencionalmente ignorado; se lint reclamar de var não usada, confirmar regra oxlint — o prefixo `_` costuma ser permitido.)

- [ ] **Step 3: Commit (se git)**

```bash
git add src/services/authService.ts
git commit -m "feat(auth): authService mock com sessao e CRUD de usuarios em localStorage"
```

---

### Task 4: AuthContext + useAuth

**Files:**
- Create: `src/context/AuthContext.tsx`

**Interfaces:**
- Consumes: `authService` (Task 3), `UsuarioAutenticado` (Task 1).
- Produces:
  - `AuthProvider` (component)
  - `useAuth(): { user: UsuarioAutenticado | null; isLoading: boolean; login(u,s): Promise<UsuarioAutenticado>; logout(): Promise<void> }`

- [ ] **Step 1: Criar `src/context/AuthContext.tsx`**

```tsx
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
```

- [ ] **Step 2: Verificar compilação**

Run: `npm run build`
Expected: sem erros.

- [ ] **Step 3: Commit (se git)**

```bash
git add src/context/AuthContext.tsx
git commit -m "feat(auth): AuthContext + useAuth com restauracao de sessao"
```

---

### Task 5: ProtectedRoute

**Files:**
- Create: `src/components/auth/ProtectedRoute.tsx`

**Interfaces:**
- Consumes: `useAuth` (Task 4), `homeDoPerfil` (Task 2), `Perfil` (Task 1).
- Produces: `ProtectedRoute` (component) — props `{ roles?: Perfil[]; children?: ReactNode }`. Renderiza `<Outlet />` se `children` ausente.

- [ ] **Step 1: Criar `src/components/auth/ProtectedRoute.tsx`**

```tsx
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
```

- [ ] **Step 2: Verificar compilação**

Run: `npm run build`
Expected: sem erros.

- [ ] **Step 3: Commit (se git)**

```bash
git add src/components/auth/ProtectedRoute.tsx
git commit -m "feat(auth): ProtectedRoute com allow-list de perfis"
```

---

### Task 6: LoginPage

**Files:**
- Create: `src/pages/LoginPage.tsx`

**Interfaces:**
- Consumes: `useAuth` (Task 4), `homeDoPerfil` (Task 2), `AuthError` (Task 3).
- Produces: `LoginPage` (default export).

- [ ] **Step 1: Criar `src/pages/LoginPage.tsx`**

```tsx
// ── Tela de login ────────────────────────────────────────────────────────────
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { LogIn, Loader2, PackageOpen } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { homeDoPerfil } from '../lib/perfil';

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [usuario, setUsuario] = useState('');
  const [senha, setSenha] = useState('');
  const [erro, setErro] = useState('');
  const [enviando, setEnviando] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErro('');
    setEnviando(true);
    try {
      const sessao = await login(usuario, senha);
      toast.success(`Bem-vindo, ${sessao.nome}.`);
      navigate(homeDoPerfil(sessao.perfil), { replace: true });
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Falha ao entrar.';
      setErro(msg);
      toast.error(msg);
    } finally {
      setEnviando(false);
    }
  };

  const inputCls =
    'h-11 w-full px-3 rounded-lg border border-slate-300 bg-white text-sm text-slate-900 ' +
    'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors';

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-100 px-4">
      <div className="w-full max-w-sm bg-white rounded-2xl shadow-sm border border-slate-200 p-8">
        <div className="flex flex-col items-center mb-6">
          <div className="w-12 h-12 rounded-xl bg-slate-800 flex items-center justify-center mb-3">
            <PackageOpen className="w-6 h-6 text-blue-400" />
          </div>
          <h1 className="text-xl font-bold text-slate-900">Logística Reversa</h1>
          <p className="text-sm text-slate-500 mt-1">Entre com suas credenciais</p>
        </div>

        <form onSubmit={onSubmit} className="space-y-4">
          <div className="flex flex-col">
            <label htmlFor="usuario" className="text-xs font-medium text-slate-500 mb-1">
              Usuário
            </label>
            <input
              id="usuario"
              type="text"
              autoComplete="username"
              value={usuario}
              onChange={(e) => setUsuario(e.target.value)}
              className={inputCls}
              required
            />
          </div>

          <div className="flex flex-col">
            <label htmlFor="senha" className="text-xs font-medium text-slate-500 mb-1">
              Senha
            </label>
            <input
              id="senha"
              type="password"
              autoComplete="current-password"
              value={senha}
              onChange={(e) => setSenha(e.target.value)}
              className={inputCls}
              required
            />
          </div>

          {erro && <p className="text-sm text-red-600">{erro}</p>}

          <button
            type="submit"
            disabled={enviando}
            className="h-11 w-full rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 transition-colors flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer"
          >
            {enviando ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <LogIn className="w-4 h-4" />
            )}
            Entrar
          </button>
        </form>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Verificar compilação**

Run: `npm run build`
Expected: sem erros.

- [ ] **Step 3: Commit (se git)**

```bash
git add src/pages/LoginPage.tsx
git commit -m "feat(auth): tela de login usuario+senha"
```

---

### Task 7: Envolver App em AuthProvider + rotas protegidas

**Files:**
- Modify: `src/App.tsx` (reescrita do bloco de rotas)

**Interfaces:**
- Consumes: `AuthProvider` (Task 4), `ProtectedRoute` (Task 5), `LoginPage` (Task 6). `StatusPage` e `UsuariosPage` ainda não existem — criar stubs temporários neste task e substituir nas Tasks 8/9.

- [ ] **Step 1: Criar stubs temporários** para não quebrar o import

Create `src/pages/StatusPage.tsx`:
```tsx
export default function StatusPage() {
  return <div className="text-slate-500">Status — em construção.</div>;
}
```

Create `src/pages/UsuariosPage.tsx`:
```tsx
export default function UsuariosPage() {
  return <div className="text-slate-500">Usuários — em construção.</div>;
}
```

- [ ] **Step 2: Reescrever `src/App.tsx`**

```tsx
// ── Roteamento principal da aplicação ────────────────────────────────────────
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';

import { AuthProvider, useAuth } from './context/AuthContext';
import ProtectedRoute from './components/auth/ProtectedRoute';
import { homeDoPerfil } from './lib/perfil';

import LoginPage from './pages/LoginPage';
import AlinareFormPage from './pages/AlinareFormPage';
import NovitahFormPage from './pages/NovitahFormPage';

import AdminLayout from './components/admin/AdminLayout';
import DashboardPage from './pages/DashboardPage';
import ListPage from './pages/ListPage';
import StatusPage from './pages/StatusPage';
import UsuariosPage from './pages/UsuariosPage';

/** Redireciona a raiz para a home do perfil (ou login). */
function RaizRedirect() {
  const { user, isLoading } = useAuth();
  if (isLoading) return null;
  return <Navigate to={user ? homeDoPerfil(user.perfil) : '/login'} replace />;
}

export default function App() {
  return (
    <BrowserRouter>
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 4000,
          style: {
            fontFamily: "'Inter', system-ui, sans-serif",
            fontSize: '14px',
            borderRadius: '10px',
            boxShadow: '0 10px 25px rgba(0,0,0,0.12)',
          },
          success: { iconTheme: { primary: '#16A34A', secondary: '#FFFFFF' } },
          error: { iconTheme: { primary: '#DC2626', secondary: '#FFFFFF' } },
        }}
      />

      <AuthProvider>
        <Routes>
          <Route path="/login" element={<LoginPage />} />

          {/* Formulários (fora do layout admin) */}
          <Route
            path="/alinare"
            element={
              <ProtectedRoute roles={['Alinare', 'ADMIN']}>
                <AlinareFormPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/novitah"
            element={
              <ProtectedRoute roles={['Novitah', 'ADMIN']}>
                <NovitahFormPage />
              </ProtectedRoute>
            }
          />

          {/* Área admin (layout com sidebar dinâmica) */}
          <Route
            path="/admin"
            element={
              <ProtectedRoute>
                <AdminLayout />
              </ProtectedRoute>
            }
          >
            <Route index element={<Navigate to="dashboard" replace />} />
            <Route
              path="dashboard"
              element={
                <ProtectedRoute roles={['ADMIN', 'Expedicao', 'Alinare', 'Novitah']}>
                  <DashboardPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="lista"
              element={
                <ProtectedRoute roles={['ADMIN', 'Expedicao']}>
                  <ListPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="status"
              element={
                <ProtectedRoute roles={['Alinare', 'Novitah']}>
                  <StatusPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="usuarios"
              element={
                <ProtectedRoute roles={['ADMIN']}>
                  <UsuariosPage />
                </ProtectedRoute>
              }
            />
          </Route>

          <Route path="/" element={<RaizRedirect />} />
          <Route path="*" element={<RaizRedirect />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
```

- [ ] **Step 3: Verificar no navegador**

Run: `npm run dev`
Checar manualmente:
- Acessar `/` deslogado → cai em `/login`.
- Login `admin/admin123` → vai pra `/admin/dashboard`, sidebar mostra Dashboard/Lista/Usuários.
- Login `alinare/alinare123` → vai pra `/alinare`.
- Tentar `/admin/usuarios` logado como `alinare` via URL → redireciona pra `/alinare`.
- Tentar `/admin/lista` como `novitah` → redireciona pra `/novitah`.

- [ ] **Step 4: Lint + build**

Run: `npm run lint && npm run build`
Expected: sem erros.

- [ ] **Step 5: Commit (se git)**

```bash
git add src/App.tsx src/pages/StatusPage.tsx src/pages/UsuariosPage.tsx
git commit -m "feat(auth): AuthProvider + rotas protegidas por perfil"
```

---

### Task 8: Sidebar dinâmica + logout + coluna Solicitante

**Files:**
- Modify: `src/components/admin/Sidebar.tsx`
- Modify: `src/components/admin/RecordsList.tsx` (coluna Solicitante + prop readOnly)

**Interfaces:**
- Consumes: `useAuth` (Task 4), `navItemsDoPerfil` + `PERFIL_LABEL` (Tasks 2/1).
- Produces: `RecordsList` ganha prop `readOnly?: boolean`.

- [ ] **Step 1: Reescrever `src/components/admin/Sidebar.tsx`**

Trocar o array estático `NAV_ITEMS` por itens do perfil e adicionar rodapé com usuário + botão Sair.

```tsx
// ── Sidebar de navegação do painel administrativo ───────────────────────────
import { NavLink, useNavigate } from 'react-router-dom';
import { PackageOpen, X, LogOut } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { navItemsDoPerfil } from '../../lib/perfil';
import { PERFIL_LABEL } from '../../types';

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
          bg-slate-800 text-slate-200
          flex flex-col
          transition-transform duration-200 ease-out
          lg:translate-x-0
          ${isOpen ? 'translate-x-0' : '-translate-x-full'}
        `}
        aria-label="Navegação principal"
      >
        <div className="flex items-center justify-between px-6 py-5 border-b border-slate-700">
          <div className="flex items-center gap-2.5">
            <PackageOpen className="w-6 h-6 text-blue-400" aria-hidden="true" />
            <span className="text-lg font-bold text-white">Reverso</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="lg:hidden p-1.5 rounded-lg hover:bg-slate-700 transition-colors cursor-pointer"
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
                text-sm font-medium transition-colors duration-150
                ${isActive
                  ? 'bg-slate-700 text-white'
                  : 'text-slate-300 hover:bg-slate-700/50 hover:text-white'
                }
              `}
            >
              <Icon className="w-5 h-5 shrink-0" aria-hidden="true" />
              {label}
            </NavLink>
          ))}
        </nav>

        {/* Rodapé: usuário + sair */}
        <div className="px-4 py-4 border-t border-slate-700 space-y-3">
          {user && (
            <div className="px-2">
              <p className="text-sm font-medium text-white truncate">{user.nome}</p>
              <p className="text-xs text-slate-400">{PERFIL_LABEL[user.perfil]}</p>
            </div>
          )}
          <button
            type="button"
            onClick={handleLogout}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium text-slate-300 hover:bg-slate-700 hover:text-white transition-colors cursor-pointer"
          >
            <LogOut className="w-4 h-4" />
            Sair
          </button>
        </div>
      </aside>
    </>
  );
}
```

Nota: `end` no NavLink evita que `/alinare` marque ativo indevidamente.

- [ ] **Step 2: Adicionar coluna Solicitante + prop readOnly em `RecordsList.tsx`**

Alterar a assinatura de props:
```tsx
interface RecordsListProps {
  dados: Solicitacao[];
  onToggleStatus?: (id: string, currentStatus: boolean, e: React.MouseEvent) => void;
  onClickRow: (solicitacao: Solicitacao) => void;
  loading: boolean;
  /** Oculta a coluna/ação "Resolvido" (usado no Status view-only) */
  readOnly?: boolean;
}
```

No `<thead>`, inserir header "Solicitante" entre "Data" e "Cliente":
```tsx
<th className="px-5 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wider">
  Data
</th>
<th className="px-5 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wider">
  Solicitante
</th>
<th className="px-5 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wider">
  Cliente
</th>
```

Envolver o header "Resolvido" em `{!readOnly && ( ... )}`.

No `<tbody>`, inserir célula solicitante entre Data e Cliente:
```tsx
<td className="px-5 py-3 whitespace-nowrap text-sm text-slate-600 font-medium">
  {formatDate(s.data_solicitacao)}
</td>
<td className="px-5 py-3 whitespace-nowrap text-sm text-slate-700">
  {s.solicitante}
</td>
```

Envolver a célula do checkbox "Resolvido" em `{!readOnly && ( ... )}`. Dentro dela, o `onClick` chama `onToggleStatus` — como agora é opcional, usar `onToggleStatus?.(s.id, s.resolvido, e)`.

- [ ] **Step 3: Verificar no navegador**

Run: `npm run dev`
- Logar como `admin`, ir em Lista: coluna "Solicitante" aparece com o nome; check "Resolvido" funciona.
- Rodapé da sidebar mostra nome + perfil + botão Sair; Sair volta pro login.

- [ ] **Step 4: Lint + build**

Run: `npm run lint && npm run build`
Expected: sem erros.

- [ ] **Step 5: Commit (se git)**

```bash
git add src/components/admin/Sidebar.tsx src/components/admin/RecordsList.tsx
git commit -m "feat(auth): sidebar dinamica por perfil, logout e coluna Solicitante"
```

---

### Task 9: Escopo de empresa nas páginas (Dashboard/Lista) + filtro fixo

**Files:**
- Modify: `src/components/admin/DashboardFilters.tsx` (prop `empresaFixa`)
- Modify: `src/pages/DashboardPage.tsx` (aplicar escopo do perfil)
- Modify: `src/pages/ListPage.tsx` (aplicar escopo do perfil)

**Interfaces:**
- Consumes: `useAuth` (Task 4), `ESCOPO_EMPRESA` (Task 1).
- Produces: `DashboardFilters` ganha prop `empresaFixa?: Empresa`.

- [ ] **Step 1: `DashboardFilters.tsx` — prop empresaFixa**

Adicionar à interface:
```tsx
interface DashboardFiltersProps {
  filtros: FiltrosState;
  onChange: (filtros: FiltrosState) => void;
  onRefresh: () => void;
  ultimaAtualizacao: string;
  isRefreshing: boolean;
  /** Quando presente, trava e oculta o seletor de empresa. */
  empresaFixa?: Empresa;
}
```

No bloco "Empresa", quando `empresaFixa` estiver setado, renderizar rótulo estático em vez do `<select>`:
```tsx
{empresaFixa ? (
  <div className="flex flex-col">
    <label className="text-xs font-medium text-slate-500 mb-1">Empresa</label>
    <div className="h-10 px-3 flex items-center rounded-lg border border-slate-200 bg-slate-50 text-sm text-slate-700">
      {empresaFixa}
    </div>
  </div>
) : (
  /* ...select existente... */
)}
```

Também ajustar `resetFiltros` para preservar empresa fixa:
```tsx
const resetFiltros = () =>
  onChange({ empresa: empresaFixa ?? 'Ambas', dataInicio: '', dataFim: '' });
```

- [ ] **Step 2: `DashboardPage.tsx` — aplicar escopo**

Logo no topo do componente:
```tsx
import { useAuth } from '../context/AuthContext';
import { ESCOPO_EMPRESA } from '../types';
```
```tsx
const { user } = useAuth();
const empresaFixa = user ? ESCOPO_EMPRESA[user.perfil] : null;
```

Inicializar filtros com empresa do escopo:
```tsx
const [filtros, setFiltros] = useState<FiltrosState>({
  empresa: empresaFixa ?? 'Ambas',
  dataInicio: '',
  dataFim: '',
});
```

Ao montar `filtrosServico`, forçar empresa quando houver escopo:
```tsx
const filtrosServico: FiltrosSolicitacoes = useMemo(
  () => ({
    empresa: empresaFixa ?? filtros.empresa,
    dataInicio: filtros.dataInicio || undefined,
    dataFim: filtros.dataFim || undefined,
  }),
  [filtros, empresaFixa]
);
```

Passar `empresaFixa` ao `DashboardFilters`:
```tsx
<DashboardFilters
  filtros={filtros}
  onChange={setFiltros}
  onRefresh={refetch}
  ultimaAtualizacao={ultimaAtualizacao}
  isRefreshing={refreshing}
  empresaFixa={empresaFixa ?? undefined}
/>
```

- [ ] **Step 3: `ListPage.tsx` — aplicar escopo**

Mesmo padrão: importar `useAuth` + `ESCOPO_EMPRESA`, derivar `empresaFixa`, inicializar `filtros.empresa` com `empresaFixa ?? 'Ambas'`, forçar em `filtrosServico.empresa = empresaFixa ?? filtros.empresa`, e passar `empresaFixa` ao `DashboardFilters`. (Lista é acessível só por ADMIN/Expedição, que têm escopo `null` — o efeito prático é neutro aqui, mas mantém o padrão consistente e seguro caso a allow-list mude.)

- [ ] **Step 4: Verificar no navegador**

Run: `npm run dev`
- Logar como `alinare`, ir em Dashboard: filtro de empresa aparece travado em "Alinare"; gráficos só mostram Alinare.
- Logar como `admin`: seletor "Ambas/Alinare/Novitah" normal.

- [ ] **Step 5: Lint + build**

Run: `npm run lint && npm run build`
Expected: sem erros.

- [ ] **Step 6: Commit (se git)**

```bash
git add src/components/admin/DashboardFilters.tsx src/pages/DashboardPage.tsx src/pages/ListPage.tsx
git commit -m "feat(auth): escopo de empresa por perfil em Dashboard e Lista"
```

---

### Task 10: StatusPage (view-only por escopo)

**Files:**
- Modify: `src/pages/StatusPage.tsx` (substitui stub)

**Interfaces:**
- Consumes: `useAuth`, `ESCOPO_EMPRESA`, `useSolicitacoes`, `RecordsList` (readOnly), `RecordDetailModal`, `DashboardFilters`.
- Produces: `StatusPage` (default export).

- [ ] **Step 1: Reescrever `src/pages/StatusPage.tsx`**

Baseado em `ListPage`, porém: empresa travada no escopo, toggle Pendente/Resolvido mantido, `RecordsList` com `readOnly` (sem check), clique na linha abre modal de respostas.

```tsx
// ── Página Status: ocorrências da empresa (view-only) ────────────────────────
import { useMemo, useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useSolicitacoes } from '../hooks/useSolicitacoes';
import { ESCOPO_EMPRESA } from '../types';
import type { FiltrosSolicitacoes, Solicitacao } from '../types';

import DashboardFilters, { type FiltrosState } from '../components/admin/DashboardFilters';
import RecordsList from '../components/admin/RecordsList';
import RecordDetailModal from '../components/admin/RecordDetailModal';

const POLLING_MS = 15_000;

export default function StatusPage() {
  const { user } = useAuth();
  const empresaFixa = user ? ESCOPO_EMPRESA[user.perfil] : null;

  const [filtros, setFiltros] = useState<FiltrosState>({
    empresa: empresaFixa ?? 'Ambas',
    dataInicio: '',
    dataFim: '',
  });
  const [verResolvidos, setVerResolvidos] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<Solicitacao | null>(null);

  const filtrosServico: FiltrosSolicitacoes = useMemo(
    () => ({
      empresa: empresaFixa ?? filtros.empresa,
      dataInicio: filtros.dataInicio || undefined,
      dataFim: filtros.dataFim || undefined,
      resolvido: verResolvidos,
    }),
    [filtros, verResolvidos, empresaFixa]
  );

  const { dados, loading, refreshing, ultimoFetch, refetch } = useSolicitacoes({
    pollingMs: POLLING_MS,
    filtros: filtrosServico,
  });

  const [, setTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 1000);
    return () => clearInterval(id);
  }, []);

  const segundosAtras = Math.floor((Date.now() - ultimoFetch) / 1000);
  const ultimaAtualizacao =
    segundosAtras < 5 ? 'Atualizado agora' : `Atualizado há ${segundosAtras}s`;

  return (
    <div className="space-y-6 max-w-7xl">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Status das Ocorrências</h1>
        <p className="text-sm text-slate-500 mt-1">
          Acompanhe a situação dos pedidos enviados.
        </p>
      </div>

      <DashboardFilters
        filtros={filtros}
        onChange={setFiltros}
        onRefresh={refetch}
        ultimaAtualizacao={ultimaAtualizacao}
        isRefreshing={refreshing}
        empresaFixa={empresaFixa ?? undefined}
      />

      <div>
        <div className="flex justify-end mb-4">
          <div className="inline-flex bg-slate-200/50 p-1 rounded-lg">
            <button
              onClick={() => setVerResolvidos(false)}
              className={`px-4 py-1.5 text-sm font-medium rounded-md transition-all ${
                !verResolvidos
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              Pendentes
            </button>
            <button
              onClick={() => setVerResolvidos(true)}
              className={`px-4 py-1.5 text-sm font-medium rounded-md transition-all ${
                verResolvidos
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              Resolvidos
            </button>
          </div>
        </div>

        <RecordsList
          dados={dados}
          loading={loading}
          onClickRow={setSelectedRecord}
          readOnly
        />
      </div>

      <RecordDetailModal
        isOpen={!!selectedRecord}
        solicitacao={selectedRecord}
        onClose={() => setSelectedRecord(null)}
      />
    </div>
  );
}
```

- [ ] **Step 2: Verificar no navegador**

Run: `npm run dev`
- Logar como `alinare`, clicar em Status: lista só com Alinare, empresa travada, **sem** check "Resolvido"; toggle Pendentes/Resolvidos funciona; clicar na linha abre modal de respostas.
- Confirmar que não há como marcar resolvido nesta tela.

- [ ] **Step 3: Lint + build**

Run: `npm run lint && npm run build`
Expected: sem erros.

- [ ] **Step 4: Commit (se git)**

```bash
git add src/pages/StatusPage.tsx
git commit -m "feat(auth): StatusPage view-only com escopo de empresa"
```

---

### Task 11: UsuariosPage (CRUD ADMIN) + modal

**Files:**
- Modify: `src/pages/UsuariosPage.tsx` (substitui stub)
- Create: `src/components/admin/UsuarioFormModal.tsx`

**Interfaces:**
- Consumes: `authService` (Task 3), `Usuario`, `Perfil`, `PERFIL_LABEL` (Task 1).
- Produces: `UsuariosPage` (default), `UsuarioFormModal` (default).

- [ ] **Step 1: Criar `src/components/admin/UsuarioFormModal.tsx`**

Modal com form (nome, usuário, senha, perfil). Modo criar ou editar. Validação simples inline (campos obrigatórios; senha obrigatória ao criar, opcional ao editar).

```tsx
// ── Modal de criação/edição de usuário ───────────────────────────────────────
import { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import type { Perfil, Usuario } from '../../types';
import { PERFIL_LABEL } from '../../types';

export interface UsuarioFormValues {
  nome: string;
  usuario: string;
  senha: string;
  perfil: Perfil;
}

interface Props {
  isOpen: boolean;
  /** Usuário sendo editado; null = criação. */
  editando: Usuario | null;
  onClose: () => void;
  onSubmit: (values: UsuarioFormValues) => Promise<void>;
}

const PERFIS: Perfil[] = ['ADMIN', 'Alinare', 'Novitah', 'Expedicao'];

export default function UsuarioFormModal({ isOpen, editando, onClose, onSubmit }: Props) {
  const [nome, setNome] = useState('');
  const [usuario, setUsuario] = useState('');
  const [senha, setSenha] = useState('');
  const [perfil, setPerfil] = useState<Perfil>('Alinare');
  const [erro, setErro] = useState('');
  const [salvando, setSalvando] = useState(false);

  // Preenche/reseta ao abrir
  useEffect(() => {
    if (!isOpen) return;
    setErro('');
    if (editando) {
      setNome(editando.nome);
      setUsuario(editando.usuario);
      setSenha('');
      setPerfil(editando.perfil);
    } else {
      setNome('');
      setUsuario('');
      setSenha('');
      setPerfil('Alinare');
    }
  }, [isOpen, editando]);

  if (!isOpen) return null;

  const handle = async (e: React.FormEvent) => {
    e.preventDefault();
    setErro('');
    if (!nome.trim() || !usuario.trim()) {
      setErro('Nome e usuário são obrigatórios.');
      return;
    }
    if (!editando && !senha) {
      setErro('Senha é obrigatória na criação.');
      return;
    }
    setSalvando(true);
    try {
      await onSubmit({ nome: nome.trim(), usuario: usuario.trim(), senha, perfil });
    } catch (err) {
      setErro(err instanceof Error ? err.message : 'Erro ao salvar.');
    } finally {
      setSalvando(false);
    }
  };

  const inputCls =
    'h-10 w-full px-3 rounded-lg border border-slate-300 bg-white text-sm text-slate-900 ' +
    'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-slate-900">
            {editando ? 'Editar usuário' : 'Novo usuário'}
          </h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-100 cursor-pointer" aria-label="Fechar">
            <X className="w-5 h-5 text-slate-600" />
          </button>
        </div>

        <form onSubmit={handle} className="space-y-3">
          <div>
            <label className="text-xs font-medium text-slate-500 mb-1 block">Nome</label>
            <input value={nome} onChange={(e) => setNome(e.target.value)} className={inputCls} />
          </div>
          <div>
            <label className="text-xs font-medium text-slate-500 mb-1 block">Usuário</label>
            <input value={usuario} onChange={(e) => setUsuario(e.target.value)} className={inputCls} autoComplete="off" />
          </div>
          <div>
            <label className="text-xs font-medium text-slate-500 mb-1 block">
              Senha {editando && <span className="text-slate-400">(deixe vazio p/ manter)</span>}
            </label>
            <input type="password" value={senha} onChange={(e) => setSenha(e.target.value)} className={inputCls} autoComplete="new-password" />
          </div>
          <div>
            <label className="text-xs font-medium text-slate-500 mb-1 block">Perfil</label>
            <select value={perfil} onChange={(e) => setPerfil(e.target.value as Perfil)} className={`${inputCls} cursor-pointer`}>
              {PERFIS.map((p) => (
                <option key={p} value={p}>{PERFIL_LABEL[p]}</option>
              ))}
            </select>
          </div>

          {erro && <p className="text-sm text-red-600">{erro}</p>}

          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={onClose} className="h-10 px-4 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-100 cursor-pointer">
              Cancelar
            </button>
            <button type="submit" disabled={salvando} className="h-10 px-4 rounded-lg text-sm font-medium bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-60 cursor-pointer">
              {salvando ? 'Salvando...' : 'Salvar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Reescrever `src/pages/UsuariosPage.tsx`**

Tabela de usuários + botão Novo + editar/remover. Carrega via `authService.listarUsuarios`.

```tsx
// ── Página de gestão de usuários (ADMIN) ─────────────────────────────────────
import { useEffect, useState, useCallback } from 'react';
import toast from 'react-hot-toast';
import { UserPlus, Pencil, Trash2 } from 'lucide-react';
import authService from '../services/authService';
import type { Usuario } from '../types';
import { PERFIL_LABEL } from '../types';
import UsuarioFormModal, { type UsuarioFormValues } from '../components/admin/UsuarioFormModal';

export default function UsuariosPage() {
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalAberto, setModalAberto] = useState(false);
  const [editando, setEditando] = useState<Usuario | null>(null);

  const carregar = useCallback(async () => {
    setLoading(true);
    try {
      setUsuarios(await authService.listarUsuarios());
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    carregar();
  }, [carregar]);

  const abrirNovo = () => {
    setEditando(null);
    setModalAberto(true);
  };
  const abrirEdicao = (u: Usuario) => {
    setEditando(u);
    setModalAberto(true);
  };

  const handleSubmit = async (values: UsuarioFormValues) => {
    if (editando) {
      // senha vazia = manter a atual
      const patch: Partial<Omit<Usuario, 'id'>> = {
        nome: values.nome,
        usuario: values.usuario,
        perfil: values.perfil,
      };
      if (values.senha) patch.senha = values.senha;
      await authService.atualizarUsuario(editando.id, patch);
      toast.success('Usuário atualizado.');
    } else {
      await authService.criarUsuario(values);
      toast.success('Usuário criado.');
    }
    setModalAberto(false);
    await carregar();
  };

  const handleRemover = async (u: Usuario) => {
    if (!confirm(`Remover o usuário "${u.nome}"?`)) return;
    try {
      await authService.removerUsuario(u.id);
      toast.success('Usuário removido.');
      await carregar();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro ao remover.');
    }
  };

  return (
    <div className="space-y-6 max-w-5xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Usuários</h1>
          <p className="text-sm text-slate-500 mt-1">Gerencie os acessos ao sistema.</p>
        </div>
        <button
          onClick={abrirNovo}
          className="h-10 px-4 rounded-lg text-sm font-medium bg-blue-600 text-white hover:bg-blue-700 flex items-center gap-2 cursor-pointer"
        >
          <UserPlus className="w-4 h-4" />
          Novo usuário
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        {loading ? (
          <div className="p-8 flex justify-center">
            <div className="w-8 h-8 rounded-full border-4 border-slate-200 border-t-blue-500 animate-spin" />
          </div>
        ) : (
          <table className="w-full text-left border-collapse min-w-[600px]">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="px-5 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wider">Nome</th>
                <th className="px-5 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wider">Usuário</th>
                <th className="px-5 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wider">Perfil</th>
                <th className="px-5 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wider text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {usuarios.map((u) => (
                <tr key={u.id} className="hover:bg-slate-50/80">
                  <td className="px-5 py-3 text-sm font-medium text-slate-900">{u.nome}</td>
                  <td className="px-5 py-3 text-sm text-slate-600">{u.usuario}</td>
                  <td className="px-5 py-3 text-sm text-slate-700">{PERFIL_LABEL[u.perfil]}</td>
                  <td className="px-5 py-3 text-right whitespace-nowrap">
                    <button onClick={() => abrirEdicao(u)} className="p-2 rounded-lg hover:bg-slate-100 cursor-pointer" aria-label="Editar">
                      <Pencil className="w-4 h-4 text-slate-600" />
                    </button>
                    <button onClick={() => handleRemover(u)} className="p-2 rounded-lg hover:bg-red-50 cursor-pointer" aria-label="Remover">
                      <Trash2 className="w-4 h-4 text-red-600" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <UsuarioFormModal
        isOpen={modalAberto}
        editando={editando}
        onClose={() => setModalAberto(false)}
        onSubmit={handleSubmit}
      />
    </div>
  );
}
```

- [ ] **Step 3: Verificar no navegador**

Run: `npm run dev`
- Logar como `admin`, ir em Usuários: lista os 4 seed.
- Criar novo (ex.: perfil Novitah) → aparece na tabela; login duplicado dá erro.
- Editar um usuário sem senha → mantém senha (relogar com senha antiga funciona).
- Remover `admin` → bloqueado com mensagem; remover outro → some.

- [ ] **Step 4: Lint + build**

Run: `npm run lint && npm run build`
Expected: sem erros.

- [ ] **Step 5: Commit (se git)**

```bash
git add src/pages/UsuariosPage.tsx src/components/admin/UsuarioFormModal.tsx
git commit -m "feat(auth): CRUD de usuarios (ADMIN) com modal"
```

---

### Task 12: Verificação end-to-end dos 4 perfis

**Files:** nenhum (validação).

- [ ] **Step 1: Rodar app limpa**

Limpar storage: DevTools → Application → Local Storage → remover `cr_usuarios` e `cr_sessao` (ou usar aba anônima). `npm run dev`.

- [ ] **Step 2: Roteiro de verificação**

- **ADMIN** (`admin/admin123`): entra em `/admin/dashboard`; vê Dashboard/Lista/Usuários; seletor de empresa "Ambas"; Lista mostra coluna Solicitante e permite check Resolvido; CRUD usuários funciona.
- **Alinare** (`alinare/alinare123`): entra em `/alinare` (formulário); menu Formulário/Status/Dashboard; Dashboard e Status travados em Alinare; Status sem check; `/admin/lista` e `/admin/usuarios` por URL redirecionam pra `/alinare`.
- **Novitah** (`novitah/novitah123`): igual Alinare, escopo Novitah.
- **Expedição** (`expedicao/expedicao123`): entra em `/admin/dashboard`; menu Dashboard/Lista; vê ambas empresas; pode marcar Resolvido na Lista; `/alinare`, `/novitah`, `/admin/usuarios` por URL redirecionam pra `/admin/dashboard`.
- **Deslogado**: qualquer rota protegida cai em `/login`. Logout pela sidebar limpa sessão.

- [ ] **Step 3: Lint + build final**

Run: `npm run lint && npm run build`
Expected: sem erros.

- [ ] **Step 4: Commit (se git)**

```bash
git commit --allow-empty -m "chore(auth): verificacao e2e dos 4 perfis concluida"
```

---

## Self-Review

**Cobertura do spec:**
- §2 Perfis/permissões → Tasks 1,2,5,7 (rotas), 9/10 (escopo, view-only), 11 (CRUD). ✔
- §3 Auth trocável (interface + mock) → Tasks 1,3,4. ✔
- §4 Rotas + ProtectedRoute → Tasks 5,7. ✔
- §5 Sidebar dinâmica + logout → Task 8. ✔
- §6 Escopo de empresa → Tasks 9,10. ✔
- §7 Mudanças componentes (coluna Solicitante, readOnly, empresaFixa) → Tasks 8,9. ✔
- §8 Arquivos novos → todos criados nas tasks correspondentes. ✔
- §10 Erros (login inválido, acesso negado, sessão ausente, CRUD) → Tasks 3,5,6,11. ✔

**Placeholders:** nenhum — todo código é concreto. Único ponto aberto controlado: nomes de ícones lucide validados no build (Task 2 Step 2 tem fallback).

**Consistência de tipos:** `Perfil`, `Usuario`, `UsuarioAutenticado`, `ESCOPO_EMPRESA`, `PERFIL_LABEL` definidos na Task 1 e usados com os mesmos nomes depois. `IAuthService` métodos idênticos entre Task 3 (def) e Tasks 4/11 (uso). `empresaFixa`/`readOnly` props consistentes entre definição e uso.

**Nota sobre TDD:** projeto sem test runner; substituído por verificação lint+build+navegador em cada task, conforme Global Constraints.
