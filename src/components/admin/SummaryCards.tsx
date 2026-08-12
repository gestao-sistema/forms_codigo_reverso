// ── Cards de KPIs do dashboard ───────────────────────────────────────────────
import {
  Package,
  Clock,
  CheckCircle2,
  TrendingUp,
  Timer,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { type Kpis, formatarTempo } from '../../services/analytics';

interface SummaryCardsProps {
  kpis: Kpis;
  loading: boolean;
}

// Configuração declarativa de cada card
interface CardConfig {
  label: string;
  value: string;
  hint?: string;
  icon: LucideIcon;
  /** Cor do ícone e do fundo do badge */
  color: string;
  bg: string;
}

export default function SummaryCards({ kpis, loading }: SummaryCardsProps) {
  const cards: CardConfig[] = [
    {
      label: 'Total',
      value: String(kpis.total),
      hint: 'Solicitações no período',
      icon: Package,
      color: 'text-blue-600',
      bg: 'bg-blue-50',
    },
    {
      label: 'Pendentes',
      value: String(kpis.pendentes),
      hint: 'Aguardando resolução',
      icon: Clock,
      color: 'text-amber-600',
      bg: 'bg-amber-50',
    },
    {
      label: 'Resolvidos',
      value: String(kpis.resolvidos),
      hint: 'Concluídas',
      icon: CheckCircle2,
      color: 'text-green-600',
      bg: 'bg-green-50',
    },
    {
      label: 'Taxa de Resolução',
      value: `${kpis.taxaResolucao}%`,
      hint: 'Resolvidos / Total',
      icon: TrendingUp,
      color: 'text-violet-600',
      bg: 'bg-violet-50',
    },
    {
      label: 'Tempo Médio',
      value: formatarTempo(kpis.tempoMedioSegundos),
      hint: 'Preenchimento do formulário',
      icon: Timer,
      color: 'text-slate-600',
      bg: 'bg-slate-100',
    },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
      {cards.map((card) => {
        const Icon = card.icon;
        return (
          <div
            key={card.label}
            className="bg-white rounded-xl p-5 shadow-sm border border-slate-200"
          >
            <div className="flex items-center justify-between mb-3">
              <span className={`p-2 rounded-lg ${card.bg}`}>
                <Icon className={`w-5 h-5 ${card.color}`} aria-hidden="true" />
              </span>
            </div>

            {loading ? (
              <div className="h-8 w-16 bg-slate-100 rounded animate-pulse" />
            ) : (
              <p className="text-2xl font-bold text-slate-900 tabular-nums">
                {card.value}
              </p>
            )}

            <p className="text-sm font-medium text-slate-600 mt-1">{card.label}</p>
            {card.hint && (
              <p className="text-xs text-slate-400 mt-0.5">{card.hint}</p>
            )}
          </div>
        );
      })}
    </div>
  );
}
