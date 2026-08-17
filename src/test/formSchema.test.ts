import { describe, it, expect } from 'vitest';
import { formSchema } from '../schemas/formSchema';

const baseline = {
  data_solicitacao: '2024-01-15',
  solicitante: 'Maria Silva',
  setor: 'Comercial Alinare' as const,
  codigo_cliente: 1234,
  nome_cliente: 'Cliente Teste',
  endereco_postagem: 'Rua das Flores, 123, Bairro, Cidade/SP',
  motivo: 'Peça com defeito' as const,
  justificativa_outros: '',
  autorizacao: 'Joice Mendes',
};

function valid(overrides: object = {}) {
  return formSchema.safeParse({ ...baseline, ...overrides });
}

describe('formSchema', () => {
  it('baseline válido passa', () => {
    expect(valid().success).toBe(true);
  });

  // ── Campos obrigatórios ──────────────────────────────────────────────────────

  it('data_solicitacao vazia falha', () => {
    const r = valid({ data_solicitacao: '' });
    expect(r.success).toBe(false);
  });

  it('data_solicitacao ausente falha', () => {
    const r = formSchema.safeParse({ ...baseline, data_solicitacao: undefined });
    expect(r.success).toBe(false);
  });

  it('setor inválido falha com mensagem correta', () => {
    const r = valid({ setor: 'Inexistente' });
    expect(r.success).toBe(false);
    if (!r.success) {
      expect(r.error.issues[0].message).toContain('setor válido');
    }
  });

  it('motivo inválido falha', () => {
    const r = valid({ motivo: 'Motivo inexistente' });
    expect(r.success).toBe(false);
    if (!r.success) {
      expect(r.error.issues[0].message).toContain('motivo válido');
    }
  });

  it('autorizacao inválida falha', () => {
    const r = valid({ autorizacao: 'Fulano da Silva' });
    expect(r.success).toBe(false);
    if (!r.success) {
      expect(r.error.issues.some(i => i.message.includes('autorizador válido'))).toBe(true);
    }
  });

  it('autorizacao vazia falha', () => {
    const r = valid({ autorizacao: '' });
    expect(r.success).toBe(false);
  });

  // ── codigo_cliente ────────────────────────────────────────────────────────────

  it('codigo_cliente 0 falha', () => {
    expect(valid({ codigo_cliente: 0 }).success).toBe(false);
  });

  it('codigo_cliente negativo falha', () => {
    expect(valid({ codigo_cliente: -1 }).success).toBe(false);
  });

  it('codigo_cliente decimal falha', () => {
    expect(valid({ codigo_cliente: 1.5 }).success).toBe(false);
  });

  it('codigo_cliente inteiro positivo passa', () => {
    expect(valid({ codigo_cliente: 1 }).success).toBe(true);
  });

  // ── Strip HTML ────────────────────────────────────────────────────────────────

  it('solicitante com tags HTML: tag removida, texto mantido', () => {
    const r = valid({ solicitante: '<b>João</b>' });
    expect(r.success).toBe(true);
    if (r.success) {
      expect(r.data.solicitante).toBe('João');
    }
  });

  it('solicitante com script injection: tag removida', () => {
    const r = valid({ solicitante: '<script>alert(1)</script>Ana' });
    expect(r.success).toBe(true);
    if (r.success) {
      // conteúdo entre tags permanece, tags são removidas
      expect(r.data.solicitante).not.toContain('<');
    }
  });

  it('nome_cliente com HTML removido', () => {
    const r = valid({ nome_cliente: '<em>Empresa</em> LTDA' });
    expect(r.success).toBe(true);
    if (r.success) {
      expect(r.data.nome_cliente).toBe('Empresa LTDA');
    }
  });

  it('endereco_postagem com HTML removido', () => {
    const r = valid({ endereco_postagem: '<div>Rua A, 100</div>' });
    expect(r.success).toBe(true);
    if (r.success) {
      expect(r.data.endereco_postagem).toBe('Rua A, 100');
    }
  });

  // ── Limites de tamanho ────────────────────────────────────────────────────────

  it('solicitante 1 char falha', () => {
    expect(valid({ solicitante: 'A' }).success).toBe(false);
  });

  it('solicitante 2 chars passa', () => {
    expect(valid({ solicitante: 'AB' }).success).toBe(true);
  });

  it('solicitante 100 chars passa', () => {
    expect(valid({ solicitante: 'A'.repeat(100) }).success).toBe(true);
  });

  it('solicitante 101 chars falha', () => {
    expect(valid({ solicitante: 'A'.repeat(101) }).success).toBe(false);
  });

  it('nome_cliente 1 char falha', () => {
    expect(valid({ nome_cliente: 'A' }).success).toBe(false);
  });

  it('nome_cliente 2 chars passa', () => {
    expect(valid({ nome_cliente: 'AB' }).success).toBe(true);
  });

  it('nome_cliente 150 chars passa', () => {
    expect(valid({ nome_cliente: 'A'.repeat(150) }).success).toBe(true);
  });

  it('nome_cliente 151 chars falha', () => {
    expect(valid({ nome_cliente: 'A'.repeat(151) }).success).toBe(false);
  });

  it('endereco_postagem 4 chars falha', () => {
    expect(valid({ endereco_postagem: 'Rua ' }).success).toBe(false);
  });

  it('endereco_postagem 5 chars passa', () => {
    expect(valid({ endereco_postagem: 'Rua X' }).success).toBe(true);
  });

  it('endereco_postagem 300 chars passa', () => {
    expect(valid({ endereco_postagem: 'A'.repeat(300) }).success).toBe(true);
  });

  it('endereco_postagem 301 chars falha', () => {
    expect(valid({ endereco_postagem: 'A'.repeat(301) }).success).toBe(false);
  });

  it('justificativa_outros 500 chars passa', () => {
    expect(valid({ motivo: 'Outros', justificativa_outros: 'A'.repeat(500) }).success).toBe(true);
  });

  it('justificativa_outros 501 chars falha', () => {
    const r = valid({ motivo: 'Outros', justificativa_outros: 'A'.repeat(501) });
    expect(r.success).toBe(false);
  });

  // ── superRefine: Outros ───────────────────────────────────────────────────────

  it('motivo=Outros sem justificativa falha no path correto', () => {
    const r = valid({ motivo: 'Outros', justificativa_outros: '' });
    expect(r.success).toBe(false);
    if (!r.success) {
      const paths = r.error.issues.map(i => i.path.join('.'));
      expect(paths).toContain('justificativa_outros');
      expect(r.error.issues.some(i => i.message.includes('Justifique'))).toBe(true);
    }
  });

  it('motivo=Outros com justificativa preenchida passa', () => {
    expect(valid({ motivo: 'Outros', justificativa_outros: 'Motivo específico aqui' }).success).toBe(true);
  });

  it('motivo != Outros com justificativa vazia passa', () => {
    expect(valid({ motivo: 'Mercadoria errada', justificativa_outros: '' }).success).toBe(true);
  });

  it('motivo != Outros sem justificativa_outros passa', () => {
    const data = { ...baseline, motivo: 'Endereço incorreto', justificativa_outros: undefined };
    expect(formSchema.safeParse(data).success).toBe(true);
  });

  // ── Autorizadores válidos por empresa ─────────────────────────────────────────

  it('autorizacao Joice Mendes (Alinare) passa', () => {
    expect(valid({ autorizacao: 'Joice Mendes' }).success).toBe(true);
  });

  it('autorizacao Marcelo Gualtieri (Novitah) passa', () => {
    expect(valid({ autorizacao: 'Marcelo Gualtieri' }).success).toBe(true);
  });

  it('autorizacao Ludmila Amancio (Novitah) passa', () => {
    expect(valid({ autorizacao: 'Ludmila Amancio' }).success).toBe(true);
  });

  // ── Setores válidos ───────────────────────────────────────────────────────────

  it('setor Comercial Novitah passa', () => {
    expect(valid({ setor: 'Comercial Novitah' }).success).toBe(true);
  });

  it('setor Financeiro passa', () => {
    expect(valid({ setor: 'Financeiro' }).success).toBe(true);
  });

  it('setor Assistência Técnica passa', () => {
    expect(valid({ setor: 'Assistência Técnica' }).success).toBe(true);
  });
});
