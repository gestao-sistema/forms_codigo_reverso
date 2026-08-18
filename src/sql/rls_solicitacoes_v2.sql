-- ============================================================
-- RLS v2: Row Level Security para solicitacoes_reverso (telas-based)
-- Substitui rls_solicitacoes.sql - usa array `telas` em vez de `perfil`
-- Execute via: DATABASE_URL="..." node run-sql-rls.cjs
-- ============================================================

-- 1. Habilita RLS na tabela (idempotente)
ALTER TABLE solicitacoes_reverso ENABLE ROW LEVEL SECURITY;

-- 2. Helper: extrai array de telas do usuário logado (do JWT user_metadata)
--    user_metadata.telas é um jsonb array; usamos jsonb_array_elements_text para cast seguro.
CREATE OR REPLACE FUNCTION public.current_telas()
RETURNS TEXT[]
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT COALESCE(
    ARRAY(
      SELECT jsonb_array_elements_text(
        COALESCE(auth.jwt() -> 'user_metadata' -> 'telas', '[]'::jsonb)
      )
    ),
    '{}'::TEXT[]
  );
$$;

-- 3. Helper: verifica se usuário tem acesso a uma tela específica
CREATE OR REPLACE FUNCTION public.has_tela(tela TEXT)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT public.current_telas() @> ARRAY[tela];
$$;

-- 4. Helper: verifica se é admin (tem tela 'usuarios')
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT public.current_telas() @> ARRAY['usuarios'];
$$;

-- 5. Helper: determina escopo de empresa pelas telas do usuário
--    NULL = acesso a todas (admin ou telas gerais)
CREATE OR REPLACE FUNCTION public.current_empresa_scope()
RETURNS TEXT
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT CASE
    WHEN public.is_admin() THEN NULL
    WHEN public.current_telas() @> ARRAY['dashboard-geral', 'lista-geral']
    THEN NULL  -- tem telas de ambas
    WHEN public.current_telas() @> ARRAY['dashboard-alinare']
      OR public.current_telas() @> ARRAY['lista-alinare']
    THEN 'Alinare'
    WHEN public.current_telas() @> ARRAY['dashboard-novitah']
      OR public.current_telas() @> ARRAY['lista-novitah']
    THEN 'Novitah'
    ELSE NULL
  END;
$$;

-- 6. Policy SELECT: usuário vê registros conforme escopo de empresa
DROP POLICY IF EXISTS "select_solicitacoes_por_escopo" ON solicitacoes_reverso;
CREATE POLICY "select_solicitacoes_por_escopo"
  ON solicitacoes_reverso
  FOR SELECT
  USING (
    public.current_empresa_scope() IS NULL
    OR empresa = public.current_empresa_scope()
  );

-- 7. Policy INSERT: usuário só cria registros da sua empresa
DROP POLICY IF EXISTS "insert_solicitacoes_por_escopo" ON solicitacoes_reverso;
CREATE POLICY "insert_solicitacoes_por_escopo"
  ON solicitacoes_reverso
  FOR INSERT
  WITH CHECK (
    public.current_empresa_scope() IS NULL
    OR empresa = public.current_empresa_scope()
  );

-- 8. Policy UPDATE: admin ou quem tem tela de lista pode atualizar
DROP POLICY IF EXISTS "update_solicitacoes_admins" ON solicitacoes_reverso;
CREATE POLICY "update_solicitacoes_admins"
  ON solicitacoes_reverso
  FOR UPDATE
  USING (
    public.is_admin()
    OR public.current_telas() @> ARRAY['lista-geral', 'lista-alinare', 'lista-novitah']
  );

-- 9. Policy DELETE: só admin remove registros
DROP POLICY IF EXISTS "delete_solicitacoes_admin" ON solicitacoes_reverso;
CREATE POLICY "delete_solicitacoes_admin"
  ON solicitacoes_reverso
  FOR DELETE
  USING (
    public.is_admin()
  );