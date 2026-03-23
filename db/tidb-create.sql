-- ============================================================
-- TiDB CREATE文
-- 接続先:
--   USER DB  : TIDB_DB_DEV (dev)    / TIDB_DB_PRD (prd)
--   ADMIN DB : TIDB_DB_ADMIN_DEV (dev_admin) / TIDB_DB_ADMIN_PRD (prd_admin)
-- ============================================================


-- ============================================================
-- USER DB  (dev / prd)
-- ============================================================

-- ユーザーマスタ
CREATE TABLE IF NOT EXISTS user_t (
  id         INT AUTO_INCREMENT PRIMARY KEY,
  user_id    VARCHAR(36)  UNIQUE NOT NULL,       -- Firebase UID / UUID
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  delete_flg INT NOT NULL DEFAULT 0
);

-- ログイン連携
CREATE TABLE IF NOT EXISTS login_t (
  id         INT AUTO_INCREMENT PRIMARY KEY,
  user_id    VARCHAR(36)  NOT NULL,
  login_type ENUM('wallet', 'google', 'line', 'apple') NOT NULL,
  login_key  VARCHAR(500) NOT NULL,              -- wallet address / Google sub / LINE uid
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  delete_flg INT NOT NULL DEFAULT 0,
  UNIQUE KEY uq_login (login_type, login_key, delete_flg)
);

-- ユーザー課金状態 (将来実装: 現在は Firebase billing/ を使用)
CREATE TABLE IF NOT EXISTS billing_status_t (
  id                     INT AUTO_INCREMENT PRIMARY KEY,
  user_id                VARCHAR(36)  NOT NULL,
  plan_key               VARCHAR(64)  NOT NULL,
  billing_type           ENUM('subscription', 'metered', 'one_time') NOT NULL,
  stripe_customer_id     VARCHAR(100),
  stripe_subscription_id VARCHAR(100),
  status                 ENUM('free', 'active', 'cancel_requested', 'cancelled', 'past_due', 'one_time_paid') NOT NULL DEFAULT 'free',
  subscribed_at          DATETIME,
  cancel_requested_at    DATETIME,
  cancel_at_period_end   TINYINT(1)   NOT NULL DEFAULT 0,
  cancelled_at           DATETIME,
  current_period_start   DATETIME,
  current_period_end     DATETIME,
  created_at             DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at             DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  delete_flg             INT NOT NULL DEFAULT 0,
  UNIQUE KEY uq_user_plan (user_id, plan_key, delete_flg),
  KEY idx_stripe_customer (stripe_customer_id),
  KEY idx_stripe_subscription (stripe_subscription_id),
  KEY idx_user_status (user_id, status)
);

-- 課金ログ (将来実装)
CREATE TABLE IF NOT EXISTS billing_log_t (
  id               BIGINT AUTO_INCREMENT PRIMARY KEY,
  user_id          VARCHAR(36)  NOT NULL,
  plan_key         VARCHAR(64)  NOT NULL,
  event_type       ENUM(
                     'subscribed',
                     'subscription_updated',
                     'cancel_requested',
                     'reactivated',
                     'cancelled',
                     'payment_succeeded',
                     'payment_failed',
                     'usage_reported',
                     'one_time_paid',
                     'migrated_from_firebase'
                   ) NOT NULL,
  stripe_event_id  VARCHAR(100),
  amount           INT,
  currency         VARCHAR(10),
  quantity         INT,
  description      TEXT,
  raw_payload      JSON,
  created_at       DATETIME DEFAULT CURRENT_TIMESTAMP,
  KEY idx_user_created (user_id, created_at DESC),
  KEY idx_stripe_event (stripe_event_id)
);

-- 月次使用量 (将来実装)
CREATE TABLE IF NOT EXISTS billing_usage_t (
  id                 BIGINT AUTO_INCREMENT PRIMARY KEY,
  user_id            VARCHAR(36)  NOT NULL,
  plan_key           VARCHAR(64)  NOT NULL,
  period_year        SMALLINT     NOT NULL,
  period_month       TINYINT      NOT NULL,
  usage_type         ENUM('transaction', 'kyc_email', 'api_call', 'custom') NOT NULL DEFAULT 'transaction',
  units              INT          NOT NULL DEFAULT 0,
  stripe_reported_at DATETIME,
  created_at         DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at         DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_usage_period (user_id, plan_key, period_year, period_month, usage_type),
  KEY idx_user_period (user_id, period_year, period_month)
);


-- ============================================================
-- ADMIN DB  (dev_admin / prd_admin)
-- ============================================================

-- プラットフォームバージョン
CREATE TABLE IF NOT EXISTS platform_versions (
  id            INT AUTO_INCREMENT PRIMARY KEY,
  platform      VARCHAR(20)  NOT NULL,           -- 'win' | 'mac' | 'linux'
  version       VARCHAR(20)  NOT NULL,
  release_notes TEXT,
  download_url  VARCHAR(500),
  created_at    DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at    DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_platform (platform)
);

-- メンテナンス設定
CREATE TABLE IF NOT EXISTS maintenance_m (
  id             INT AUTO_INCREMENT PRIMARY KEY,
  title          VARCHAR(200) NOT NULL,
  message        TEXT,
  is_active      TINYINT(1)   NOT NULL DEFAULT 0,
  scheduled_end  DATETIME,
  created_at     DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at     DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  delete_flg     INT NOT NULL DEFAULT 0
);

-- お知らせ
CREATE TABLE IF NOT EXISTS information_m (
  id           INT AUTO_INCREMENT PRIMARY KEY,
  title        VARCHAR(200) NOT NULL,
  body         TEXT,
  is_active    TINYINT(1)   NOT NULL DEFAULT 0,
  published_at DATETIME,
  created_at   DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at   DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  delete_flg   INT NOT NULL DEFAULT 0
);

-- 除外ユーザー（メンテナンス中も利用可）
CREATE TABLE IF NOT EXISTS exclude_users (
  id         INT AUTO_INCREMENT PRIMARY KEY,
  user_id    VARCHAR(36)  NOT NULL,
  reason     VARCHAR(200),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  delete_flg INT NOT NULL DEFAULT 0,
  UNIQUE KEY uq_user (user_id, delete_flg)
);

-- 管理者ユーザー
CREATE TABLE IF NOT EXISTS admin_users (
  id           INT AUTO_INCREMENT PRIMARY KEY,
  firebase_uid VARCHAR(128) NOT NULL UNIQUE,
  email        VARCHAR(200),
  role         ENUM('superadmin', 'admin', 'viewer') NOT NULL DEFAULT 'admin',
  created_at   DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at   DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  delete_flg   INT NOT NULL DEFAULT 0
);

-- 課金プランマスタ (将来実装)
CREATE TABLE IF NOT EXISTS billing_plan_m (
  id               INT AUTO_INCREMENT PRIMARY KEY,
  plan_key         VARCHAR(64)  NOT NULL,
  billing_type     ENUM('subscription', 'metered', 'one_time') NOT NULL,
  display_name_ja  VARCHAR(200) NOT NULL,
  display_name_en  VARCHAR(200) NOT NULL,
  stripe_price_id  VARCHAR(100) NOT NULL,
  unit_amount      INT          NOT NULL DEFAULT 0,
  currency         VARCHAR(10)  NOT NULL DEFAULT 'jpy',
  free_unit_limit  INT          NOT NULL DEFAULT 0,
  description_ja   TEXT,
  description_en   TEXT,
  is_active        TINYINT(1)   NOT NULL DEFAULT 1,
  sort_order       INT          NOT NULL DEFAULT 0,
  created_at       DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at       DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  delete_flg       INT NOT NULL DEFAULT 0,
  UNIQUE KEY uq_plan_key (plan_key, delete_flg)
);
