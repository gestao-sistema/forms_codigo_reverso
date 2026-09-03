// ── Cards de KPIs do dashboard ───────────────────────────────────────────────
import {
  Package,
  Clock,
  Tag,
  PackageCheck,
  Truck,
  CheckCircle2,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { Kpis } from '../../services/analytics';
import type { StatusSolicitacao } from '../../types';

/** Status mapeado para cada card clicável (Total = null, não filtrável) */
type CardStatusKey = StatusSolicitacao | null;

interface SummaryCardsProps {
  kpis: Kpis;
  loading: boolean;
  /** Status ativos no filtro. Set vazio = todos visíveis */
  activeStatuses?: Set<StatusSolicitacao>;
  /** Callback ao clicar num card de status. undefined = sem interação */
  onToggle?: (status: StatusSolicitacao) => void;
}

// Configuração declarativa de cada card
interface CardConfig {
  label: string;
  value: string;
  hint?: string;
  icon: LucideIcon;
  /** Cor do ícone e do fundo do badge */
  color: string;
  /** Classe bg-* do badge */
  bg: string;
  /** Hex da cor (para borda via inline style) */
  hex: string;
  /** Status vinculado ao card (null = Total, não clicável) */
  status: CardStatusKey;
}

export default function SummaryCards({
  kpis,
  loading,
  activeStatuses,
  onToggle,
}: SummaryCardsProps) {
  const cards: CardConfig[] = [
    {
      label: 'Total',
      value: String(kpis.total),
      hint: 'Solicitações no período',
      icon: Package,
      color: 'text-blue-600',
      bg: 'bg-blue-50',
      hex: '#3b82f6',
      status: null,
    },
    {
      label: 'Pendentes',
      value: String(kpis.pendentes),
      hint: 'Aguardando etiqueta',
      icon: Clock,
      color: 'text-amber-600',
      bg: 'bg-amber-50',
      hex: '#f59e0b',
      status: 'pendente',
    },
    {
      label: 'Etiqueta Gerada',
      value: String(kpis.etiquetaGerada),
      hint: 'Etiqueta pronta p/ postagem',
      icon: Tag,
      color: 'text-blue-600',
      bg: 'bg-blue-50',
      hex: '#3b82f6',
      status: 'etiqueta_gerada',
    },
    {
      label: 'Postados',
      value: String(kpis.postados),
      hint: 'Cliente postou a mercadoria',
      icon: PackageCheck,
      color: 'text-violet-600',
      bg: 'bg-violet-50',
      hex: '#8b5cf6',
      status: 'postado',
    },
    {
      label: 'Em Trânsito',
      value: String(kpis.emTransito),
      hint: 'Mercadoria a caminho',
      icon: Truck,
      color: 'text-orange-600',
      bg: 'bg-orange-50',
      hex: '#f97316',
      status: 'em_transito',
    },
    {
      label: 'Concluídos',
      value: String(kpis.concluidos),
      hint: 'Expedição finalizou',
      icon: CheckCircle2,
      color: 'text-emerald-600',
      bg: 'bg-emerald-50',
      hex: '#10b981',
      status: 'concluido',
    },
  ];

  const clickable = !!onToggle;
  const isActive = (s: CardStatusKey) =>
    s !== null && activeStatuses !== undefined && activeStatuses.has(s);

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
      {cards.map((card) => {
        const Icon = card.icon;
        const active = isActive(card.status);
        const isClickable = clickable && card.status !== null;

        return (
          <div
            key={card.label}
            role={isClickable ? 'button' : undefined}
            tabIndex={isClickable ? 0 : undefined}
            aria-pressed={isClickable ? active : undefined}
            onClick={isClickable ? () => onToggle(card.status!) : undefined}
            onKeyDown={
              isClickable
                ? (e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      onToggle(card.status!);
                    }
                  }
                : undefined
            }
            style={active ? { borderColor: card.hex, borderWidth: '2px' } : undefined}
            className={`bg-white rounded-xl p-5 border transition-all duration-150 ${
              active
                ? 'shadow-md'
                : 'border-slate-200 shadow-sm'
            } ${
              isClickable
                ? 'cursor-pointer hover:shadow-md active:scale-[0.98]'
                : ''
            }`}
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
