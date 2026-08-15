// ── Service Layer: Supabase ───────────────────────────────────────────────────
//
// Implementação real de IApiService sobre a tabela `solicitacoes_reverso`.
// Padrão:  componente → apiService → Supabase
//          Componentes NUNCA acessam o banco diretamente.
// ─────────────────────────────────────────────────────────────────────────────

import { supabase } from '../lib/supabase';
import type {
  Solicitacao,
  CreateSolicitacaoPayload,
  UpdateSolicitacaoPayload,
  FiltrosSolicitacoes,
} from '../types';

// ── Interface pública do serviço ──────────────────────────────────────────────
export interface IApiService {
  createSolicitacao(data: CreateSolicitacaoPayload): Promise<Solicitacao>;
  getSolicitacoes(filtros?: FiltrosSolicitacoes): Promise<Solicitacao[]>;
  updateSolicitacao(
    id: string,
    data: UpdateSolicitacaoPayload
  ): Promise<Solicitacao>;
  getSolicitacaoById(id: string): Promise<Solicitacao | null>;
}

/** Converte erro Supabase em mensagem legível */
function checarErro(erro: { message: string } | null, fallback: string): void {
  if (erro) throw new Error(erro.message || fallback);
}

// ── Implementação Supabase ────────────────────────────────────────────────────

const apiService: IApiService = {
  /**
   * Insere uma nova solicitação e retorna o registro criado.
   */
  async createSolicitacao(data: CreateSolicitacaoPayload): Promise<Solicitacao> {
    const { data: nova, error } = await supabase
      .from('solicitacoes_reverso')
      .insert(data)
      .select()
      .single();

    checarErro(error, 'Erro ao criar solicitação.');
    return nova as Solicitacao;
  },

  /**
   * Retorna solicitações aplicando os filtros informados.
   * Ordenadas por data de criação (mais recentes primeiro).
   */
  async getSolicitacoes(filtros?: FiltrosSolicitacoes): Promise<Solicitacao[]> {
    let query = supabase
      .from('solicitacoes_reverso')
      .select('*')
      .order('data_solicitacao', { ascending: false })
      .order('created_at', { ascending: false });

    if (filtros?.empresa && filtros.empresa !== 'Ambas') {
      query = query.eq('empresa', filtros.empresa);
    }
    if (filtros?.dataInicio) {
      query = query.gte('data_solicitacao', filtros.dataInicio);
    }
    if (filtros?.dataFim) {
      query = query.lte('data_solicitacao', filtros.dataFim);
    }
    if (filtros?.resolvido !== undefined) {
      query = query.eq('resolvido', filtros.resolvido);
    }

    const { data, error } = await query;
    checarErro(error, 'Erro ao buscar solicitações.');
    return (data ?? []) as Solicitacao[];
  },

  /**
   * Atualiza parcialmente uma solicitação pelo ID.
   */
  async updateSolicitacao(
    id: string,
    data: UpdateSolicitacaoPayload
  ): Promise<Solicitacao> {
    const { data: atualizada, error } = await supabase
      .from('solicitacoes_reverso')
      .update(data)
      .eq('id', id)
      .select()
      .single();

    checarErro(error, 'Erro ao atualizar solicitação.');
    return atualizada as Solicitacao;
  },

  /**
   * Busca uma solicitação específica pelo ID.
   * Retorna null se não encontrada.
   */
  async getSolicitacaoById(id: string): Promise<Solicitacao | null> {
    const { data, error } = await supabase
      .from('solicitacoes_reverso')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    checarErro(error, 'Erro ao buscar solicitação.');
    return (data as Solicitacao) ?? null;
  },
};

export default apiService;
