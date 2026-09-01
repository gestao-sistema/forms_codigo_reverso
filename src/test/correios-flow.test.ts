import { describe, it, expect, vi, beforeEach } from 'vitest';

// ── Mock do singleton supabase ──────────────────────────────────────────────
vi.mock('../lib/supabase', () => ({
  supabase: {
    from: vi.fn(),
    functions: { invoke: vi.fn() },
  },
}));

import { supabase } from '../lib/supabase';
import apiService from '../services/apiService';
import type { Solicitacao, RastreamentoCorreios } from '../types';

const rastreamentoMock: RastreamentoCorreios = {
  codigo_rastreio: 'DG049186226BR',
  solicitacao_id: 'uuid-1',
  ultimo_evento_codigo: 'BDE',
  ultimo_evento_descricao: 'Objeto entregue ao destinatário',
  unidade_cidade: 'XAPURI',
  unidade_uf: 'AC',
  eventos: [
    {
      codigo: 'BDE',
      descricao: 'Objeto entregue ao destinatário',
      dtHrCriado: '2022-03-11T17:03:00',
      unidade: { endereco: { uf: 'AC', cidade: 'XAPURI' } },
    },
    {
      codigo: 'OEC',
      descricao: 'Objeto em rota de entrega',
      dtHrCriado: '2022-03-11T17:02:45',
      unidade: { endereco: { uf: 'SP', cidade: 'SAO PAULO' } },
    },
    {
      codigo: 'PO',
      descricao: 'Objeto postado',
      dtHrCriado: '2022-03-10T19:10:36',
      unidade: { endereco: { uf: 'SP', cidade: 'SAO PAULO' } },
    },
  ],
  ultimo_check_em: '2026-08-28T17:00:00Z',
  created_at: '2026-08-28T16:00:00Z',
};

/** Query fluente (mesmo helper do apiService.test.ts). */
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

const functionsInvoke = supabase.functions.invoke as ReturnType<typeof vi.fn>;

beforeEach(() => {
  vi.resetAllMocks();
});

describe('apiService.getRastreio', () => {
  it('retorna rastreamento salvo da tabela 1:1', async () => {
    const mock = chainBuilder({ data: rastreamentoMock, error: null });
    (supabase.from as ReturnType<typeof vi.fn>).mockImplementation(() => mock);

    const r = await apiService.getRastreio('DG049186226BR');

    expect(r?.codigo_rastreio).toBe('DG049186226BR');
    expect(mock.eq).toHaveBeenCalledWith('codigo_rastreio', 'DG049186226BR');
  });

  it('sem rastreamento salvo: retorna null', async () => {
    (supabase.from as ReturnType<typeof vi.fn>).mockImplementation(() =>
      chainBuilder({ data: null, error: null })
    );

    expect(await apiService.getRastreio('INEXISTENTE')).toBeNull();
  });
});

describe('apiService.atualizarRastreio (Edge Function correios-rastreio)', () => {
  it('invoca a edge function com o código no body', async () => {
    functionsInvoke.mockResolvedValueOnce({ data: { success: true }, error: null });

    await apiService.atualizarRastreio('DG049186226BR');

    expect(functionsInvoke).toHaveBeenCalledWith('correios-rastreio', {
      body: { codigo: 'DG049186226BR' },
    });
  });

  it('erro da edge function: lança com mensagem', async () => {
    functionsInvoke.mockResolvedValueOnce({
      data: null,
      error: { message: 'Falha autenticação Correios: 401' },
    });

    await expect(apiService.atualizarRastreio('DG049186226BR')).rejects.toThrow(
      'Falha autenticação Correios: 401'
    );
  });
});

describe('apiService.salvarCodigoRastreio', () => {
  it('salva em maiúsculas e registra histórico', async () => {
    const mockUpdate = chainBuilder({
      data: { id: 'uuid-1', codigo_rastreio: 'DG049186226BR' },
      error: null,
    });
    const mockInsert = chainBuilder({ data: [{}], error: null });
    let callCount = 0;
    (supabase.from as ReturnType<typeof vi.fn>).mockImplementation(() => {
      callCount++;
      return callCount === 1 ? mockUpdate : mockInsert;
    });

    const user = { id: 'u1', nome: 'Maria', usuario: 'maria', telas: [] as never[] };
    const res = await apiService.salvarCodigoRastreio('uuid-1', 'dg049186226br  ', user);

    expect(res.codigo_rastreio).toBe('DG049186226BR');
    // update recebeu normalizado (trim + upper)
    expect(mockUpdate.update).toHaveBeenCalledWith(
      expect.objectContaining({ codigo_rastreio: 'DG049186226BR' })
    );
    const inserted = mockInsert.insert.mock.calls[0][0];
    expect(inserted.acao).toContain('DG049186226BR');
    expect(inserted.user_nome).toBe('Maria');
  });
});

describe('apiService.removerCodigoRastreio', () => {
  it('limpa codigo_rastreio, deleta rastreamento_correios e registra histórico', async () => {
    // Mock de busca do código atual (1a chamada from → select para pegar código)
    const mockSelect = chainBuilder({
      data: { codigo_rastreio: 'DG049186226BR' },
      error: null,
    });
    // Mock de delete do rastreamento_correios (2a chamada from)
    const mockDelete = chainBuilder({ data: [{}], error: null });
    // Mock de update do card (3a chamada from)
    const mockUpdate = chainBuilder({
      data: { id: 'uuid-1', codigo_rastreio: null },
      error: null,
    });
    // Mock de insert do histórico (4a chamada from)
    const mockInsert = chainBuilder({ data: [{}], error: null });

    let callCount = 0;
    (supabase.from as ReturnType<typeof vi.fn>).mockImplementation(() => {
      callCount++;
      if (callCount === 1) return mockSelect;       // .select('codigo_rastreio').single()
      if (callCount === 2) return mockDelete;        // .delete().eq('codigo_rastreio', ...)
      if (callCount === 3) return mockUpdate;        // .update({codigo_rastreio: null})
      return mockInsert;                             // histórico
    });

    const user = { id: 'u1', nome: 'João', usuario: 'joao', telas: [] as never[] };
    const res = await apiService.removerCodigoRastreio('uuid-1', user);

    expect(res.codigo_rastreio).toBeNull();
    expect(mockDelete.delete).toHaveBeenCalled();
    expect(mockDelete.eq).toHaveBeenCalledWith('codigo_rastreio', 'DG049186226BR');
    expect(mockUpdate.update).toHaveBeenCalledWith(
      expect.objectContaining({ codigo_rastreio: null, ultima_cidade_rastreio: null })
    );
    expect(mockUpdate.eq).toHaveBeenCalledWith('id', 'uuid-1');
    expect(mockInsert.insert).toHaveBeenCalled();
    const inserted = mockInsert.insert.mock.calls[0][0];
    expect(inserted.acao).toContain('removido');
    expect(inserted.user_nome).toBe('João');
  });
});
