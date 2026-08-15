// ── Funções puras de análise/agregação de dados ──────────────────────────────
// Recebem um array de Solicitacao já filtrado e derivam KPIs e datasets
// para os gráficos. Mantidas puras (sem side-effects) para fácil teste.
// ─────────────────────────────────────────────────────────────────────────────

import type { Solicitacao, Empresa } from '../types';
import { MOTIVOS } from '../types';

// ── Cores das marcas (reuso em gráficos) ──────────────────────────────────────
export const COR_EMPRESA: Record<Empresa, string> = {
  Alinare: '#2B2D42',
  Novitah: '#A67B7B',
};

// Paleta para os motivos (5 categorias)
export const COR_MOTIVO: string[] = [
  '#3B82F6', // Peça com defeito — azul
  '#F59E0B', // Mercadoria errada — âmbar
  '#8B5CF6', // Endereço incorreto — roxo
  '#EF4444', // Baixa qualidade no conserto — vermelho
  '#64748B', // Outros — cinza
];

// ── KPIs numéricos ────────────────────────────────────────────────────────────

export interface Kpis {
  total: number;
  pendentes: number;
  resolvidos: number;
  /** Percentual de resolução (0–100) */
  taxaResolucao: number;
  /** Tempo médio de preenchimento em segundos */
  tempoMedioSegundos: number;
  /** Motivo mais recorrente */
  motivoTop: string;
}

export function calcularKpis(dados: Solicitacao[]): Kpis {
  const total = dados.length;
  const resolvidos = dados.filter((s) => s.resolvido).length;
  const pendentes = total - resolvidos;

  const taxaResolucao = total > 0 ? Math.round((resolvidos / total) * 100) : 0;

  const somaTempo = dados.reduce(
    (acc, s) => acc + s.tempo_preenchimento_segundos,
    0
  );
  const tempoMedioSegundos = total > 0 ? Math.round(somaTempo / total) : 0;

  // Motivo mais frequente
  const contagem = new Map<string, number>();
  dados.forEach((s) => contagem.set(s.motivo, (contagem.get(s.motivo) ?? 0) + 1));
  let motivoTop = '—';
  let maxCount = 0;
  contagem.forEach((count, motivo) => {
    if (count > maxCount) {
      maxCount = count;
      motivoTop = motivo;
    }
  });

  return { total, pendentes, resolvidos, taxaResolucao, tempoMedioSegundos, motivoTop };
}

// ── Dataset: quantidade por motivo ────────────────────────────────────────────

export interface MotivoDatum {
  motivo: string;
  quantidade: number;
}

export function porMotivo(dados: Solicitacao[]): MotivoDatum[] {
  return MOTIVOS.map((motivo) => ({
    motivo,
    quantidade: dados.filter((s) => s.motivo === motivo).length,
  }));
}

// ── Dataset: proporção por empresa (pizza) ────────────────────────────────────

export interface EmpresaDatum {
  empresa: Empresa;
  quantidade: number;
}

export function porEmpresa(dados: Solicitacao[]): EmpresaDatum[] {
  return (['Alinare', 'Novitah'] as Empresa[])
    .map((empresa) => ({
      empresa,
      quantidade: dados.filter((s) => s.empresa === empresa).length,
    }))
    .filter((d) => d.quantidade > 0); // não renderiza fatias vazias
}

// ── Dataset: volume ao longo do tempo (área) ──────────────────────────────────

export interface TimelineDatum {
  data: string;        // YYYY-MM-DD (para ordenação)
  dataLabel: string;   // DD/MM (para exibição)
  quantidade: number;
}

export function porData(dados: Solicitacao[]): TimelineDatum[] {
  const contagem = new Map<string, number>();
  dados.forEach((s) => {
    contagem.set(s.data_solicitacao, (contagem.get(s.data_solicitacao) ?? 0) + 1);
  });

  return Array.from(contagem.entries())
    .map(([data, quantidade]) => {
      const [, m, d] = data.split('-');
      return { data, dataLabel: `${d}/${m}`, quantidade };
    })
    .sort((a, b) => a.data.localeCompare(b.data));
}

// ── Dataset: motivo × empresa (barras empilhadas) ─────────────────────────────

export interface MotivoEmpresaDatum {
  motivo: string;
  Alinare: number;
  Novitah: number;
  total: number;
}

export function porMotivoEmpresa(dados: Solicitacao[]): MotivoEmpresaDatum[] {
  return MOTIVOS.map((motivo) => {
    const doMotivo = dados.filter((s) => s.motivo === motivo);
    const alinare = doMotivo.filter((s) => s.empresa === 'Alinare').length;
    const novitah = doMotivo.filter((s) => s.empresa === 'Novitah').length;
    return {
      motivo,
      Alinare: alinare,
      Novitah: novitah,
      total: alinare + novitah,
    };
  });
}

// ── Dataset: ranking por autorizador ──────────────────────────────────────────

export interface AutorizadorDatum {
  autorizador: string;
  pendentes: number;
  resolvidos: number;
  total: number;
}

export function porAutorizador(dados: Solicitacao[]): AutorizadorDatum[] {
  const mapa = new Map<string, { pendentes: number; resolvidos: number }>();

  dados.forEach((s) => {
    const atual = mapa.get(s.autorizacao) ?? { pendentes: 0, resolvidos: 0 };
    if (s.resolvido) atual.resolvidos += 1;
    else atual.pendentes += 1;
    mapa.set(s.autorizacao, atual);
  });

  return Array.from(mapa.entries())
    .map(([autorizador, v]) => ({
      autorizador,
      pendentes: v.pendentes,
      resolvidos: v.resolvidos,
      total: v.pendentes + v.resolvidos,
    }))
    .sort((a, b) => b.total - a.total); // maior carga primeiro
}

// ── Formatação de tempo (segundos → "Xmin Ys") ────────────────────────────────

export function formatarTempo(segundos: number): string {
  if (segundos < 60) return `${segundos}s`;
  const min = Math.floor(segundos / 60);
  const seg = segundos % 60;
  return seg > 0 ? `${min}min ${seg}s` : `${min}min`;
}
