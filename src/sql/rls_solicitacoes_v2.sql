-- ============================================================
-- RLS v2: Row Level Security para solicitacoes_reverso (telas-based)
-- Substitui rls_solicitacoes.sql - usa array `telas` em vez de `perfil`
-- ============================================================

-- 1. Habilita RLS na tabela (idempotente)
ALTER TABLE solicitacoes_reverso ENABLE ROW LEVEL SECURITY;

-- 2. Helper: extrai array de telas do usuário logado (do JWT user_metadata)
CREATE OR REPLACE FUNCTION public.current_telas()
RETURNS TEXT[]
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT COALESCE(
    (auth.jwt() -> 'user_metadata' -> 'telas')::TEXT[],
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
  SELECT tela = ANY(public.current_telas());
$$;

-- 4. Helper: verifica se é admin (tem tela 'usuarios')
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT 'usuarios' = ANY(public.current_telas());
$$;

-- 5. Helper: determina escopo de empresa pelas telas do usuário
-- Retorna NULL se admin (acesso total) ou se tem telas gerais/ambas
-- Retorna 'Alinare' se só tem telas Alinare
-- Retorna 'Novitah' se só tem telas Novitah
CREATE OR REPLACE FUNCTION public.current_empresa_scope()
RETURNS TEXT
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT CASE
    WHEN public.is_admin() THEN NULL
    WHEN 'dashboard-geral' = ANY(public.current_telas())
      OR 'lista-geral' = ANY(public.current_telas())
      OR ('dashboard-alinare' = ANY(public.current_telas()) AND 'dashboard-novitah' = ANY(public.current_telas()))
      OR ('formulario-alinare' = ANY(public.current_telas()) AND 'formulario-novitah' = ANY(public.current_telas()))
      OR ('lista-alinare' = ANY(public.current_telas()) AND 'lista-novitah' = ANY(public.current_telas()))
    THEN NULL  -- tem acesso a ambas empresas
    WHEN 'dashboard-alinare' = ANY(public.current_telas())
      OR 'formulario-alinare' = ANY(public.current_telas())
      OR 'lista-alinare' = ANY(public.current_telas())
      OR 'status' = ANY(public.current_telas())  -- status segue empresa do form/lista
    THEN 'Alinare'
    WHEN 'dashboard-novitah' = ANY(public.current_telas())
      OR 'formulario-novitah' = ANY(public.current_telas())
      OR 'lista-novitah' = ANY(public.current_telas())
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
    public.current_empresa_scope() IS NULL                  -- admin ou ambas: tudo
    OR empresa = public.current_empresa_scope()             -- demais: só sua empresa
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

-- 8. Policy UPDATE: admin e expedicao (tem lista-geral) atualizam
DROP POLICY IF EXISTS "update_solicitacoes_admins" ON solicitacoes_reverso;
CREATE POLICY "update_solicitacoes_admins"
  ON solicitacoes_reverso
  FOR UPDATE
  USING (
    public.is_admin()
    OR public.has_tela('lista-geral')  -- Expedicao
    OR public.has_tela('lista-alinare')
    OR public.has_tela('lista-novitah')
  );

-- 9. Policy DELETE: só admin remove registros
DROP POLICY IF EXISTS "delete_solicitacoes_admin" ON solicitacoes_reverso;
CREATE POLICY "delete_solicitacoes_admin"
  ON solicitacoes_reverso
  FOR DELETE
  USING (
    public.is_admin()
  );