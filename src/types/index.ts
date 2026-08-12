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
}

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
