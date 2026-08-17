import { describe, it, expect } from 'vitest';
import {
  calcularKpis,
  porMotivo,
  porEmpresa,
  porData,
  porMotivoEmpresa,
  porAutorizador,
  formatarTempo
} from '../services/analytics';
import type { Solicitacao } from '../types';

function sol(overrides: Partial<Solicitacao> = {}): Solicitacao {
  return {
    id: crypto.randomUUID(),
    created_at: '2024-01-01T00:00:00Z',
    empresa: 'Alinare',
    data_solicitacao: '2024-01-15',
    solicitante: 'Teste',
    setor: 'Comercial Alinare',
    codigo_cliente: 1,
    nome_cliente: 'Cliente',
    endereco_postagem: 'Rua X',
    motivo: 'Peça com defeito',
    justificativa_outros: null,
    autorizacao: 'Joice Mendes',
    resolvido: false,
    tempo_preenchimento_segundos: 60,
    ...overrides,
  };
}

describe('analytics', () => {
  describe('calcularKpis', () => {
    it('retorna zeros e "—" com array vazio', () => {
      const res = calcularKpis([]);
      expect(res).toEqual({
        total: 0,
        pendentes: 0,
        resolvidos: 0,
        taxaResolucao: 0,
        tempoMedioSegundos: 0,
        motivoTop: '—'
      });
    });

    it('calcula KPIs corretamente para lista mista', () => {
      const dados = [
        sol({ resolvido: true, tempo_preenchimento_segundos: 60, motivo: 'Endereço incorreto' }),
        sol({ resolvido: true, tempo_preenchimento_segundos: 120, motivo: 'Outros' }),
        sol({ resolvido: false, tempo_preenchimento_segundos: 0, motivo: 'Outros' })
      ];

      const res = calcularKpis(dados);
      expect(res.total).toBe(3);
      expect(res.resolvidos).toBe(2);
      expect(res.pendentes).toBe(1);
      expect(res.taxaResolucao).toBe(67); // Math.round((2/3) * 100)
      expect(res.tempoMedioSegundos).toBe(60); // 180 / 3
      expect(res.motivoTop).toBe('Outros');
    });

    it('motivoTop pega o mais frequente em caso de empate retorna o primeiro encontrado', () => {
      const dados = [
        sol({ motivo: 'Peça com defeito' }),
        sol({ motivo: 'Mercadoria errada' }),
        sol({ motivo: 'Mercadoria errada' }),
      ];
      expect(calcularKpis(dados).motivoTop).toBe('Mercadoria errada');
    });
  });

  describe('porMotivo', () => {
    it('retorna os 5 motivos mesmo vazios', () => {
      const res = porMotivo([]);
      expect(res).toHaveLength(5);
      expect(res.every(r => r.quantidade === 0)).toBe(true);
    });

    it('conta corretamente por motivo', () => {
      const res = porMotivo([
        sol({ motivo: 'Peça com defeito' }),
        sol({ motivo: 'Peça com defeito' }),
        sol({ motivo: 'Outros' })
      ]);
      expect(res.find(m => m.motivo === 'Peça com defeito')?.quantidade).toBe(2);
      expect(res.find(m => m.motivo === 'Outros')?.quantidade).toBe(1);
      expect(res.find(m => m.motivo === 'Mercadoria errada')?.quantidade).toBe(0);
    });
  });

  describe('porEmpresa', () => {
    it('filtra empresas sem registros', () => {
      const dados = [sol({ empresa: 'Alinare' }), sol({ empresa: 'Alinare' })];
      const res = porEmpresa(dados);
      expect(res).toHaveLength(1);
      expect(res[0].empresa).toBe('Alinare');
      expect(res[0].quantidade).toBe(2);
    });

    it('inclui ambas se ambas tiverem registros', () => {
      const dados = [sol({ empresa: 'Alinare' }), sol({ empresa: 'Novitah' })];
      const res = porEmpresa(dados);
      expect(res).toHaveLength(2);
      const alinare = res.find(r => r.empresa === 'Alinare');
      const novitah = res.find(r => r.empresa === 'Novitah');
      expect(alinare?.quantidade).toBe(1);
      expect(novitah?.quantidade).toBe(1);
    });
  });

  describe('porData', () => {
    it('ordena por data asc e formata dataLabel', () => {
      const dados = [
        sol({ data_solicitacao: '2024-01-20' }),
        sol({ data_solicitacao: '2024-01-15' }),
        sol({ data_solicitacao: '2024-01-15' })
      ];

      const res = porData(dados);
      expect(res).toHaveLength(2);

      expect(res[0].data).toBe('2024-01-15');
      expect(res[0].dataLabel).toBe('15/01');
      expect(res[0].quantidade).toBe(2);

      expect(res[1].data).toBe('2024-01-20');
      expect(res[1].dataLabel).toBe('20/01');
      expect(res[1].quantidade).toBe(1);
    });
  });

  describe('porMotivoEmpresa', () => {
    it('divide corretamente por Alinare e Novitah', () => {
      const dados = [
        sol({ motivo: 'Peça com defeito', empresa: 'Alinare' }),
        sol({ motivo: 'Peça com defeito', empresa: 'Alinare' }),
        sol({ motivo: 'Peça com defeito', empresa: 'Novitah' }),
        sol({ motivo: 'Outros', empresa: 'Novitah' })
      ];

      const res = porMotivoEmpresa(dados);
      expect(res).toHaveLength(5);

      const defeito = res.find(r => r.motivo === 'Peça com defeito');
      expect(defeito?.Alinare).toBe(2);
      expect(defeito?.Novitah).toBe(1);
      expect(defeito?.total).toBe(3);

      const outros = res.find(r => r.motivo === 'Outros');
      expect(outros?.Alinare).toBe(0);
      expect(outros?.Novitah).toBe(1);
      expect(outros?.total).toBe(1);
    });
  });

  describe('porAutorizador', () => {
    it('ordena por total desc', () => {
      const dados = [
        sol({ autorizacao: 'Joice Mendes', resolvido: true }),
        sol({ autorizacao: 'Viviane Ulian', resolvido: false }),
        sol({ autorizacao: 'Viviane Ulian', resolvido: true })
      ];

      const res = porAutorizador(dados);
      expect(res).toHaveLength(2);

      expect(res[0].autorizador).toBe('Viviane Ulian');
      expect(res[0].pendentes).toBe(1);
      expect(res[0].resolvidos).toBe(1);
      expect(res[0].total).toBe(2);

      expect(res[1].autorizador).toBe('Joice Mendes');
      expect(res[1].pendentes).toBe(0);
      expect(res[1].resolvidos).toBe(1);
      expect(res[1].total).toBe(1);
    });
  });

  describe('formatarTempo', () => {
    it('formata 0s', () => expect(formatarTempo(0)).toBe('0s'));
    it('formata < 60s', () => expect(formatarTempo(59)).toBe('59s'));
    it('formata minutos exatos', () => expect(formatarTempo(60)).toBe('1min'));
    it('formata minutos e segundos', () => expect(formatarTempo(90)).toBe('1min 30s'));
    it('formata 2 minutos exatos', () => expect(formatarTempo(120)).toBe('2min'));
  });
});
