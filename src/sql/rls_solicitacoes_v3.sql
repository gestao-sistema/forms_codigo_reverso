-- ============================================================
-- RLS v3: Row Level Security para solicitacoes_reverso
-- Seguro, testável, sem cast perigoso. Execute via:
--   DATABASE_URL="postgresql://..." node run-sql-rls.cjs
-- ============================================================

-- 1. Habilita RLS
ALTER TABLE solicitacoes_reverso ENABLE ROW LEVEL SECURITY;

-- 2. Helper seguro: extrai array telas do JWT (retorna '{}' se ausente/inválido)
CREATE OR REPLACE FUNCTION public.current_telas()
RETURNS TEXT[]
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT COALESCE(
    (
      SELECT array_agg(elem::text)
      FROM jsonb_array_elements_text(
        COALESCE(auth.jwt() -> 'user_metadata' -> 'telas', '[]'::jsonb)
      ) AS elem
    ),
    '{}'::TEXT[]
  );
$$;

-- 3. Helper: tem tela?
CREATE OR REPLACE FUNCTION public.has_tela(tela TEXT)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT public.current_telas() @> ARRAY[tela];
$$;

-- 4. Helper: é admin?
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT public.has_tela('usuarios');
$$;

-- 5. Helper: escopo empresa (NULL = todas)
CREATE OR REPLACE FUNCTION public.current_empresa_scope()
RETURNS TEXT
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT CASE
    WHEN public.is_admin() THEN NULL
    WHEN public.has_tela('dashboard-geral') OR public.has_tela('lista-geral') THEN NULL
    WHEN public.has_tela('dashboard-alinare') OR public.has_tela('formulario-alinare')
      OR public.has_tela('lista-alinare') OR public.has_tela('status') THEN 'Alinare'
    WHEN public.has_tela('dashboard-novitah') OR public.has_tela('formulario-novitah')
      OR public.has_tela('lista-novitah') THEN 'Novitah'
    ELSE NULL
  END;
$$;

-- 6. SELECT: vê conforme escopo
DROP POLICY IF EXISTS "select_solicitacoes_por_escopo" ON solicitacoes_reverso;
CREATE POLICY "select_solicitacoes_por_escopo"
  ON solicitacoes_reverso
  FOR SELECT
  USING (
    public.current_empresa_scope() IS NULL
    OR empresa = public.current_empresa_scope()
  );

-- 7. INSERT: só cria na sua empresa
DROP POLICY IF EXISTS "insert_solicitacoes_por_escopo" ON solicitacoes_reverso;
CREATE POLICY "insert_solicitacoes_por_escopo"
  ON solicitacoes_reverso
  FOR INSERT
  WITH CHECK (
    public.current_empresa_scope() IS NULL
    OR empresa = public.current_empresa_scope()
  );

-- 8. UPDATE: admin ou telas de lista
DROP POLICY IF EXISTS "update_solicitacoes_admins" ON solicitacoes_reverso;
CREATE POLICY "update_solicitacoes_admins"
  ON solicitacoes_reverso
  FOR UPDATE
  USING (
    public.is_admin()
    OR public.has_tela('lista-geral')
    OR public.has_tela('lista-alinare')
    OR public.has_tela('lista-novitah')
  );

-- 9. DELETE: só admin
DROP POLICY IF EXISTS "delete_solicitacoes_admin" ON solicitacoes_reverso;
CREATE POLICY "delete_solicitacoes_admin"
  ON solicitacoes_reverso
  FOR DELETE
  USING (
    public.is_admin()
  );

-- 10. Test helpers (opcional, para debug no SQL editor do Supabase)
-- SELECT public.current_telas();
-- SELECT public.is_admin();
-- SELECT public.current_empresa_scope();