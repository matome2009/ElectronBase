-- ============================================================
-- TiDB CREATE (OPTIONAL)
-- Optional modules:
--   billing / watched wallets / transactions / contacts / labels
-- ============================================================

-- ============================================================
-- USER DB
-- ============================================================

CREATE TABLE IF NOT EXISTS billing_status_t (
  id                     INT AUTO_INCREMENT PRIMARY KEY,
  user_id                VARCHAR(36) NOT NULL,
  plan_key               VARCHAR(64) NOT NULL,
  billing_type           ENUM('subscription', 'metered', 'one_time') NOT NULL,
  stripe_customer_id     VARCHAR(100),
  stripe_subscription_id VARCHAR(100),
  status                 ENUM('free', 'active', 'cancel_requested', 'cancelled', 'past_due', 'one_time_paid') NOT NULL DEFAULT 'free',
  subscribed_at          DATETIME,
  cancel_requested_at    DATETIME,
  cancel_at_period_end   TINYINT(1) NOT NULL DEFAULT 0,
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

CREATE TABLE IF NOT EXISTS billing_log_t (
  id              BIGINT AUTO_INCREMENT PRIMARY KEY,
  user_id         VARCHAR(36) NOT NULL,
  plan_key        VARCHAR(64) NOT NULL,
  event_type      ENUM(
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
  stripe_event_id VARCHAR(100),
  amount          INT,
  currency        VARCHAR(10),
  quantity        INT,
  description     TEXT,
  raw_payload     JSON,
  created_at      DATETIME DEFAULT CURRENT_TIMESTAMP,
  KEY idx_user_created (user_id, created_at DESC),
  KEY idx_stripe_event (stripe_event_id)
);

CREATE TABLE IF NOT EXISTS billing_usage_t (
  id                 BIGINT AUTO_INCREMENT PRIMARY KEY,
  user_id            VARCHAR(36) NOT NULL,
  plan_key           VARCHAR(64) NOT NULL,
  period_year        SMALLINT NOT NULL,
  period_month       TINYINT NOT NULL,
  usage_type         ENUM('transaction', 'kyc_email', 'api_call', 'custom') NOT NULL DEFAULT 'transaction',
  units              INT NOT NULL DEFAULT 0,
  stripe_reported_at DATETIME,
  created_at         DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at         DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_usage_period (user_id, plan_key, period_year, period_month, usage_type),
  KEY idx_user_period (user_id, period_year, period_month)
);

CREATE TABLE IF NOT EXISTS watched_wallets_t (
  id         BIGINT AUTO_INCREMENT PRIMARY KEY,
  user_id    VARCHAR(36) NOT NULL,
  address    VARCHAR(42) NOT NULL,
  chain_id   INT NOT NULL,
  label      VARCHAR(100),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  is_active  TINYINT(1) NOT NULL DEFAULT 1,
  delete_flg INT NOT NULL DEFAULT 0,
  UNIQUE KEY uq_wallet (user_id, address, chain_id, delete_flg),
  KEY idx_user_chain (user_id, chain_id)
);

CREATE TABLE IF NOT EXISTS transactions_t (
  id               BIGINT AUTO_INCREMENT PRIMARY KEY,
  chain_id         INT NOT NULL,
  tx_hash          VARCHAR(66) NOT NULL,
  block_number     BIGINT NOT NULL,
  block_timestamp  DATETIME NOT NULL,
  from_address     VARCHAR(42) NOT NULL,
  to_address       VARCHAR(42) NOT NULL,
  asset            VARCHAR(20) NOT NULL,
  contract_address VARCHAR(42),
  token_id         VARCHAR(78),
  value            VARCHAR(78) NOT NULL,
  decimals         TINYINT NOT NULL DEFAULT 18,
  category         VARCHAR(20) NOT NULL,
  gas_used         VARCHAR(78),
  gas_price        VARCHAR(78),
  raw_payload      JSON,
  synced_at        DATETIME DEFAULT CURRENT_TIMESTAMP,
  created_at       DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at       DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  delete_flg       INT NOT NULL DEFAULT 0,
  UNIQUE KEY uq_tx (chain_id, tx_hash, from_address, to_address, asset),
  KEY idx_chain_block (chain_id, block_number DESC),
  KEY idx_block_timestamp (block_timestamp DESC),
  KEY idx_from_address (from_address),
  KEY idx_to_address (to_address)
);

CREATE TABLE IF NOT EXISTS user_transactions_t (
  id              BIGINT AUTO_INCREMENT PRIMARY KEY,
  user_id         VARCHAR(36) NOT NULL,
  transaction_id  BIGINT NOT NULL,
  watched_address VARCHAR(42) NOT NULL,
  direction       ENUM('in', 'out') NOT NULL,
  state           ENUM('unread', 'read') NOT NULL DEFAULT 'unread',
  is_flagged      TINYINT(1) NOT NULL DEFAULT 0,
  is_hidden       TINYINT(1) NOT NULL DEFAULT 0,
  label_ids       JSON,
  sync_revision   BIGINT NOT NULL DEFAULT 0,
  created_at      DATETIME(6) DEFAULT CURRENT_TIMESTAMP(6),
  updated_at      DATETIME(6) DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  delete_flg      INT NOT NULL DEFAULT 0,
  UNIQUE KEY uq_user_tx (user_id, transaction_id, watched_address, direction),
  KEY idx_user_state (user_id, state),
  KEY idx_user_watched (user_id, watched_address),
  KEY idx_transaction (transaction_id),
  KEY idx_user_updated (user_id, updated_at, id)
);

CREATE TABLE IF NOT EXISTS wallet_contacts_t (
  id          BIGINT AUTO_INCREMENT PRIMARY KEY,
  user_id     VARCHAR(36) NOT NULL,
  address     VARCHAR(42) NOT NULL,
  label       VARCHAR(100) NOT NULL,
  description VARCHAR(500),
  created_at  DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at  DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  delete_flg  INT NOT NULL DEFAULT 0,
  UNIQUE KEY uq_contact (user_id, address, delete_flg),
  KEY idx_user (user_id)
);

CREATE TABLE IF NOT EXISTS transaction_labels_t (
  id         BIGINT AUTO_INCREMENT PRIMARY KEY,
  user_id    VARCHAR(36) NOT NULL,
  name       VARCHAR(100) NOT NULL,
  color      VARCHAR(7) NOT NULL DEFAULT '#6366f1',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  delete_flg INT NOT NULL DEFAULT 0,
  KEY idx_user (user_id)
);

-- ============================================================
-- ADMIN DB
-- ============================================================

CREATE TABLE IF NOT EXISTS billing_plan_m (
  id              INT AUTO_INCREMENT PRIMARY KEY,
  plan_key        VARCHAR(64) NOT NULL,
  billing_type    ENUM('subscription', 'metered', 'one_time') NOT NULL,
  display_name_ja VARCHAR(200) NOT NULL,
  display_name_en VARCHAR(200) NOT NULL,
  stripe_price_id VARCHAR(100) NULL DEFAULT NULL,
  unit_amount     INT NOT NULL DEFAULT 0,
  currency        VARCHAR(10) NOT NULL DEFAULT 'jpy',
  free_unit_limit INT NOT NULL DEFAULT 0,
  description_ja  TEXT,
  description_en  TEXT,
  is_active       TINYINT(1) NOT NULL DEFAULT 1,
  sort_order      INT NOT NULL DEFAULT 0,
  created_at      DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at      DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  delete_flg      INT NOT NULL DEFAULT 0,
  UNIQUE KEY uq_plan_key (plan_key, delete_flg)
);
