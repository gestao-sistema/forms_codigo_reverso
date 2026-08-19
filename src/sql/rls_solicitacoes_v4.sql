-- ============================================================
-- RLS v4: Row Level Security - Híbrido (Perfil Legado + Telas)
-- ============================================================

-- 1. Habilita RLS
ALTER TABLE solicitacoes_reverso ENABLE ROW LEVEL SECURITY;

-- 2. Helper seguro: extrai array telas do JWT, garantindo fallback
CREATE OR REPLACE FUNCTION public.current_telas()
RETURNS TEXT[]
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT ARRAY(
    SELECT jsonb_array_elements_text(
      CASE
        WHEN jsonb_typeof(auth.jwt() -> 'user_metadata' -> 'telas') = 'array'
        THEN auth.jwt() -> 'user_metadata' -> 'telas'
        ELSE '[]'::jsonb
      END
    )
  );
$$;

-- 3. Helper legado: perfil antigo
CREATE OR REPLACE FUNCTION public.current_perfil_legacy()
RETURNS TEXT
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT COALESCE(auth.jwt() -> 'user_metadata' ->> 'perfil', '');
$$;

-- 4. Helper: é admin? (Checa tela nova OU perfil antigo)
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT (public.current_telas() @> ARRAY['usuarios']) OR (public.current_perfil_legacy() = 'ADMIN');
$$;

-- 5. Helper: escopo empresa (NULL = admin/tudo, senão 'Alinare'/'Novitah')
CREATE OR REPLACE FUNCTION public.current_empresa_scope()
RETURNS TEXT
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT CASE
    -- Admin vê tudo
    WHEN public.is_admin() THEN NULL

    -- Expedição legado vê tudo
    WHEN public.current_perfil_legacy() = 'Expedicao' THEN NULL

    -- Telas gerais novas veem tudo
    WHEN public.current_telas() @> ARRAY['dashboard-geral'] OR public.current_telas() @> ARRAY['lista-geral'] OR public.current_telas() @> ARRAY['status-geral'] THEN NULL

    -- Escopo Alinare (Novo e Legado)
    WHEN public.current_perfil_legacy() = 'Alinare' THEN 'Alinare'
    WHEN public.current_telas() @> ARRAY['dashboard-alinare']
      OR public.current_telas() @> ARRAY['formulario-alinare']
      OR public.current_telas() @> ARRAY['lista-alinare']
      OR public.current_telas() @> ARRAY['status-alinare'] THEN 'Alinare'

    -- Escopo Novitah (Novo e Legado)
    WHEN public.current_perfil_legacy() = 'Novitah' THEN 'Novitah'
    WHEN public.current_telas() @> ARRAY['dashboard-novitah']
      OR public.current_telas() @> ARRAY['formulario-novitah']
      OR public.current_telas() @> ARRAY['lista-novitah']
      OR public.current_telas() @> ARRAY['status-novitah'] THEN 'Novitah'

    -- Se não bateu nada, mas chegou aqui, restringe total (ou força NULL fallback seguro pra dev local? Mantido restrito)
    ELSE 'NENHUM_ACESSO'
  END;
$$;

-- 6. Policy SELECT
DROP POLICY IF EXISTS "select_solicitacoes_por_escopo" ON solicitacoes_reverso;
CREATE POLICY "select_solicitacoes_por_escopo"
  ON solicitacoes_reverso
  FOR SELECT
  USING (
    public.current_empresa_scope() IS NULL
    OR empresa = public.current_empresa_scope()
  );

-- 7. Policy INSERT
DROP POLICY IF EXISTS "insert_solicitacoes_por_escopo" ON solicitacoes_reverso;
CREATE POLICY "insert_solicitacoes_por_escopo"
  ON solicitacoes_reverso
  FOR INSERT
  WITH CHECK (
    public.current_empresa_scope() IS NULL
    OR empresa = public.current_empresa_scope()
  );

-- 8. Policy UPDATE
DROP POLICY IF EXISTS "update_solicitacoes_admins" ON solicitacoes_reverso;
CREATE POLICY "update_solicitacoes_admins"
  ON solicitacoes_reverso
  FOR UPDATE
  USING (
    public.is_admin()
    OR public.current_perfil_legacy() = 'Expedicao'
    OR public.current_telas() @> ARRAY['lista-geral', 'lista-alinare', 'lista-novitah']
  );

-- 9. Policy DELETE
DROP POLICY IF EXISTS "delete_solicitacoes_admin" ON solicitacoes_reverso;
CREATE POLICY "delete_solicitacoes_admin"
  ON solicitacoes_reverso
  FOR DELETE
  USING (
    public.is_admin()
  );