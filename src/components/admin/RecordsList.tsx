// ── Lista em Tabela das Solicitações ─────────────────────────────────────────
import { Inbox } from 'lucide-react';
import type { Solicitacao } from '../../types';
import { COR_EMPRESA } from '../../services/analytics';

interface RecordsListProps {
  dados: Solicitacao[];
  onToggleStatus?: (id: string, currentStatus: boolean, e: React.MouseEvent) => void;
  onClickRow: (solicitacao: Solicitacao) => void;
  loading: boolean;
  /** Oculta a coluna/ação "Resolvido" (usado no Status view-only) */
  readOnly?: boolean;
}

export default function RecordsList({
  dados,
  onToggleStatus,
  onClickRow,
  loading,
  readOnly,
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

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse min-w-[700px]">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200">
              <th className="px-5 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Empresa
              </th>
              <th className="px-5 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Data
              </th>
              <th className="px-5 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Solicitante
              </th>
              <th className="px-5 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Cliente
              </th>
              <th className="px-5 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Motivo
              </th>
              <th className="px-5 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Autorização
              </th>
              {!readOnly && (
                <th className="px-5 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wider text-center">
                  Resolvido
                </th>
              )}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {dados.map((s) => (
              <tr
                key={s.id}
                onClick={() => onClickRow(s)}
                className="hover:bg-slate-50/80 transition-colors cursor-pointer group"
              >
                <td className="px-5 py-3 whitespace-nowrap">
                  <span
                    className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold text-white`}
                    style={{ backgroundColor: COR_EMPRESA[s.empresa] }}
                  >
                    {s.empresa}
                  </span>
                </td>
                <td className="px-5 py-3 whitespace-nowrap text-sm text-slate-600 font-medium">
                  {formatDate(s.data_solicitacao)}
                </td>
                <td className="px-5 py-3 whitespace-nowrap text-sm text-slate-700">
                  {s.solicitante}
                </td>
                <td className="px-5 py-3 whitespace-nowrap">
                  <div className="text-sm font-medium text-slate-900 group-hover:text-blue-600 transition-colors">
                    {s.nome_cliente}
                  </div>
                  <div className="text-xs text-slate-500">#{s.codigo_cliente}</div>
                </td>
                <td className="px-5 py-3 text-sm text-slate-700 max-w-[200px] truncate">
                  {s.motivo}
                </td>
                <td className="px-5 py-3 text-sm text-slate-700 whitespace-nowrap">
                  {s.autorizacao}
                </td>
                {!readOnly && (
                  <td className="px-5 py-3 text-center whitespace-nowrap">
                    {/* Container invisível aumenta área de clique do checkbox */}
                    <div
                      className="inline-flex items-center justify-center p-2 -m-2 rounded-full hover:bg-slate-100 transition-colors cursor-pointer"
                      onClick={(e) => onToggleStatus?.(s.id, s.resolvido, e)}
                      role="button"
                      aria-label={`Marcar como ${s.resolvido ? 'pendente' : 'resolvido'}`}
                    >
                      <input
                        type="checkbox"
                        checked={s.resolvido}
                        readOnly // Estado gerenciado pelo onClick do container pai
                        className="w-4 h-4 text-blue-600 border-slate-300 rounded focus:ring-blue-500 cursor-pointer pointer-events-none"
                      />
                    </div>
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
