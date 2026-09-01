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


| Coluna                         | Tipo          | Descrição                                                  |
| ------------------------------ | ------------- | ---------------------------------------------------------- |
| `id`                           | `uuid`        | PK, `gen_random_uuid()`                                    |
| `created_at`                   | `timestamptz` | Timestamp de inserção                                      |
| `empresa`                      | `text`        | `'Alinare'` | `'Novitah'`                                  |
| `data_solicitacao`             | `date`        | Data da solicitação (YYYY-MM-DD)                           |
| `solicitante`                  | `text`        | Nome do solicitante interno                                |
| `setor`                        | `text`        | Setor (ex: 'Comercial Alinare')                            |
| `codigo_cliente`               | `integer`     | Código numérico da cliente                                 |
| `nome_cliente`                 | `text`        | Nome completo da cliente                                   |
| `endereco_postagem`            | `text`        | Endereço para devolução                                    |
| `motivo`                       | `text`        | Motivo (enum: Peça com defeito, Mercadoria errada, ...)    |
| `justificativa_outros`         | `text`        | Obrigatório quando motivo = 'Outros'                       |
| `autorizacao`                  | `text`        | Nome do autorizador                                        |
| `status`                       | `text`        | `'pendente' | 'etiqueta_gerada' | 'postado' | 'concluido'` |
| `etiqueta_gerada_em`           | `timestamptz` | Quando a etiqueta foi gerada (Expedição)                   |
| `postado_em`                   | `timestamptz` | Quando a cliente postou a mercadoria (Comercial)           |
| `concluido_em`                 | `timestamptz` | Quando a solicitação foi finalizada (Expedição)            |
| `anotacoes`                    | `text`        | Campo livre para anotações internas                        |
| `tempo_preenchimento_segundos` | `integer`     | Tempo de preenchimento do formulário                       |


**Índices**:

```sql
CREATE INDEX idx_solicitacoes_empresa_data ON solicitacoes_reverso (empresa, data_solicitacao DESC);
CREATE INDEX idx_solicitacoes_status ON solicitacoes_reverso (status);
```

### Tabela `usuarios` (gerenciada via Supabase Auth + Edge Function)

Usuários existem em `auth.users` (Supabase Auth). Metadata no JWT:


| Campo metadata | Tipo     | Descrição                                                           |
| -------------- | -------- | ------------------------------------------------------------------- |
| `nome`         | `text`   | Nome completo                                                       |
| `usuario`      | `text`   | Login único (username)                                              |
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


| Tela                 | Descrição                         | Empresa (escopo) |
| -------------------- | --------------------------------- | ---------------- |
| `dashboard-geral`    | Dashboard (todas empresas)        | Ambas            |
| `dashboard-alinare`  | Dashboard (Alinare)               | Alinare          |
| `dashboard-novitah`  | Dashboard (Novitah)               | Novitah          |
| `formulario-alinare` | Formulário Alinare                | Alinare          |
| `formulario-novitah` | Formulário Novitah                | Novitah          |
| `lista-geral`        | Lista de solicitações (Expedição) | Ambas            |
| `lista-alinare`      | Lista (Alinare)                   | Alinare          |
| `lista-novitah`      | Lista (Novitah)                   | Novitah          |
| `status-geral`       | Status (Comercial vê tudo)        | Ambas            |
| `status-alinare`     | Status (Alinare)                  | Alinare          |
| `status-novitah`     | Status (Novitah)                  | Novitah          |
| `kanban`             | Kanban (visão geral do fluxo)     | Ambas            |
| `usuarios`           | Administração de usuários (Admin) | Ambas            |


Definidos em `src/types/index.ts` → `Tela`, `TELAS`, `TELA_LABEL`.

---

## Fluxo de Status (Novo)

```
pendente → etiqueta_gerada → postado → concluido
```


| Status            | Quem move                                | Onde            | Timestamp            |
| ----------------- | ---------------------------------------- | --------------- | -------------------- |
| `pendente`        | — (criação)                              | Formulário      | —                    |
| `etiqueta_gerada` | **Expedição** (`lista-*`)                | Lista / Kanban  | `etiqueta_gerada_em` |
| `postado`         | **Comercial** (`status-*` sem `lista-*`) | Status / Kanban | `postado_em`         |
| `concluido`       | **Expedição** (`lista-*`)                | Lista / Kanban  | `concluido_em`       |


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

## Dashboard, Kanban &amp; Gráficos (`src/components/admin/`)


| Componente           | Biblioteca             | Dados                                                            |
| -------------------- | ---------------------- | ---------------------------------------------------------------- |
| `ChartEmpresa`       | Recharts (PieChart)    | Distribuição por empresa                                         |
| `ChartMotivo`        | Recharts (BarChart)    | Top motivos                                                      |
| `ChartTimeline`      | Recharts (LineChart)   | Solicitações por dia                                             |
| `ChartAutorizador`   | Recharts (BarChart)    | Por autorizador                                                  |
| `ChartMotivoEmpresa` | Recharts (Grouped Bar) | Motivo × Empresa                                                 |
| `SummaryCards`       | —                      | 5 KPIs (Total, Pendentes, Etiqueta Gerada, Postados, Concluídos) |
| `KanbanPage`         | — (botões, sem DnD)    | 4 colunas por status                                             |


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

## Rastreamento Correios (API Oficial)

### Visão Geral

O sistema consulta a API oficial dos Correios (SRO — Rastreamento de Objetos) para atualizar automaticamente o status das solicitações que possuem código de rastreio.

### Arquitetura do Rastreamento

```
Frontend (KanbanPage / RecordDetailModal)
       │
       ▼
apiService.atualizarRastreioLote() / atualizarRastreio(codigo)
       │
       ▼
Supabase Edge Function: `correios-rastreio` (Deno)
       │
       ├─► Busca token OAuth 2.0 (Basic Auth: usuario:senha)
       │    Endpoint: POST https://api.correios.com.br/token/v1/autentica/cartaopostagem
       │
       └─► Consulta rastreio por código
            Endpoint: GET https://api.correios.com.br/srorastro/v1/objetos/{codigo}?resultado=T
```

### Empresas / Contratos Configurados (4 contas)

O sistema suporta **múltiplos contratos/CNPJs** simultâneos. Cada "empresa" no `.env` / Supabase Secrets tem suas próprias credenciais (usuario, senha, cartão de postagem). Ao consultar um código, a Edge Function itera nas 4 contas até achar a dona do pacote.


| Prefixo ENV | Empresa (CNPJ) | Uso                               |
| ----------- | -------------- | --------------------------------- |
| `ALINARE`   | 19679195000176 | Contrato principal (9912398217)   |
| `AZIME`     | 30013070000145 | Contrato secundário (9912666541)  |
| `ARTIKLER`  | 15277597000193 | Contrato terciário (9912529770)   |
| `NOVITAH`   | 29971267000108 | Contrato quaternário (9912459852) |


**Lógica de busca**:

1. Itera `['ALINARE','AZIME','ARTIKLER','NOVITAH']` em ordem
2. Para cada conta: obtém token (cache 24h com margem 60s)
3. Consulta `srorastro/v1/objetos/{codigo}`
4. Se resposta traz `objetos[0].mensagem` contendo **SRO-009** → "não pertence a este contrato" → tenta próxima conta
5. Se achou eventos → **break** (achou o contrato dono)
6. Atualiza tabela `solicitacoes_reverso` (status, timestamps, cidade) + tabela `rastreamento_correios` (eventos completos)
7. Retorna JSON bruto da API pro frontend exibir

**Resultado**: o mesmo código de rastreio funciona independentemente de qual CNPJ postou, sem configuração manual.

### Refresh de Tokens (Simplificado)

- **Cache em memória** na Edge Function (`tokensCache[prefixo]`) com TTL de 24h - 60s
- Na primeira chamada ou se expirado: faz `POST /token/v1/autentica/cartaopostagem` com Basic Auth (`usuario:senha` em Base64)
- Retorno contém `token` (JWT RS512) + `expiraEm` (ISO 8601)
- Cache evita re-autenticar a cada request; validação de expiração é feita no lado do cliente (edge)
- Se 401/403: token pode ter expirado antes do cache → invalida cache e tenta novamente (lógica futura)

### Configuração de Segredos (Supabase Secrets)

```bash
# 4 contas — cada uma com 3 segredos
CORREIOS_USUARIO_ALINARE    CORREIOS_SENHA_ALINARE    CORREIOS_POSTAGEM_ALINARE
CORREIOS_USUARIO_AZIME      CORREIOS_SENHA_AZIME      CORREIOS_POSTAGEM_AZIME
CORREIOS_USUARIO_ARTIKLER   CORREIOS_SENHA_ARTIKLER   CORREIOS_POSTAGEM_ARTIKLER
CORREIOS_USUARIO_NOVITAH    CORREIOS_SENHA_NOVITAH    CORREIOS_POSTAGEM_NOVITAH
```

Comando para atualizar:

```bash
npx supabase secrets set \
  CORREIOS_USUARIO_ALINARE=... \
  CORREIOS_SENHA_ALINARE=... \
  CORREIOS_POSTAGEM_ALINARE=... \
  # ... demais
```

### Fluxo de Uso (Frontend → Backend)


| Ação do Usuário                          | Chamada API                              | O que acontece no Backend                                                            |
| ---------------------------------------- | ---------------------------------------- | ------------------------------------------------------------------------------------ |
| Salva código no card                     | `apiService.salvarCodigoRastreio()`      | UPDATE card + histórico + dispara `atualizarRastreio(codigo)`                        |
| Clica "Atualizar" / abre "Mais detalhes" | `apiService.atualizarRastreio(codigo)`   | Edge Function itera 4 contas → retorna JSON bruto                                    |
| Abre página Kanban                       | `carregar()` + `atualizarRastreioLote()` | Lote: pega todos `postado/em_transito/etiqueta_gerada` com código → processa em lote |
| Polling 15s (Kanban)                     | `carregar(true)`                         | Só re-lê do banco (não bate em Correios)                                             |


### Mapeamento de Eventos → Status Kanban


| Código Correios | Descrição                    | Status Kanban | Coluna      |
| --------------- | ---------------------------- | ------------- | ----------- |
| `PO`            | Objeto postado               | `postado`     | Postado     |
| `RO` / `OEC`    | Em trânsito / Saiu p/entrega | `em_transito` | Em Trânsito |
| `BDE`           | Entregue ao destinatário     | `concluido`   | Concluído   |
| `FC` / outros   | Etiqueta emitida / outros    | — (ignora)    | —           |


O campo `ultima_cidade_rastreio` é preenchido com `cidade/UF` da unidade do último evento.

### Remoção de Código (Libera para Reuso)

Botão **🗑️** no modal ao lado de "Salvar Código":

- Pede confirmação (`window.confirm`)
- Chama `apiService.removerCodigoRastreio(id, user)`
- Backend: deleta `rastreamento_correios` + seta `codigo_rastreio=null` + `ultima_cidade_rastreio=null` + histórico `"Código de rastreio removido: XXX"`
- Frontend limpa campo, timeline, retorno API, recarrega histórico
- Código fica livre para ser colado em outro card

### Boas Práticas para Novos Devs

1. **Nunca** coloque credenciais no código/front — use Supabase Secrets (`Deno.env.get()` na Edge Function)
2. **Nunca** logue tokens — logs da Edge Function mostram só `pertence=true/false` e contagem de eventos
3. **Sempre** use `apiService` — componentes **nunca** acessam Supabase direto
4. **Token expirou?** A Edge Function trata automaticamente (cache + retry na próxima chamada)
5. **Código dá SRO-009?** Significa que pertence a outro contrato — a Edge Function já tenta as outras 3 contas automaticamente
6. **409 Conflict ao salvar?** Código já existe em outro card → use botão 🗑️ no card antigo ou peça ao time pra apagar

### Performance e Proteção de Cota (Rate Limits)

De acordo com o manual da API dos Correios, não há menções claras sobre limites de requisição. Entretanto, as seguintes estratégias estão implementadas para proteger a saúde da integração:

1. **Memoização do Token**: O endpoint `/token/v1/autentica/cartaopostagem` não é chamado a cada requisição. O JWT gerado dura 24h. A Edge Function mantém um cache em memória (`tokensCache`) e reutiliza o mesmo token para o prefixo da conta durante todo o período, acionando o *refresh* automático apenas quando `agora < expiraEmMs - 60s`.
2. **Short-Circuit em Status Concluído**: Para evitar consumo de cota (e lentidão na UI) processando pacotes finalizados, a Edge Function e o Frontend bloqueiam imediatamente a requisição se `solicitacao.status === 'concluido'`. Uma vez entregue (evento BDE), a API dos Correios não é mais sobrecarregada com este pacote.
3. **Lote Sincronizado Controlado**: O job de atualização em lote (via cronjob ou refresh da tela Kanban) não roda sobre toda a base. Apenas registros com os status intermediários `['etiqueta_gerada', 'postado', 'em_transito']` são selecionados na query, contendo estritamente os pacotes pendentes de resposta logística.

### Testes Automatizados

```bash
npm run test              # Roda tudo (118 testes)
npx vitest run src/test/correios.test.ts src/test/correios-flow.test.ts
```

Cobertura: lógica de eventos (`mapEventoParaStatus`), extração de eventos, fluxo do service (`getRastreio`, `atualizarRastreio`, `salvarCodigoRastreio`, `removerCodigoRastreio`), fluxo de navegação (`perfil.test.ts`), integração completa.

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


| Problema                                 | Causa                             | Solução                                                                          |
| ---------------------------------------- | --------------------------------- | -------------------------------------------------------------------------------- |
| `Supabase não configurado`               | `.env` ausente ou vars erradas    | Verifique `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY`                         |
| Login falha "Usuário ou senha inválidos" | Usuário não existe / senha errada | Admin gerencia senhas na aba de Usuários                                         |
| Gráficos vazios                          | RLS bloqueando SELECT             | Policy `SELECT` para `anon` / `authenticated` na tabela                          |
| Build falha no `tsc`                     | Tipos desatualizados              | `npm install` + verifique `src/types/index.ts` sincronizado com DB               |
| Kanban não carrega / tela cortada        | Height mal calculada              | Ajuste `h-[calc(100dvh-...)]` em `KanbanPage.tsx` por breakpoint                 |
| Botão "Marcar postado" não aparece       | Permissão de tela                 | Usuário precisa de `status-*` **sem** `lista-*` (ou `usuarios`)                  |
| Erro ao salvar anotações                 | Coluna `anotacoes` não existe     | Rode `ALTER TABLE solicitacoes_reverso ADD COLUMN IF NOT EXISTS anotacoes TEXT;` |


---

## Licença

Uso interno — Alinare / Novitah e Expedição.