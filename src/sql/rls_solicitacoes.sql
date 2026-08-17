-- ============================================================
-- RLS: Row Level Security para solicitacoes_reverso
-- Proteção no banco: cada usuário acessa só seu escopo de empresa.
-- ADMIN/Expedicao veem tudo; Alinare/Novitah veem só sua empresa.
-- Requer extensão auth (já vem no Supabase).
-- ============================================================

-- 1. Habilita RLS na tabela
ALTER TABLE solicitacoes_reverso ENABLE ROW LEVEL SECURITY;

-- 2. Helper: extrai o perfil do usuário logado (do JWT user_metadata)
CREATE OR REPLACE FUNCTION public.current_perfil()
RETURNS TEXT
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT coalesce(
    (auth.jwt() -> 'user_metadata' ->> 'perfil'),
    ''
  );
$$;

-- 3. Helper: extrai a empresa do perfil (null = ADMIN/Expedicao = todas)
CREATE OR REPLACE FUNCTION public.current_empresa_scope()
RETURNS TEXT
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT CASE
    WHEN public.current_perfil() = 'Alinare' THEN 'Alinare'
    WHEN public.current_perfil() = 'Novitah' THEN 'Novitah'
    ELSE NULL  -- ADMIN, Expedicao, ou vazio
  END;
$$;

-- 4. Policy SELECT: usuário vê registros conforme seu escopo
DROP POLICY IF EXISTS "select_solicitacoes_por_escopo" ON solicitacoes_reverso;
CREATE POLICY "select_solicitacoes_por_escopo"
  ON solicitacoes_reverso
  FOR SELECT
  USING (
    public.current_empresa_scope() IS NULL                  -- ADMIN/Expedicao: tudo
    OR empresa = public.current_empresa_scope()             -- demais: só sua empresa
  );

-- 5. Policy INSERT: usuário só cria registros da sua empresa
--    (ADMIN não cria pelo form; se criar, qualquer empresa é permitida)
DROP POLICY IF EXISTS "insert_solicitacoes_por_escopo" ON solicitacoes_reverso;
CREATE POLICY "insert_solicitacoes_por_escopo"
  ON solicitacoes_reverso
  FOR INSERT
  WITH CHECK (
    public.current_empresa_scope() IS NULL
    OR empresa = public.current_empresa_scope()
  );

-- 6. Policy UPDATE: só ADMIN e Expedicao atualizam (resolver/toggle)
DROP POLICY IF EXISTS "update_solicitacoes_admins" ON solicitacoes_reverso;
CREATE POLICY "update_solicitacoes_admins"
  ON solicitacoes_reverso
  FOR UPDATE
  USING (
    public.current_perfil() IN ('ADMIN', 'Expedicao')
  );

-- 7. Policy DELETE: só ADMIN remov registros
DROP POLICY IF EXISTS "delete_solicitacoes_admin" ON solicitacoes_reverso;
CREATE POLICY "delete_solicitacoes_admin"
  ON solicitacoes_reverso
  FOR DELETE
  USING (
    public.current_perfil() = 'ADMIN'
  );
