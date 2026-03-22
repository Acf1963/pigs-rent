USE pwa_agro_analytics;

-- Inserir Lotes Iniciais
INSERT INTO dim_lote (codigo_lote, fornecedor_origem, data_inicio_lote) VALUES 
('LOTE-2026-001', 'Fazenda Quanza', '2026-03-01'),
('LOTE-2026-002', 'Agro-Viana', '2026-03-15');

-- Inserir Animais (Exemplo de 5 porcos)
INSERT INTO dim_animal (id_brinco_rfid, sexo, linhagem_genetica, data_nascimento) VALUES 
('RFID-9001', 'M', 'Duroc', '2025-12-01'),
('RFID-9002', 'F', 'Landrace', '2025-12-05'),
('RFID-9003', 'M', 'Pietrain', '2025-11-20'),
('RFID-9004', 'F', 'Duroc', '2025-12-10'),
('RFID-9005', 'M', 'Large White', '2025-11-15');

-- Inserir Factos Iniciais (Entrada no Sistema)
INSERT INTO fact_ciclo_vida_suino 
(fk_animal, fk_lote, peso_origem, peso_chegada, custo_aquisicao, data_entrada) VALUES 
(1, 1, 25.500, 24.800, 45.00, '2026-03-01'),
(2, 1, 26.200, 25.100, 45.00, '2026-03-01'),
(3, 2, 28.000, 27.200, 50.00, '2026-03-15');