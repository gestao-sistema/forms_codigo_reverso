// ── Barra de filtros do dashboard ────────────────────────────────────────────
import DatePicker, { registerLocale } from 'react-datepicker';
import { ptBR } from 'date-fns/locale/pt-BR';
import { RefreshCw, RotateCcw } from 'lucide-react';
import 'react-datepicker/dist/react-datepicker.css';
import type { Empresa } from '../../types';

registerLocale('pt-BR', ptBR);

// Valor do filtro de empresa inclui a opção "Ambas"
export type FiltroEmpresa = Empresa | 'Ambas';

export interface FiltrosState {
  empresa: FiltroEmpresa;
  dataInicio: string; // YYYY-MM-DD ou ''
  dataFim: string;    // YYYY-MM-DD ou ''
  buscaCliente: string; // Busca por nome do cliente
}

interface DashboardFiltersProps {
  filtros: FiltrosState;
  onChange: (filtros: FiltrosState) => void;
  onRefresh: () => void;
  /** Rótulo do último update, ex: "Atualizado há 5s" */
  ultimaAtualizacao: string;
  isRefreshing: boolean;
  /** Quando presente, trava e oculta o seletor de empresa. */
  empresaFixa?: Empresa;
  /** Exibe busca por cliente (apenas na Lista). */
  showBuscaCliente?: boolean;
}

// Helpers de conversão Date <-> string (mesma lógica do formulário)
const dateToString = (date: Date): string => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};
const stringToDate = (str: string): Date | null => {
  if (!str) return null;
  const [y, m, d] = str.split('-').map(Number);
  return new Date(y, m - 1, d);
};

const inputCls =
  'h-10 px-3 rounded-lg border border-slate-300 bg-white text-sm text-slate-900 ' +
  'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors';

export default function DashboardFilters({
  filtros,
  onChange,
  onRefresh,
  ultimaAtualizacao,
  isRefreshing,
  empresaFixa,
  showBuscaCliente = true,
}: DashboardFiltersProps) {
  const resetFiltros = () =>
    onChange({ empresa: empresaFixa ?? 'Ambas', dataInicio: '', dataFim: '', buscaCliente: '' });

  const temFiltroAtivo =
    filtros.empresa !== 'Ambas' || filtros.dataInicio || filtros.dataFim || filtros.buscaCliente;

  return (
    <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-200">
      <div className="flex flex-wrap items-end gap-4">

        {/* Data início */}
        <div className="flex flex-col">
          <label className="text-xs font-medium text-slate-500 mb-1">De</label>
          <DatePicker
            locale="pt-BR"
            dateFormat="dd/MM/yyyy"
            placeholderText="Início"
            selected={stringToDate(filtros.dataInicio)}
            onChange={(date: Date | null) =>
              onChange({ ...filtros, dataInicio: date ? dateToString(date) : '' })
            }
            maxDate={stringToDate(filtros.dataFim) ?? new Date()}
            className={inputCls}
            isClearable
          />
        </div>

        {/* Data fim */}
        <div className="flex flex-col">
          <label className="text-xs font-medium text-slate-500 mb-1">Até</label>
          <DatePicker
            locale="pt-BR"
            dateFormat="dd/MM/yyyy"
            placeholderText="Fim"
            selected={stringToDate(filtros.dataFim)}
            onChange={(date: Date | null) =>
              onChange({ ...filtros, dataFim: date ? dateToString(date) : '' })
            }
            minDate={stringToDate(filtros.dataInicio) ?? undefined}
            maxDate={new Date()}
            className={inputCls}
            isClearable
          />
        </div>

        {/* Empresa */}
        {empresaFixa ? (
          <div className="flex flex-col">
            <label className="text-xs font-medium text-slate-500 mb-1">Empresa</label>
            <div className="h-10 px-3 flex items-center rounded-lg border border-slate-200 bg-slate-50 text-sm text-slate-700">
              {empresaFixa}
            </div>
          </div>
        ) : (
          <div className="flex flex-col">
            <label htmlFor="filtro-empresa" className="text-xs font-medium text-slate-500 mb-1">
              Empresa
            </label>
            <select
              id="filtro-empresa"
              value={filtros.empresa}
              onChange={(e) =>
                onChange({ ...filtros, empresa: e.target.value as FiltroEmpresa })
              }
              className={`${inputCls} cursor-pointer`}
            >
              <option value="Ambas">Ambas</option>
              <option value="Alinare">Alinare</option>
              <option value="Novitah">Novitah</option>
            </select>
          </div>
        )}

        {/* Busca por Cliente */}
        {showBuscaCliente && (
          <div className="flex flex-col flex-1 min-w-[200px]">
            <label className="text-xs font-medium text-slate-500 mb-1">Cliente</label>
            <input
              type="text"
              placeholder="Nome do cliente..."
              value={filtros.buscaCliente}
              onChange={(e) => onChange({ ...filtros, buscaCliente: e.target.value })}
              className={inputCls}
            />
          </div>
        )}

        {/* Limpar filtros */}
        {temFiltroAtivo && (
          <button
            type="button"
            onClick={resetFiltros}
            className="h-10 px-3 rounded-lg text-sm text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer flex items-center gap-1.5"
          >
            <RotateCcw className="w-4 h-4" />
            Limpar
          </button>
        )}

        {/* Espaçador + ações à direita */}
        <div className="flex items-center gap-3 ml-auto">
          <span className="text-xs text-slate-400 hidden sm:inline">
            {ultimaAtualizacao}
          </span>
          <button
            type="button"
            onClick={onRefresh}
            disabled={isRefreshing}
            className="h-10 px-4 rounded-lg text-sm font-medium bg-blue-600 text-white hover:bg-blue-700 transition-colors cursor-pointer flex items-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
          >
            <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
            Atualizar
          </button>
        </div>
      </div>
    </div>
  );
}
