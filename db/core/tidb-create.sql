-- ============================================================
-- TiDB CREATE (CORE)
-- Run against:
--   USER DB  : dev / prd
--   ADMIN DB : dev_admin / prd_admin
-- ============================================================

-- ============================================================
-- USER DB
-- ============================================================

CREATE TABLE IF NOT EXISTS user_t (
  id              INT AUTO_INCREMENT PRIMARY KEY,
  user_id         VARCHAR(36) UNIQUE NOT NULL,
  last_login_at   DATETIME,
  created_at      DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at      DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  delete_flg      INT NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS login_t (
  id         INT AUTO_INCREMENT PRIMARY KEY,
  user_id    VARCHAR(36) NOT NULL,
  login_type ENUM('wallet', 'google', 'line', 'apple') NOT NULL,
  login_key  VARCHAR(500) NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  delete_flg INT NOT NULL DEFAULT 0,
  UNIQUE KEY uq_login (login_type, login_key, delete_flg)
);

-- ============================================================
-- ADMIN DB
-- ============================================================

CREATE TABLE IF NOT EXISTS platform_versions (
  id            INT AUTO_INCREMENT PRIMARY KEY,
  platform      VARCHAR(20) NOT NULL,
  version       VARCHAR(20) NOT NULL,
  release_notes TEXT,
  download_url  VARCHAR(500),
  created_at    DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at    DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_platform (platform)
);

CREATE TABLE IF NOT EXISTS maintenance_m (
  id         INT AUTO_INCREMENT PRIMARY KEY,
  status     INT NOT NULL DEFAULT 0,
  message_ja VARCHAR(500) NOT NULL DEFAULT '',
  message_en VARCHAR(500) NOT NULL DEFAULT '',
  message_ko VARCHAR(500) NOT NULL DEFAULT '',
  message_cn VARCHAR(500) NOT NULL DEFAULT '',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  delete_flg INT NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS information_m (
  id               INT AUTO_INCREMENT PRIMARY KEY,
  title_ja         VARCHAR(200) NOT NULL,
  title_en         VARCHAR(200) NOT NULL DEFAULT '',
  title_ko         VARCHAR(200) NOT NULL DEFAULT '',
  title_cn         VARCHAR(200) NOT NULL DEFAULT '',
  body_ja          TEXT,
  body_en          TEXT,
  body_ko          TEXT,
  body_cn          TEXT,
  display_start_at DATETIME NOT NULL,
  display_end_at   DATETIME DEFAULT NULL,
  priority         INT NOT NULL DEFAULT 0,
  created_at       DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at       DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  delete_flg       INT NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS exclude_users (
  id         INT AUTO_INCREMENT PRIMARY KEY,
  user_id    VARCHAR(36) NOT NULL,
  reason     VARCHAR(200),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  delete_flg INT NOT NULL DEFAULT 0,
  UNIQUE KEY uq_user (user_id, delete_flg)
);

CREATE TABLE IF NOT EXISTS admin_users (
  id                    INT AUTO_INCREMENT PRIMARY KEY,
  mail_address          VARCHAR(200) NOT NULL UNIQUE,
  password_hash         VARCHAR(128) NOT NULL,
  auth_level            ENUM('superadmin', 'admin', 'viewer') NOT NULL DEFAULT 'admin',
  failed_login_attempts INT NOT NULL DEFAULT 0,
  locked_until          DATETIME DEFAULT NULL,
  created_at            DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at            DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  delete_flg            INT NOT NULL DEFAULT 0
);
