


SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;


CREATE EXTENSION IF NOT EXISTS "pg_cron" WITH SCHEMA "pg_catalog";






COMMENT ON SCHEMA "public" IS 'standard public schema';



CREATE EXTENSION IF NOT EXISTS "pg_net" WITH SCHEMA "public";






CREATE EXTENSION IF NOT EXISTS "pg_stat_statements" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "supabase_vault" WITH SCHEMA "vault";






CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "extensions";






CREATE OR REPLACE FUNCTION "public"."current_empresa_scope"() RETURNS "text"
    LANGUAGE "sql" STABLE SECURITY DEFINER
    AS $$
  SELECT CASE
    -- Admin vê tudo
    WHEN public.is_admin() THEN NULL

    -- Expedição legado vê tudo
    WHEN public.current_perfil_legacy() = 'Expedicao' THEN NULL

    -- Telas gerais novas veem tudo
    WHEN public.current_telas() @> ARRAY['dashboard-geral'] OR public.current_telas() @> ARRAY['lista-geral'] OR public.current_telas() @> ARRAY['status-geral'] OR public.current_telas() @> ARRAY['kanban'] THEN NULL

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


ALTER FUNCTION "public"."current_empresa_scope"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."current_perfil_legacy"() RETURNS "text"
    LANGUAGE "sql" STABLE SECURITY DEFINER
    AS $$
  SELECT COALESCE(auth.jwt() -> 'user_metadata' ->> 'perfil', '');
$$;


ALTER FUNCTION "public"."current_perfil_legacy"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."current_telas"() RETURNS "text"[]
    LANGUAGE "sql" STABLE SECURITY DEFINER
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


ALTER FUNCTION "public"."current_telas"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."is_admin"() RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    AS $$
  SELECT (public.current_telas() @> ARRAY['usuarios']) OR (public.current_perfil_legacy() = 'ADMIN');
$$;


ALTER FUNCTION "public"."is_admin"() OWNER TO "postgres";

SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "public"."rastreamento_correios" (
    "codigo_rastreio" "text" NOT NULL,
    "solicitacao_id" "uuid" NOT NULL,
    "ultimo_evento_codigo" "text",
    "ultimo_evento_descricao" "text",
    "unidade_cidade" "text",
    "unidade_uf" "text",
    "ultimo_check_em" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."rastreamento_correios" OWNER TO "postgres";


COMMENT ON TABLE "public"."rastreamento_correios" IS 'Último evento de rastreio Correios por solicitação (1:1).';



CREATE TABLE IF NOT EXISTS "public"."solicitacoes_historico" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "solicitacao_id" "uuid" NOT NULL,
    "user_nome" "text" NOT NULL,
    "acao" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."solicitacoes_historico" OWNER TO "postgres";


COMMENT ON TABLE "public"."solicitacoes_historico" IS 'Auditoria de movimentos das solicitacoes de logistica reversa.';



CREATE TABLE IF NOT EXISTS "public"."solicitacoes_reverso" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "empresa" "text" NOT NULL,
    "data_solicitacao" "date" NOT NULL,
    "solicitante" "text" NOT NULL,
    "setor" "text" NOT NULL,
    "codigo_cliente" integer NOT NULL,
    "nome_cliente" "text" NOT NULL,
    "endereco_postagem" "text" NOT NULL,
    "motivo" "text" NOT NULL,
    "justificativa_outros" "text",
    "autorizacao" "text" NOT NULL,
    "status" "text" DEFAULT 'pendente'::"text" NOT NULL,
    "etiqueta_gerada_em" timestamp with time zone,
    "postado_em" timestamp with time zone,
    "concluido_em" timestamp with time zone,
    "anotacoes" "text",
    "tempo_preenchimento_segundos" integer DEFAULT 0 NOT NULL,
    "em_transito_em" timestamp with time zone,
    "codigo_rastreio" "text",
    "ultima_cidade_rastreio" "text",
    CONSTRAINT "solicitacoes_reverso_empresa_check" CHECK (("empresa" = ANY (ARRAY['Alinare'::"text", 'Novitah'::"text"]))),
    CONSTRAINT "solicitacoes_reverso_motivo_check" CHECK (("motivo" = ANY (ARRAY['Peça com defeito'::"text", 'Mercadoria errada'::"text", 'Endereço incorreto'::"text", 'Baixa qualidade no conserto'::"text", 'Outros'::"text"]))),
    CONSTRAINT "solicitacoes_reverso_status_check" CHECK (("status" = ANY (ARRAY['pendente'::"text", 'etiqueta_gerada'::"text", 'postado'::"text", 'em_transito'::"text", 'concluido'::"text"])))
);


ALTER TABLE "public"."solicitacoes_reverso" OWNER TO "postgres";


COMMENT ON TABLE "public"."solicitacoes_reverso" IS 'Solicitações de logística reversa das empresas Alinare e Novitah.';



COMMENT ON COLUMN "public"."solicitacoes_reverso"."justificativa_outros" IS 'Campo obrigatório somente quando motivo = ''Outros''. NULL nos demais casos.';



COMMENT ON COLUMN "public"."solicitacoes_reverso"."tempo_preenchimento_segundos" IS 'Segundos decorridos entre a abertura do formulário e o envio pelo usuário.';



ALTER TABLE ONLY "public"."rastreamento_correios"
    ADD CONSTRAINT "rastreamento_correios_pkey" PRIMARY KEY ("codigo_rastreio");



ALTER TABLE ONLY "public"."solicitacoes_historico"
    ADD CONSTRAINT "solicitacoes_historico_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."solicitacoes_reverso"
    ADD CONSTRAINT "solicitacoes_reverso_pkey" PRIMARY KEY ("id");



CREATE UNIQUE INDEX "idx_rc_solicitacao" ON "public"."rastreamento_correios" USING "btree" ("solicitacao_id");



CREATE INDEX "idx_sh_solicitacao" ON "public"."solicitacoes_historico" USING "btree" ("solicitacao_id", "created_at" DESC);



CREATE UNIQUE INDEX "idx_sr_codigo_rastreio" ON "public"."solicitacoes_reverso" USING "btree" ("codigo_rastreio") WHERE ("codigo_rastreio" IS NOT NULL);



CREATE INDEX "idx_sr_data_solicitacao" ON "public"."solicitacoes_reverso" USING "btree" ("data_solicitacao" DESC);



CREATE INDEX "idx_sr_empresa" ON "public"."solicitacoes_reverso" USING "btree" ("empresa");



CREATE INDEX "idx_sr_empresa_data" ON "public"."solicitacoes_reverso" USING "btree" ("empresa", "data_solicitacao" DESC);



CREATE INDEX "idx_sr_status" ON "public"."solicitacoes_reverso" USING "btree" ("status");



ALTER TABLE ONLY "public"."rastreamento_correios"
    ADD CONSTRAINT "rastreamento_correios_solicitacao_id_fkey" FOREIGN KEY ("solicitacao_id") REFERENCES "public"."solicitacoes_reverso"("id") ON DELETE CASCADE;



CREATE POLICY "delete_solicitacoes_admin" ON "public"."solicitacoes_reverso" FOR DELETE USING ("public"."is_admin"());



CREATE POLICY "insert_historico" ON "public"."solicitacoes_historico" FOR INSERT WITH CHECK (("auth"."role"() = 'authenticated'::"text"));



CREATE POLICY "insert_rastreamento" ON "public"."rastreamento_correios" FOR INSERT TO "authenticated" WITH CHECK (true);



CREATE POLICY "insert_solicitacoes_por_escopo" ON "public"."solicitacoes_reverso" FOR INSERT WITH CHECK ((("public"."current_empresa_scope"() IS NULL) OR ("empresa" = "public"."current_empresa_scope"())));



ALTER TABLE "public"."rastreamento_correios" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "select_historico" ON "public"."solicitacoes_historico" FOR SELECT USING (("auth"."role"() = 'authenticated'::"text"));



CREATE POLICY "select_rastreamento" ON "public"."rastreamento_correios" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "select_solicitacoes_por_escopo" ON "public"."solicitacoes_reverso" FOR SELECT USING ((("public"."current_empresa_scope"() IS NULL) OR ("empresa" = "public"."current_empresa_scope"())));



ALTER TABLE "public"."solicitacoes_historico" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."solicitacoes_reverso" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "update_rastreamento" ON "public"."rastreamento_correios" FOR UPDATE TO "authenticated" USING (true) WITH CHECK (true);



CREATE POLICY "update_solicitacoes_admins" ON "public"."solicitacoes_reverso" FOR UPDATE USING (("public"."is_admin"() OR ("public"."current_perfil_legacy"() = 'Expedicao'::"text") OR ("public"."current_telas"() @> ARRAY['lista-geral'::"text"]) OR ("public"."current_telas"() @> ARRAY['lista-alinare'::"text"]) OR ("public"."current_telas"() @> ARRAY['lista-novitah'::"text"]) OR ("public"."current_telas"() @> ARRAY['status-geral'::"text"]) OR ("public"."current_telas"() @> ARRAY['status-alinare'::"text"]) OR ("public"."current_telas"() @> ARRAY['status-novitah'::"text"]) OR ("public"."current_telas"() @> ARRAY['kanban'::"text"]) OR ("public"."current_telas"() @> ARRAY['kanban-edit'::"text"])));





ALTER PUBLICATION "supabase_realtime" OWNER TO "postgres";





GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";














































































































































































GRANT ALL ON FUNCTION "public"."current_empresa_scope"() TO "anon";
GRANT ALL ON FUNCTION "public"."current_empresa_scope"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."current_empresa_scope"() TO "service_role";



GRANT ALL ON FUNCTION "public"."current_perfil_legacy"() TO "anon";
GRANT ALL ON FUNCTION "public"."current_perfil_legacy"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."current_perfil_legacy"() TO "service_role";



GRANT ALL ON FUNCTION "public"."current_telas"() TO "anon";
GRANT ALL ON FUNCTION "public"."current_telas"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."current_telas"() TO "service_role";



GRANT ALL ON FUNCTION "public"."is_admin"() TO "anon";
GRANT ALL ON FUNCTION "public"."is_admin"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."is_admin"() TO "service_role";
























GRANT ALL ON TABLE "public"."rastreamento_correios" TO "anon";
GRANT ALL ON TABLE "public"."rastreamento_correios" TO "authenticated";
GRANT ALL ON TABLE "public"."rastreamento_correios" TO "service_role";



GRANT ALL ON TABLE "public"."solicitacoes_historico" TO "anon";
GRANT ALL ON TABLE "public"."solicitacoes_historico" TO "authenticated";
GRANT ALL ON TABLE "public"."solicitacoes_historico" TO "service_role";



GRANT ALL ON TABLE "public"."solicitacoes_reverso" TO "anon";
GRANT ALL ON TABLE "public"."solicitacoes_reverso" TO "authenticated";
GRANT ALL ON TABLE "public"."solicitacoes_reverso" TO "service_role";









ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "service_role";































drop extension if exists "pg_net";

create extension if not exists "pg_net" with schema "public";


