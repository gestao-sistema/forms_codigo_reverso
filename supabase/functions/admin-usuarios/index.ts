// ── Supabase Edge Function: Admin Usuários ─────────────────────────────────────
// Gerencia CRUD no auth.users via supabase.auth.admin. Requer service_role.
// Protegido: valida se o chamador possui tela 'usuarios' no metadata do JWT.
// Execução: Deno (Edge Runtime)
// ─────────────────────────────────────────────────────────────────────────────

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.112.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Telas válidas
const TELAS_VALIDAS = [
  'dashboard-geral',
  'dashboard-alinare',
  'dashboard-novitah',
  'formulario-alinare',
  'formulario-novitah',
  'lista-geral',
  'lista-alinare',
  'lista-novitah',
  'status-geral',
  'status-alinare',
  'status-novitah',
  'kanban',
  'kanban-edit',
  'usuarios',
];

function normalizarTelas(telas: string[]): string[] {
  return telas.filter((t) => TELAS_VALIDAS.includes(t));
}

/**
 * Telas do usuário com fallback legado: se o metadata não tem `telas`
 * mas tem `perfil` antigo (ADMIN/Alinare/Novitah/Expedicao), deriva delas.
 * Espelha normalizarTelas() do frontend (authService.ts).
 */
function telasDoUsuario(md: Record<string, any> = {}): string[] {
  if (Array.isArray(md.telas) && md.telas.length > 0) return md.telas as string[];
  const LEGADO: Record<string, string[]> = {
    ADMIN: [...TELAS_VALIDAS],
    Expedicao: ['dashboard-geral', 'lista-geral', 'status-geral', 'kanban', 'kanban-edit'],
    Alinare: ['dashboard-alinare', 'formulario-alinare', 'lista-alinare', 'status-alinare', 'kanban'],
    Novitah: ['dashboard-novitah', 'formulario-novitah', 'lista-novitah', 'status-novitah', 'kanban'],
  };
  return LEGADO[md.perfil] ?? [];
}

function ehAdmin(md: Record<string, any> = {}): boolean {
  return md.perfil === 'ADMIN' || telasDoUsuario(md).includes('usuarios');
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) throw new Error('Authorization header missing');

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    );

    // 1. Validar identidade e telas do chamador (caller)
    const { data: { user: caller }, error: callerError } = await supabaseClient.auth.getUser();
    if (callerError || !caller) throw new Error('Acesso negado: token inválido.');

    const callerMd = caller.user_metadata ?? {};
    if (!ehAdmin(callerMd)) {
      throw new Error('Acesso negado: requer permissão de administração (tela "usuarios").');
    }

    // 2. Cliente com service_role para operar no auth.admin
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    const { action, payload } = await req.json();

    if (action === 'create') {
      const email = `${payload.usuario}@cr.internal`.toLowerCase();
      const { data, error } = await supabaseAdmin.auth.admin.createUser({
        email,
        password: payload.senha,
        email_confirm: true,
        user_metadata: {
          nome: payload.nome,
          usuario: payload.usuario.toLowerCase(),
          telas: normalizarTelas(payload.telas ?? []),
        }
      });
      if (error) throw error;
      return new Response(JSON.stringify({ data: data.user }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    if (action === 'update') {
      // payload.id é o user_id no auth.users
      const { id, nome, telas, usuario, senha } = payload;

      // Protege o administrador padrão (login 'admin'): login/telas imutáveis
      const { data: alvoAtual, error: alvoError } = await supabaseAdmin.auth.admin.getUserById(id);
      if (alvoError) throw alvoError;
      const loginAtual = alvoAtual.user?.user_metadata?.usuario;
      if (loginAtual === 'admin' && (usuario || telas)) {
        throw new Error('Não é possível alterar login ou telas do administrador padrão.');
      }

      const updateData: any = { user_metadata: {} };
      if (nome) updateData.user_metadata.nome = nome;
      if (telas) updateData.user_metadata.telas = normalizarTelas(telas);
      if (usuario) {
        updateData.user_metadata.usuario = usuario.toLowerCase();
        updateData.email = `${usuario.toLowerCase()}@cr.internal`;
      }
      if (senha) updateData.password = senha;

      const { data, error } = await supabaseAdmin.auth.admin.updateUserById(id, updateData);
      if (error) throw error;
      return new Response(JSON.stringify({ data: data.user }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    if (action === 'delete') {
      if (payload.id === caller.id) throw new Error('Não é possível remover a si próprio.');

      const { error } = await supabaseAdmin.auth.admin.deleteUser(payload.id);
      if (error) throw error;
      return new Response(JSON.stringify({ success: true }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    if (action === 'list') {
      const { data, error } = await supabaseAdmin.auth.admin.listUsers();
      if (error) throw error;

      const usuarios = data.users.map(u => ({
        id: u.id,
        nome: u.user_metadata?.nome,
        usuario: u.user_metadata?.usuario,
        telas: u.user_metadata?.telas ?? [],
      })).sort((a, b) => a.nome.localeCompare(b.nome));

      return new Response(JSON.stringify({ data: usuarios }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    throw new Error('Action unknown');

  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});