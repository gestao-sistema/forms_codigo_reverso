# Formulário de Logística Reversa — Documentação Técnica

Sistema para registro e acompanhamento de solicitações de devolução (logística reversa) das empresas **Alinare** e **Novitah**. Frontend React + TypeScript + Vite, backend **Supabase (PostgreSQL)**.

---

## Stack Tecnológica

| Camada | Tecnologia | Versão |
|--------|------------|--------|
| Runtime | Node.js | 20+ |
| Build | Vite | 8.x |
| Framework | React | 19.x |
| Linguagem | TypeScript | 6.x |
| Estilização | Tailwind CSS | 4.x |
| Roteamento | React Router | 7.x |
| Formulários | React Hook Form | 7.x |
| Validação | Zod | 3.x |
| Gráficos | Recharts | 3.x |
| Autenticação | Supabase Auth (custom) | 2.x |
| Banco de Dados | Supabase / PostgreSQL | 2.x |
| Planilhas | SheetJS (xlsx) | 0.18.x |
| Lint | Oxlint | 1.x |

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
│   ├── admin/                 # Dashboard, listas, gráficos
│   ├── auth/                  # ProtectedRoute
│   └── forms/                 # ReverseLogisticsForm
├── context/
│   └── AuthContext.tsx        # Estado global de autenticação
├── hooks/
│   └── useSolicitacoes.ts     # Data fetching + cache
├── lib/
│   ├── supabase.ts            # Cliente Supabase (singleton)
│   └── perfil.ts              # Helpers de navegação por perfil
├── pages/                     # Páginas (Login, Dashboard, Formulários, etc)
├── schemas/
│   └── formSchema.ts          # Validação Zod do formulário
├── services/
│   ├── apiService.ts          # CRUD solicitacoes_reverso
│   └── authService.ts         # Login, usuários, sessão
└── types/
    └── index.ts               # Tipos compartilhados (Solicitacao, Usuario, Perfil)
```

**Padrão de camadas**:
```
Component → Service (apiService/authService) → Supabase Client → PostgreSQL
```
Componentes **nunca** acessam banco diretamente.

---

## Banco de Dados (PostgreSQL via Supabase)

### Tabela `solicitacoes_reverso`

| Coluna | Tipo | Descrição |
|--------|------|-----------|
| `id` | `uuid` | PK, `gen_random_uuid()` |
| `created_at` | `timestamptz` | Timestamp de inserção |
| `empresa` | `text` | `'Alinare'` \| `'Novitah'` |
| `data_solicitacao` | `date` | Data da solicitação (YYYY-MM-DD) |
| `solicitante` | `text` | Nome do solicitante interno |
| `setor` | `text` | Setor (ex: 'Comercial Alinare') |
| `codigo_cliente` | `integer` | Código numérico da cliente |
| `nome_cliente` | `text` | Nome completo da cliente |
| `endereco_postagem` | `text` | Endereço para devolução |
| `motivo` | `text` | Motivo (enum: Peça com defeito, Mercadoria errada, ...) |
| `justificativa_outros` | `text` | Obrigatório quando motivo = 'Outros' |
| `autorizacao` | `text` | Nome do autorizador |
| `resolvido` | `boolean` | Status de resolução |
| `tempo_preenchimento_segundos` | `integer` | Tempo de preenchimento do formulário |

**Índices recomendados**:
```sql
CREATE INDEX idx_solicitacoes_empresa_data ON solicitacoes_reverso (empresa, data_solicitacao DESC);
CREATE INDEX idx_solicitacoes_resolvido ON solicitacoes_reverso (resolvido);
```

### Tabela `usuarios`

| Coluna | Tipo | Descrição |
|--------|------|-----------|
| `id` | `uuid` | PK |
| `nome` | `text` | Nome completo |
| `usuario` | `text` | Login único (username) |
| `senha` | `text` | **Texto plano** (TODO: hash bcrypt/argon2) |
| `perfil` | `text` | `'ADMIN' \| 'Alinare' \| 'Novitah' \| 'Expedicao'` |

---

## Perfis de Acesso

| Perfil | Escopo Empresa | Rotas Permitidas |
|--------|----------------|------------------|
| `ADMIN` | Ambas | Todas (`/admin/*`, `/admin/usuarios`) |
| `Expedicao` | Ambas | Dashboard, Lista |
| `Alinare` | Alinare | Formulário Alinare, Status, Dashboard |
| `Novitah` | Novitah | Formulário Novitah, Status, Dashboard |

Definidos em `src/types/index.ts` → `ESCOPO_EMPRESA` e `PERFIL_LABEL`.

---

## Configuração de Ambiente

Crie `.env` na raiz (baseado em `.env.example`):

```env
# Supabase (obrigatório)
VITE_SUPABASE_URL=https://<seu-projeto>.supabase.co
VITE_SUPABASE_ANON_KEY=<anon-key>

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
```

---

## Estrutura de Dados (TypeScript)

Tipos principais em `src/types/index.ts`:

```typescript
type Empresa = 'Alinare' | 'Novitah';

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
  resolvido: boolean;
  tempo_preenchimento_segundos: number;
}

type CreateSolicitacaoPayload = Omit<Solicitacao, 'id' | 'created_at'>;
type UpdateSolicitacaoPayload = Partial<CreateSolicitacaoPayload>;

interface FiltrosSolicitacoes {
  empresa?: Empresa | 'Ambas';
  dataInicio?: string;   // YYYY-MM-DD
  dataFim?: string;      // YYYY-MM-DD
  resolvido?: boolean;
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
2. Query `usuarios` por `usuario` + comparação de senha (texto plano)
3. Sucesso → salva `UsuarioAutenticado` (sem senha) no `localStorage` chave `cr_sessao`
4. `AuthProvider` restaura sessão no mount via `authService.getSessao()`

**⚠️ Segurança**: Senhas em texto plano. **Produção requer hash (bcrypt/argon2)** e migração para Supabase Auth nativo ou JWT customizado.

---

## Importação de Dados (Excel)

Funcionalidade em `src/services/analytics.ts` / `apiService.ts`:

- Lê `.xlsx` via `SheetJS (xlsx)`
- Mapeia colunas → `CreateSolicitacaoPayload`
- Insere em lote via `supabase.from('solicitacoes_reverso').insert()`

**Colunas esperadas na planilha**:
```
Empresa | Data Solicitação | Solicitante | Setor | Código Cliente | Nome Cliente | Endereço Postagem | Motivo | Justificativa Outros | Autorização | Resolvido | Tempo Preenchimento (s)
```

---

## Dashboard & Gráficos (`src/components/admin/`)

| Componente | Biblioteca | Dados |
|------------|------------|-------|
| `ChartEmpresa` | Recharts (PieChart) | Distribuição por empresa |
| `ChartMotivo` | Recharts (BarChart) | Top motivos |
| `ChartTimeline` | Recharts (LineChart) | Solicitações por dia |
| `ChartAutorizador` | Recharts (BarChart) | Por autorizador |
| `ChartMotivoEmpresa` | Recharts (Grouped Bar) | Motivo × Empresa |

Dados via `useSolicitacoes.ts` (hook com cache e invalidação).

---

## Deploy

### Vercel / Netlify (Recomendado)

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

### Novo perfil de acesso
1. `src/types/index.ts` → `Perfil` type + `ESCOPO_EMPRESA` + `PERFIL_LABEL`
2. `src/lib/perfil.ts` → `homeDoPerfil()` + `navItemsDoPerfil()`
3. `src/App.tsx` → `ProtectedRoute roles={...}` nas rotas novas

### Migração de banco (Supabase)
Use **Supabase Migrations** (`supabase migration new`) ou SQL direto no Dashboard → SQL Editor.

---

## Troubleshooting

| Problema | Causa | Solução |
|----------|-------|---------|
| `Supabase não configurado` | `.env` ausente ou vars erradas | Verifique `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY` |
| Login falha "Usuário ou senha inválidos" | Usuário não existe / senha errada | Confira tabela `usuarios` no Supabase |
| Gráficos vazios | RLS bloqueando SELECT | Policy `SELECT` para `anon` / `authenticated` na tabela |
| Build falha no `tsc` | Tipos desatualizados | `npm install` + verifique `src/types/index.ts` sincronizado com DB |

---

## Roadmap / Pendências

- [ ] Hash de senhas (bcrypt/argon2) + migração Supabase Auth
- [ ] Row Level Security (RLS) por `empresa` / `perfil`
- [ ] Testes (Vitest + React Testing Library)
- [ ] CI/CD (GitHub Actions: lint + type-check + build)
- [ ] Logs de auditoria (tabela `audit_log`)
- [ ] Exportação PDF/Excel do dashboard

---

## Licença

Uso interno — Alinare / Novitah.