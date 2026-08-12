// ── Service Layer: Mock de API ────────────────────────────────────────────────
//
// Esta camada simula chamadas assíncronas ao banco de dados.
// Para conectar o Supabase real, basta criar uma nova implementação
// de `IApiService` e exportá-la no lugar de `apiService`.
//
// Padrão:  componente → apiService → (mock | Supabase real)
//          Componentes NUNCA acessam o banco diretamente.
// ─────────────────────────────────────────────────────────────────────────────

import type {
  Solicitacao,
  CreateSolicitacaoPayload,
  UpdateSolicitacaoPayload,
  FiltrosSolicitacoes,
} from '../types';

// ── Interface pública do serviço ──────────────────────────────────────────────
// Trocar mock por Supabase = implementar esta interface.
export interface IApiService {
  createSolicitacao(data: CreateSolicitacaoPayload): Promise<Solicitacao>;
  getSolicitacoes(filtros?: FiltrosSolicitacoes): Promise<Solicitacao[]>;
  updateSolicitacao(
    id: string,
    data: UpdateSolicitacaoPayload
  ): Promise<Solicitacao>;
  getSolicitacaoById(id: string): Promise<Solicitacao | null>;
}

// ── Helpers internos ──────────────────────────────────────────────────────────

/** Simula latência de rede (300–500ms) */
const delay = (ms = 400) =>
  new Promise<void>((resolve) => setTimeout(resolve, ms));

/** Gera um UUID v4 simples sem dependência externa */
const uuid = (): string => crypto.randomUUID();

// ── Banco de dados em memória ─────────────────────────────────────────────────
// 5 registros de mock com dados variados para demonstração.
let solicitacoes: Solicitacao[] = [
  {
    id: uuid(),
    created_at: '2026-07-28T09:15:00.000Z',
    empresa: 'Alinare',
    data_solicitacao: '2026-07-28',
    solicitante: 'Fernanda Lima',
    setor: 'Comercial Alinare',
    codigo_cliente: 10234,
    nome_cliente: 'Maria Aparecida Santos',
    endereco_postagem: 'Rua das Acácias, 250 — Jundiaí/SP',
    motivo: 'Peça com defeito',
    justificativa_outros: null,
    autorizacao: 'Joice Mendes',
    resolvido: false,
    tempo_preenchimento_segundos: 87,
  },
  {
    id: uuid(),
    created_at: '2026-07-30T14:42:00.000Z',
    empresa: 'Novitah',
    data_solicitacao: '2026-07-30',
    solicitante: 'Ricardo Alves',
    setor: 'Comercial Novitah',
    codigo_cliente: 20891,
    nome_cliente: 'João Carlos Ferreira',
    endereco_postagem: 'Av. Brasil, 1100 — Campinas/SP',
    motivo: 'Mercadoria errada',
    justificativa_outros: null,
    autorizacao: 'Marcelo Gualtieri',
    resolvido: true,
    tempo_preenchimento_segundos: 145,
  },
  {
    id: uuid(),
    created_at: '2026-08-02T11:05:00.000Z',
    empresa: 'Alinare',
    data_solicitacao: '2026-08-02',
    solicitante: 'Carla Souza',
    setor: 'Assistência Técnica',
    codigo_cliente: 10567,
    nome_cliente: 'Ana Paula Rodrigues',
    endereco_postagem: 'Rua Sete de Setembro, 44 — Sorocaba/SP',
    motivo: 'Outros',
    justificativa_outros: 'Cliente relatou insatisfação com prazo de entrega e solicitou devolução.',
    autorizacao: 'Viviane Ulian',
    resolvido: false,
    tempo_preenchimento_segundos: 312,
  },
  {
    id: uuid(),
    created_at: '2026-08-05T08:30:00.000Z',
    empresa: 'Novitah',
    data_solicitacao: '2026-08-05',
    solicitante: 'Marcos Pereira',
    setor: 'Financeiro',
    codigo_cliente: 21045,
    nome_cliente: 'Carlos Eduardo Mendes',
    endereco_postagem: 'Rua do Comércio, 900 — São Paulo/SP',
    motivo: 'Baixa qualidade no conserto',
    justificativa_outros: null,
    autorizacao: 'Ludmila Amancio',
    resolvido: false,
    tempo_preenchimento_segundos: 58,
  },
  {
    id: uuid(),
    created_at: '2026-08-08T16:20:00.000Z',
    empresa: 'Alinare',
    data_solicitacao: '2026-08-08',
    solicitante: 'Juliana Costa',
    setor: 'Comercial Alinare',
    codigo_cliente: 10789,
    nome_cliente: 'Patricia Oliveira Lima',
    endereco_postagem: 'Estrada Municipal, km 3 — Indaiatuba/SP',
    motivo: 'Endereço incorreto',
    justificativa_outros: null,
    autorizacao: 'Sheila Cristina',
    resolvido: true,
    tempo_preenchimento_segundos: 203,
  },
];

// ── Implementação mock ────────────────────────────────────────────────────────

const apiService: IApiService = {
  /**
   * Cria uma nova solicitação e a adiciona ao banco em memória.
   */
  async createSolicitacao(data: CreateSolicitacaoPayload): Promise<Solicitacao> {
    await delay();

    const nova: Solicitacao = {
      ...data,
      id: uuid(),
      created_at: new Date().toISOString(),
    };

    // Insere no início para exibição cronológica inversa
    solicitacoes = [nova, ...solicitacoes];

    return nova;
  },

  /**
   * Retorna solicitações aplicando os filtros informados.
   * Ordenadas por data de criação (mais recentes primeiro).
   */
  async getSolicitacoes(filtros?: FiltrosSolicitacoes): Promise<Solicitacao[]> {
    await delay(300);

    let resultado = [...solicitacoes];

    // Filtro por empresa
    if (filtros?.empresa && filtros.empresa !== 'Ambas') {
      resultado = resultado.filter((s) => s.empresa === filtros.empresa);
    }

    // Filtro por data início
    if (filtros?.dataInicio) {
      resultado = resultado.filter(
        (s) => s.data_solicitacao >= filtros.dataInicio!
      );
    }

    // Filtro por data fim
    if (filtros?.dataFim) {
      resultado = resultado.filter(
        (s) => s.data_solicitacao <= filtros.dataFim!
      );
    }

    // Filtro por status de resolução
    if (filtros?.resolvido !== undefined) {
      resultado = resultado.filter((s) => s.resolvido === filtros.resolvido);
    }

    return resultado;
  },

  /**
   * Atualiza parcialmente uma solicitação pelo ID.
   * Lança erro se o registro não for encontrado.
   */
  async updateSolicitacao(
    id: string,
    data: UpdateSolicitacaoPayload
  ): Promise<Solicitacao> {
    await delay(300);

    const index = solicitacoes.findIndex((s) => s.id === id);

    if (index === -1) {
      throw new Error(`Solicitação com ID "${id}" não encontrada.`);
    }

    const atualizada: Solicitacao = { ...solicitacoes[index], ...data };
    solicitacoes = [
      ...solicitacoes.slice(0, index),
      atualizada,
      ...solicitacoes.slice(index + 1),
    ];

    return atualizada;
  },

  /**
   * Busca uma solicitação específica pelo ID.
   * Retorna null se não encontrada.
   */
  async getSolicitacaoById(id: string): Promise<Solicitacao | null> {
    await delay(200);
    return solicitacoes.find((s) => s.id === id) ?? null;
  },
};

export default apiService;
