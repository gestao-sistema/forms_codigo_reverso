import { useMemo, useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import * as XLSX from 'xlsx';
import { Download } from 'lucide-react';
import { useSolicitacoes } from '../hooks/useSolicitacoes';
import { isAdmin, type FiltrosSolicitacoes, type Solicitacao, type StatusSolicitacao, STATUS_LABEL } from '../types';
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

  // ── Exportar XLSX ──
  const handleExportXlsx = async () => {
    try {
      // Busca base completa do grupo (sem filtros de status/data)
      const empresa = empresaFixa ?? filtros.empresa;
      const dadosExport = await apiService.getSolicitacoes({ empresa: empresa === 'Ambas' ? 'Ambas' : empresa });

      if (!dadosExport.length) {
        toast.error('Nenhum registro para exportar.');
        return;
      }

      const colunas: [keyof Solicitacao, string][] = [
        ['created_at', 'Criado em'],
        ['empresa', 'Empresa'],
        ['solicitante', 'Solicitante'],
        ['setor', 'Setor'],
        ['data_solicitacao', 'Data Solicitação'],
        ['codigo_cliente', 'Código Cliente'],
        ['nome_cliente', 'Nome Cliente'],
        ['motivo', 'Motivo'],
        ['justificativa_outros', 'Justificativa (Outros)'],
        ['autorizacao', 'Autorização'],
        ['status', 'Status'],
        ['etiqueta_gerada_em', 'Etiqueta Gerada'],
        ['postado_em', 'Postado'],
        ['em_transito_em', 'Em Trânsito'],
        ['concluido_em', 'Concluído'],
        ['codigo_rastreio', 'Código Rastreio'],
        ['ultima_cidade_rastreio', 'Última Cidade'],
        ['anotacoes', 'Anotações'],
      ];

      const rows = dadosExport.map((r) =>
        Object.fromEntries(
          colunas.map(([key, header]) => {
            let val = r[key] ?? '';
            if (key === 'status') val = STATUS_LABEL[r.status] ?? r.status;
            else if (typeof val === 'string' && /^\d{4}-\d{2}-\d{2}T/.test(val)) {
              val = new Date(val).toLocaleString('pt-BR', { timeZone: 'UTC' });
            }
            return [header, val];
          })
        )
      );

      const ws = XLSX.utils.json_to_sheet(rows);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Solicitações');
      XLSX.writeFile(wb, `reverso_${empresa}_${new Date().toISOString().slice(0, 10)}.xlsx`);
      toast.success('Arquivo exportado com sucesso.');
    } catch (err) {
      console.error(err);
      toast.error('Erro ao exportar. Tente novamente.');
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
        {/* Toggle Filtro (Pill) + Exportar */}
        <div className="flex flex-wrap items-center justify-end gap-3 mb-4">
          <button
            onClick={handleExportXlsx}
            className="inline-flex items-center gap-2 px-4 py-1.5 text-sm font-medium rounded-lg border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 hover:border-slate-400 transition-all cursor-pointer"
          >
            <Download className="w-4 h-4" />
            Exportar
          </button>
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
