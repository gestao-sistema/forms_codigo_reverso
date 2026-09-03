-- ============================================================
-- Script p/ popular banco com massa de dados fictícios
-- Empresas: Alinare, Novitah
-- Status: pendente, etiqueta_gerada, postado, em_transito, concluido
-- ============================================================

INSERT INTO solicitacoes_reverso (
  empresa, data_solicitacao, solicitante, setor, codigo_cliente, nome_cliente, endereco_postagem, motivo, justificativa_outros, autorizacao, status, tempo_preenchimento_segundos
) VALUES
-- 1. PENDENTES
('Alinare', CURRENT_DATE, 'João Vendedor', 'Comercial Alinare', 101, 'Maria Silva', 'Rua A, 123', 'Peça com defeito', null, 'Joice Mendes', 'pendente', 45),
('Alinare', CURRENT_DATE - INTERVAL '1 day', 'Maria Silva', 'Comercial Alinare', 102, 'José Souza', 'Av Brasil, 1000', 'Outros', 'Produto amarelado na vitrine', 'Viviane Ulian', 'pendente', 120),
('Novitah', CURRENT_DATE, 'Lucas Novitah', 'Comercial Novitah', 201, 'Boutique Chique', 'Rua B, 44', 'Endereço incorreto', null, 'Marcelo Gualtieri', 'pendente', 30),

-- 2. ETIQUETA GERADA
('Alinare', CURRENT_DATE - INTERVAL '2 days', 'João Vendedor', 'Comercial Alinare', 103, 'Loja da Esquina', 'Rua Central, 5', 'Mercadoria errada', null, 'Sheila Cristina', 'etiqueta_gerada', 60),
('Novitah', CURRENT_DATE - INTERVAL '1 day', 'Ana Vendedora', 'Comercial Novitah', 202, 'Magazine Luz', 'Av Paulista, 900', 'Baixa qualidade no conserto', null, 'Ludmila Amancio', 'etiqueta_gerada', 55),

-- 3. POSTADOS
('Alinare', CURRENT_DATE - INTERVAL '3 days', 'Maria Silva', 'Comercial Alinare', 104, 'Super Fashion', 'Rua Direita, 20', 'Peça com defeito', null, 'Joice Mendes', 'postado', 40),
('Novitah', CURRENT_DATE - INTERVAL '4 days', 'Lucas Novitah', 'Comercial Novitah', 203, 'Outlet XYZ', 'Rodovia BR, km 10', 'Endereço incorreto', null, 'Marcelo Gualtieri', 'postado', 90),

-- 4. EM TRÂNSITO (Status 4)
('Alinare', CURRENT_DATE - INTERVAL '5 days', 'João Vendedor', 'Comercial Alinare', 105, 'Mega Modas', 'Shopping Sul, Loja 3', 'Mercadoria errada', null, 'Viviane Ulian', 'em_transito', 45),
('Novitah', CURRENT_DATE - INTERVAL '6 days', 'Ana Vendedora', 'Comercial Novitah', 204, 'Loja Centro', 'Praça da Sé, 1', 'Peça com defeito', null, 'Ludmila Amancio', 'em_transito', 35),

-- 5. CONCLUÍDOS
('Alinare', CURRENT_DATE - INTERVAL '10 days', 'Maria Silva', 'Comercial Alinare', 106, 'Boutique Z', 'Rua Nova, 99', 'Peça com defeito', null, 'Joice Mendes', 'concluido', 50),
('Novitah', CURRENT_DATE - INTERVAL '15 days', 'Lucas Novitah', 'Comercial Novitah', 205, 'Outlet A', 'Av Central, 200', 'Outros', 'Acordo comercial - devolução total', 'Marcelo Gualtieri', 'concluido', 110);

-- Update campos de tempo e rastreio para fazer sentido com os status acima
UPDATE solicitacoes_reverso
SET etiqueta_gerada_em = NOW() - INTERVAL '1 hour'
WHERE status IN ('etiqueta_gerada', 'postado', 'em_transito', 'concluido');

UPDATE solicitacoes_reverso
SET postado_em = NOW() - INTERVAL '24 hours'
WHERE status IN ('postado', 'em_transito', 'concluido');

UPDATE solicitacoes_reverso
SET em_transito_em = NOW() - INTERVAL '2 days',
    -- Gera código de rastreio único para cada linha afetada usando a parte inicial do ID
    codigo_rastreio = 'ON' || UPPER(SUBSTRING(id::text FROM 1 FOR 9)) || 'BR',
    ultima_cidade_rastreio = 'São Paulo/SP'
WHERE status IN ('em_transito', 'concluido');

UPDATE solicitacoes_reverso
SET concluido_em = NOW() - INTERVAL '5 days',
    ultima_cidade_rastreio = 'Belo Horizonte/MG'
WHERE status = 'concluido';
