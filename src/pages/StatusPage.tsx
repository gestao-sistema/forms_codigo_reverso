import { useEffect, useState, useMemo, useRef, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import apiService from '../services/apiService';
import type { Solicitacao } from '../types';
import { Clock, CheckCircle2, Search, Filter, ChevronDown, ChevronUp } from 'lucide-react';

const POLLING_MS = 15_000;

export default function StatusPage() {
  const { user } = useAuth();
  const [solicitacoes, setSolicitacoes] = useState<Solicitacao[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [busca, setBusca] = useState('');
  const [filtroStatus, setFiltroStatus] = useState<'todos' | 'concluido' | 'andamento'>('todos');
  const [expandidoId, setExpandidoId] = useState<string | null>(null);
  const [ultimaAtualizacao, setUltimaAtualizacao] = useState<number>(Date.now());
  const [refreshing, setRefreshing] = useState(false);
  const mountedRef = useRef(true);

  const empresaFixa = user?.telas.includes('status')
    ? (user.telas.includes('dashboard-alinare') || user.telas.includes('formulario-alinare') || user.telas.includes('lista-alinare')
        ? 'Alinare'
        : user.telas.includes('dashboard-novitah') || user.telas.includes('formulario-novitah') || user.telas.includes('lista-novitah')
          ? 'Novitah'
          : undefined)
    : undefined;

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
      if (filtroStatus === 'concluido' && !s.resolvido) return false;
      if (filtroStatus === 'andamento' && s.resolvido) return false;

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

  const tema =
    empresaFixa === 'Alinare'
      ? { text: 'text-[#2B2D42]', ring: 'focus:ring-[#2B2D42]/30' }
      : { text: 'text-[#A67B7B]', ring: 'focus:ring-[#A67B7B]/30' };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className={`text-2xl font-bold ${tema.text}`}>Minhas Solicitações</h1>
          <p className="text-sm text-slate-500 mt-1">Acompanhe o status das solicitações enviadas</p>
        </div>
        <span className="text-xs text-slate-400 hidden sm:inline">
          {ultimaAtualizacaoLabel}
        </span>
      </div>

      <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 flex flex-col sm:flex-row gap-4">
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
        <div className="relative min-w-[180px]">
          <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <select
            value={filtroStatus}
            onChange={(e) => setFiltroStatus(e.target.value as any)}
            className={`w-full pl-9 pr-8 h-10 rounded-lg border border-slate-300 text-sm appearance-none cursor-pointer focus:outline-none focus:ring-2 focus:border-transparent ${tema.ring}`}
          >
            <option value="todos">Todos os status</option>
            <option value="andamento">Em andamento</option>
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
          {dadosFiltrados.map((item) => (
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
                  {item.resolvido ? (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      Concluído
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-amber-50 text-amber-700 border border-amber-200">
                      <Clock className="w-3.5 h-3.5" />
                      Em andamento
                    </span>
                  )}
                  {expandidoId === item.id ? (
                    <ChevronUp className="w-5 h-5 text-slate-400" />
                  ) : (
                    <ChevronDown className="w-5 h-5 text-slate-400" />
                  )}
                </div>
              </div>

              {expandidoId === item.id && (
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
          ))}
        </div>
      )}
    </div>
  );
}
