CREATE DATABASE IF NOT EXISTS pwa_agro_analytics;
USE pwa_agro_analytics;

-- Tabela de Dimensão: Lote
CREATE TABLE IF NOT EXISTS dim_lote (
    sk_lote INT AUTO_INCREMENT PRIMARY KEY,
    codigo_lote VARCHAR(20) NOT NULL UNIQUE,
    fornecedor_origem VARCHAR(100),
    data_inicio_lote DATE
) ENGINE=InnoDB;

-- Tabela de Dimensão: Animal
CREATE TABLE IF NOT EXISTS dim_animal (
    sk_animal INT AUTO_INCREMENT PRIMARY KEY,
    id_brinco_rfid VARCHAR(50) NOT NULL UNIQUE,
    sexo ENUM('M', 'F'),
    linhagem_genetica VARCHAR(100),
    data_nascimento DATE
) ENGINE=InnoDB;

-- Tabela de Factos: Ciclo de Vida e Rentabilidade
CREATE TABLE IF NOT EXISTS fact_ciclo_vida_suino (
    sk_producao INT AUTO_INCREMENT PRIMARY KEY,
    fk_animal INT NOT NULL,
    fk_lote INT NOT NULL,
    peso_origem DECIMAL(10, 3),
    peso_chegada DECIMAL(10, 3),
    peso_vivo_final DECIMAL(10, 3),
    peso_carcaca_quente DECIMAL(10, 3),
    custo_aquisicao DECIMAL(12, 2),
    custo_alimentar_total DECIMAL(12, 2) DEFAULT 0.00,
    valor_venda_final DECIMAL(12, 2),
    data_entrada DATE,
    data_abate DATE,
    CONSTRAINT fk_animal FOREIGN KEY (fk_animal) REFERENCES dim_animal(sk_animal),
    CONSTRAINT fk_lote FOREIGN KEY (fk_lote) REFERENCES dim_lote(sk_lote)
) ENGINE=InnoDB;

-- Tabela de Logs de Erros (Data Quality)
CREATE TABLE IF NOT EXISTS log_erros_pesagem (
    id_erro INT AUTO_INCREMENT PRIMARY KEY,
    fk_animal INT,
    tipo_erro VARCHAR(100),
    valor_lido DECIMAL(10,3),
    data_deteccao TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    resolvido BOOLEAN DEFAULT FALSE
);