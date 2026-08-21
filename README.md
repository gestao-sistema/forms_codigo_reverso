# Formulário de Logística Reversa — Documentação Técnica

Sistema para registro e acompanhamento de solicitações de devolução (logística reversa) das empresas **Alinare** e **Novitah**. Frontend React + TypeScript + Vite, backend **Supabase (PostgreSQL)**.

---

## Stack Tecnológica


| Camada         | Tecnologia                 | Versão |
| -------------- | -------------------------- | ------ |
| Runtime        | Node.js                    | 20+    |
| Build          | Vite                       | 8.x    |
| Framework      | React                      | 19.x   |
| Linguagem      | TypeScript                 | 6.x    |
| Estilização    | Tailwind CSS               | 4.x    |
| Roteamento     | React Router               | 7.x    |
| Formulários    | React Hook Form            | 7.x    |
| Validação      | Zod                        | 3.x    |
| Gráficos       | Recharts                   | 3.x    |
| Autenticação   | Supabase Auth (JWT nativo) | 2.x    |
| Banco de Dados | Supabase / PostgreSQL      | 2.x    |
| Planilhas      | SheetJS (xlsx)             | 0.18.x |
| Lint           | Oxlint                     | 1.x    |


**Dependências principais** (`package.json`):

```json
{
  "dependencies": {
    "@hookform/resolvers": "^5.7.1",
    "@supabase/supabase-js": "^2.112.3",
    "lucide-react": "^1.31.0",
    "react": "^19.2.8",
    "react-datepicker": "^9.1.0",
    "react-dom": "^19.2.8",
    "react-hook-form": "^7.85.0",
    "react-hot-toast": "^2.6.0",
    "react-router-dom": "^7.18.2",
    "recharts": "^3.10.1",
    "xlsx": "^0.18.5",
    "zod": "^3.25.76"
  }
}
```

---

## Arquitetura

```
src/
├── App.tsx                    # Roteamento + providers
├── main.tsx                   # Entry point
├── components/
│   ├── admin/                 # Dashboard, listas, gráficos, Kanban
│   ├── auth/                  # ProtectedRoute
│   └── forms/                 # ReverseLogisticsForm
├── context/
│   └── AuthContext.tsx        # Estado global de autenticação
├── hooks/
│   └── useSolicitacoes.ts     # Data fetching + cache + polling
├── lib/
│   ├── supabase.ts            # Cliente Supabase (singleton)
│   └── perfil.ts              # Helpers de navegação por telas
├── pages/                     # Páginas (Login, Dashboard, Formulários, etc)
├── schemas/
│   └── formSchema.ts          # Validação Zod do formulário
├── services/
│   ├── apiService.ts          # CRUD solicitacoes_reverso
│   └── authService.ts         # Supabase Auth (signIn, sessão, JWT)
├── supabase/functions/
│   └── admin-usuarios/        # Edge Function CRUD auth.users (service_role)
└── types/
    └── index.ts               # Tipos compartilhados (Solicitacao, Usuario, Tela)
```

**Padrão de camadas**:

```
Component → Service (apiService/authService) → Supabase Client → PostgreSQL
```

Componentes **nunca** acessam banco diretamente.

---

## Banco de Dados (PostgreSQL via Supabase)

### Tabela `solicitacoes_reverso`


| Coluna                         | Tipo          | Descrição                                               |
| ------------------------------ | ------------- | ------------------------------------------------------- |
| `id`                           | `uuid`        | PK, `gen_random_uuid()`                                 |
| `created_at`                   | `timestamptz` | Timestamp de inserção                                   |
| `empresa`                      | `text`        | `'Alinare'` \| `'Novitah'`                              |
| `data_solicitacao`             | `date`        | Data da solicitação (YYYY-MM-DD)                        |
| `solicitante`                  | `text`        | Nome do solicitante interno                             |
| `setor`                        | `text`        | Setor (ex: 'Comercial Alinare')                         |
| `codigo_cliente`               | `integer`     | Código numérico da cliente                              |
| `nome_cliente`                 | `text`        | Nome completo da cliente                                |
| `endereco_postagem`            | `text`        | Endereço para devolução                                 |
| `motivo`                       | `text`        | Motivo (enum: Peça com defeito, Mercadoria errada, ...) |
| `justificativa_outros`         | `text`        | Obrigatório quando motivo = 'Outros'                    |
| `autorizacao`                  | `text`        | Nome do autorizador                                     |
| `status`                       | `text`        | `'pendente' \| 'etiqueta_gerada' \| 'postado' \| 'concluido'` |
| `etiqueta_gerada_em`           | `timestamptz` | Quando a etiqueta foi gerada (Expedição)                |
| `postado_em`                   | `timestamptz` | Quando a cliente postou a mercadoria (Comercial)        |
| `concluido_em`                 | `timestamptz` | Quando a solicitação foi finalizada (Expedição)         |
| `anotacoes`                    | `text`        | Campo livre para anotações internas                     |
| `tempo_preenchimento_segundos` | `integer`     | Tempo de preenchimento do formulário                    |


**Índices**:

```sql
CREATE INDEX idx_solicitacoes_empresa_data ON solicitacoes_reverso (empresa, data_solicitacao DESC);
CREATE INDEX idx_solicitacoes_status ON solicitacoes_reverso (status);
```

### Tabela `usuarios` (gerenciada via Supabase Auth + Edge Function)

Usuários existem em `auth.users` (Supabase Auth). Metadata no JWT:


| Campo metadata | Tipo   | Descrição                                                 |
| -------------- | ------ | --------------------------------------------------------- |
| `nome`         | `text` | Nome completo                                             |
| `usuario`      | `text` | Login único (username)                                    |
| `telas`        | `text[]` | Array de telas permitidas (ex: `['lista-geral', 'status-alinare']`) |


**Senha**: NUNCA armazenada/acessada pelo app. Hash gerenciado 100% pelo Supabase Auth (bcrypt/argon2 interno). Login via `signInWithPassword(email, senha)` → JWT + refresh token.

CRUD admin via Edge Function `admin-usuarios` (service_role, só ADMIN chama):

- `create`: cria em `auth.users` + metadata
- `update`: metadata + opcional senha/email
- `delete`: remove de `auth.users`
- `list`: lista todos via `auth.admin.listUsers()`

---

## Telas de Acesso (Permissões Granulares)

Substituíram perfis legados. Cada usuário recebe um array `telas` no JWT:


| Tela               | Descrição                              | Empresa (escopo) |
| ------------------ | -------------------------------------- | ---------------- |
| `dashboard-geral`  | Dashboard (todas empresas)             | Ambas            |
| `dashboard-alinare`| Dashboard (Alinare)                    | Alinare          |
| `dashboard-novitah`| Dashboard (Novitah)                    | Novitah          |
| `formulario-alinare`| Formulário Alinare                    | Alinare          |
| `formulario-novitah`| Formulário Novitah                    | Novitah          |
| `lista-geral`      | Lista de solicitações (Expedição)      | Ambas            |
| `lista-alinare`    | Lista (Alinare)                        | Alinare          |
| `lista-novitah`    | Lista (Novitah)                        | Novitah          |
| `status-geral`     | Status (Comercial vê tudo)             | Ambas            |
| `status-alinare`   | Status (Alinare)                       | Alinare          |
| `status-novitah`   | Status (Novitah)                       | Novitah          |
| `kanban`           | Kanban (visão geral do fluxo)          | Ambas            |
| `usuarios`         | Administração de usuários (Admin)      | Ambas            |


Definidos em `src/types/index.ts` → `Tela`, `TELAS`, `TELA_LABEL`.

---

## Fluxo de Status (Novo)

```
pendente → etiqueta_gerada → postado → concluido
```

| Status          | Quem move        | Onde           | Timestamp            |
| --------------- | ---------------- | --------------- | -------------------- |
| `pendente`      | — (criação)      | Formulário      | —                    |
| `etiqueta_gerada`| **Expedição** (`lista-*`) | Lista / Kanban | `etiqueta_gerada_em` |
| `postado`       | **Comercial** (`status-*` sem `lista-*`) | Status / Kanban | `postado_em`        |
| `concluido`     | **Expedição** (`lista-*`) | Lista / Kanban | `concluido_em`      |

- **Admin** (`usuarios`) pode mover em qualquer direção
- **Expedição** (tela `lista-*`) → `pendente→etiqueta_gerada`, `postado→concluido`
- **Comercial** (tela `status-*` **sem** `lista-*`) → `etiqueta_gerada→postado`

---

## Configuração de Ambiente

Crie `.env` na raiz (baseado em `.env.example`):

```env
# Supabase (obrigatório)
VITE_SUPABASE_URL=https://[[ORCA_RICH_MD:de5f6ef2e3ca4a18792719dd005085be:inline-html:%3Cseu-projeto%3E]].supabase.co
VITE_SUPABASE_ANON_KEY=[[ORCA_RICH_MD:de5f6ef2e3ca4a18792719dd005085be:inline-html:%3Canon-key%3E]]

# Opcional: para importação de planilhas Excel
# VITE_IMPORT_API_URL=
```

**Obter credenciais**: Supabase Dashboard → Settings → API → Project URL / anon public key.

---

## Scripts Disponíveis

```bash
npm run dev      # Servidor de desenvolvimento (Vite + HMR)
npm run build    # Build produção (tsc + vite build)
npm run lint     # Oxlint (rápido, sem type-check)
npm run preview  # Preview do build local
npm run test     # Vitest (unit + integration)
```

---

## Estrutura de Dados (TypeScript)

Tipos principais em `src/types/index.ts`:

```typescript
type Empresa = 'Alinare' | 'Novitah';

export const STATUS_SOLICITACAO = [
  'pendente',
  'etiqueta_gerada',
  'postado',
  'concluido',
] as const;

export type StatusSolicitacao = typeof STATUS_SOLICITACAO[number];

interface Solicitacao {
  id: string;
  created_at: string;           // ISO 8601
  empresa: Empresa;
  data_solicitacao: string;     // YYYY-MM-DD
  solicitante: string;
  setor: string;
  codigo_cliente: number;
  nome_cliente: string;
  endereco_postagem: string;
  motivo: string;
  justificativa_outros?: string | null;
  autorizacao: string;
  status: StatusSolicitacao;
  etiqueta_gerada_em?: string | null;
  postado_em?: string | null;
  concluido_em?: string | null;
  anotacoes?: string | null;
  tempo_preenchimento_segundos: number;
}

type CreateSolicitacaoPayload = Omit<Solicitacao, 'id' | 'created_at'>;
type UpdateSolicitacaoPayload = Partial<Omit<Solicitacao, 'id' | 'created_at'>>;

interface FiltrosSolicitacoes {
  empresa?: Empresa | 'Ambas';
  dataInicio?: string;   // YYYY-MM-DD
  dataFim?: string;      // YYYY-MM-DD
  status?: StatusSolicitacao | StatusSolicitacao[];
  buscaCliente?: string;
}
```

---

## Validação do Formulário (`src/schemas/formSchema.ts`)

Zod com `superRefine` para regra condicional:

- `justificativa_outros` **obrigatório** apenas quando `motivo === 'Outros'`
- Sanitização anti-XSS em campos de texto (`replace(/<[^>]*>?/gm, '')`)
- Limites de tamanho: solicitante 100, nome_cliente 150, endereço 300, justificativa 500

---

## Autenticação

**Fluxo**:

1. `LoginPage` → `authService.login(usuario, senha)`
2. `authService` transforma login em `{usuario}@cr.internal`
3. Chama `supabase.auth.signInWithPassword` (banco de dados Supabase nativo)
4. Sucesso → JWT e refresh token salvos (SDK Supabase). O JWT inclui os custom claims em `user_metadata` (`nome`, `usuario`, `telas`).
5. `AuthProvider` escuta mudanças de sessão via `onAuthStateChange` e popula o contexto React.

**Segurança**: Senhas são processadas e hasheadas nativamente pelo Supabase (não transitam no seu backend, e o DB não as guarda em texto plano). Sessão flui via JWT HttpOnly/Secure ou localStorage (gerenciado pelo JS client do Supabase).

---

## Importação de Dados (Excel)

Funcionalidade em `src/services/analytics.ts` / `apiService.ts`:

- Lê `.xlsx` via `SheetJS (xlsx)`
- Mapeia colunas → `CreateSolicitacaoPayload`
- Insere em lote via `supabase.from('solicitacoes_reverso').insert()`

**Colunas esperadas na planilha**:

```
Empresa | Data Solicitação | Solicitante | Setor | Código Cliente | Nome Cliente | Endereço Postagem | Motivo | Justificativa Outros | Autorização | Status | Etiqueta Gerada Em | Postado Em | Concluido Em | Anotações | Tempo Preenchimento (s)
```

---

## Dashboard, Kanban & Gráficos (`src/components/admin/`)


| Componente           | Biblioteca             | Dados                    |
| -------------------- | ---------------------- | ------------------------ |
| `ChartEmpresa`       | Recharts (PieChart)    | Distribuição por empresa |
| `ChartMotivo`        | Recharts (BarChart)    | Top motivos              |
| `ChartTimeline`      | Recharts (LineChart)   | Solicitações por dia     |
| `ChartAutorizador`   | Recharts (BarChart)    | Por autorizador          |
| `ChartMotivoEmpresa` | Recharts (Grouped Bar) | Motivo × Empresa         |
| `SummaryCards`       | —                      | 5 KPIs (Total, Pendentes, Etiqueta Gerada, Postados, Concluídos) |
| `KanbanPage`         | — (botões, sem DnD)    | 4 colunas por status     |


Dados via `useSolicitacoes.ts` (hook com cache, polling 15s e invalidação).

---

## Deploy

### Railway - Stack Comum

1. Conecte repositório
2. Build Command: `npm run build`
3. Output Directory: `dist`
4. Adicione variáveis de ambiente (`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`)

### Docker (Opcional)

```dockerfile
FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build
EXPOSE 4173
CMD ["npm", "run", "preview", "--", "--host", "0.0.0.0", "--port", "4173"]
```

---

## Manutenção Comum

### Adicionar novo motivo

1. `src/types/index.ts` → array `MOTIVOS`
2. `src/schemas/formSchema.ts` → enum `MOTIVOS` (automático via import)

### Adicionar novo autorizador

1. `src/types/index.ts` → `AUTORIZACOES` record
2. `src/schemas/formSchema.ts` → `todasAutorizacoes` (automático)

### Adicionar novo setor

1. `src/types/index.ts` → array `SETORES`

### Nova tela de acesso

1. `src/types/index.ts` → `Tela` type + `TELAS` + `TELA_LABEL`
2. `src/lib/perfil.ts` → `NAV_MAP` + `ORDEM_NAV` + `ORDEM_NAV_ADMIN` + `telaDaRota`
3. `src/App.tsx` → `ProtectedRoute telas={['nova-tela']}` na rota nova
4. `src/pages/UsuariosPage.tsx` → adicionar grupo checkbox na UI

### Migração de banco (Supabase)

Use **Supabase Migrations** (`supabase migration new`) ou SQL direto no Dashboard → SQL Editor.

Para recriar tabela do zero (novo ambiente):

```bash
# 1. Rodar create_table.sql (DROP + CREATE)
# 2. Rodar rls_solicitacoes_v4.sql
```

---

## Troubleshooting


| Problema                                 | Causa                             | Solução                                                            |
| ---------------------------------------- | --------------------------------- | ------------------------------------------------------------------ |
| `Supabase não configurado`               | `.env` ausente ou vars erradas    | Verifique `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY`           |
| Login falha "Usuário ou senha inválidos" | Usuário não existe / senha errada | Admin gerencia senhas na aba de Usuários                           |
| Gráficos vazios                          | RLS bloqueando SELECT             | Policy `SELECT` para `anon` / `authenticated` na tabela            |
| Build falha no `tsc`                     | Tipos desatualizados              | `npm install` + verifique `src/types/index.ts` sincronizado com DB |
| Kanban não carrega / tela cortada        | Height mal calculada              | Ajuste `h-[calc(100dvh-...)]` em `KanbanPage.tsx` por breakpoint  |
| Botão "Marcar postado" não aparece       | Permissão de tela                 | Usuário precisa de `status-*` **sem** `lista-*` (ou `usuarios`)    |
| Erro ao salvar anotações                 | Coluna `anotacoes` não existe     | Rode `ALTER TABLE solicitacoes_reverso ADD COLUMN IF NOT EXISTS anotacoes TEXT;` |

---

## Licença

Uso interno — Alinare / Novitah e Expedição.