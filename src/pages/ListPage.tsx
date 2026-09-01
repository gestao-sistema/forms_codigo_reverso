import { useMemo, useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { useSolicitacoes } from '../hooks/useSolicitacoes';
import { isAdmin, type FiltrosSolicitacoes, type Solicitacao, type StatusSolicitacao } from '../types';
import { useAuth } from '../context/AuthContext';
import apiService from '../services/apiService';

import DashboardFilters, { type FiltrosState } from '../components/admin/DashboardFilters';
import RecordsList from '../components/admin/RecordsList';
import RecordDetailModal from '../components/admin/RecordDetailModal';

// Intervalo de polling (15s)
const POLLING_MS = 15_000;

type FiltroListaUI = 'pendentes' | 'concluidos' | 'todos';

export default function ListPage() {
  const { user } = useAuth();
  const searchParams = new URLSearchParams(window.location.search);
  const queryEmpresa = searchParams.get('empresa') as 'Alinare' | 'Novitah' | null;

  const temGeral = user?.telas.includes('lista-geral');
  const temAlinare = user?.telas.includes('lista-alinare');
  const temNovitah = user?.telas.includes('lista-novitah');

  let empresaFixa: 'Alinare' | 'Novitah' | null = null;
  if (!temGeral) {
    if (temAlinare && !temNovitah) empresaFixa = 'Alinare';
    if (temNovitah && !temAlinare) empresaFixa = 'Novitah';
  } else if (queryEmpresa && (queryEmpresa === 'Alinare' || queryEmpresa === 'Novitah')) {
    empresaFixa = queryEmpresa;
  }

  // ── Filtros globais (topo) ──
  const [filtros, setFiltros] = useState<FiltrosState>({
    empresa: empresaFixa ?? 'Ambas',
    dataInicio: '',
    dataFim: '',
    buscaCliente: '',
  });

  // ── Filtro local de status ──
  const [verFiltro, setVerFiltro] = useState<FiltroListaUI>('pendentes');

  // ── Modal de detalhe ──
  const [selectedRecord, setSelectedRecord] = useState<Solicitacao | null>(null);

  // Junta filtros da barra + toggle local
  const filtrosServico: FiltrosSolicitacoes = useMemo(() => {
    let statusFilter: StatusSolicitacao | StatusSolicitacao[] | undefined;
    if (verFiltro === 'pendentes') {
      statusFilter = ['pendente', 'etiqueta_gerada', 'postado'];
    } else if (verFiltro === 'concluidos') {
      statusFilter = 'concluido';
    }

    return {
      empresa: empresaFixa ?? filtros.empresa,
      dataInicio: filtros.dataInicio || undefined,
      dataFim: filtros.dataFim || undefined,
      status: statusFilter,
      buscaCliente: filtros.buscaCliente || undefined,
    };
  }, [filtros, verFiltro, empresaFixa]);

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

  return (
    <div className="space-y-6">
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
        {/* Toggle Filtro (Pill) */}
        <div className="flex justify-end mb-4">
          <div className="inline-flex bg-slate-200/50 p-1 rounded-lg">
            <button
              onClick={() => setVerFiltro('pendentes')}
              className={`px-4 py-1.5 text-sm font-medium rounded-md transition-all ${
                verFiltro === 'pendentes'
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              Ativos
            </button>
            <button
              onClick={() => setVerFiltro('concluidos')}
              className={`px-4 py-1.5 text-sm font-medium rounded-md transition-all ${
                verFiltro === 'concluidos'
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              Concluídos
            </button>
            <button
              onClick={() => setVerFiltro('todos')}
              className={`px-4 py-1.5 text-sm font-medium rounded-md transition-all ${
                verFiltro === 'todos'
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              Todos
            </button>
          </div>
        </div>

        {/* Lista */}
        <RecordsList
          dados={dados}
          loading={loading}
          onClickRow={setSelectedRecord}
          showDelete={user ? isAdmin(user) : false}
          onDelete={handleDelete}
          podeAgir={() => false}
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
