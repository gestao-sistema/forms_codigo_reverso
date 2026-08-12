// ── Hook de dados: busca solicitações com polling opcional ───────────────────
// Centraliza fetch + estado de loading + polling em tempo real.
// Reusado no Dashboard e na Lista.
// ─────────────────────────────────────────────────────────────────────────────

import { useCallback, useEffect, useRef, useState } from 'react';
import apiService from '../services/apiService';
import type { Solicitacao, FiltrosSolicitacoes } from '../types';

interface UseSolicitacoesOptions {
  /** Intervalo de polling em ms. 0 ou undefined desativa. */
  pollingMs?: number;
  /** Filtros aplicados na consulta */
  filtros?: FiltrosSolicitacoes;
}

interface UseSolicitacoesReturn {
  dados: Solicitacao[];
  loading: boolean;      // carregamento inicial
  refreshing: boolean;   // refetch (polling ou manual)
  /** Timestamp epoch do último fetch bem-sucedido */
  ultimoFetch: number;
  /** Dispara refetch manual */
  refetch: () => void;
}

export function useSolicitacoes({
  pollingMs,
  filtros,
}: UseSolicitacoesOptions = {}): UseSolicitacoesReturn {
  const [dados, setDados] = useState<Solicitacao[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [ultimoFetch, setUltimoFetch] = useState<number>(() => Date.now());

  // Serializa filtros para dependência estável do useEffect/useCallback
  const filtrosKey = JSON.stringify(filtros ?? {});

  // Evita setState após desmontagem
  const montadoRef = useRef(true);
  useEffect(() => {
    montadoRef.current = true;
    return () => {
      montadoRef.current = false;
    };
  }, []);

  const buscar = useCallback(
    async (isInitial: boolean) => {
      if (isInitial) setLoading(true);
      else setRefreshing(true);

      try {
        const resultado = await apiService.getSolicitacoes(
          filtros as FiltrosSolicitacoes | undefined
        );
        if (montadoRef.current) {
          setDados(resultado);
          setUltimoFetch(Date.now());
        }
      } finally {
        if (montadoRef.current) {
          setLoading(false);
          setRefreshing(false);
        }
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [filtrosKey]
  );

  // Fetch inicial + refetch quando filtros mudam
  useEffect(() => {
    buscar(true);
  }, [buscar]);

  // Polling em intervalo (tempo real simulado)
  useEffect(() => {
    if (!pollingMs || pollingMs <= 0) return;
    const id = setInterval(() => buscar(false), pollingMs);
    return () => clearInterval(id);
  }, [pollingMs, buscar]);

  const refetch = useCallback(() => buscar(false), [buscar]);

  return { dados, loading, refreshing, ultimoFetch, refetch };
}
