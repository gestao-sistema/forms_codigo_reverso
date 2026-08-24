-- ============================================================
-- Tabela: solicitacoes_historico
-- Desc:   Auditoria de movimentos de cada solicitação
--         (quem moveu, para qual status, quando).
-- ============================================================

CREATE TABLE IF NOT EXISTS solicitacoes_historico (
  -- Chave primária UUID gerada automaticamente
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Solicitação auditada (apagou a solicitação, apaga o histórico)
  solicitacao_id    UUID NOT NULL REFERENCES solicitacoes_reverso(id) ON DELETE CASCADE,

  -- Nome de quem realizou a ação (denormalizado para exibição simples)
  user_nome         TEXT NOT NULL,

  -- Descrição da ação (ex: 'Moveu para Postado', 'Anotação atualizada')
  acao              TEXT NOT NULL,

  -- Momento da ação
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Índice: busca do histórico de uma solicitação (mais recente primeiro)
CREATE INDEX IF NOT EXISTS idx_sh_solicitacao
  ON solicitacoes_historico (solicitacao_id, created_at DESC);

-- ── RLS ──────────────────────────────────────────────────────────────────────
ALTER TABLE solicitacoes_historico ENABLE ROW LEVEL SECURITY;

-- Grants para os roles do Supabase
GRANT SELECT, INSERT ON TABLE solicitacoes_historico TO authenticated;

-- SELECT
DROP POLICY IF EXISTS "select_historico" ON solicitacoes_historico;
CREATE POLICY "select_historico" ON solicitacoes_historico
  FOR SELECT
  USING (auth.role() = 'authenticated');

-- INSERT
DROP POLICY IF EXISTS "insert_historico" ON solicitacoes_historico;
CREATE POLICY "insert_historico" ON solicitacoes_historico
  FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

-- Sem UPDATE/DELETE: histórico é imutável por design.

COMMENT ON TABLE solicitacoes_historico
  IS 'Auditoria de movimentos das solicitacoes de logistica reversa.';
