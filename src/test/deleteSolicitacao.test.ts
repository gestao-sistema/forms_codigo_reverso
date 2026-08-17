import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../lib/supabase', () => ({
  supabase: { from: vi.fn() },
}));

import { supabase } from '../lib/supabase';
import apiService from '../services/apiService';

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

describe('apiService.deleteSolicitacao', () => {
  it('sucesso: resolve sem erro e chama .delete() com .eq(id)', async () => {
    const mock = chainBuilder({ data: null, error: null });
    (supabase.from as ReturnType<typeof vi.fn>).mockImplementation(() => mock);

    await expect(apiService.deleteSolicitacao('uuid-1')).resolves.toBeUndefined();
    expect(mock.delete).toHaveBeenCalled();
    expect(mock.eq).toHaveBeenCalledWith('id', 'uuid-1');
  });

  it('erro do supabase: lança Error com a mensagem', async () => {
    (supabase.from as ReturnType<typeof vi.fn>).mockImplementation(() =>
      chainBuilder({ data: null, error: { message: 'foreign key violation' } })
    );

    await expect(apiService.deleteSolicitacao('uuid-1')).rejects.toThrow(
      'foreign key violation'
    );
  });

  it('erro sem mensagem: usa fallback', async () => {
    (supabase.from as ReturnType<typeof vi.fn>).mockImplementation(() =>
      chainBuilder({ data: null, error: { message: '' } })
    );

    await expect(apiService.deleteSolicitacao('uuid-1')).rejects.toThrow(
      'Erro ao apagar solicitação.'
    );
  });
});
