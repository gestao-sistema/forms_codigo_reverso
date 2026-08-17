// Aplica RLS (e migrações pontuais) no Supabase via DATABASE_URL.
// Uso: DATABASE_URL="postgresql://postgres:SENHA@db.ymrrguubkqbxndhoxhor.supabase.co:5432/postgres" node run-sql-rls.cjs
const { Client } = require('pg');
const { readFileSync } = require('fs');
const { resolve } = require('path');

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

    const sql = readFileSync(resolve(__dirname, 'src/sql/rls_solicitacoes.sql'), 'utf8');
    await client.query(sql);
    console.log('RLS aplicado em solicitacoes_reverso.');

    await client.query(`SELECT public.current_perfil()`);
    console.log('Helper current_perfil OK.');
  } catch (err) {
    console.error('Erro:', err.message);
    process.exit(1);
  } finally {
    await client.end();
  }
}

main();