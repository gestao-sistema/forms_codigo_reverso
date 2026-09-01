// ── Lógica pura do rastreio Correios (sem I/O) ──────────────────────────────
// Compartilhada entre a Edge Function e os testes (vitest).

export interface EventoRastro {
  codigo: string;
  descricao: string;
  dtHrCriado: string;
  unidade?: { endereco?: { cidade?: string; uf?: string }; tipo?: string; nome?: string };
  unidadeDestino?: { endereco?: { cidade?: string; uf?: string }; tipo?: string; nome?: string };
}

export type StatusRastreio = 'postado' | 'em_transito' | 'concluido';

/** Mapeia código de evento SRO para status interno do fluxo. */
export function mapEventoParaStatus(codigo: string): StatusRastreio | null {
  if (codigo === 'PO') return 'postado';
  if (codigo === 'RO' || codigo === 'OEC') return 'em_transito';
  if (codigo === 'BDE') return 'concluido';
  return null;
}

/** Extrai lista de eventos da resposta da API (formato objeto único ou lista). */
export function extrairEventos(respostaApi: unknown): EventoRastro[] {
  const data = respostaApi as
    | { eventos?: EventoRastro[]; objetos?: { eventos?: EventoRastro[] }[] }
    | null;
  return data?.eventos ?? data?.objetos?.[0]?.eventos ?? [];
}
