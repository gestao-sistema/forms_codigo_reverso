import { useEffect, useState, useMemo, useRef, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import apiService from '../services/apiService';
import type { Solicitacao, StatusSolicitacao } from '../types';
import { STATUS_SOLICITACAO, STATUS_LABEL, proximoStatus, statusAnterior, movimentoValido, isAdmin } from '../types';
import { useSearchParams } from 'react-router-dom';
import {
  Clock,
  CheckCircle2,
  Tag,
  PackageCheck,
  Filter,
  StickyNote,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { COR_EMPRESA } from '../services/analytics';
import RecordDetailModal from '../components/admin/RecordDetailModal';
import {
  DndContext,
  useDroppable,
  useDraggable,
  PointerSensor,
  useSensor,
  useSensors,
  DragOverlay,
} from '@dnd-kit/core';
import type { DragEndEvent } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';

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

function KanbanCard({ item, onClick }: { item: Solicitacao; onClick?: () => void }) {
  return (
    <div
      onClick={onClick}
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
    </div>
  );
}

function DraggableKanbanCard({ item, onClick, disabled }: { item: Solicitacao; onClick: () => void; disabled: boolean }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: item.id,
    data: { item },
    disabled,
  });

  const style = {
    transform: CSS.Translate.toString(transform),
    opacity: isDragging ? 0.4 : 1,
    zIndex: isDragging ? 50 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
      <KanbanCard item={item} onClick={onClick} />
    </div>
  );
}

function KanbanColumn({
  status,
  items,
  onCardClick,
  podeArraste,
}: {
  status: StatusSolicitacao;
  items: Solicitacao[];
  onCardClick: (item: Solicitacao) => void;
  podeArraste: boolean;
}) {
  const { setNodeRef, isOver } = useDroppable({
    id: status,
  });

  const vis = STATUS_VISUAL[status];
  const Icon = vis.icon;

  return (
    <div
      ref={setNodeRef}
      className={`min-w-0 flex-1 sm:basis-0 basis-[85vw] shrink-0 sm:shrink rounded-xl border flex flex-col h-full min-h-0 transition-colors
        ${vis.border} ${isOver ? 'bg-slate-200/50 ring-2 ring-blue-400/30' : vis.bg}
      `}
    >
      <div className={`px-4 py-3 rounded-t-xl ${vis.headerBg} flex items-center justify-between shrink-0`}>
        <div className={`flex items-center gap-2 font-semibold text-sm ${vis.text}`}>
          <Icon className="w-4 h-4" />
          {STATUS_LABEL[status]}
        </div>
        <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${vis.text} bg-white/60`}>
          {items.length}
        </span>
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-3 min-h-0">
        {items.length === 0 && !isOver && (
          <p className="text-xs text-slate-400 text-center py-4">Nenhuma solicitação</p>
        )}
        {items.map((item) => (
          <DraggableKanbanCard
            key={item.id}
            item={item}
            onClick={() => onCardClick(item)}
            disabled={!podeArraste}
          />
        ))}
      </div>
    </div>
  );
}

export default function KanbanPage() {
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const queryEmpresa = searchParams.get('empresa') as 'Alinare' | 'Novitah' | null;
  const [solicitacoes, setSolicitacoes] = useState<Solicitacao[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selected, setSelected] = useState<Solicitacao | null>(null);
  const [draggedItem, setDraggedItem] = useState<Solicitacao | null>(null);
  const mountedRef = useRef(true);

  // Requer pressionar por um pequeno tempo/distância para não conflitar com click de abrir modal
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5,
      },
    })
  );

  const temGeral =
    user?.telas.includes('lista-geral') ||
    user?.telas.includes('status-geral') ||
    user?.telas.includes('dashboard-geral') ||
    user?.telas.includes('usuarios');
  const temAlinare = user?.telas.some((t) => t.includes('alinare'));
  const temNovitah = user?.telas.some((t) => t.includes('novitah'));

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
      const dados = await apiService.getSolicitacoes({ empresa: empresaFixa, limiteConcluidos: 50 });
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

  const admin = user ? isAdmin(user) : false;
  const podeEditarKanban = admin || user?.telas.includes('kanban-edit') || false;

  const handleDragEnd = async (event: DragEndEvent) => {
    setDraggedItem(null);
    const { active, over } = event;
    if (!over) return; // soltou fora de qualquer coluna

    const draggedCard = active.data.current?.item as Solicitacao;
    if (!draggedCard) return;

    const sourceStatus = draggedCard.status || (draggedCard.resolvido ? 'concluido' : 'pendente');
    const destStatus = over.id as StatusSolicitacao;

    if (sourceStatus === destStatus) return; // não mudou

    // Validações: movimento válido (uma etapa pra frente OU pra trás)
    if (!movimentoValido(sourceStatus, destStatus)) {
      toast.error(`Movimento inválido. Só pode mover uma etapa por vez.`);
      return;
    }

    try {
      // Optimistic update
      setSolicitacoes((prev) =>
        prev.map((s) => (s.id === draggedCard.id ? { ...s, status: destStatus } : s))
      );

      const payload: Partial<Solicitacao> = { status: destStatus };

      // Limpa timestamp ao voltar etapa
      if (destStatus === statusAnterior('etiqueta_gerada')) {
        payload.etiqueta_gerada_em = null; // voltou de etiqueta_gerada para pendente
      }
      if (destStatus === statusAnterior('postado')) {
        payload.postado_em = null; // voltou de postado para etiqueta_gerada
      }
      if (destStatus === statusAnterior('concluido')) {
        payload.concluido_em = null; // voltou de concluido para postado
      }

      // Seta timestamp ao avançar
      if (destStatus === 'etiqueta_gerada') payload.etiqueta_gerada_em = new Date().toISOString();
      if (destStatus === 'postado') payload.postado_em = new Date().toISOString();
      if (destStatus === 'concluido') payload.concluido_em = new Date().toISOString();

      await apiService.updateSolicitacao(draggedCard.id, payload, user);
      toast.success(`Movido para ${STATUS_LABEL[destStatus]}`);
    } catch (err) {
      console.error(err);
      toast.error('Erro ao atualizar status.');
      await carregar(true); // rollback
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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 shrink-0">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Kanban</h1>
          <p className="text-sm text-slate-500 mt-1">Arraste os cards para avançar no fluxo (se tiver permissão).</p>
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
        <DndContext
          sensors={sensors}
          onDragStart={(e) => setDraggedItem(e.active.data.current?.item)}
          onDragEnd={handleDragEnd}
          onDragCancel={() => setDraggedItem(null)}
        >
          <div className="flex sm:flex-row flex-col gap-4 overflow-x-auto sm:overflow-visible pb-4 sm:pb-0 flex-1 min-h-0">
            {STATUS_SOLICITACAO.map((status) => (
              <KanbanColumn
                key={status}
                status={status}
                items={colunas[status]}
                onCardClick={setSelected}
                podeArraste={podeEditarKanban}
              />
            ))}
          </div>
          <DragOverlay>
            {draggedItem ? <KanbanCard item={draggedItem} /> : null}
          </DragOverlay>
        </DndContext>
      )}

      <RecordDetailModal
        isOpen={!!selected}
        solicitacao={selected}
        onClose={() => {
          setSelected(null);
          carregar(true);
        }}
      />
    </div>
  );
}
