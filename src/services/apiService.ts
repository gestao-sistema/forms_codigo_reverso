// ── Service Layer: Supabase ───────────────────────────────────────────────────
//
// Implementação real de IApiService sobre a tabela `solicitacoes_reverso`.
// Padrão:  componente → apiService → Supabase
//          Componentes NUNCA acessam o banco diretamente.
// ─────────────────────────────────────────────────────────────────────────────

import { supabase } from '../lib/supabase';
import type {
  Solicitacao,
  SolicitacaoHistorico,
  CreateSolicitacaoPayload,
  UpdateSolicitacaoPayload,
  FiltrosSolicitacoes,
  RastreamentoCorreios,
} from '../types';
import { STATUS_LABEL, type UsuarioAutenticado } from '../types';

// ── Interface pública do serviço ──────────────────────────────────────────────
export interface IApiService {
  createSolicitacao(data: CreateSolicitacaoPayload): Promise<Solicitacao>;
  getSolicitacoes(filtros?: FiltrosSolicitacoes): Promise<Solicitacao[]>;
  updateSolicitacao(
    id: string,
    data: UpdateSolicitacaoPayload,
    user?: UsuarioAutenticado | null
  ): Promise<Solicitacao>;
  getSolicitacaoById(id: string): Promise<Solicitacao | null>;
  deleteSolicitacao(id: string): Promise<void>;
  getHistorico(solicitacaoId: string): Promise<SolicitacaoHistorico[]>;
  /** Retorna o rastreio completo de uma solicitação. */
  getRastreio(codigoRastreio: string): Promise<RastreamentoCorreios | null>;
  /** Salva o código de rastreio dos Correios em uma solicitação. */
  salvarCodigoRastreio(
    id: string,
    codigoRastreio: string,
    user?: UsuarioAutenticado | null
  ): Promise<Solicitacao>;
  /** Remove o código de rastreio vinculado (libera para reuso em outro card). */
  removerCodigoRastreio(
    id: string,
    user?: UsuarioAutenticado | null
  ): Promise<Solicitacao>;
  /** Dispara consulta manual de rastreio (chama a Edge Function) e retorna payload bruto. */
  atualizarRastreio(codigoRastreio: string): Promise<any>;
  /** Dispara consulta em lote de todos os rastreios pendentes (Edge Function, body vazio). */
  atualizarRastreioLote(): Promise<any>;
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
   * Se `limiteConcluidos` for informado, faz 2 queries:
   *  - ativos (pendente, etiqueta_gerada, postado): sem limite
   *  - concluido: limitada a `limiteConcluidos` (mais recentes primeiro)
   */
  async getSolicitacoes(filtros?: FiltrosSolicitacoes): Promise<Solicitacao[]> {
    const baseFilters = (f?: FiltrosSolicitacoes) => {
      let q = supabase.from('solicitacoes_reverso').select('*');
      if (f?.empresa && f.empresa !== 'Ambas') q = q.eq('empresa', f.empresa);
      if (f?.dataInicio) q = q.gte('data_solicitacao', f.dataInicio);
      if (f?.dataFim) q = q.lte('data_solicitacao', f.dataFim);
      if (f?.status !== undefined) {
        const statuses = Array.isArray(f.status) ? f.status : [f.status];
        q = q.in('status', statuses);
      }
      return q;
    };

    const limite = filtros?.limiteConcluidos ?? 0;

    if (limite > 0) {
      // Query 1: ativos (sem concluidos)
      const ativosQuery = baseFilters(filtros)
        .in('status', ['pendente', 'etiqueta_gerada', 'postado', 'em_transito'])
        .order('data_solicitacao', { ascending: false })
        .order('created_at', { ascending: false });
      const { data: ativos, error: e1 } = await ativosQuery;
      checarErro(e1, 'Erro ao buscar solicitações ativas.');

      // Query 2: concluidos limitados (mais recentes primeiro)
      const concluidosQuery = baseFilters(filtros)
        .eq('status', 'concluido')
        .order('data_solicitacao', { ascending: false })
        .order('created_at', { ascending: false })
        .limit(limite);
      const { data: concluidos, error: e2 } = await concluidosQuery;
      checarErro(e2, 'Erro ao buscar solicitações concluídas.');

      const resultados = [...(ativos ?? []), ...(concluidos ?? [])];

      if (filtros?.buscaCliente) {
        const termo = filtros.buscaCliente.toLowerCase().trim();
        return resultados.filter((s) => s.nome_cliente.toLowerCase().includes(termo));
      }
      return resultados;
    }

    // Sem limite: query única (comportamento original)
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
    if (filtros?.status !== undefined) {
      const statuses = Array.isArray(filtros.status) ? filtros.status : [filtros.status];
      query = query.in('status', statuses);
    }
    const { data, error } = await query;
    checarErro(error, 'Erro ao buscar solicitações.');

    let resultados = (data ?? []) as Solicitacao[];

    if (filtros?.buscaCliente) {
      const termo = filtros.buscaCliente.toLowerCase().trim();
      resultados = resultados.filter((s) => s.nome_cliente.toLowerCase().includes(termo));
    }

    return resultados;
  },

  /**
   * Atualiza parcialmente uma solicitação pelo ID.
   * Quando o status muda e um usuário é informado, registra no histórico.
   */
  async updateSolicitacao(
    id: string,
    data: UpdateSolicitacaoPayload,
    user?: UsuarioAutenticado | null
  ): Promise<Solicitacao> {
    const { data: atualizada, error } = await supabase
      .from('solicitacoes_reverso')
      .update(data)
      .eq('id', id)
      .select()
      .single();

    checarErro(error, 'Erro ao atualizar solicitação.');

    // Registra auditoria quando o status muda ou anotação é salva
    if (user) {
      if (data.status) {
        await supabase.from('solicitacoes_historico').insert({
          solicitacao_id: id,
          user_nome: user.nome,
          acao: `Moveu para ${STATUS_LABEL[data.status] ?? data.status}`,
        });
      } else if ('anotacoes' in data) {
        await supabase.from('solicitacoes_historico').insert({
          solicitacao_id: id,
          user_nome: user.nome,
          acao: 'Anotação atualizada',
        });
      }
    }

    return atualizada as Solicitacao;
  },

  /**
   * Retorna o histórico de auditoria de uma solicitação (mais recente primeiro).
   */
  async getHistorico(solicitacaoId: string): Promise<SolicitacaoHistorico[]> {
    const { data, error } = await supabase
      .from('solicitacoes_historico')
      .select('*')
      .eq('solicitacao_id', solicitacaoId)
      .order('created_at', { ascending: false });

    checarErro(error, 'Erro ao buscar histórico.');
    return (data ?? []) as SolicitacaoHistorico[];
  },

  /**
   * Retorna os dados completos do rastreio.
   */
  async getRastreio(codigoRastreio: string): Promise<RastreamentoCorreios | null> {
    const { data, error } = await supabase
      .from('rastreamento_correios')
      .select('*')
      .eq('codigo_rastreio', codigoRastreio)
      .maybeSingle();

    checarErro(error, 'Erro ao buscar rastreio.');
    return (data as RastreamentoCorreios) ?? null;
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

  /**
   * Remove uma solicitação pelo ID.
   */
  async deleteSolicitacao(id: string): Promise<void> {
    const { error } = await supabase
      .from('solicitacoes_reverso')
      .delete()
      .eq('id', id);

    checarErro(error, 'Erro ao apagar solicitação.');
  },

  /**
   * Salva/atualiza o código de rastreio dos Correios para uma solicitação.
   */
  async salvarCodigoRastreio(
    id: string,
    codigoRastreio: string,
    user?: UsuarioAutenticado | null
  ): Promise<Solicitacao> {
    const { data: atualizada, error } = await supabase
      .from('solicitacoes_reverso')
      .update({ codigo_rastreio: codigoRastreio.toUpperCase().trim() })
      .eq('id', id)
      .select()
      .single();

    if (error?.code === '23505') {
      throw new Error('Este código de rastreio já está vinculado a outra solicitação.');
    }
    checarErro(error, 'Erro ao salvar código de rastreio.');

    if (user) {
      await supabase.from('solicitacoes_historico').insert({
        solicitacao_id: id,
        user_nome: user.nome,
        acao: `Código de rastreio informado: ${codigoRastreio.toUpperCase().trim()}`,
      });
    }

    return atualizada as Solicitacao;
  },

  /** Remove código de rastreio vinculado (seta null + limpa rastreamento_correios). */
  async removerCodigoRastreio(
    id: string,
    user?: UsuarioAutenticado | null
  ): Promise<Solicitacao> {
    // Busca código atual pra logar no histórico e pra limpar rastreamento_correios
    const { data: atual } = await supabase
      .from('solicitacoes_reverso')
      .select('codigo_rastreio')
      .eq('id', id)
      .single();

    const codigo = (atual as any)?.codigo_rastreio;

    // Remove da tabela de rastreamento
    if (codigo) {
      await supabase.from('rastreamento_correios').delete().eq('codigo_rastreio', codigo);
    }

    // Seta null no card e limpa cidade (se tiver)
    const { data: atualizada, error } = await supabase
      .from('solicitacoes_reverso')
      .update({ codigo_rastreio: null, ultima_cidade_rastreio: null })
      .eq('id', id)
      .select()
      .single();

    checarErro(error, 'Erro ao remover código de rastreio.');

    if (user && codigo) {
      await supabase.from('solicitacoes_historico').insert({
        solicitacao_id: id,
        user_nome: user.nome,
        acao: `Código de rastreio removido: ${codigo}`,
      });
    }

    return atualizada as Solicitacao;
  },

  /**
   * Dispara consulta manual de rastreio (chama Edge Function correios-rastreio).
   */
  async atualizarRastreio(codigoRastreio: string): Promise<any> {
    const { data, error } = await supabase.functions.invoke('correios-rastreio', {
      body: { codigo: codigoRastreio },
    });
    if (error) throw new Error(error.message || 'Erro ao atualizar rastreio.');
    return data;
  },

  /**
   * Dispara consulta em lote (chama Edge Function correios-rastreio sem código).
   */
  async atualizarRastreioLote(): Promise<any> {
    const { data, error } = await supabase.functions.invoke('correios-rastreio', {
      body: {},
    });
    if (error) throw new Error(error.message || 'Erro ao atualizar rastreios em lote.');
    return data;
  },
};

export default apiService;
