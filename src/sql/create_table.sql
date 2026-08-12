-- ============================================================
-- Tabela: solicitacoes_reverso
-- Banco:  PostgreSQL (Supabase)
-- Desc:   Armazena as solicitações de logística reversa das
--         empresas Alinare e Novitah.
-- ============================================================

CREATE TABLE IF NOT EXISTS solicitacoes_reverso (
  -- Chave primária UUID gerada automaticamente
  id                              UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Metadados de criação
  created_at                      TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Dados de contexto
  empresa                         TEXT NOT NULL
                                    CHECK (empresa IN ('Alinare', 'Novitah')),
  data_solicitacao                DATE NOT NULL,

  -- Identificação do solicitante interno
  solicitante                     TEXT NOT NULL,
  setor                           TEXT NOT NULL,

  -- Dados da cliente
  codigo_cliente                  INTEGER NOT NULL,
  nome_cliente                    TEXT NOT NULL,
  endereco_postagem               TEXT NOT NULL,

  -- Motivo e justificativa
  motivo                          TEXT NOT NULL
                                    CHECK (motivo IN (
                                      'Peça com defeito',
                                      'Mercadoria errada',
                                      'Endereço incorreto',
                                      'Baixa qualidade no conserto',
                                      'Outros'
                                    )),
  -- Obrigatório apenas quando motivo = 'Outros'; validado na aplicação
  justificativa_outros            TEXT,

  -- Autorização do reverso
  autorizacao                     TEXT NOT NULL,

  -- Status de resolução
  resolvido                       BOOLEAN NOT NULL DEFAULT FALSE,

  -- Rastreamento de tempo de preenchimento do formulário (em segundos)
  tempo_preenchimento_segundos    INTEGER NOT NULL DEFAULT 0
);

-- ── Índices para consultas frequentes ──────────────────────────────────────
-- Filtragem por empresa
CREATE INDEX IF NOT EXISTS idx_sr_empresa
  ON solicitacoes_reverso (empresa);

-- Filtragem por data (dashboard e filtros de período)
CREATE INDEX IF NOT EXISTS idx_sr_data_solicitacao
  ON solicitacoes_reverso (data_solicitacao DESC);

-- Filtragem por status de resolução
CREATE INDEX IF NOT EXISTS idx_sr_resolvido
  ON solicitacoes_reverso (resolvido);

-- Consultas combinadas empresa + data (caso de uso mais comum)
CREATE INDEX IF NOT EXISTS idx_sr_empresa_data
  ON solicitacoes_reverso (empresa, data_solicitacao DESC);

-- ── Comentários de coluna ───────────────────────────────────────────────────
COMMENT ON TABLE solicitacoes_reverso
  IS 'Solicitações de logística reversa das empresas Alinare e Novitah.';

COMMENT ON COLUMN solicitacoes_reverso.tempo_preenchimento_segundos
  IS 'Segundos decorridos entre a abertura do formulário e o envio pelo usuário.';

COMMENT ON COLUMN solicitacoes_reverso.justificativa_outros
  IS 'Campo obrigatório somente quando motivo = ''Outros''. NULL nos demais casos.';
