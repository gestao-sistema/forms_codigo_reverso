// ── Lista em Tabela das Solicitações ─────────────────────────────────────────
import { Inbox, Trash2, Clock, Tag, PackageCheck, CheckCircle2, ArrowRight, Truck } from 'lucide-react';
import type { Solicitacao, StatusSolicitacao } from '../../types';
import { COR_EMPRESA } from '../../services/analytics';

/** Visual + próxima ação disponível na Lista (Expedição) para cada status. */
const STATUS_LISTA: Record<
  StatusSolicitacao,
  { bg: string; text: string; icon: React.ElementType; label: string; acao?: string }
> = {
  pendente: { bg: 'bg-amber-50', text: 'text-amber-700', icon: Clock, label: 'Pendente', acao: 'Etiqueta Gerada' },
  etiqueta_gerada: { bg: 'bg-blue-50', text: 'text-blue-700', icon: Tag, label: 'Etiqueta Gerada' },
  postado: { bg: 'bg-violet-50', text: 'text-violet-700', icon: PackageCheck, label: 'Postado', acao: 'Concluir' },
  em_transito: { bg: 'bg-orange-50', text: 'text-orange-700', icon: Truck, label: 'Em Trânsito', acao: 'Concluir' },
  concluido: { bg: 'bg-emerald-50', text: 'text-emerald-700', icon: CheckCircle2, label: 'Concluído' },
};

interface RecordsListProps {
  dados: Solicitacao[];
  onToggleStatus?: (id: string, currentStatus: StatusSolicitacao, e: React.MouseEvent) => void;
  /** Apaga uma solicitação. Exibido apenas quando showDelete está ativo. */
  onDelete?: (id: string, e: React.MouseEvent) => void;
  onClickRow: (solicitacao: Solicitacao) => void;
  loading: boolean;
  /** Oculta a coluna/ação "Status" (usado no Status view-only) */
  readOnly?: boolean;
  /** Exibe coluna/ação de apagar (apenas ADMIN deve ativar) */
  showDelete?: boolean;
  /** Decide se o botão de ação aparece para o status (permissão por papel). */
  podeAgir?: (status: StatusSolicitacao) => boolean;
}

export default function RecordsList({
  dados,
  onToggleStatus,
  onDelete,
  onClickRow,
  loading,
  readOnly,
  showDelete,
  podeAgir,
}: RecordsListProps) {
  // Formatador
  const formatDate = (dateStr: string) => {
    const [, m, d] = dateStr.split('-');
    return `${d}/${m}`;
  };

  if (loading) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-8 flex flex-col items-center justify-center min-h-[300px]">
        <div className="w-8 h-8 rounded-full border-4 border-slate-200 border-t-blue-500 animate-spin mb-4" />
        <p className="text-sm text-slate-500 font-medium">Carregando registros...</p>
      </div>
    );
  }

  if (dados.length === 0) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-12 flex flex-col items-center justify-center text-center min-h-[300px]">
        <div className="w-12 h-12 bg-slate-50 rounded-full flex items-center justify-center mb-4">
          <Inbox className="w-6 h-6 text-slate-400" />
        </div>
        <h3 className="text-base font-semibold text-slate-800 mb-1">Nenhum registro encontrado</h3>
        <p className="text-sm text-slate-500">
          Não há solicitações que correspondam aos filtros atuais.
        </p>
      </div>
    );
  }

  const thCls = 'px-4 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wider whitespace-nowrap';
  const tdCls = 'px-4 py-3 text-sm text-slate-700 whitespace-nowrap';

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse min-w-[1100px]">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200">
              {!readOnly && <th className={`${thCls} text-center`}>Status</th>}
              <th className={thCls}>Empresa</th>
              <th className={thCls}>Data</th>
              <th className={thCls}>Solicitante</th>
              <th className={thCls}>Setor</th>
              <th className={thCls}>Código</th>
              <th className={thCls}>Cliente</th>
              <th className={thCls}>Motivo</th>
              <th className={thCls}>Endereço de Postagem</th>
              <th className={thCls}>Justificativa</th>
              <th className={thCls}>Autorização</th>
              {showDelete && <th className={`${thCls} text-center`}>Ações</th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {dados.map((s) => (
              <tr
                key={s.id}
                onClick={() => onClickRow(s)}
                className="hover:bg-slate-50/80 transition-colors cursor-pointer group"
              >
                {!readOnly && (() => {
                  const resolvidoAntigo = (s as any).resolvido;
                  const statusReal = s.status || (resolvidoAntigo ? 'concluido' : 'pendente');
                  const vis = STATUS_LISTA[statusReal] || STATUS_LISTA['pendente'];
                  const Icon = vis.icon;
                  return (
                    <td className="px-4 py-3 text-center whitespace-nowrap">
                      <div className="flex items-center justify-center gap-2">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${vis.bg} ${vis.text} border-slate-200`}
                        >
                          <Icon className="w-3.5 h-3.5" />
                          {vis.label}
                        </span>
                        {vis.acao && podeAgir?.(statusReal) !== false && (
                          <button
                            type="button"
                            onClick={(e) => onToggleStatus?.(s.id, statusReal, e)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium
                              bg-slate-900 text-white hover:bg-slate-700 transition-colors"
                            aria-label={vis.acao}
                          >
                            {vis.acao}
                            <ArrowRight className="w-3 h-3" />
                          </button>
                        )}
                      </div>
                    </td>
                  );
                })()}
                <td className="px-4 py-3 whitespace-nowrap">
                  <span
                    className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold text-white`}
                    style={{ backgroundColor: COR_EMPRESA[s.empresa] }}
                  >
                    {s.empresa}
                  </span>
                </td>
                <td className="px-4 py-3 whitespace-nowrap text-sm text-slate-600 font-medium">
                  {formatDate(s.data_solicitacao)}
                </td>
                <td className={tdCls}>{s.solicitante}</td>
                <td className={tdCls}>{s.setor}</td>
                <td className={tdCls}>#{s.codigo_cliente}</td>
                <td className="px-4 py-3 whitespace-nowrap">
                  <div className="text-sm font-medium text-slate-900 group-hover:text-blue-600 transition-colors">
                    {s.nome_cliente}
                  </div>
                </td>
                <td className="px-4 py-3 text-sm text-slate-700 max-w-[180px] truncate" title={s.motivo}>
                  {s.motivo}
                </td>
                <td className="px-4 py-3 text-sm text-slate-700 max-w-[220px] truncate" title={s.endereco_postagem}>
                  {s.endereco_postagem}
                </td>
                <td className="px-4 py-3 text-sm text-slate-500 max-w-[180px] truncate" title={s.justificativa_outros ?? undefined}>
                  {s.justificativa_outros ?? '—'}
                </td>
                <td className={tdCls}>{s.autorizacao}</td>
                {showDelete && (
                  <td className="px-4 py-3 text-center whitespace-nowrap">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation(); // impede abrir modal da linha
                        onDelete?.(s.id, e);
                      }}
                      className="inline-flex items-center justify-center p-2 -m-2 rounded-full text-red-400 hover:text-red-600 hover:bg-red-50 transition-colors cursor-pointer"
                      aria-label="Apagar solicitação"
                      title="Apagar"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}