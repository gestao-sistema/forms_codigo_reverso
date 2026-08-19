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
  /** Indica se a solicitação já foi resolvida */
  resolvido: boolean;
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
  resolvido?: boolean;
  buscaCliente?: string;
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
  | 'status-geral'
  | 'status-alinare'
  | 'status-novitah'
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
  'status-geral',
  'status-alinare',
  'status-novitah',
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
  'status-geral': 'Status Geral',
  'status-alinare': 'Status Alinare',
  'status-novitah': 'Status Novitah',
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

/** Mapeamento legado: perfil antigo → telas equivalentes (migração). */
export const LEGADO_PERFIL_TELAS: Record<string, Tela[]> = {
  ADMIN: [...TELAS],
  Alinare: ['dashboard-alinare', 'formulario-alinare', 'lista-alinare', 'status-alinare'],
  Novitah: ['dashboard-novitah', 'formulario-novitah', 'lista-novitah', 'status-novitah'],
  Expedicao: ['dashboard-geral', 'lista-geral', 'status-geral'],
};
