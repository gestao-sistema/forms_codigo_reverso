import { useEffect, useState, useMemo, useRef, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import apiService from '../services/apiService';
import type { Solicitacao, StatusSolicitacao } from '../types';
import { STATUS_SOLICITACAO, STATUS_LABEL, proximoStatus, isAdmin } from '../types';
import { useSearchParams } from 'react-router-dom';
import {
  Clock,
  CheckCircle2,
  Tag,
  PackageCheck,
  ArrowRight,
  Filter,
  StickyNote,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { COR_EMPRESA } from '../services/analytics';
import RecordDetailModal from '../components/admin/RecordDetailModal';

const POLLING_MS = 15_000;

const STATUS_VISUAL: Record<
  StatusSolicitacao,
  { bg: string; headerBg: string; text: string; border: string; icon: typeof Clock }
> = {
  pendente: { bg: 'bg-amber-50/50', headerBg: 'bg-amber-100', text: 'text-amber-700', border: 'border-amber-200', icon: Clock },
  etiqueta_gerada: { bg: 'bg-blue-50/50', headerBg: 'bg-blue-100', text: 'text-blue-700', border: 'border-blue-200', icon: Tag },
  postado: { bg: 'bg-violet-50/50', headerBg: 'bg-violet-100', text: 'text-violet-700', border: 'border-violet-200', icon: PackageCheck },
  concluido: { bg: 'bg-emerald-50/50', headerBg: 'bg-emerald-100', text: 'text-emerald-700', border: 'border-emerald-200', icon: CheckCircle2 },
};

export default function KanbanPage() {
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const queryEmpresa = searchParams.get('empresa') as 'Alinare' | 'Novitah' | null;
  const [solicitacoes, setSolicitacoes] = useState<Solicitacao[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [selected, setSelected] = useState<Solicitacao | null>(null);
  const mountedRef = useRef(true);

  // Escopo de empresa (deriva das demais telas do usuário)
  const temGeral =
    user?.telas.includes('lista-geral') ||
    user?.telas.includes('status-geral') ||
    user?.telas.includes('dashboard-geral') ||
    user?.telas.includes('usuarios');
  const temAlinare =
    user?.telas.some((t) => t.includes('alinare'));
  const temNovitah =
    user?.telas.some((t) => t.includes('novitah'));

  let empresaFixa: 'Alinare' | 'Novitah' | null = null;
  if (!temGeral) {
    if (temAlinare && !temNovitah) empresaFixa = 'Alinare';
    if (temNovitah && !temAlinare) empresaFixa = 'Novitah';
  } else if (queryEmpresa && (queryEmpresa === 'Alinare' || queryEmpresa === 'Novitah')) {
    empresaFixa = queryEmpresa;
  }

  const carregar = useCallback(async (isPoll = false) => {
    if (!mountedRef.current) return;
    if (!isPoll) setIsLoading(true);
    try {
      const dados = await apiService.getSolicitacoes({ empresa: empresaFixa });
      if (mountedRef.current) setSolicitacoes(dados);
    } catch (err) {
      console.error(err);
    } finally {
      if (mountedRef.current) setIsLoading(false);
    }
  }, [empresaFixa]);

  useEffect(() => {
    mountedRef.current = true;
    carregar(false);
    const id = setInterval(() => carregar(true), POLLING_MS);
    return () => { mountedRef.current = false; clearInterval(id); };
  }, [carregar]);

  // Permissões de transição: expedição = lista-*; comercial puro = status-* sem lista-*;
  // admin pode tudo.
  const admin = user ? isAdmin(user) : false;
  const ehExpedicao = admin || user?.telas.some((t) => t.startsWith('lista-')) || false;
  const ehComercialPuro = admin || (
    user?.telas.some((t) => t.startsWith('status-')) &&
    !user?.telas.some((t) => t.startsWith('lista-'))
  ) || false;

  const podeAvancar = (status: StatusSolicitacao): boolean => {
    if (status === 'pendente' && ehExpedicao) return true;      // expedição: gerar etiqueta
    if (status === 'etiqueta_gerada' && ehComercialPuro) return true; // comercial: marcar postado
    if (status === 'postado' && ehExpedicao) return true;       // expedição: concluir
    return false;
  };

  const labelAcao = (status: StatusSolicitacao): string => {
    if (status === 'pendente') return 'Etiqueta Gerada';
    if (status === 'etiqueta_gerada') return 'Marcar postado';
    if (status === 'postado') return 'Concluir';
    return '';
  };

  const handleAvancar = async (id: string, status: StatusSolicitacao) => {
    const prox = proximoStatus(status);
    if (!prox) return;
    setUpdatingId(id);
    try {
      const payload: Partial<Solicitacao> = { status: prox };
      if (prox === 'etiqueta_gerada') payload.etiqueta_gerada_em = new Date().toISOString();
      if (prox === 'postado') payload.postado_em = new Date().toISOString();
      if (prox === 'concluido') payload.concluido_em = new Date().toISOString();

      await apiService.updateSolicitacao(id, payload);
      toast.success(`Movido para ${STATUS_LABEL[prox]}`);
      await carregar(true);
    } catch (err) {
      console.error(err);
      toast.error('Erro ao atualizar status.');
    } finally {
      setUpdatingId(null);
    }
  };

  const colunas = useMemo(() => {
    const map: Record<StatusSolicitacao, Solicitacao[]> = {
      pendente: [],
      etiqueta_gerada: [],
      postado: [],
      concluido: [],
    };
    solicitacoes.forEach((s) => {
      const resolvidoAntigo = (s as any).resolvido;
      const statusReal = s.status || (resolvidoAntigo ? 'concluido' : 'pendente');
      if (map[statusReal]) map[statusReal].push(s);
    });
    return map;
  }, [solicitacoes]);

  return (
    <div className="flex flex-col h-[calc(100dvh-5.5rem)] sm:h-[calc(100dvh-6.5rem)] lg:h-[calc(100vh-4rem)] gap-4 min-h-0">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 shrink-0">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Kanban</h1>
          <p className="text-sm text-slate-500 mt-1">Visão geral do fluxo de solicitações</p>
        </div>
        {temGeral && (
          <div className="relative sm:min-w-[160px]">
            <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <select
              value={empresaFixa ?? 'Ambas'}
              onChange={(e) => {
                const val = e.target.value;
                setSearchParams(val === 'Ambas' ? {} : { empresa: val });
              }}
              className="w-full pl-9 pr-8 h-10 rounded-lg border border-slate-300 text-sm appearance-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-transparent"
            >
              <option value="Ambas">Todas empresas</option>
              <option value="Alinare">Alinare</option>
              <option value="Novitah">Novitah</option>
            </select>
          </div>
        )}
      </div>

      {isLoading ? (
        <div className="text-center py-12 text-slate-400">Carregando...</div>
      ) : (
        <div className="flex gap-4 overflow-x-auto pb-4 flex-1 min-h-0">
          {STATUS_SOLICITACAO.map((status) => {
            const vis = STATUS_VISUAL[status];
            const Icon = vis.icon;
            const items = colunas[status];

            return (
              <div
                key={status}
                className={`shrink-0 w-72 sm:w-80 rounded-xl border ${vis.border} ${vis.bg} flex flex-col h-full min-h-0`}
              >
                {/* Header coluna */}
                <div className={`px-4 py-3 rounded-t-xl ${vis.headerBg} flex items-center justify-between shrink-0`}>
                  <div className={`flex items-center gap-2 font-semibold text-sm ${vis.text}`}>
                    <Icon className="w-4 h-4" />
                    {STATUS_LABEL[status]}
                  </div>
                  <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${vis.text} bg-white/60`}>
                    {items.length}
                  </span>
                </div>

                {/* Cards */}
                <div className="flex-1 overflow-y-auto p-3 space-y-3 min-h-0">
                  {items.length === 0 ? (
                    <p className="text-xs text-slate-400 text-center py-4">Nenhuma solicitação</p>
                  ) : (
                    items.map((item) => (
                      <div
                        key={item.id}
                        onClick={() => setSelected(item)}
                        className="bg-white rounded-lg border border-slate-200 p-3 shadow-sm space-y-2
                          cursor-pointer hover:border-slate-300 hover:shadow transition-all"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-medium text-sm text-slate-900 truncate">
                            {item.nome_cliente}
                          </span>
                          <span className="text-xs px-1.5 py-0.5 rounded bg-slate-100 text-slate-500 font-mono shrink-0">
                            #{item.codigo_cliente}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span
                            className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold text-white"
                            style={{ backgroundColor: COR_EMPRESA[item.empresa] }}
                          >
                            {item.empresa}
                          </span>
                          <span className="text-xs text-slate-500 truncate">{item.motivo}</span>
                        </div>
                        <div className="flex items-center justify-between text-xs text-slate-400">
                          <span>
                            {new Date(item.data_solicitacao).toLocaleDateString('pt-BR', { timeZone: 'UTC' })}
                          </span>
                          {item.anotacoes && (
                            <span className="inline-flex items-center gap-1 text-amber-500" title="Possui anotações">
                              <StickyNote className="w-3 h-3" />
                            </span>
                          )}
                        </div>

                        {podeAvancar(status) && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleAvancar(item.id, status);
                            }}
                            disabled={updatingId === item.id}
                            className="w-full mt-1 flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium
                              bg-slate-900 text-white hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                          >
                            {updatingId === item.id ? 'Atualizando...' : labelAcao(status)}
                            {updatingId !== item.id && <ArrowRight className="w-3 h-3" />}
                          </button>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal de detalhes (clique no card) */}
      <RecordDetailModal
        isOpen={!!selected}
        solicitacao={selected}
        onClose={() => {
          setSelected(null);
          carregar(true); // puxa anotações atualizadas
        }}
      />
    </div>
  );
}
