-- ============================================================
-- Tabela: usuarios
-- Banco:  PostgreSQL (Supabase)
-- Desc:   Armazena usuários do sistema com perfis e senhas.
-- ============================================================

CREATE TABLE IF NOT EXISTS usuarios (
  -- Chave primária UUID gerada automaticamente
  id                              UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Metadados
  created_at                      TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Identificação
  nome                            TEXT NOT NULL,
  usuario                         TEXT NOT NULL UNIQUE,
  senha                           TEXT NOT NULL, -- hash em produção
  perfil                          TEXT NOT NULL
                                    CHECK (perfil IN ('ADMIN', 'Alinare', 'Novitah', 'Expedicao'))
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_usuarios_perfil ON usuarios (perfil);
CREATE INDEX IF NOT EXISTS idx_usuarios_usuario ON usuarios (usuario);

-- Comentários
COMMENT ON TABLE usuarios IS 'Usuários do sistema com autenticação por login/senha.';
COMMENT ON COLUMN usuarios.senha IS 'Em produção, armazenar hash (bcrypt/argon2). Texto plano apenas para desenvolvimento.';

-- ── Seed: administrador padrão (senha: admin123 — trocar em produção!) ────────
INSERT INTO usuarios (nome, usuario, senha, perfil)
VALUES ('Administrador', 'admin', 'admin123', 'ADMIN')
ON CONFLICT (usuario) DO NOTHING;