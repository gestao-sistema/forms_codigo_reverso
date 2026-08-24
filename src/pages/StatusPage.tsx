import { useEffect, useState, useMemo, useRef, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import apiService from '../services/apiService';
import type { Solicitacao, StatusSolicitacao } from '../types';
import { STATUS_LABEL } from '../types';
import { useSearchParams } from 'react-router-dom';
import {
  Clock,
  CheckCircle2,
  Search,
  Filter,
  ChevronDown,
  ChevronUp,
  Tag,
  PackageCheck,
} from 'lucide-react';

const POLLING_MS = 15_000;

/** Mapa visual de cada status. */
const STATUS_VISUAL: Record<
  StatusSolicitacao,
  { bg: string; text: string; border: string; icon: typeof Clock; label: string }
> = {
  pendente: {
    bg: 'bg-amber-50',
    text: 'text-amber-700',
    border: 'border-amber-200',
    icon: Clock,
    label: 'Pendente',
  },
  etiqueta_gerada: {
    bg: 'bg-blue-50',
    text: 'text-blue-700',
    border: 'border-blue-200',
    icon: Tag,
    label: 'Etiqueta Gerada',
  },
  postado: {
    bg: 'bg-violet-50',
    text: 'text-violet-700',
    border: 'border-violet-200',
    icon: PackageCheck,
    label: 'Postado',
  },
  concluido: {
    bg: 'bg-emerald-50',
    text: 'text-emerald-700',
    border: 'border-emerald-200',
    icon: CheckCircle2,
    label: 'Concluído',
  },
};

type FiltroStatusUI = 'todos' | StatusSolicitacao;

export default function StatusPage() {
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const queryEmpresa = searchParams.get('empresa') as 'Alinare' | 'Novitah' | null;
  const [solicitacoes, setSolicitacoes] = useState<Solicitacao[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [busca, setBusca] = useState('');
  const [filtroStatus, setFiltroStatus] = useState<FiltroStatusUI>('todos');
  const [expandidoId, setExpandidoId] = useState<string | null>(null);
  const [ultimaAtualizacao, setUltimaAtualizacao] = useState<number>(Date.now());
  const [refreshing, setRefreshing] = useState(false);
  const mountedRef = useRef(true);

  // Permissão pelas telas de status específicas
  const temStatusGeral = user?.telas.includes('status-geral');
  const temStatusAlinare = user?.telas.includes('status-alinare');
  const temStatusNovitah = user?.telas.includes('status-novitah');

  // Escopo fixo: quem só tem status de UMA empresa fica travado nela.
  let empresaFixa: 'Alinare' | 'Novitah' | null = null;
  if (!temStatusGeral) {
    if (temStatusAlinare && !temStatusNovitah) empresaFixa = 'Alinare';
    if (temStatusNovitah && !temStatusAlinare) empresaFixa = 'Novitah';
  } else if (queryEmpresa && (queryEmpresa === 'Alinare' || queryEmpresa === 'Novitah')) {
    // Quem tem status-geral respeita query param ?empresa=
    empresaFixa = queryEmpresa;
  }

  const carregar = useCallback(async (isPoll = false) => {
    if (!mountedRef.current) return;
    if (isPoll) setRefreshing(true);
    else setIsLoading(true);
    try {
      const dados = await apiService.getSolicitacoes({ empresa: empresaFixa });
      if (mountedRef.current) {
        setSolicitacoes(dados);
        setUltimaAtualizacao(Date.now());
      }
    } catch (err) {
      console.error(err);
    } finally {
      if (mountedRef.current) {
        setIsLoading(false);
        setRefreshing(false);
      }
    }
  }, [empresaFixa]);

  useEffect(() => {
    mountedRef.current = true;
    carregar(false);

    const id = setInterval(() => carregar(true), POLLING_MS);
    return () => {
      mountedRef.current = false;
      clearInterval(id);
    };
  }, [carregar]);

  // Tick para mostrar "atualizado há Xs"
  const [, setTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 1000);
    return () => clearInterval(id);
  }, []);

  const segundosAtras = Math.floor((Date.now() - ultimaAtualizacao) / 1000);
  const ultimaAtualizacaoLabel =
    segundosAtras < 5 ? 'Atualizado agora' : `Atualizado há ${segundosAtras}s`;

  const dadosFiltrados = useMemo(() => {
    return solicitacoes.filter((s) => {
      if (filtroStatus !== 'todos' && s.status !== filtroStatus) return false;

      if (busca) {
        const termo = busca.toLowerCase();
        const matches =
          s.nome_cliente.toLowerCase().includes(termo) ||
          s.codigo_cliente.toString().includes(termo) ||
          s.motivo.toLowerCase().includes(termo) ||
          s.solicitante.toLowerCase().includes(termo);
        if (!matches) return false;
      }
      return true;
    });
  }, [solicitacoes, busca, filtroStatus]);

  const toggleExpandir = (id: string) => {
    setExpandidoId(prev => prev === id ? null : id);
  };

  // Cores por empresa
  const tema =
    empresaFixa === 'Alinare'
      ? { bg: 'bg-[#2B2D42]/10', border: 'border-[#2B2D42]/20', text: 'text-[#2B2D42]', ring: 'focus:ring-[#2B2D42]/30', badge: 'bg-[#2B2D42]/10 text-[#2B2D42] border-[#2B2D42]/20' }
      : empresaFixa === 'Novitah'
        ? { bg: 'bg-[#A67B7B]/10', border: 'border-[#A67B7B]/20', text: 'text-[#A67B7B]', ring: 'focus:ring-[#A67B7B]/30', badge: 'bg-[#A67B7B]/10 text-[#A67B7B] border-[#A67B7B]/20' }
        : { bg: 'bg-slate-100', border: 'border-slate-200', text: 'text-slate-700', ring: 'focus:ring-blue-500/30', badge: 'bg-slate-100 text-slate-700 border-slate-200' };

  // Rótulo da view para o header
  const viewLabel = empresaFixa ? `Status — ${empresaFixa}` : 'Status — Ambas';

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header com identificação da empresa */}
      <div className={`rounded-xl border p-4 ${tema.bg} ${tema.border}`}>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className={`text-2xl font-bold ${tema.text}`}>Minhas Solicitações</h1>
            <p className="text-sm text-slate-500 mt-1">Acompanhe o status das solicitações enviadas</p>
          </div>
          <div className="flex items-center gap-3">
            <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium border ${tema.badge}`}>
              {viewLabel}
            </span>
            <span className="text-xs text-slate-400 hidden sm:inline">
              {ultimaAtualizacaoLabel}
            </span>
          </div>
        </div>
      </div>

      <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 grid grid-cols-1 sm:flex sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Buscar por cliente, código, motivo..."
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            className={`w-full pl-9 pr-4 h-10 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:border-transparent ${tema.ring}`}
          />
        </div>

        {/* Seletor de empresa — só aparece pra quem tem status-geral (pode ver ambas) */}
        {temStatusGeral && (
          <div className="relative sm:min-w-[160px]">
            <label htmlFor="status-empresa" className="sr-only">Empresa</label>
            <select
              id="status-empresa"
              value={empresaFixa ?? 'Ambas'}
              onChange={(e) => {
                const val = e.target.value;
                setSearchParams(val === 'Ambas' ? {} : { empresa: val });
              }}
              className={`w-full pl-3 pr-8 h-10 rounded-lg border border-slate-300 text-sm appearance-none cursor-pointer focus:outline-none focus:ring-2 focus:border-transparent ${tema.ring}`}
            >
              <option value="Ambas">Ambas</option>
              <option value="Alinare">Alinare</option>
              <option value="Novitah">Novitah</option>
            </select>
            <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6"/></svg>
            </div>
          </div>
        )}

        <div className="relative sm:min-w-[200px]">
          <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <select
            value={filtroStatus}
            onChange={(e) => setFiltroStatus(e.target.value as FiltroStatusUI)}
            className={`w-full pl-9 pr-8 h-10 rounded-lg border border-slate-300 text-sm appearance-none cursor-pointer focus:outline-none focus:ring-2 focus:border-transparent ${tema.ring}`}
          >
            <option value="todos">Todos os status</option>
            <option value="pendente">Pendente</option>
            <option value="etiqueta_gerada">Etiqueta Gerada</option>
            <option value="postado">Postado</option>
            <option value="concluido">Concluído</option>
          </select>
          <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6"/></svg>
          </div>
        </div>
      </div>

      {isLoading ? (
        <div className="text-center py-12 text-slate-400">Carregando solicitações...</div>
      ) : dadosFiltrados.length === 0 ? (
        <div className="bg-white rounded-xl p-8 text-center text-slate-500 border border-slate-200 shadow-sm">
          Nenhuma solicitação encontrada para os filtros selecionados.
        </div>
      ) : (
        <div className="grid gap-4">
          {dadosFiltrados.map((item) => {
            // FALLBACK: se migration do banco ainda não rodou, mapeia o `resolvido` booleano antigo
            const resolvidoAntigo = (item as any).resolvido;
            const statusReal = item.status || (resolvidoAntigo ? 'concluido' : 'pendente');
            const vis = STATUS_VISUAL[statusReal] || STATUS_VISUAL['pendente'];
            const Icon = vis.icon;
            const isExpanded = expandidoId === item.id;

            return (
              <div
                key={item.id}
                onClick={() => toggleExpandir(item.id)}
                className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden cursor-pointer hover:border-slate-300 transition-colors"
              >
                <div className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-slate-900">{item.nome_cliente}</span>
                      <span className="text-xs px-2 py-0.5 rounded bg-slate-100 text-slate-600 font-mono">
                        #{item.codigo_cliente}
                      </span>
                    </div>
                    <p className="text-sm text-slate-600">
                      <strong className="font-medium text-slate-700">Motivo:</strong> {item.motivo}
                    </p>
                    <div className="text-xs text-slate-400 flex items-center gap-3 pt-1">
                      <span>Data: {new Date(item.data_solicitacao).toLocaleDateString('pt-BR', { timeZone: 'UTC' })}</span>
                      <span>•</span>
                      <span>Setor: {item.setor}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 self-start sm:self-center shrink-0">
                    <span
                      className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium ${vis.bg} ${vis.text} border ${vis.border}`}
                    >
                      <Icon className="w-3.5 h-3.5" />
                      {vis.label}
                    </span>
                    {isExpanded ? (
                      <ChevronUp className="w-5 h-5 text-slate-400" />
                    ) : (
                      <ChevronDown className="w-5 h-5 text-slate-400" />
                    )}
                  </div>
                </div>

                {isExpanded && (
                  <div className="px-5 pb-5 pt-2 border-t border-slate-100 bg-slate-50/50">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-4 gap-x-8 text-sm">
                      <div>
                        <span className="block text-xs font-medium text-slate-400 uppercase tracking-wider mb-1">Solicitante</span>
                        <span className="text-slate-700">{item.solicitante}</span>
                      </div>
                      <div>
                        <span className="block text-xs font-medium text-slate-400 uppercase tracking-wider mb-1">Autorização</span>
                        <span className="text-slate-700">{item.autorizacao}</span>
                      </div>
                      <div className="sm:col-span-2">
                        <span className="block text-xs font-medium text-slate-400 uppercase tracking-wider mb-1">Endereço de Postagem</span>
                        <span className="text-slate-700">{item.endereco_postagem}</span>
                      </div>
                      {item.motivo === 'Outros' && item.justificativa_outros && (
                        <div className="sm:col-span-2">
                          <span className="block text-xs font-medium text-slate-400 uppercase tracking-wider mb-1">Justificativa</span>
                          <span className="text-slate-700 italic">"{item.justificativa_outros}"</span>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
