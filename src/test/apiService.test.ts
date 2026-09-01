import { describe, it, expect, vi, beforeEach } from 'vitest';

// ── Mock do singleton supabase ──────────────────────────────────────────────────
vi.mock('../lib/supabase', () => ({
  supabase: {
    from: vi.fn(),
  },
}));

import { supabase } from '../lib/supabase';
import apiService from '../services/apiService';
import type { Solicitacao, Tela } from '../types';

const solicitacaoMock: Solicitacao = {
  id: 'uuid-1',
  created_at: '2024-01-01T00:00:00Z',
  empresa: 'Alinare',
  data_solicitacao: '2024-01-15',
  solicitante: 'Teste',
  setor: 'Comercial Alinare',
  codigo_cliente: 1234,
  nome_cliente: 'Cliente',
  endereco_postagem: 'Rua X',
  motivo: 'Peça com defeito',
  justificativa_outros: null,
  autorizacao: 'Joice Mendes',
  status: 'pendente' as const,
  tempo_preenchimento_segundos: 60,
};

/**
 * Builder de query fluente + thenável.
 * métodos: select/eq/gte/lte/order/insert/update/delete → retornam self
 * terminadores: single/maybeSingle → Promise do resultado final
 * await query → resolve o resultado final (thenable)
 */
function chainBuilder(final: { data: unknown; error: unknown }) {
  const obj: Record<string, ReturnType<typeof vi.fn>> = {};
  const self: any = new Proxy(obj, {
    get(_t, prop: string | symbol) {
      const key = String(prop);
      if (key === 'then') {
        return (resolve: any, reject: any) => Promise.resolve(final).then(resolve, reject);
      }
      if (key === 'single' || key === 'maybeSingle') {
        if (!(key in obj)) {
          obj[key] = vi.fn(() => Promise.resolve(final));
        }
        return obj[key];
      }
      if (!(key in obj)) {
        obj[key] = vi.fn(() => self);
      }
      return obj[key];
    },
  });
  return self;
}

beforeEach(() => {
  vi.resetAllMocks();
});

describe('apiService.createSolicitacao', () => {
  it('sucesso: retorna registro criado', async () => {
    const mock = chainBuilder({ data: solicitacaoMock, error: null });
    (supabase.from as ReturnType<typeof vi.fn>).mockImplementation(() => mock);

    const nova = await apiService.createSolicitacao({
      ...solicitacaoMock,
      id: undefined as unknown as string,
      created_at: undefined as unknown as string,
    } as any);

    expect(nova.id).toBe('uuid-1');
    expect(mock.insert).toHaveBeenCalled();
  });

  it('erro do supabase: lança Error com a mensagem', async () => {
    (supabase.from as ReturnType<typeof vi.fn>).mockImplementation(() =>
      chainBuilder({ data: null, error: { message: 'violates check constraint' } })
    );

    await expect(apiService.createSolicitacao({} as any)).rejects.toThrow(
      'violates check constraint'
    );
  });
});

describe('apiService.getSolicitacoes', () => {
  it('sem filtros: retorna array', async () => {
    const mock = chainBuilder({ data: [solicitacaoMock], error: null });
    (supabase.from as ReturnType<typeof vi.fn>).mockImplementation(() => mock);

    const res = await apiService.getSolicitacoes();
    expect(res).toHaveLength(1);
    expect(res[0].id).toBe('uuid-1');
  });

  it('data null: retorna []', async () => {
    (supabase.from as ReturnType<typeof vi.fn>).mockImplementation(() =>
      chainBuilder({ data: null, error: null })
    );

    expect(await apiService.getSolicitacoes()).toEqual([]);
  });

  it('empresa específica: aplica .eq(empresa)', async () => {
    const mock = chainBuilder({ data: [], error: null });
    (supabase.from as ReturnType<typeof vi.fn>).mockImplementation(() => mock);

    await apiService.getSolicitacoes({ empresa: 'Novitah' });
    expect(mock.eq).toHaveBeenCalledWith('empresa', 'Novitah');
  });

  it('empresa "Ambas": NÃO aplica .eq(empresa)', async () => {
    const mock = chainBuilder({ data: [], error: null });
    (supabase.from as ReturnType<typeof vi.fn>).mockImplementation(() => mock);

    await apiService.getSolicitacoes({ empresa: 'Ambas' });
    expect(mock.eq).not.toHaveBeenCalledWith('empresa', expect.anything());
  });

  it('dataInicio: aplica .gte', async () => {
    const mock = chainBuilder({ data: [], error: null });
    (supabase.from as ReturnType<typeof vi.fn>).mockImplementation(() => mock);

    await apiService.getSolicitacoes({ dataInicio: '2024-01-01' });
    expect(mock.gte).toHaveBeenCalledWith('data_solicitacao', '2024-01-01');
  });

  it('dataFim: aplica .lte', async () => {
    const mock = chainBuilder({ data: [], error: null });
    (supabase.from as ReturnType<typeof vi.fn>).mockImplementation(() => mock);

    await apiService.getSolicitacoes({ dataFim: '2024-12-31' });
    expect(mock.lte).toHaveBeenCalledWith('data_solicitacao', '2024-12-31');
  });

  it('status: aplica .in(status, array)', async () => {
    const mock = chainBuilder({ data: [], error: null });
    (supabase.from as ReturnType<typeof vi.fn>).mockImplementation(() => mock);

    await apiService.getSolicitacoes({ status: 'pendente' });
    expect(mock.in).toHaveBeenCalledWith('status', ['pendente']);

    vi.clearAllMocks();
    await apiService.getSolicitacoes({ status: ['pendente', 'etiqueta_gerada'] });
    expect(mock.in).toHaveBeenCalledWith('status', ['pendente', 'etiqueta_gerada']);
  });
});

describe('apiService.updateSolicitacao', () => {
  it('sucesso: retorna registro atualizado', async () => {
    const mock = chainBuilder({ data: { ...solicitacaoMock, status: 'concluido' }, error: null });
    (supabase.from as ReturnType<typeof vi.fn>).mockImplementation(() => mock);

    const res = await apiService.updateSolicitacao('uuid-1', { status: 'concluido' });
    expect(res.status).toBe('concluido');
    expect(mock.eq).toHaveBeenCalledWith('id', 'uuid-1');
  });

  it('erro: lança', async () => {
    (supabase.from as ReturnType<typeof vi.fn>).mockImplementation(() =>
      chainBuilder({ data: null, error: { message: 'update failed' } })
    );

    await expect(apiService.updateSolicitacao('uuid-1', {})).rejects.toThrow('update failed');
  });

  it('com user e status: registra histórico', async () => {
    const mockUpdate = chainBuilder({
      data: { ...solicitacaoMock, status: 'etiqueta_gerada' },
      error: null,
    });
    const mockInsert = chainBuilder({ data: [{ id: 'hist-1' }], error: null });

    let callCount = 0;
    (supabase.from as ReturnType<typeof vi.fn>).mockImplementation(() => {
      callCount++;
      return callCount === 1 ? mockUpdate : mockInsert;
    });

        const user = { id: 'user-1', nome: 'João Silva', usuario: 'joao', telas: ['lista-geral'] as Tela[] };
    const res = await apiService.updateSolicitacao(
      'uuid-1',
      { status: 'etiqueta_gerada' },
      user
    );

    expect(res.status).toBe('etiqueta_gerada');
    expect(mockUpdate.eq).toHaveBeenCalledWith('id', 'uuid-1');
    expect(mockInsert.insert).toHaveBeenCalled();
    const inserted = mockInsert.insert.mock.calls[0][0];
    expect(inserted.solicitacao_id).toBe('uuid-1');
    expect(inserted.user_nome).toBe('João Silva');
    expect(inserted.acao).toContain('Etiqueta Gerada');
  });

  it('com user e anotações: registra histórico', async () => {
    const mockUpdate = chainBuilder({
      data: { ...solicitacaoMock, anotacoes: 'Nova anotação' },
      error: null,
    });
    const mockInsert = chainBuilder({ data: [{ id: 'hist-2' }], error: null });

    let callCount = 0;
    (supabase.from as ReturnType<typeof vi.fn>).mockImplementation(() => {
      callCount++;
      return callCount === 1 ? mockUpdate : mockInsert;
    });

    const user2 = { id: 'user-1', nome: 'Maria Santos', usuario: 'maria', telas: ['kanban'] as Tela[] };
    await apiService.updateSolicitacao(
      'uuid-1',
      { anotacoes: 'Nova anotação' },
      user2
    );

    expect(mockInsert.insert).toHaveBeenCalled();
    const inserted = mockInsert.insert.mock.calls[0][0];
    expect(inserted.solicitacao_id).toBe('uuid-1');
    expect(inserted.user_nome).toBe('Maria Santos');
    expect(inserted.acao).toBe('Anotação atualizada');
  });

  it('sem user: não registra histórico', async () => {
    const mockUpdate = chainBuilder({ data: { ...solicitacaoMock, status: 'concluido' }, error: null });
    (supabase.from as ReturnType<typeof vi.fn>).mockImplementation(() => mockUpdate);

    await apiService.updateSolicitacao('uuid-1', { status: 'concluido' });

    expect(mockUpdate.insert).not.toHaveBeenCalled();
  });
});

describe('apiService.getHistorico', () => {
  it('retorna array de historico', async () => {
    const mock = chainBuilder({ data: [{ id: 'hist-1', acao: 'Teste' }], error: null });
    (supabase.from as ReturnType<typeof vi.fn>).mockImplementation(() => mock);

    const res = await apiService.getHistorico('uuid-1');
    expect(res).toHaveLength(1);
    expect(res[0].id).toBe('hist-1');
    expect(mock.eq).toHaveBeenCalledWith('solicitacao_id', 'uuid-1');
  });
});

describe('apiService.getSolicitacaoById', () => {
  it('encontrado: retorna registro', async () => {
    (supabase.from as ReturnType<typeof vi.fn>).mockImplementation(() =>
      chainBuilder({ data: solicitacaoMock, error: null })
    );

    const res = await apiService.getSolicitacaoById('uuid-1');
    expect(res?.id).toBe('uuid-1');
  });

  it('não encontrado: retorna null', async () => {
    (supabase.from as ReturnType<typeof vi.fn>).mockImplementation(() =>
      chainBuilder({ data: null, error: null })
    );

    expect(await apiService.getSolicitacaoById('inexistente')).toBeNull();
  });
});
