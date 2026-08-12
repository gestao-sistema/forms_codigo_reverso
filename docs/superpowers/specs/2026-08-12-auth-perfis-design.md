# Design — Autenticação + Perfis de Acesso

**Data:** 2026-08-12
**Projeto:** formulario_cr (Logística Reversa — Alinare/Novitah)
**Status:** Aprovado para planejamento

## 1. Objetivo

Adicionar tela de login e controle de acesso por perfil sobre a aplicação
existente (React 19 + Vite + React Router + Tailwind). O backend atual é um
**mock em memória** (`src/services/apiService.ts`) — não há servidor, tabela de
usuários nem auth. Esta fase entrega **UI + estrutura de auth** com provider
trocável, começando num mock client-side, sem reescrita quando o Supabase real
entrar depois.

## 2. Perfis e Permissões

Quatro perfis. O perfil carrega um **escopo de empresa** que trava o que o
usuário enxerga.

| Perfil | Escopo empresa | Login redireciona p/ | Menu (sidebar) | Permissões |
|--------|----------------|----------------------|----------------|------------|
| **ADMIN** | Ambas | `/admin/dashboard` | Dashboard, Lista, Usuários | Acesso total; CRUD de usuários; marcar resolvido |
| **Alinare** | Alinare | `/alinare` (formulário) | Formulário, Status, Dashboard | Enviar formulário; Status e Dashboard **somente Alinare**; Status é **view-only** |
| **Novitah** | Novitah | `/novitah` (formulário) | Formulário, Status, Dashboard | Igual Alinare, escopo **Novitah** |
| **Expedição** | Ambas | `/admin/dashboard` | Dashboard, Lista | Ver Lista + Dashboard de ambas; **marcar concluído (check)**; sem formulário; sem usuários |

Regras de escopo:
- Alinare/Novitah têm filtro de empresa **forçado** em toda consulta — não veem a
  outra empresa nem por manipulação de URL/filtro.
- "Status" (Alinare/Novitah) = lista de ocorrências da própria empresa mostrando
  situação (Pendente/Concluído) e abrindo respostas do formulário. **Sem** toggle
  de check (só Expedição/Admin resolvem).

## 3. Arquitetura de Auth (provider trocável)

Mesmo padrão do `apiService`: interface + implementação injetável.

```
AuthContext (React Context)
  └── useAuth() → { user, login(usuario, senha), logout(), isLoading }

IAuthService (interface)
  ├── mockAuthService   ← ESTA FASE (localStorage)
  └── supabaseAuthService ← futuro (mesma interface, telas não mudam)
```

### 3.1 Tipos novos (`src/types/index.ts`)

```ts
export type Perfil = 'ADMIN' | 'Alinare' | 'Novitah' | 'Expedicao';

export interface Usuario {
  id: string;
  nome: string;
  usuario: string;        // login (username), único
  senha: string;          // texto plano no mock; hash quando houver backend
  perfil: Perfil;
}

/** Usuário autenticado exposto pela sessão (sem senha) */
export type UsuarioAutenticado = Omit<Usuario, 'senha'>;
```

Mapa perfil → escopo de empresa (helper):
```ts
// null = ambas (ADMIN, Expedicao)
export const ESCOPO_EMPRESA: Record<Perfil, Empresa | null> = {
  ADMIN: null,
  Expedicao: null,
  Alinare: 'Alinare',
  Novitah: 'Novitah',
};
```

### 3.2 `IAuthService` (`src/services/authService.ts`)

```ts
export interface IAuthService {
  login(usuario: string, senha: string): Promise<UsuarioAutenticado>;
  logout(): Promise<void>;
  getSessao(): UsuarioAutenticado | null;   // lê localStorage
  // CRUD de usuários (só ADMIN chama via UI protegida)
  listarUsuarios(): Promise<Usuario[]>;
  criarUsuario(data: Omit<Usuario, 'id'>): Promise<Usuario>;
  atualizarUsuario(id: string, data: Partial<Omit<Usuario, 'id'>>): Promise<Usuario>;
  removerUsuario(id: string): Promise<void>;
}
```

`mockAuthService`:
- Lista de usuários persistida em `localStorage` (chave `cr_usuarios`), com seed
  inicial na primeira carga.
- Sessão em `localStorage` (chave `cr_sessao`), guardando `UsuarioAutenticado`.
- `login` compara usuario+senha; erro → rejeita com mensagem "Usuário ou senha inválidos".
- Latência simulada (`delay`) igual ao `apiService`.

### 3.3 Seed inicial de usuários

| nome | usuario | senha | perfil |
|------|---------|-------|--------|
| Administrador | `admin` | `admin123` | ADMIN |
| Operador Alinare | `alinare` | `alinare123` | Alinare |
| Operador Novitah | `novitah` | `novitah123` | Novitah |
| Expedição | `expedicao` | `expedicao123` | Expedicao |

(Senhas de desenvolvimento; trocar ao integrar backend.)

## 4. Rotas e Proteção

### 4.1 Nova rota pública
- `/login` — tela de login (usuário + senha).

### 4.2 Componente `ProtectedRoute`
Props: `roles?: Perfil[]`. Comportamento:
- Sem sessão → `Navigate` para `/login`.
- Com sessão mas perfil fora de `roles` → `Navigate` para a **home do perfil**
  (helper `homeDoPerfil(perfil)`).
- Autorizado → renderiza `children`/`Outlet`.

### 4.3 Mapa de rotas (App.tsx)

```
/login                         → LoginPage (público)

/alinare    [Alinare, ADMIN]   → AlinareFormPage
/novitah    [Novitah, ADMIN]   → NovitahFormPage

/admin  (AdminLayout, protegido)
  /admin/dashboard  [ADMIN, Expedicao, Alinare, Novitah] → DashboardPage (escopo)
  /admin/lista      [ADMIN, Expedicao]                   → ListPage (ambas)
  /admin/status     [Alinare, Novitah]                   → StatusPage (view-only, escopo)
  /admin/usuarios   [ADMIN]                              → UsuariosPage

/  → redireciona para home do perfil (ou /login se deslogado)
*  → home do perfil (ou /login)
```

Observação: Alinare/Novitah acessam Dashboard e Status dentro de `/admin`
(mesmo layout), com sidebar filtrada por perfil. O formulário permanece em
`/alinare` `/novitah` (rota própria, fora do layout admin), e o menu "Formulário"
aponta para lá.

## 5. Layout — Sidebar dinâmica (Abordagem A)

Reaproveita `AdminLayout` + `Sidebar`. `Sidebar` passa a montar `NAV_ITEMS` a
partir do perfil do usuário logado:

```ts
function navItemsDoPerfil(perfil: Perfil): NavItem[] { ... }
// ADMIN     → Dashboard, Lista, Usuários
// Expedicao → Dashboard, Lista
// Alinare   → Formulário (/alinare), Status, Dashboard
// Novitah   → Formulário (/novitah), Status, Dashboard
```

Adições na Sidebar:
- Bloco de rodapé mostra nome do usuário + perfil + botão **Sair** (logout).
- Ícones lucide já disponíveis (`FileText` p/ Formulário, `ListChecks` p/ Status, `Users` p/ Usuários).

## 6. Aplicação do escopo de empresa

O escopo trava dados nas consultas. Ponto único: um hook/wrapper que injeta a
empresa do perfil no filtro antes de chamar `apiService`.

- **DashboardPage / ListPage / StatusPage**: ao montar filtros, se
  `ESCOPO_EMPRESA[perfil] !== null`, força `empresa` = escopo e **oculta** o
  seletor de empresa no `DashboardFilters` (Alinare/Novitah não escolhem empresa).
- ADMIN/Expedição mantêm o seletor "Ambas/Alinare/Novitah".

Assim o filtro é aplicado na camada de página (mock não conhece sessão),
mantendo `apiService` agnóstico. Quando o Supabase entrar, o mesmo escopo vira
RLS no backend.

## 7. Mudanças em componentes existentes

- **`RecordsList.tsx`**: adicionar coluna **Solicitante** (`s.solicitante`).
  Requisito explícito. Posição sugerida: entre "Data" e "Cliente". Reutilizada
  por Lista e Status.
- **`RecordsList` reuso em Status**: prop opcional `readOnly?: boolean`. Quando
  `true`, oculta a coluna/ação "Resolvido" (check), mantendo clique na linha p/
  abrir modal de respostas. Status usa `readOnly`.
- **`DashboardFilters.tsx`**: prop opcional `empresaFixa?: Empresa`. Quando
  presente, oculta o `<select>` de empresa e mostra rótulo estático.
- **`App.tsx`**: envolver árvore em `<AuthProvider>` e aplicar `ProtectedRoute`.
  Ajustar redirecionamento raiz para `homeDoPerfil`.

## 8. Arquivos novos

```
src/context/AuthContext.tsx        # Provider + useAuth
src/services/authService.ts        # IAuthService + mockAuthService
src/components/auth/ProtectedRoute.tsx
src/pages/LoginPage.tsx
src/pages/StatusPage.tsx           # lista view-only por escopo
src/pages/UsuariosPage.tsx         # CRUD users (ADMIN)
src/components/admin/UsuarioFormModal.tsx  # criar/editar usuário
src/lib/perfil.ts                  # homeDoPerfil, navItemsDoPerfil, ESCOPO_EMPRESA
```

## 9. Fluxo de dados

```
Login → mockAuthService.login → grava cr_sessao → AuthContext.user
     → redireciona homeDoPerfil(user.perfil)

Navegação → ProtectedRoute lê AuthContext.user → autoriza por roles
Páginas   → useAuth() → escopo empresa → filtros → apiService (mock)
Logout    → limpa cr_sessao → redireciona /login
```

## 10. Tratamento de erro

- Login inválido: mensagem inline + toast de erro (react-hot-toast já disponível).
- Acesso negado por URL: redireciona silenciosamente para home do perfil.
- Sessão ausente/expirada: qualquer rota protegida cai em `/login`.
- CRUD usuários: validação (usuário único, campos obrigatórios) via zod; toast de sucesso/erro.

## 11. Fora de escopo (fases futuras)

- Backend real / Supabase Auth + RLS.
- Hash de senha, recuperação de senha, refresh token.
- Auditoria de acesso.
- Testes automatizados (projeto hoje não tem suíte configurada).

## 12. Abordagens consideradas

- **A (escolhida):** um `AdminLayout` com sidebar dinâmica por perfil + rotas
  protegidas. Menos duplicação, um layout só.
- **B:** layouts separados por perfil. Mais isolamento visual, mais código.
- **C:** condicionais numa página única. Rápido, mas vira difícil de manter.
