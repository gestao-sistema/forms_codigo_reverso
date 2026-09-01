import { describe, it, expect } from 'vitest';
import { mapEventoParaStatus, extrairEventos } from '../../supabase/functions/correios-rastreio/logic.ts';

describe('Correios Rastreio - Lógica de Eventos', () => {
  it('mapEventoParaStatus mapeia eventos conhecidos para status Kanban', () => {
    // Testes código de homologação PDF DG...
    expect(mapEventoParaStatus('PO')).toBe('postado');
    expect(mapEventoParaStatus('RO')).toBe('em_transito');
    expect(mapEventoParaStatus('OEC')).toBe('em_transito');
    expect(mapEventoParaStatus('BDE')).toBe('concluido');

    // Testes ignoram eventos não-marco (encaminhamento etc sem mudança de fase master)
    expect(mapEventoParaStatus('FC')).toBeNull();
    expect(mapEventoParaStatus('XYZ')).toBeNull();
  });

  describe('extrairEventos com payload da API oficial', () => {
    it('Lida com payload SRO-020 (objeto não encontrado em prod)', () => {
      const payload = {
        "versao": "3.5.49",
        "quantidade": 1,
        "objetos": [{
          "codObjeto": "DG049186226BR",
          "mensagem": "SRO-020: Não localizamos..."
        }],
        "tipoResultado": "Todos os Eventos"
      };

      const eventos = extrairEventos(payload);
      expect(eventos).toEqual([]);
    });

    it('Extrai corretamente a timeline de rastreio (payload V1 de homologação pág 47)', () => {
      const payload = {
        "quantidade": 1,
        "versao": "1.8.7",
        "resultado": "Todos os Eventos",
        "objetos": [{
          "codObjeto": "DG049186226BR",
          "tipoPostal": { "sigla": "DG", "categoria": "SEDEX" },
          "eventos": [
            {
              "codigo": "BDE",
              "tipo": "01",
              "dtHrCriado": "2022-03-11T17:03:00",
              "descricao": "Objeto entregue ao destinatário"
            },
            {
              "codigo": "OEC",
              "tipo": "03",
              "dtHrCriado": "2022-03-11T17:02:45",
              "descricao": "Objeto em rota de entrega"
            },
            {
              "codigo": "PO",
              "tipo": "01",
              "dtHrCriado": "2022-03-10T19:10:36",
              "descricao": "Objeto postado"
            }
          ]
        }]
      };

      const eventos = extrairEventos(payload);
      expect(eventos).toHaveLength(3);
      expect(eventos[0].codigo).toBe('BDE');

      // O fluxo da Deno Edge function lê "rastro.ultimo.codigo" que no caso será BDE
      const statusFinal = mapEventoParaStatus(eventos[0].codigo);
      expect(statusFinal).toBe('concluido');

      const statusMeio = mapEventoParaStatus(eventos[1].codigo);
      expect(statusMeio).toBe('em_transito');

      const statusInicio = mapEventoParaStatus(eventos[2].codigo);
      expect(statusInicio).toBe('postado');
    });

    it('Lida com array plano de eventos fallback', () => {
      const payload = {
        "eventos": [
          { "codigo": "PO", "descricao": "Postado" }
        ]
      };
      expect(extrairEventos(payload)).toHaveLength(1);
    });
  });
});
