-- ============================================================
-- Migração: setup do cron (pg_cron + pg_net)
-- Executar no Supabase SQL Editor
-- ============================================================

-- Requer extensões pg_cron e pg_net (habilitar em Database > Extensions no painel Supabase)
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

SELECT cron.schedule(
  'correios-rastreio-30min',
  '*/30 * * * *',
  $$
  SELECT net.http_post(
    url := 'https://ymrrguubkqbxndhoxhor.supabase.co/functions/v1/correios-rastreio',
    headers := jsonb_build_object(
      'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InltcnJndXVia3FieG5kaG94aG9yIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4NjcyNTEzMywiZXhwIjoyMTAyMzAxMTMzfQ.2ydD4vwAJkw7l5PXI7imDbAXaX13TVbvgbyTGBQoamM',
      'Content-Type', 'application/json'
    ),
    body := '{}'::jsonb
  );
  $$
);

-- Para remover caso precise:
-- SELECT cron.unschedule('correios-rastreio-30min');
