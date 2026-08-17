// ── Página da Lista de Registros ─────────────────────────────────────────────
import { useMemo, useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { useSolicitacoes } from '../hooks/useSolicitacoes';
import { ESCOPO_EMPRESA, type FiltrosSolicitacoes, type Solicitacao } from '../types';
import { useAuth } from '../context/AuthContext';
import apiService from '../services/apiService';

import DashboardFilters, { type FiltrosState } from '../components/admin/DashboardFilters';
import RecordsList from '../components/admin/RecordsList';
import RecordDetailModal from '../components/admin/RecordDetailModal';

// Intervalo de polling (15s)
const POLLING_MS = 15_000;

export default function ListPage() {
  // Trava o filtro de empresa conforme o perfil logado
  const { user } = useAuth();
  const empresaFixa = user ? ESCOPO_EMPRESA[user.perfil] : null;

  // ── Filtros globais (topo) ──
  const [filtros, setFiltros] = useState<FiltrosState>({
    empresa: empresaFixa ?? 'Ambas',
    dataInicio: '',
    dataFim: '',
    buscaCliente: '',
  });

  // ── Toggle local (Pendente vs Resolvido) ──
  const [verResolvidos, setVerResolvidos] = useState(false);

  // ── Modal de detalhe ──
  const [selectedRecord, setSelectedRecord] = useState<Solicitacao | null>(null);

  // Junta filtros da barra + toggle local
  const filtrosServico: FiltrosSolicitacoes = useMemo(
    () => ({
      empresa: empresaFixa ?? filtros.empresa,
      dataInicio: filtros.dataInicio || undefined,
      dataFim: filtros.dataFim || undefined,
      resolvido: verResolvidos,
      buscaCliente: filtros.buscaCliente || undefined,
    }),
    [filtros, verResolvidos, empresaFixa]
  );

  const { dados, loading, refreshing, ultimoFetch, refetch } = useSolicitacoes({
    pollingMs: POLLING_MS,
    filtros: filtrosServico,
  });

  // Rótulo "atualizado há Xs"
  const [, setTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 1000);
    return () => clearInterval(id);
  }, []);

  const segundosAtras = Math.floor((Date.now() - ultimoFetch) / 1000);
  const ultimaAtualizacao =
    segundosAtras < 5 ? 'Atualizado agora' : `Atualizado há ${segundosAtras}s`;

  // ── Ações ──

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation(); // impede abrir modal da linha
    if (!confirm('Apagar esta solicitação permanentemente? Esta ação não pode ser desfeita.')) return;
    try {
      await apiService.deleteSolicitacao(id);
      toast.success('Solicitação apagada.');
      refetch();
    } catch {
      toast.error('Erro ao apagar. Tente novamente.');
    }
  };

  const handleToggleStatus = async (
    id: string,
    currentStatus: boolean,
    e: React.MouseEvent
  ) => {
    e.stopPropagation(); // Impede click da linha de abrir modal

    // Optimistic UI imediata
    const acaoDesejada = !currentStatus;
    const promise = apiService.updateSolicitacao(id, { resolvido: acaoDesejada });

    toast.promise(
      promise,
      {
        loading: 'Atualizando status...',
        success: () => {
          refetch(); // Busca dado fresco p/ sumir da lista se necessário
          return acaoDesejada
            ? 'Marcado como resolvido.'
            : 'Marcado como pendente.';
        },
        error: 'Erro ao atualizar. Tente novamente.',
      },
      {
        style: { minWidth: '220px' },
      }
    );
  };

  return (
    <div className="space-y-6 max-w-7xl">
      {/* Cabeçalho */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Lista de Solicitações</h1>
        <p className="text-sm text-slate-500 mt-1">
          Gerencie e resolva os pedidos de devolução.
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
      />

      {/* Área da Tabela */}
      <div>
        {/* Toggle Resolvido/Pendente (Pill) */}
        <div className="flex justify-end mb-4">
          <div className="inline-flex bg-slate-200/50 p-1 rounded-lg">
            <button
              onClick={() => setVerResolvidos(false)}
              className={`px-4 py-1.5 text-sm font-medium rounded-md transition-all ${
                !verResolvidos
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              Pendentes
            </button>
            <button
              onClick={() => setVerResolvidos(true)}
              className={`px-4 py-1.5 text-sm font-medium rounded-md transition-all ${
                verResolvidos
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              Resolvidos
            </button>
          </div>
        </div>

        {/* Lista */}
        <RecordsList
          dados={dados}
          loading={loading}
          onClickRow={setSelectedRecord}
          onToggleStatus={handleToggleStatus}
          showDelete={user?.perfil === 'ADMIN'}
          onDelete={handleDelete}
        />
      </div>

      {/* Modal */}
      <RecordDetailModal
        isOpen={!!selectedRecord}
        solicitacao={selectedRecord}
        onClose={() => setSelectedRecord(null)}
      />
    </div>
  );
}
