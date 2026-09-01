-- ============================================================
-- Migração: status em_transito + rastreamento Correios
-- Executar no Supabase SQL Editor
-- ============================================================

-- 1. Novo status no CHECK constraint
ALTER TABLE solicitacoes_reverso DROP CONSTRAINT IF EXISTS solicitacoes_reverso_status_check;
ALTER TABLE solicitacoes_reverso ADD CONSTRAINT solicitacoes_reverso_status_check
  CHECK (status IN ('pendente','etiqueta_gerada','postado','em_transito','concluido'));

-- 2. Novas colunas em solicitacoes_reverso
ALTER TABLE solicitacoes_reverso ADD COLUMN IF NOT EXISTS em_transito_em TIMESTAMPTZ;
ALTER TABLE solicitacoes_reverso ADD COLUMN IF NOT EXISTS codigo_rastreio TEXT;
ALTER TABLE solicitacoes_reverso ADD COLUMN IF NOT EXISTS ultima_cidade_rastreio TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS idx_sr_codigo_rastreio ON solicitacoes_reverso (codigo_rastreio)
  WHERE codigo_rastreio IS NOT NULL;

-- 3. Tabela de rastreamento (1:1 com solicitacoes_reverso)
CREATE TABLE IF NOT EXISTS rastreamento_correios (
  codigo_rastreio          TEXT PRIMARY KEY,
  solicitacao_id           UUID NOT NULL REFERENCES solicitacoes_reverso(id) ON DELETE CASCADE,
  ultimo_evento_codigo     TEXT,
  ultimo_evento_descricao  TEXT,
  unidade_cidade           TEXT,
  unidade_uf               TEXT,
  eventos                  JSONB,   -- histórico completo de eventos do rastreio
  ultimo_check_em          TIMESTAMPTZ,
  created_at               TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_rc_solicitacao ON rastreamento_correios (solicitacao_id);

-- RLS: leitura e escrita básica para usuários autenticados;
-- service_role (edge function) tem bypass total.
ALTER TABLE rastreamento_correios ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_rastreamento" ON rastreamento_correios;
CREATE POLICY "select_rastreamento" ON rastreamento_correios FOR SELECT
  TO authenticated USING (true);

DROP POLICY IF EXISTS "insert_rastreamento" ON rastreamento_correios;
CREATE POLICY "insert_rastreamento" ON rastreamento_correios FOR INSERT
  TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "update_rastreamento" ON rastreamento_correios;
CREATE POLICY "update_rastreamento" ON rastreamento_correios FOR UPDATE
  TO authenticated USING (true) WITH CHECK (true);

COMMENT ON TABLE rastreamento_correios IS 'Último evento de rastreio Correios por solicitação (1:1).';
