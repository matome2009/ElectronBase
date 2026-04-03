-- ============================================================
-- TiDB CREATE文 (combined compatibility file)
-- 接続先:
--   USER DB  : TIDB_DB_DEV (dev)    / TIDB_DB_PRD (prd)
--   ADMIN DB : TIDB_DB_ADMIN_DEV (dev_admin) / TIDB_DB_ADMIN_PRD (prd_admin)
-- 推奨:
--   core     -> db/core/tidb-create.sql
--   optional -> db/optional/tidb-create.sql
-- ============================================================


-- ============================================================
-- USER DB  (dev / prd)
-- ============================================================

-- ユーザーマスタ
CREATE TABLE IF NOT EXISTS user_t (
  id              INT AUTO_INCREMENT PRIMARY KEY,
  user_id         VARCHAR(36)  UNIQUE NOT NULL,       -- Firebase UID / UUID
  last_login_at   DATETIME,                           -- 最終ログイン日時（ゲスト自動削除判定に使用）
  created_at      DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at      DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  delete_flg      INT NOT NULL DEFAULT 0
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
-- ウォレット監視対象アドレス
-- ============================================================
CREATE TABLE IF NOT EXISTS watched_wallets_t (
  id         BIGINT AUTO_INCREMENT PRIMARY KEY,
  user_id    VARCHAR(36)  NOT NULL,
  address    VARCHAR(42)  NOT NULL,          -- lowercase 0x address
  chain_id   INT          NOT NULL,          -- 1=ETH, 137=Polygon, 42161=Arbitrum, 10=Optimism, 56=BSC
  label      VARCHAR(100),                   -- ユーザー定義のニックネーム
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  is_active  TINYINT(1)   NOT NULL DEFAULT 1,
  delete_flg INT NOT NULL DEFAULT 0,
  UNIQUE KEY uq_wallet (user_id, address, chain_id, delete_flg),
  KEY idx_user_chain (user_id, chain_id)
);

-- ============================================================
-- トランザクション事実テーブル（オンチェーンデータ / ユーザー非依存）
-- 同一txは1レコード。INSERT ... ON DUPLICATE KEY UPDATE で冪等。
-- ============================================================
CREATE TABLE IF NOT EXISTS transactions_t (
  id                BIGINT AUTO_INCREMENT PRIMARY KEY,
  chain_id          INT           NOT NULL,
  tx_hash           VARCHAR(66)   NOT NULL,    -- 0x + 64 hex chars
  block_number      BIGINT        NOT NULL,
  block_timestamp   DATETIME      NOT NULL,
  from_address      VARCHAR(42)   NOT NULL,
  to_address        VARCHAR(42)   NOT NULL,
  asset             VARCHAR(20)   NOT NULL,    -- 'ETH', 'USDC' 等
  contract_address  VARCHAR(42),              -- ネイティブ転送の場合 NULL
  token_id          VARCHAR(78),              -- ERC-721/1155 トークンID (uint256 の文字列)
  value             VARCHAR(78)   NOT NULL,    -- raw value (浮動小数点誤差回避のため文字列)
  decimals          TINYINT       NOT NULL DEFAULT 18,
  category          VARCHAR(20)   NOT NULL,    -- Alchemy category: external/erc20/erc721/erc1155
  gas_used          VARCHAR(78),              -- レシートの gasUsed（10進文字列）
  gas_price         VARCHAR(78),              -- effectiveGasPrice / gasPrice（Wei、10進文字列）
  raw_payload       JSON,                     -- Alchemy レスポンス全体（将来利用）
  synced_at         DATETIME DEFAULT CURRENT_TIMESTAMP,
  created_at        DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at        DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  delete_flg        INT NOT NULL DEFAULT 0,
  -- 同一チェーン・同一tx・同一from/to/asset で1レコード
  UNIQUE KEY uq_tx (chain_id, tx_hash, from_address, to_address, asset),
  KEY idx_chain_block (chain_id, block_number DESC),
  KEY idx_block_timestamp (block_timestamp DESC),
  KEY idx_from_address (from_address),
  KEY idx_to_address (to_address)
);

-- ============================================================
-- ユーザー×トランザクション紐付けテーブル（ユーザー固有の状態）
-- direction / state / watched_address はユーザー視点なのでここに持つ。
-- INSERT ... ON DUPLICATE KEY UPDATE で冪等。
-- ============================================================
CREATE TABLE IF NOT EXISTS user_transactions_t (
  id                BIGINT AUTO_INCREMENT PRIMARY KEY,
  user_id           VARCHAR(36)   NOT NULL,
  transaction_id    BIGINT        NOT NULL,    -- transactions_t.id
  watched_address   VARCHAR(42)   NOT NULL,    -- どの監視ウォレットがトリガーしたか
  direction         ENUM('in', 'out') NOT NULL, -- 監視ウォレット視点
  state             ENUM('unread', 'read') NOT NULL DEFAULT 'unread',
  is_flagged        TINYINT(1)    NOT NULL DEFAULT 0,   -- ★フラグ（state と独立）
  is_hidden         TINYINT(1)    NOT NULL DEFAULT 0,   -- 非表示（state と独立）
  label_ids         JSON, -- ラベルIDの配列（NULL = 空配列として扱う）
  sync_revision     BIGINT        NOT NULL DEFAULT 0,   -- 楽観ロック / 差分同期用の行版数
  created_at        DATETIME(6) DEFAULT CURRENT_TIMESTAMP(6),
  updated_at        DATETIME(6) DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  delete_flg        INT NOT NULL DEFAULT 0,
  UNIQUE KEY uq_user_tx (user_id, transaction_id, watched_address, direction),
  KEY idx_user_state (user_id, state),
  KEY idx_user_watched (user_id, watched_address),
  KEY idx_transaction (transaction_id),
  KEY idx_user_updated (user_id, updated_at, id)
);

-- ============================================================
-- ウォレットアドレス帳（コンタクト）
-- ============================================================
CREATE TABLE IF NOT EXISTS wallet_contacts_t (
  id          BIGINT AUTO_INCREMENT PRIMARY KEY,
  user_id     VARCHAR(36)  NOT NULL,
  address     VARCHAR(42)  NOT NULL,          -- lowercase 0x address
  label       VARCHAR(100) NOT NULL,          -- 表示名（必須）
  description VARCHAR(500),                  -- メモ・説明（電話番号・メアド等）
  created_at  DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at  DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  delete_flg  INT NOT NULL DEFAULT 0,
  UNIQUE KEY uq_contact (user_id, address, delete_flg),
  KEY idx_user (user_id)
);

-- ============================================================
-- トランザクションラベル
-- ============================================================
CREATE TABLE IF NOT EXISTS transaction_labels_t (
  id         BIGINT AUTO_INCREMENT PRIMARY KEY,
  user_id    VARCHAR(36)  NOT NULL,
  name       VARCHAR(100) NOT NULL,
  color      VARCHAR(7)   NOT NULL DEFAULT '#6366f1',  -- hex color code
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  delete_flg INT NOT NULL DEFAULT 0,
  KEY idx_user (user_id)
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
  status         INT          NOT NULL DEFAULT 0,
  message_ja     VARCHAR(500) NOT NULL DEFAULT '',
  message_en     VARCHAR(500) NOT NULL DEFAULT '',
  message_ko     VARCHAR(500) NOT NULL DEFAULT '',
  message_cn     VARCHAR(500) NOT NULL DEFAULT '',
  created_at     DATETIME     DEFAULT CURRENT_TIMESTAMP,
  updated_at     DATETIME     DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  delete_flg     INT          NOT NULL DEFAULT 0
);

-- お知らせ
CREATE TABLE IF NOT EXISTS information_m (
  id                INT AUTO_INCREMENT PRIMARY KEY,
  title_ja          VARCHAR(200) NOT NULL,
  title_en          VARCHAR(200) NOT NULL DEFAULT '',
  title_ko          VARCHAR(200) NOT NULL DEFAULT '',
  title_cn          VARCHAR(200) NOT NULL DEFAULT '',
  body_ja           TEXT,
  body_en           TEXT,
  body_ko           TEXT,
  body_cn           TEXT,
  display_start_at  DATETIME     NOT NULL,
  display_end_at    DATETIME     DEFAULT NULL,
  priority          INT          NOT NULL DEFAULT 0,
  created_at        DATETIME     DEFAULT CURRENT_TIMESTAMP,
  updated_at        DATETIME     DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  delete_flg        INT          NOT NULL DEFAULT 0
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

-- 課金プランマスタ (将来実装)
CREATE TABLE IF NOT EXISTS billing_plan_m (
  id               INT AUTO_INCREMENT PRIMARY KEY,
  plan_key         VARCHAR(64)  NOT NULL,
  billing_type     ENUM('subscription', 'metered', 'one_time') NOT NULL,
  display_name_ja  VARCHAR(200) NOT NULL,
  display_name_en  VARCHAR(200) NOT NULL,
  stripe_price_id  VARCHAR(100) NULL DEFAULT NULL,
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
