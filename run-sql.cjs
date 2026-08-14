// Executa DDL no Supabase. Senha NÃO fica aqui — passa via DATABASE_URL.
// Uso: DATABASE_URL="postgresql://postgres:SENHA@db.ymrrguubkqbxndhoxhor.supabase.co:5432/postgres" node run-sql.cjs
const { Client } = require('pg');

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.error('Defina DATABASE_URL com a connection string do Supabase.');
  process.exit(1);
}

const client = new Client({ connectionString, ssl: { rejectUnauthorized: false } });

async function main() {
  try {
    await client.connect();
    console.log('Conectado ao Supabase');

    // 1. Tabela solicitacoes_reverso
    await client.query(`
-- ============================================================
-- Tabela: solicitacoes_reverso
-- Banco:  PostgreSQL (Supabase)
-- Desc:   Armazena as solicitações de logística reversa das
--         empresas Alinare e Novitah.
-- ============================================================

CREATE TABLE IF NOT EXISTS solicitacoes_reverso (
  id                              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at                      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  empresa                         TEXT NOT NULL
                                    CHECK (empresa IN ('Alinare', 'Novitah')),
  data_solicitacao                DATE NOT NULL,
  solicitante                     TEXT NOT NULL,
  setor                           TEXT NOT NULL,
  codigo_cliente                  INTEGER NOT NULL,
  nome_cliente                    TEXT NOT NULL,
  endereco_postagem               TEXT NOT NULL,
  motivo                          TEXT NOT NULL
                                    CHECK (motivo IN (
                                      'Peça com defeito',
                                      'Mercadoria errada',
                                      'Endereço incorreto',
                                      'Baixa qualidade no conserto',
                                      'Outros'
                                    )),
  justificativa_outros            TEXT,
  autorizacao                     TEXT NOT NULL,
  resolvido                       BOOLEAN NOT NULL DEFAULT FALSE,
  tempo_preenchimento_segundos    INTEGER NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_sr_empresa
  ON solicitacoes_reverso (empresa);
CREATE INDEX IF NOT EXISTS idx_sr_data_solicitacao
  ON solicitacoes_reverso (data_solicitacao DESC);
CREATE INDEX IF NOT EXISTS idx_sr_resolvido
  ON solicitacoes_reverso (resolvido);
CREATE INDEX IF NOT EXISTS idx_sr_empresa_data
  ON solicitacoes_reverso (empresa, data_solicitacao DESC);

COMMENT ON TABLE solicitacoes_reverso
  IS 'Solicitações de logística reversa das empresas Alinare e Novitah.';
COMMENT ON COLUMN solicitacoes_reverso.tempo_preenchimento_segundos
  IS 'Segundos decorridos entre a abertura do formulário e o envio pelo usuário.';
COMMENT ON COLUMN solicitacoes_reverso.justificativa_outros
  IS 'Campo obrigatório somente quando motivo = ''Outros''. NULL nos demais casos.';
    `);
    console.log('Tabela solicitacoes_reverso criada/verificada');

    // 2. Tabela usuarios
    await client.query(`
CREATE TABLE IF NOT EXISTS usuarios (
  id                              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at                      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  nome                            TEXT NOT NULL,
  usuario                         TEXT NOT NULL UNIQUE,
  senha                           TEXT NOT NULL,
  perfil                          TEXT NOT NULL
                                    CHECK (perfil IN ('ADMIN', 'Alinare', 'Novitah', 'Expedicao'))
);

CREATE INDEX IF NOT EXISTS idx_usuarios_perfil ON usuarios (perfil);
CREATE INDEX IF NOT EXISTS idx_usuarios_usuario ON usuarios (usuario);

COMMENT ON TABLE usuarios IS 'Usuários do sistema com autenticação por login/senha.';

INSERT INTO usuarios (nome, usuario, senha, perfil)
VALUES ('Administrador', 'admin', 'admin123', 'ADMIN')
ON CONFLICT (usuario) DO NOTHING;
    `);
    console.log('Tabela usuarios criada/verificada com seed admin');

    const { rows: users } = await client.query('SELECT id, nome, usuario, perfil FROM usuarios');
    console.log('Usuários:', JSON.stringify(users, null, 2));

    const { rows: solic } = await client.query('SELECT count(*) AS total FROM solicitacoes_reverso');
    console.log('Solicitações:', solic[0].total);
  } catch (err) {
    console.error('Erro:', err.message);
    process.exit(1);
  } finally {
    await client.end();
  }
}

main();