// ── Tipos principais da aplicação de Logística Reversa ───────────────────────
// Mantido em sincronia com a tabela `solicitacoes_reverso` no PostgreSQL.
// Ao conectar o Supabase real, apenas apiService.ts precisa ser alterado.

/** Empresas suportadas pelo sistema */
export type Empresa = 'Alinare' | 'Novitah';

/** Motivos disponíveis para solicitação de reverso */
export const MOTIVOS = [
  'Peça com defeito',
  'Mercadoria errada',
  'Endereço incorreto',
  'Baixa qualidade no conserto',
  'Outros',
] as const;

export type Motivo = (typeof MOTIVOS)[number];

/** Fluxo de status de uma solicitação de reverso. */
export const STATUS_SOLICITACAO = [
  'pendente',
  'etiqueta_gerada',
  'postado',
  'em_transito',
  'concluido',
] as const;

export type StatusSolicitacao = (typeof STATUS_SOLICITACAO)[number];

/** Label de exibição de cada status. */
export const STATUS_LABEL: Record<StatusSolicitacao, string> = {
  pendente: 'Pendente',
  etiqueta_gerada: 'Etiqueta Gerada',
  postado: 'Postado',
  em_transito: 'Em Trânsito',
  concluido: 'Concluído',
};

/** Próximo status no fluxo. null = status final. */
export function proximoStatus(s: StatusSolicitacao): StatusSolicitacao | null {
  switch (s) {
    case 'pendente':
      return 'etiqueta_gerada';
    case 'etiqueta_gerada':
      return 'postado';
    case 'postado':
      return 'em_transito';
    case 'em_transito':
      return 'concluido';
    default:
      return null;
  }
}

/** Status anterior no fluxo. null = status inicial. */
export function statusAnterior(s: StatusSolicitacao): StatusSolicitacao | null {
  switch (s) {
    case 'etiqueta_gerada':
      return 'pendente';
    case 'postado':
      return 'etiqueta_gerada';
    case 'em_transito':
      return 'postado';
    case 'concluido':
      return 'em_transito';
    default:
      return null;
  }
}

/** Movimento válido no DnD: exatamente uma etapa à frente ou uma atrás. */
export function movimentoValido(
  origem: StatusSolicitacao,
  destino: StatusSolicitacao
): boolean {
  return destino === proximoStatus(origem) || destino === statusAnterior(origem);
}

/** Setores disponíveis por empresa */
export const SETORES = [
  'Comercial Alinare',
  'Comercial Novitah',
  'Financeiro',
  'Assistência Técnica',
] as const;

export type Setor = (typeof SETORES)[number];

/** Autorizações por empresa */
export const AUTORIZACOES: Record<Empresa, string[]> = {
  Alinare: ['Joice Mendes', 'Viviane Ulian', 'Sheila Cristina'],
  Novitah: ['Marcelo Gualtieri', 'Ludmila Amancio'],
};

/**
 * Representa uma solicitação de logística reversa.
 * Espelha exatamente as colunas da tabela `solicitacoes_reverso`.
 */
export interface Solicitacao {
  /** UUID gerado pelo banco (ou crypto.randomUUID() no mock) */
  id: string;
  /** ISO 8601 timestamp de criação */
  created_at: string;
  /** Empresa responsável pela solicitação */
  empresa: Empresa;
  /** Data da solicitação no formato YYYY-MM-DD */
  data_solicitacao: string;
  /** Nome do solicitante interno */
  solicitante: string;
  /** Setor interno responsável */
  setor: string;
  /** Código numérico da cliente no sistema */
  codigo_cliente: number;
  /** Nome completo da cliente */
  nome_cliente: string;
  /** Endereço completo para postagem da devolução */
  endereco_postagem: string;
  /** Motivo principal da devolução */
  motivo: string;
  /** Justificativa obrigatória quando motivo === 'Outros' */
  justificativa_outros?: string | null;
  /** Nome de quem autorizou o reverso */
  autorizacao: string;
  /** Status atual no fluxo de reverso */
  status: StatusSolicitacao;
  /** Quando a etiqueta foi gerada (expedição) */
  etiqueta_gerada_em?: string | null;
  /** Quando a cliente postou a mercadoria (comercial) */
  postado_em?: string | null;
  /** Quando entrou em trânsito (rastreio Correios) */
  em_transito_em?: string | null;
  /** Quando a solicitação foi concluída (expedição) */
  concluido_em?: string | null;
  /** Código de rastreio dos Correios (ex: AA123456789BR) */
  codigo_rastreio?: string | null;
  /** Última cidade/UF conhecida via rastreio (denormalizado p/ exibição rápida no card) */
  ultima_cidade_rastreio?: string | null;
  /** Anotações livres de controle interno */
  anotacoes?: string | null;
  /** Segundos decorridos entre abertura e envio do formulário */
  tempo_preenchimento_segundos: number;
}

/**
 * Payload para criação de nova solicitação.
 * Omite campos gerados automaticamente (id, created_at).
 */
export type CreateSolicitacaoPayload = Omit<Solicitacao, 'id' | 'created_at'>;

/**
 * Payload para atualização parcial de uma solicitação.
 */
export type UpdateSolicitacaoPayload = Partial<
  Omit<Solicitacao, 'id' | 'created_at'>
>;

/** Filtros para consulta de solicitações */
export interface FiltrosSolicitacoes {
  empresa?: Empresa | 'Ambas';
  dataInicio?: string; // YYYY-MM-DD
  dataFim?: string;    // YYYY-MM-DD
  resolvido?: boolean;       // legado — deprecated, usar status
  status?: StatusSolicitacao | StatusSolicitacao[];
  buscaCliente?: string;
  /** Limita registros 'concluido' retornados (proteção contra acúmulo). */
  limiteConcluidos?: number;
}

// ── Autenticação e perfis de acesso ──────────────────────────────────────────

/** Telas do sistema que podem ser autorizadas individualmente. */
export type Tela =
  | 'dashboard-geral'
  | 'dashboard-alinare'
  | 'dashboard-novitah'
  | 'formulario-alinare'
  | 'formulario-novitah'
  | 'lista-geral'
  | 'lista-alinare'
  | 'lista-novitah'
  | 'kanban'
  | 'kanban-edit'
  | 'usuarios';

/** Todas as telas disponíveis para seleção no cadastro. */
export const TELAS: Tela[] = [
  'dashboard-geral',
  'dashboard-alinare',
  'dashboard-novitah',
  'formulario-alinare',
  'formulario-novitah',
  'lista-geral',
  'lista-alinare',
  'lista-novitah',
  'kanban',
  'kanban-edit',
  'usuarios',
];

/** Label de exibição de cada tela. */
export const TELA_LABEL: Record<Tela, string> = {
  'dashboard-geral': 'Dashboard Geral',
  'dashboard-alinare': 'Dashboard Alinare',
  'dashboard-novitah': 'Dashboard Novitah',
  'formulario-alinare': 'Formulário Alinare',
  'formulario-novitah': 'Formulário Novitah',
  'lista-geral': 'Lista Geral',
  'lista-alinare': 'Lista Alinare',
  'lista-novitah': 'Lista Novitah',
  kanban: 'Kanban',
  'kanban-edit': 'Editar Kanban',
  usuarios: 'Usuários (admin)',
};

/** Usuário do sistema (Supabase Auth). Senha NÃO armazenada no client. */
export interface Usuario {
  id: string;
  nome: string;
  /** Login único (username) */
  usuario: string;
  /** Telas que o usuário pode acessar. */
  telas: Tela[];
}

/** Usuário autenticado exposto pela sessão — nunca carrega senha. */
export type UsuarioAutenticado = Usuario;

/** Payload para criação de usuário */
export type CreateUsuarioPayload = Omit<Usuario, 'id'> & { senha?: string };

/** Payload para atualização de usuário */
export type UpdateUsuarioPayload = Partial<Usuario> & { senha?: string };

/** true se o usuário tem permissão de gestão (tela de usuários). */
export function isAdmin(u: Pick<Usuario, 'telas'>): boolean {
  return u.telas.includes('usuarios');
}

/** Item do histórico de auditoria de uma solicitação. */
export interface SolicitacaoHistorico {
  id: string;
  solicitacao_id: string;
  user_nome: string;
  acao: string;
  created_at: string; // ISO 8601
}

/** Último evento de rastreio Correios vinculado a uma solicitação (1:1). */
export interface RastreamentoCorreios {
  codigo_rastreio: string;
  solicitacao_id: string;
  ultimo_evento_codigo: string | null;
  ultimo_evento_descricao: string | null;
  unidade_cidade: string | null;
  unidade_uf: string | null;
  eventos: any[] | null;
  ultimo_check_em: string | null;
  created_at: string;
}

/** Mapeamento legado: perfil antigo → telas equivalentes (migração). */
export const LEGADO_PERFIL_TELAS: Record<string, Tela[]> = {
  ADMIN: [...TELAS],
  Alinare: ['dashboard-alinare', 'formulario-alinare', 'lista-alinare'],
  Novitah: ['dashboard-novitah', 'formulario-novitah', 'lista-novitah'],
  Expedicao: ['dashboard-geral', 'lista-geral', 'kanban', 'kanban-edit'],
};
