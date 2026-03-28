-- cnpj_chatinteligente.sql
-- Banco: MySQL / MariaDB
-- Módulos:
--   187 -> /dashboard/cnpj-chatinteligente (configuração do agente)
--   188 -> /dashboard/cpnj-conexoes (conexões WhatsApp)

CREATE TABLE IF NOT EXISTS cnpj_chatinteligente_agents (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  module_id INT NOT NULL DEFAULT 187,
  user_id INT NOT NULL,
  agent_name VARCHAR(120) NOT NULL,
  openai_api_key TEXT NULL,
  prompt LONGTEXT NOT NULL,
  status ENUM('ativo','inativo') NOT NULL DEFAULT 'ativo',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_chat_agent_user (user_id),
  KEY idx_chat_agent_module (module_id),
  KEY idx_chat_agent_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS cnpj_chatinteligente_connections (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  module_id INT NOT NULL DEFAULT 188,
  user_id INT NOT NULL,
  session_name VARCHAR(120) NOT NULL,
  whatsapp_number VARCHAR(20) NOT NULL,
  connection_status ENUM('pendente','conectado','desconectado') NOT NULL DEFAULT 'pendente',
  qr_code LONGTEXT NULL,
  last_connected_at DATETIME NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_chat_conn_user (user_id),
  KEY idx_chat_conn_module (module_id),
  KEY idx_chat_conn_status (connection_status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Ajustes defensivos para bases antigas (sem IF NOT EXISTS em ALTER TABLE)
SET @db_name := DATABASE();

SELECT COUNT(*) INTO @has_agent_status
FROM information_schema.COLUMNS
WHERE TABLE_SCHEMA = @db_name
  AND TABLE_NAME = 'cnpj_chatinteligente_agents'
  AND COLUMN_NAME = 'status';
SET @sql := IF(@has_agent_status = 0,
  'ALTER TABLE cnpj_chatinteligente_agents ADD COLUMN status ENUM("ativo","inativo") NOT NULL DEFAULT "ativo" AFTER prompt',
  'SELECT "Coluna status já existe"');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SELECT COUNT(*) INTO @has_conn_status
FROM information_schema.COLUMNS
WHERE TABLE_SCHEMA = @db_name
  AND TABLE_NAME = 'cnpj_chatinteligente_connections'
  AND COLUMN_NAME = 'connection_status';
SET @sql := IF(@has_conn_status = 0,
  'ALTER TABLE cnpj_chatinteligente_connections ADD COLUMN connection_status ENUM("pendente","conectado","desconectado") NOT NULL DEFAULT "pendente" AFTER whatsapp_number',
  'SELECT "Coluna connection_status já existe"');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
