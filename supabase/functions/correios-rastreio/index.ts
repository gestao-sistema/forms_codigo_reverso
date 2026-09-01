// ── Supabase Edge Function: Correios Rastreio ──────────────────────────────
// Consulta API dos Correios (rastro) iterando sobre múltiplos contratos.
// Retorna a payload real para o frontend, e atualiza status/rastreamento_correios.
// ─────────────────────────────────────────────────────────────────────────

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.112.3';
import { mapEventoParaStatus, extrairEventos, type EventoRastro } from './logic.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Cache de tokens por conta (empresa/prefixo)
const tokensCache: Record<string, { token: string; expiraEmMs: number }> = {};

/** Busca token ativo para uma conta específica. */
async function getTokenParaConta(prefixo: string): Promise<string> {
  const agora = Date.now();
  if (tokensCache[prefixo] && agora < tokensCache[prefixo].expiraEmMs - 60_000) {
    return tokensCache[prefixo].token;
  }

  const usuario = Deno.env.get(`CORREIOS_USUARIO_${prefixo}`);
  const senha = Deno.env.get(`CORREIOS_SENHA_${prefixo}`);
  const cartao = Deno.env.get(`CORREIOS_CARTAO_POSTAGEM_${prefixo}`) ?? Deno.env.get(`CORREIOS_POSTAGEM_${prefixo}`);

  if (!usuario || !senha || !cartao) {
    throw new Error(`Credenciais Correios incompletas para ${prefixo}.`);
  }

  const basic = btoa(`${usuario}:${senha}`);
  const res = await fetch('https://api.correios.com.br/token/v1/autentica/cartaopostagem', {
    method: 'POST',
    headers: { Authorization: `Basic ${basic}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ numero: cartao }),
  });

  if (!res.ok) {
    throw new Error(`Falha autenticação Correios (${prefixo}): ${res.status} ${await res.text()}`);
  }

  const data = await res.json();
  tokensCache[prefixo] = { token: data.token, expiraEmMs: new Date(data.expiraEm).getTime() };
  return data.token;
}

/** Tenta consultar o objeto. Retorna o json bruto da API e status extraído se ok. */
async function consultarObjeto(codigoObjeto: string, token: string): Promise<{
  raw: any;
  pertenceAoContrato: boolean;
  ultimo: EventoRastro | null;
  todos: EventoRastro[];
} | null> {
  const res = await fetch(
    `https://api.correios.com.br/srorastro/v1/objetos/${codigoObjeto}?resultado=T`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
        'Accept-Language': 'pt-BR,pt;q=0.9',
        'Accept': 'application/json'
      }
    }
  );

  if (!res.ok) {
    console.error(`Erro rastreio HTTP ${res.status}`);
    return null;
  }

  const data = await res.json();
  const obj = data?.objetos?.[0] ?? {};

  // SRO-009: não pertence ao contrato. (SRO-020 é não localizado).
  const mensagem = obj.mensagem || '';
  if (mensagem.includes('SRO-009')) {
    return { raw: data, pertenceAoContrato: false, ultimo: null, todos: [] };
  }

  const eventos = extrairEventos(data) as EventoRastro[];
  return {
    raw: data,
    pertenceAoContrato: true,
    ultimo: eventos.length > 0 ? eventos[0] : null,
    todos: eventos,
  };
}

/** Fluxo principal: itera nas contas, busca, atualiza DB, retorna pro front. */
async function processarCodigo(supabaseAdmin: any, codigoRastreio: string) {
  // Lista de empresas baseadas nas chaves do ENV (ALINARE, AZIME, ARTIKLER, NOVITAH)
  const contas = ['ALINARE', 'AZIME', 'ARTIKLER', 'NOVITAH'];
  let ultimoRaw = null;
  let sucesso = false;
  let resultadoRastreio = null;

  for (const conta of contas) {
    try {
      const token = await getTokenParaConta(conta);
      const rastro = await consultarObjeto(codigoRastreio, token);

      if (rastro) {
        ultimoRaw = rastro.raw;
        // Se pertencer ao contrato ou já achou eventos reais (evita loop cego)
        if (rastro.pertenceAoContrato) {
          sucesso = true;
          resultadoRastreio = rastro;
          break; // Achou o contrato dono do pacote
        }
      }
    } catch (err) {
      console.warn(`[rastreio] ERRO conta ${conta}: ${(err as Error).message}`);
    }
  }

  // Se passou por todas as contas e nenhuma é dona, retorna o último raw (ex: SRO-009 ou SRO-020)
  if (!sucesso || !resultadoRastreio || !resultadoRastreio.ultimo) {
    return ultimoRaw || { erro: 'Falha de comunicação com os Correios.' };
  }

  // ── Atualização do BD (se achou eventos) ──
  const evento = resultadoRastreio.ultimo;
  const novoStatus = mapEventoParaStatus(evento.codigo);
  const cidade = evento.unidade?.endereco?.cidade ?? null;
  const uf = evento.unidade?.endereco?.uf ?? null;

  const { data: solicitacao } = await supabaseAdmin
    .from('solicitacoes_reverso')
    .select('id, status')
    .eq('codigo_rastreio', codigoRastreio)
    .maybeSingle();

  if (solicitacao) {
    // Se já concluído, não bate na API dos Correios — evita gasto de quota
    if (solicitacao.status === 'concluido') {
      return ultimoRaw || { erro: 'Solicitação já concluída.' };
    }
    await supabaseAdmin.from('rastreamento_correios').upsert({
      codigo_rastreio: codigoRastreio,
      solicitacao_id: solicitacao.id,
      ultimo_evento_codigo: evento.codigo,
      ultimo_evento_descricao: evento.descricao,
      unidade_cidade: cidade,
      unidade_uf: uf,
      eventos: resultadoRastreio.todos,
      ultimo_check_em: new Date().toISOString(),
    }, { onConflict: 'codigo_rastreio' });

    if (novoStatus && novoStatus !== solicitacao.status) {
      const timestampCol = novoStatus === 'postado' ? 'postado_em'
        : novoStatus === 'em_transito' ? 'em_transito_em'
        : 'concluido_em';

      await supabaseAdmin.from('solicitacoes_reverso').update({
        status: novoStatus,
        [timestampCol]: new Date().toISOString(),
        ultima_cidade_rastreio: cidade && uf ? `${cidade}/${uf}` : null,
      }).eq('id', solicitacao.id);

      await supabaseAdmin.from('solicitacoes_historico').insert({
        solicitacao_id: solicitacao.id,
        user_nome: 'Sistema (Correios)',
        acao: `Rastreio: ${evento.descricao}`,
      });
    }
  }

  // Retorna JSON bruto da API para o frontend
  return resultadoRastreio.raw;
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
    const supabaseAdmin = createClient(supabaseUrl, supabaseKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    let body: { codigo?: string } = {};
    try { body = await req.json(); } catch { /* Lote cron */ }

    // Chamada manual de um código (UI)
    if (body.codigo) {
      const rawPayload = await processarCodigo(supabaseAdmin, body.codigo);
      return new Response(JSON.stringify(rawPayload), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Lote cron (background) — inclui etiqueta_gerada: pacote pode ter sido
    // postado nos Correios sem o usuário registrar no sistema.
    const { data: pendentes } = await supabaseAdmin
      .from('solicitacoes_reverso')
      .select('codigo_rastreio')
      .in('status', ['etiqueta_gerada', 'postado', 'em_transito'])
      .not('codigo_rastreio', 'is', null);

    for (const row of pendentes ?? []) {
      await processarCodigo(supabaseAdmin, row.codigo_rastreio as string);
    }

    return new Response(JSON.stringify({ success: true, count: pendentes?.length || 0 }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});