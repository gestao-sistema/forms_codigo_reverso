// ── Modal de Detalhes da Solicitação ─────────────────────────────────────────
import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { X, Timer, Calendar, User, Package, MapPin, Building2, StickyNote, History, Truck, RefreshCw, CheckCircle2, ChevronDown, Trash2 } from 'lucide-react';
import type { Solicitacao, SolicitacaoHistorico, RastreamentoCorreios } from '../../types';
import { STATUS_LABEL } from '../../types';
import { formatarTempo } from '../../services/analytics';
import apiService from '../../services/apiService';
import { useAuth } from '../../context/AuthContext';

interface RecordDetailModalProps {
  isOpen: boolean;
  solicitacao: Solicitacao | null;
  onClose: () => void;
}

/** Monta linha de status por evento (mesma cor do Kanban). */
function corEvento(codigo: string | undefined): string {
  if (!codigo) return 'text-slate-400';
  if (codigo === 'PO') return 'text-violet-500';
  if (codigo === 'RO' || codigo === 'OEC') return 'text-orange-500';
  if (codigo === 'BDE') return 'text-emerald-500';
  return 'text-slate-500';
}

/** Remove ruído do detalhe do evento (pesquisa de satisfação, links, etc). */
function limparDetalhe(detalhe: string | undefined | null): string | null {
  if (!detalhe) return null;
  const limpo = detalhe
    .replace(/https?:\/\/\S+/g, '') // links (survey etc)
    .replace(/Sua opinião é importante.*$/is, '')
    .replace(/avaliar o serviço.*$/is, '')
    .replace(/\s{2,}/g, ' ')
    .trim();
  return limpo || null;
}

interface EventoApi {
  codigo?: string;
  descricao?: string;
  dtHrCriado?: string;
  detalhe?: string;
  unidade?: { tipo?: string; nome?: string; endereco?: { cidade?: string; uf?: string; logradouro?: string; bairro?: string } };
  unidadeDestino?: { tipo?: string; endereco?: { cidade?: string; uf?: string } };
}

/** Componente do retorno da API: resumo em chips + collapse "Mais detalhes" com timeline limpa. */
function RetornoResumo({ retorno, onUpdate }: { retorno: any; onUpdate: () => Promise<any> }) {
  const [detailsOpen, setDetailsOpen] = useState(false);
  const objeto = retorno?.objetos?.[0];

  // Auto-refresh ao abrir o collapse (só quando muda o estado de aberto)
  useEffect(() => {
    if (detailsOpen) onUpdate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [detailsOpen]);

  // Casos de erro/mensagem (SRO-009, SRO-020 etc) — sem timeline
  if (!objeto || objeto.mensagem) {
    return (
      <div className="mt-4 pt-4 border-t border-slate-200">
        <div className="flex items-start gap-2 px-3 py-2 rounded-lg bg-amber-50 border border-amber-100">
          <Package className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
          <span className="text-xs text-amber-700 font-medium">
            {objeto?.mensagem ?? retorno?.erro ?? 'Sem retorno dos Correios.'}
          </span>
        </div>
      </div>
    );
  }

  const eventos: EventoApi[] = objeto.eventos ?? [];
  const ultimo = eventos[0];

  const chips: { label: string; value: string }[] = [];
  if (objeto.tipoPostal?.categoria) chips.push({ label: 'Serviço', value: objeto.tipoPostal.categoria });
  if (objeto.dtPrevista) chips.push({ label: 'Previsão', value: new Date(objeto.dtPrevista).toLocaleDateString('pt-BR') });
  if (objeto.peso) chips.push({ label: 'Peso', value: `${objeto.peso} kg` });
  if (objeto.valorDeclarado) chips.push({ label: 'Valor declarado', value: `R$ ${objeto.valorDeclarado.toFixed(2)}` });

  return (
    <div className="mt-4 pt-4 border-t border-slate-200">
      {/* Última movimentação + chips de dados úteis */}
      {ultimo && (
        <>
          <p className={`text-sm font-semibold mb-2 ${corEvento(ultimo.codigo)}`}>
            {ultimo.descricao}
          </p>
          <div className="flex flex-wrap gap-1.5 mb-3">
            {chips.map((c) => (
              <span key={c.label} className="px-2 py-0.5 rounded-full bg-white border border-slate-200 text-xs text-slate-600">
                <span className="text-slate-400">{c.label}:</span> {c.value}
              </span>
            ))}
          </div>
        </>
      )}

      {/* Colapsável com timeline completa e limpa */}
      <details className="group" open={detailsOpen} onToggle={(e) => setDetailsOpen(e.currentTarget.open)}>
        <summary className="inline-flex items-center gap-1 text-xs font-medium text-blue-600 cursor-pointer select-none list-none hover:text-blue-700 min-h-[32px] focus:outline-none">
          <ChevronDown className="w-3.5 h-3.5 transition-transform group-open:rotate-180" />
          Mais detalhes
        </summary>
        <ul className="ml-2 mt-3 max-h-72 overflow-y-auto pr-1">
          {eventos.map((ev, i) => {
            const detalhe = limparDetalhe(ev.detalhe);
            const local = [ev.unidade?.endereco?.cidade, ev.unidade?.endereco?.uf].filter(Boolean).join('/');
            const destino = [ev.unidadeDestino?.endereco?.cidade, ev.unidadeDestino?.endereco?.uf].filter(Boolean).join('/');
            return (
              <li key={i} className="relative pl-8 pb-6 before:absolute before:left-[7px] before:top-3 before:bottom-0 before:w-[2px] before:bg-slate-200 before:content-[''] last:before:hidden">
                <span className={`absolute left-0 top-1.5 w-4 h-4 rounded-full border-2 border-white flex items-center justify-center z-10 ${i === 0 ? 'bg-blue-500' : 'bg-slate-300'}`}>
                  {i === 0 && <span className="w-1.5 h-1.5 rounded-full bg-white" />}
                </span>
                <div className="pl-1">
                  <p className={`text-sm ${i === 0 ? 'font-medium text-slate-900' : 'text-slate-700'}`}>{ev.descricao}</p>
                  <p className="text-xs text-slate-400">
                    {ev.dtHrCriado ? new Date(ev.dtHrCriado).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' }) : ''}
                  </p>
                  {detalhe && <p className="text-xs text-slate-500 mt-0.5">{detalhe}</p>}
                  {local && <p className="text-xs text-slate-500">{ev.unidade?.tipo ? `${ev.unidade.tipo} — ` : ''}{local}</p>}
                  {destino && <p className="text-xs text-slate-400">→ {destino}</p>}
                </div>
              </li>
            );
          })}
          {eventos.length === 0 && <li className="text-xs text-slate-400">Aguardando primeiro registro nos Correios.</li>}
        </ul>
      </details>
    </div>
  );
}

export default function RecordDetailModal({
  isOpen,
  solicitacao,
  onClose,
}: RecordDetailModalProps) {
  const { user } = useAuth();
  const [anotacoes, setAnotacoes] = useState('');
  const [salvandoAnot, setSalvandoAnot] = useState(false);
  const [codigoRastreio, setCodigoRastreio] = useState('');
  const [salvandoRastreio, setSalvandoRastreio] = useState(false);
  const [atualizandoRastreio, setAtualizandoRastreio] = useState(false);
  const [historico, setHistorico] = useState<SolicitacaoHistorico[]>([]);
  const [carregandoHist, setCarregandoHist] = useState(false);
  const [rastreio, setRastreio] = useState<RastreamentoCorreios | null>(null);
  const [carregandoRastreio, setCarregandoRastreio] = useState(false);
  const [retornoApi, setRetornoApi] = useState<any | null>(null);

  // Sincroniza campos quando abre/troca de registro
  useEffect(() => {
    setAnotacoes(solicitacao?.anotacoes ?? '');
    setCodigoRastreio(solicitacao?.codigo_rastreio ?? '');
    setRastreio(null);
    setRetornoApi(null);
  }, [solicitacao?.id, solicitacao?.anotacoes, solicitacao?.codigo_rastreio]);

  // Busca histórico quando o modal abre
  useEffect(() => {
    if (!isOpen || !solicitacao?.id) return;
    let montado = true;
    setCarregandoHist(true);
    apiService
      .getHistorico(solicitacao.id)
      .then((h) => { if (montado) setHistorico(h); })
      .catch(() => { if (montado) setHistorico([]); })
      .finally(() => { if (montado) setCarregandoHist(false); });
    return () => { montado = false; };
  }, [isOpen, solicitacao?.id]);

  // Busca rastreio do pacote quando há código (e dispara consulta viva)
  useEffect(() => {
    if (!isOpen || !solicitacao?.codigo_rastreio) return;
    let montado = true;
    setCarregandoRastreio(true);
    apiService
      .getRastreio(solicitacao.codigo_rastreio)
      .then((r) => { if (montado) setRastreio(r); })
      .catch(() => { if (montado) setRastreio(null); })
      .finally(() => { if (montado) setCarregandoRastreio(false); });
    // Consulta viva: refaz a chamada à API para manter dados atuais (exceto se já concluído)
    if (solicitacao.status !== 'concluido') {
      apiService
        .atualizarRastreio(solicitacao.codigo_rastreio)
        .then((raw) => { if (montado) { setRetornoApi(raw); return apiService.getRastreio(solicitacao.codigo_rastreio as string); } })
        .then((r) => { if (montado && r) setRastreio(r); })
        .catch(() => {});
    }
    return () => { montado = false; };
  }, [isOpen, solicitacao?.codigo_rastreio, solicitacao?.status]);

  // Fechar com tecla esc
  useEffect(() => {
    if (!isOpen) return;
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleEsc);
    document.body.style.overflow = 'hidden';

    return () => {
      window.removeEventListener('keydown', handleEsc);
      document.body.style.overflow = '';
    };
  }, [isOpen, onClose]);

  if (!isOpen || !solicitacao) return null;

  /** Salva anotações no banco. */
  const salvarAnotacoes = async () => {
    setSalvandoAnot(true);
    try {
      await apiService.updateSolicitacao(
        solicitacao.id,
        { anotacoes: anotacoes.trim() || null },
        user
      );
      solicitacao.anotacoes = anotacoes.trim() || null;
      toast.success('Anotações salvas.');
      const h = await apiService.getHistorico(solicitacao.id);
      setHistorico(h);
    } catch {
      toast.error('Erro ao salvar anotações.');
    } finally {
      setSalvandoAnot(false);
    }
  };

  /** Salva código de rastreio no banco e dispara consulta imediata. */
  const salvarRastreio = async () => {
    setSalvandoRastreio(true);
    try {
      const codigoStr = codigoRastreio.trim() || '';
      await apiService.salvarCodigoRastreio(solicitacao.id, codigoStr, user);
      solicitacao.codigo_rastreio = codigoStr;
      const h = await apiService.getHistorico(solicitacao.id);
      setHistorico(h);

      // Dispara consulta imediata e mostra retorno
      try {
        const raw = await apiService.atualizarRastreio(codigoStr);
        setRetornoApi(raw);
        // Recarrega rastreio processado (que já deve ter sido salvo no BD pela Edge)
        const r = await apiService.getRastreio(codigoStr);
        setRastreio(r);
        toast.success('Código salvo e rastreio consultado.');
      } catch (e) {
        setRetornoApi({ erro: (e as Error).message });
      }
    } catch (err: any) {
      toast.error(err.message || 'Erro ao salvar código de rastreio.');
    } finally {
      setSalvandoRastreio(false);
    }
  };

  /** Remove o código de rastreio (libera o pacote e limpa dados do correios) */
  const apagarRastreio = async () => {
    if (!window.confirm('Tem certeza que deseja apagar o código de rastreio e desvinculá-lo deste pacote?')) return;

    setSalvandoRastreio(true);
    try {
      await apiService.removerCodigoRastreio(solicitacao.id, user);
      solicitacao.codigo_rastreio = null;
      setCodigoRastreio('');
      setRetornoApi(null);
      setRastreio(null);
      const h = await apiService.getHistorico(solicitacao.id);
      setHistorico(h);
      toast.success('Código de rastreio removido.');
    } catch (err: any) {
      toast.error(err.message || 'Erro ao remover código.');
    } finally {
      setSalvandoRastreio(false);
    }
  };

  /** Consulta o rastreio na hora (chama Edge Function + recarrega). Silencioso: sem toast. */
  const atualizarRastreio = async () => {
    if (!solicitacao.codigo_rastreio) return;
    if (solicitacao.status === 'concluido') return; // não gasta cota de API se já entregue

    setAtualizandoRastreio(true);
    try {
      const raw = await apiService.atualizarRastreio(solicitacao.codigo_rastreio);
      setRetornoApi(raw);
      const r = await apiService.getRastreio(solicitacao.codigo_rastreio);
      setRastreio(r);
    } catch (e) {
      setRetornoApi({ erro: (e as Error).message });
    } finally {
      setAtualizandoRastreio(false);
    }
  };

  const bgEmpresa =
    solicitacao.empresa === 'Alinare' ? 'bg-[#2B2D42]' : 'bg-[#A67B7B]';

  // Formatadores
  const formatDate = (dateStr: string) => {
    const [y, m, d] = dateStr.split('-');
    return `${d}/${m}/${y}`;
  };

  const formatDateTime = (isoStr: string) => {
    const d = new Date(isoStr);
    return new Intl.DateTimeFormat('pt-BR', {
      dateStyle: 'short',
      timeStyle: 'short',
    }).format(d);
  };

  const FieldInfo = ({ label, value, bg = false }: { label: string; value: string | number; bg?: boolean }) => (
    <div className={`p-3 rounded-lg ${bg ? 'bg-slate-50' : ''}`}>
      <span className="block text-xs font-medium text-slate-500 uppercase tracking-tight mb-1">
        {label}
      </span>
      <span className="block text-sm font-medium text-slate-900">{value}</span>
    </div>
  );

  const eventos = rastreio?.eventos ?? [];
  const temCodigo = !!solicitacao.codigo_rastreio;
  const ultimoEvento = eventos[0];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm transition-opacity"
      aria-modal="true"
      role="dialog"
      onClick={onClose}
    >
      <div
        className="w-full max-w-2xl bg-white rounded-2xl shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header com cor da empresa */}
        <div className="flex items-start justify-between px-6 py-5 border-b border-slate-100">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <span className={`px-2.5 py-1 rounded-full text-xs font-semibold text-white ${bgEmpresa}`}>
                {solicitacao.empresa}
              </span>
              <span
                className={`px-2.5 py-1 rounded-full text-xs font-semibold ${
                  solicitacao.status === 'concluido'
                    ? 'bg-emerald-100 text-emerald-700'
                    : solicitacao.status === 'em_transito'
                      ? 'bg-orange-100 text-orange-700'
                      : 'bg-amber-100 text-amber-700'
                }`}
              >
                {STATUS_LABEL[solicitacao.status] ?? 'Pendente'}
              </span>
            </div>
            <h2 className="text-lg font-bold text-slate-800">
              Detalhes da Solicitação
            </h2>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 -mr-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
            aria-label="Fechar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Corpo scrollable */}
        <div className="p-6 max-h-[70vh] overflow-y-auto">
          {/* Seção 1: Origem interna */}
          <div className="mb-6">
            <h3 className="flex items-center gap-2 text-sm font-semibold text-slate-800 mb-3">
              <Building2 className="w-4 h-4 text-slate-400" /> Origem
            </h3>
            <div className="grid grid-cols-2 gap-2">
              <FieldInfo label="Solicitante" value={solicitacao.solicitante} bg />
              <FieldInfo label="Setor" value={solicitacao.setor} bg />
              <FieldInfo label="Autorizador" value={solicitacao.autorizacao} bg />
              <FieldInfo label="Preenchimento" value={formatarTempo(solicitacao.tempo_preenchimento_segundos)} bg />
            </div>
          </div>

          {/* Seção 2: Dados da Cliente */}
          <div className="mb-6">
            <h3 className="flex items-center gap-2 text-sm font-semibold text-slate-800 mb-3">
              <User className="w-4 h-4 text-slate-400" /> Dados da Cliente
            </h3>
            <div className="grid grid-cols-2 gap-2 mb-2">
              <FieldInfo label="Cód. Cliente" value={solicitacao.codigo_cliente} />
              <FieldInfo label="Nome Cliente" value={solicitacao.nome_cliente} />
            </div>
            <div className="pl-3">
              <span className="block text-xs font-medium text-slate-500 uppercase tracking-tight mb-1">
                Endereço de Postagem
              </span>
              <div className="flex items-start gap-2 max-w-full">
                <MapPin className="w-4 h-4 mt-0.5 text-slate-300 shrink-0" />
                <span className="text-sm font-medium text-slate-900 break-words">
                  {solicitacao.endereco_postagem}
                </span>
              </div>
            </div>
          </div>

          {/* Seção 3: Problema/Motivo */}
          <div className="mb-6">
            <h3 className="flex items-center gap-2 text-sm font-semibold text-slate-800 mb-3">
              <Package className="w-4 h-4 text-slate-400" /> Motivo da Devolução
            </h3>
            <div className="bg-slate-50 border border-slate-100 rounded-xl p-4">
              <span className="inline-block px-3 py-1 rounded bg-white border border-slate-200 text-sm font-semibold text-slate-800 mb-3">
                {solicitacao.motivo}
              </span>

              {solicitacao.motivo === 'Outros' && solicitacao.justificativa_outros && (
                <div className="mt-1 border-l-2 border-slate-300 pl-3">
                  <span className="block text-xs font-medium text-slate-500 uppercase mb-1">Justificativa</span>
                  <p className="text-sm text-slate-700 italic">
                    "{solicitacao.justificativa_outros}"
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Seção 4: Rastreamento */}
          {['etiqueta_gerada', 'postado', 'em_transito', 'concluido'].includes(solicitacao.status) && (
            <div className="mb-6">
              <h3 className="flex items-center gap-2 text-sm font-semibold text-slate-800 mb-3">
                <Truck className="w-4 h-4 text-slate-400" /> Rastreamento Correios
              </h3>
              <div className="bg-slate-50 border border-slate-100 rounded-xl p-4">
                <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
                  <input
                    type="text"
                    value={codigoRastreio}
                    onChange={(e) => setCodigoRastreio(e.target.value.toUpperCase())}
                    placeholder="Ex: AA123456789BR"
                    aria-label="Código de rastreio"
                    className="flex-1 px-3 py-2 rounded-lg border border-slate-300 bg-white text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                  />
                  <button
                    type="button"
                    onClick={salvarRastreio}
                    disabled={salvandoRastreio || codigoRastreio === (solicitacao.codigo_rastreio ?? '')}
                    className="w-full sm:w-auto px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors min-h-[38px]"
                  >
                    {salvandoRastreio ? 'Salvando...' : 'Salvar Código'}
                  </button>
                  {temCodigo && (
                    <button
                      type="button"
                      onClick={apagarRastreio}
                      disabled={salvandoRastreio}
                      title="Apagar código de rastreio"
                      className="p-2 rounded-lg border border-red-200 text-red-500 hover:bg-red-50 hover:border-red-300 disabled:opacity-40 disabled:cursor-not-allowed transition-colors min-h-[38px] min-w-[38px] flex items-center justify-center"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>

                {/* Resumo processado + colapsável "Mais detalhes" do retorno da API */}
                {retornoApi && <RetornoResumo retorno={retornoApi} onUpdate={atualizarRastreio} />}

                {temCodigo && (
                  <div className="mt-4 pt-4 border-t border-slate-200">
                    <div className="mb-2">
                      <span className="text-xs font-medium text-slate-500 uppercase tracking-tight">
                        Status Interno
                      </span>
                    </div>

                    {solicitacao.status === 'concluido' && (
                      <div className="mb-3 flex items-center gap-2 px-3 py-2 rounded-lg bg-emerald-50 border border-emerald-100">
                        <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                        <span className="text-xs text-emerald-700 font-medium">Pacote entregue</span>
                      </div>
                    )}

                    {carregandoRastreio ? (
                      <p className="text-xs text-slate-400" aria-live="polite">Carregando rastreio...</p>
                    ) : !rastreio && (
                      <p className="text-xs text-slate-400" aria-live="polite">
                        Código salvo. As atualizações do Correios são consultadas automaticamente.
                      </p>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Seção 5: Histórico de alterações (colapsável) */}
          <div className="mb-6">
            <details className="group">
              <summary className="flex items-center gap-2 text-sm font-semibold text-slate-800 cursor-pointer select-none list-none mb-1 min-h-[32px]">
                <History className="w-4 h-4 text-slate-400" /> Histórico
                <ChevronDown className="w-3.5 h-3.5 text-slate-400 transition-transform group-open:rotate-180" />
                <span className="text-xs font-normal text-slate-400">({historico.length})</span>
              </summary>
              {carregandoHist ? (
                <p className="text-xs text-slate-400 mt-2">Carregando histórico...</p>
              ) : historico.length === 0 ? (
                <p className="text-xs text-slate-400 mt-2">Nenhum movimento registrado.</p>
              ) : (
                <ol className="ml-2 mt-3 max-h-64 overflow-y-auto pr-1">
                  {historico.map((h) => (
                    <li key={h.id} className="relative pl-8 pb-5 before:absolute before:left-[7px] before:top-4 before:bottom-0 before:w-[2px] before:bg-slate-200 before:content-[''] last:before:hidden">
                      <span className="absolute left-0 top-1.5 w-4 h-4 rounded-full bg-slate-300 border-2 border-white z-10" />
                      <p className="text-sm text-slate-800">
                        <span className="font-medium">{h.user_nome}</span> — {h.acao}
                      </p>
                      <p className="text-xs text-slate-400">
                        {new Date(h.created_at).toLocaleString('pt-BR', {
                          dateStyle: 'short',
                          timeStyle: 'short',
                        })}
                      </p>
                    </li>
                  ))}
                </ol>
              )}
            </details>
          </div>

          {/* Seção 6: Anotações internas */}
          <div className="mb-6">
            <h3 className="flex items-center gap-2 text-sm font-semibold text-slate-800 mb-3">
              <StickyNote className="w-4 h-4 text-slate-400" /> Anotações
            </h3>
            <textarea
              rows={3}
              value={anotacoes}
              onChange={(e) => setAnotacoes(e.target.value)}
              placeholder="Anotações internas sobre esta solicitação..."
              className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white text-sm text-slate-900
                placeholder:text-slate-400 resize-none transition-colors duration-150
                focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-transparent"
            />
            <div className="flex justify-end mt-2">
              <button
                type="button"
                onClick={salvarAnotacoes}
                disabled={salvandoAnot || anotacoes === (solicitacao.anotacoes ?? '')}
                className="px-4 py-1.5 rounded-lg bg-slate-900 text-white text-xs font-medium
                  hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                {salvandoAnot ? 'Salvando...' : 'Salvar anotações'}
              </button>
            </div>
          </div>

          {/* Footer stats */}
          <div className="flex items-center justify-between pt-6 border-t border-slate-100">
            <div className="flex items-center gap-1.5 text-xs text-slate-500">
              <Calendar className="w-3.5 h-3.5" />
              Data ref: <span className="font-semibold text-slate-700">{formatDate(solicitacao.data_solicitacao)}</span>
            </div>
            <div className="flex items-center gap-1.5 text-xs text-slate-500">
              <Timer className="w-3.5 h-3.5" />
              Criado em: <span className="font-semibold text-slate-700">{formatDateTime(solicitacao.created_at)}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}