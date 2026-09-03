// ── Página Dashboard: visão analítica em tempo real ──────────────────────────
import { useMemo, useState, useEffect, useCallback } from 'react';
import { useSolicitacoes } from '../hooks/useSolicitacoes';
import {
  calcularKpis,
  porMotivo,
  porEmpresa,
  porData,
  porMotivoEmpresa,
  porAutorizador,
} from '../services/analytics';
import { useAuth } from '../context/AuthContext';
import { type FiltrosSolicitacoes, type StatusSolicitacao } from '../types';

import SummaryCards from '../components/admin/SummaryCards';
import DashboardFilters, {
  type FiltrosState,
} from '../components/admin/DashboardFilters';
import ChartCard from '../components/admin/ChartCard';
import ChartMotivo from '../components/admin/ChartMotivo';
import ChartEmpresa from '../components/admin/ChartEmpresa';
import ChartTimeline from '../components/admin/ChartTimeline';
import ChartMotivoEmpresa from '../components/admin/ChartMotivoEmpresa';
import ChartAutorizador from '../components/admin/ChartAutorizador';

// Intervalo de polling — "tempo real" (15s)
const POLLING_MS = 15_000;

export default function DashboardPage() {
  const { user } = useAuth();
  const searchParams = new URLSearchParams(window.location.search);
  const queryEmpresa = searchParams.get('empresa') as 'Alinare' | 'Novitah' | null;

  // Trava o filtro de empresa conforme acesso
  const temGeral = user?.telas.includes('dashboard-geral');
  const temAlinare = user?.telas.includes('dashboard-alinare');
  const temNovitah = user?.telas.includes('dashboard-novitah');

  let empresaFixa: 'Alinare' | 'Novitah' | null = null;
  if (!temGeral) {
    if (temAlinare && !temNovitah) empresaFixa = 'Alinare';
    if (temNovitah && !temAlinare) empresaFixa = 'Novitah';
  } else if (queryEmpresa && (queryEmpresa === 'Alinare' || queryEmpresa === 'Novitah')) {
    // Admin com dashboard-geral: respeita query param ?empresa=
    empresaFixa = queryEmpresa;
  }

  // Estado dos filtros da UI
  const [filtros, setFiltros] = useState<FiltrosState>({
    empresa: empresaFixa ?? 'Ambas',
    dataInicio: '',
    dataFim: '',
    buscaCliente: '',
  });

  // Converte filtros da UI para o formato do serviço
  const filtrosServico: FiltrosSolicitacoes = useMemo(
    () => ({
      empresa: empresaFixa ?? filtros.empresa,
      dataInicio: filtros.dataInicio || undefined,
      dataFim: filtros.dataFim || undefined,
    }),
    [filtros, empresaFixa]
  );

  const { dados, loading, refreshing, ultimoFetch, refetch } = useSolicitacoes({
    pollingMs: POLLING_MS,
    filtros: filtrosServico,
  });

  // ── Filtro por status (cards clicáveis) ───────────────────────────────────
  // Set vazio = nenhum filtro, mostra todos
  const [statusSelecionados, setStatusSelecionados] = useState<Set<StatusSolicitacao>>(new Set());

  const toggleStatus = useCallback((status: StatusSolicitacao) => {
    setStatusSelecionados((prev) => {
      const next = new Set(prev);
      if (next.has(status)) next.delete(status);
      else next.add(status);
      return next;
    });
  }, []);

  // Dados filtrados: alimenta KPIs e gráficos. Sem seleção = dados completos
  const dadosFiltrados = useMemo(
    () =>
      statusSelecionados.size === 0
        ? dados
        : dados.filter((s) => {
            const resolvidoAntigo = (s as any).resolvido;
            const statusReal = s.status || (resolvidoAntigo ? 'concluido' : 'pendente');
            return statusSelecionados.has(statusReal);
          }),
    [dados, statusSelecionados]
  );

  // ── Rótulo "atualizado há Xs" (recalcula a cada segundo) ──────────────────
  const [, setTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 1000);
    return () => clearInterval(id);
  }, []);

  const segundosAtras = Math.floor((Date.now() - ultimoFetch) / 1000);
  const ultimaAtualizacao =
    segundosAtras < 5 ? 'Atualizado agora' : `Atualizado há ${segundosAtras}s`;

  // ── Datasets derivados (memoizados) ───────────────────────────────────────
  // KPIs sempre calculados sobre dados completos (números dos cards não mudam)
  const kpis = useMemo(() => calcularKpis(dados), [dados]);
  // Gráficos usam dados filtrados por status
  const dataMotivo = useMemo(() => porMotivo(dadosFiltrados), [dadosFiltrados]);
  const dataEmpresa = useMemo(() => porEmpresa(dadosFiltrados), [dadosFiltrados]);
  const dataTimeline = useMemo(() => porData(dadosFiltrados), [dadosFiltrados]);
  const dataMotivoEmpresa = useMemo(() => porMotivoEmpresa(dadosFiltrados), [dadosFiltrados]);
  const dataAutorizador = useMemo(() => porAutorizador(dadosFiltrados), [dadosFiltrados]);

  const semDados = !loading && dadosFiltrados.length === 0;

  return (
    <div className="space-y-6">

      {/* Cabeçalho */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Dashboard</h1>
        <p className="text-sm text-slate-500 mt-1">
          Visão analítica das solicitações de logística reversa em tempo real.
        </p>
      </div>

      {/* Filtros */}
      <DashboardFilters
        filtros={filtros}
        onChange={setFiltros}
        onRefresh={refetch}
        ultimaAtualizacao={ultimaAtualizacao}
        isRefreshing={refreshing}
        empresaFixa={empresaFixa ?? undefined}
        showBuscaCliente={false}
      />

      {/* Cards de KPIs — clicáveis para filtrar por status */}
      <SummaryCards
        kpis={kpis}
        loading={loading}
        activeStatuses={statusSelecionados}
        onToggle={toggleStatus}
      />

      {/* Linha 1: Motivo + Empresa */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ChartCard
          title="Solicitações por Motivo"
          subtitle="Distribuição das causas de devolução"
          loading={loading}
          isEmpty={semDados}
        >
          <ChartMotivo data={dataMotivo} />
        </ChartCard>

        <ChartCard
          title="Alinare vs Novitah"
          subtitle="Proporção de solicitações por empresa"
          loading={loading}
          isEmpty={semDados}
        >
          <ChartEmpresa data={dataEmpresa} />
        </ChartCard>
      </div>

      {/* Linha 2: Timeline (full width) */}
      <ChartCard
        title="Volume ao Longo do Tempo"
        subtitle="Solicitações por data"
        loading={loading}
        isEmpty={semDados}
      >
        <ChartTimeline data={dataTimeline} />
      </ChartCard>

      {/* Linha 3: Motivo×Empresa + Autorizador */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ChartCard
          title="Motivo por Empresa"
          subtitle="Concentração de causas em cada marca"
          loading={loading}
          isEmpty={semDados}
        >
          <ChartMotivoEmpresa data={dataMotivoEmpresa} />
        </ChartCard>

        <ChartCard
          title="Carga por Autorizador"
          subtitle="Pendentes e resolvidos por responsável"
          loading={loading}
          isEmpty={semDados}
        >
          <ChartAutorizador data={dataAutorizador} />
        </ChartCard>
      </div>
    </div>
  );
}
