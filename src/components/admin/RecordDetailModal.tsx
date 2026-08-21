// ── Modal de Detalhes da Solicitação ─────────────────────────────────────────
import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { X, Timer, Calendar, User, Package, MapPin, Building2, StickyNote } from 'lucide-react';
import type { Solicitacao } from '../../types';
import { STATUS_LABEL } from '../../types';
import { formatarTempo } from '../../services/analytics';
import apiService from '../../services/apiService';

interface RecordDetailModalProps {
  isOpen: boolean;
  solicitacao: Solicitacao | null;
  onClose: () => void;
}

export default function RecordDetailModal({
  isOpen,
  solicitacao,
  onClose,
}: RecordDetailModalProps) {
  const [anotacoes, setAnotacoes] = useState('');
  const [salvandoAnot, setSalvandoAnot] = useState(false);

  // Sincroniza textarea quando abre/troca de registro
  useEffect(() => {
    setAnotacoes(solicitacao?.anotacoes ?? '');
  }, [solicitacao?.id, solicitacao?.anotacoes]);

  // Fechar com tecla esc
  useEffect(() => {
    if (!isOpen) return;
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleEsc);
    // Trava rolagem do body
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
      await apiService.updateSolicitacao(solicitacao.id, {
        anotacoes: anotacoes.trim() || null,
      });
      solicitacao.anotacoes = anotacoes.trim() || null;
      toast.success('Anotações salvas.');
    } catch {
      toast.error('Erro ao salvar anotações.');
    } finally {
      setSalvandoAnot(false);
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

  return (
    // Overlay escuro com blurred border
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm transition-opacity"
      aria-modal="true"
      role="dialog"
      onClick={onClose}
    >
      {/* Container principal */}
      <div
        className="w-full max-w-2xl bg-white rounded-2xl shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()} // Evita fechar ao clicar dentro
      >
        {/* Header com cor da empresa */}
        <div className="flex items-start justify-between px-6 py-5 border-b border-slate-100">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <span
                className={`px-2.5 py-1 rounded-full text-xs font-semibold text-white ${bgEmpresa}`}
              >
                {solicitacao.empresa}
              </span>
              <span
                className={`px-2.5 py-1 rounded-full text-xs font-semibold ${
                  solicitacao.status === 'concluido'
                    ? 'bg-emerald-100 text-emerald-700'
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

          {/* Seção 4: Anotações internas */}
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
