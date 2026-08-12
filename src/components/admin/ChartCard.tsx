// ── Card container reutilizável para gráficos ────────────────────────────────
import type { ReactNode } from 'react';

interface ChartCardProps {
  title: string;
  subtitle?: string;
  /** Estado de carregamento — exibe skeleton */
  loading?: boolean;
  /** Indica ausência de dados */
  isEmpty?: boolean;
  children: ReactNode;
  className?: string;
}

export default function ChartCard({
  title,
  subtitle,
  loading = false,
  isEmpty = false,
  children,
  className = '',
}: ChartCardProps) {
  return (
    <div
      className={`bg-white rounded-xl p-6 shadow-sm border border-slate-200 ${className}`}
    >
      <div className="mb-4">
        <h3 className="text-base font-semibold text-slate-800">{title}</h3>
        {subtitle && <p className="text-xs text-slate-400 mt-0.5">{subtitle}</p>}
      </div>

      {loading ? (
        <div className="h-[280px] flex items-center justify-center">
          <div className="w-full h-full bg-slate-50 rounded-lg animate-pulse" />
        </div>
      ) : isEmpty ? (
        <div className="h-[280px] flex flex-col items-center justify-center text-center">
          <p className="text-sm text-slate-400">Sem dados no período selecionado.</p>
        </div>
      ) : (
        children
      )}
    </div>
  );
}
