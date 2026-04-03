-- ============================================================
-- TiDB TEMPLATE SEED (OPTIONAL)
-- Apply this file only when billing or wallet-related optional modules are enabled.
-- ============================================================

INSERT INTO billing_plan_m (
  plan_key,
  billing_type,
  display_name_ja,
  display_name_en,
  stripe_price_id,
  unit_amount,
  currency,
  free_unit_limit,
  description_ja,
  description_en,
  is_active,
  sort_order,
  delete_flg
)
VALUES (
  'starter',
  'subscription',
  'スタータープラン',
  'Starter Plan',
  NULL,
  0,
  'jpy',
  0,
  '必要に応じて Stripe Price ID と説明文を設定してください。',
  'Set a Stripe Price ID and plan description when billing is enabled.',
  1,
  10,
  0
)
ON DUPLICATE KEY UPDATE
  display_name_ja = VALUES(display_name_ja),
  display_name_en = VALUES(display_name_en),
  unit_amount = VALUES(unit_amount),
  description_ja = VALUES(description_ja),
  description_en = VALUES(description_en),
  is_active = VALUES(is_active),
  sort_order = VALUES(sort_order),
  delete_flg = VALUES(delete_flg),
  updated_at = CURRENT_TIMESTAMP;
