-- ============================================================
-- TiDB TEMPLATE SEED (CORE)
-- Run this file against the ADMIN DB (dev_admin / prd_admin)
-- ============================================================

INSERT INTO platform_versions (platform, version, release_notes, download_url)
VALUES
  ('WIN',   '1.0.0', 'Initial desktop release for Windows.', 'https://example.com/download/windows'),
  ('MAC',   '1.0.0', 'Initial desktop release for macOS.',   'https://example.com/download/macos'),
  ('LINUX', '1.0.0', 'Initial desktop release for Linux.',   'https://example.com/download/linux')
ON DUPLICATE KEY UPDATE
  version = VALUES(version),
  release_notes = VALUES(release_notes),
  download_url = VALUES(download_url),
  updated_at = CURRENT_TIMESTAMP;

INSERT INTO maintenance_m (id, status, message_ja, message_en, message_ko, message_cn, delete_flg)
VALUES (1, 0, '', '', '', '', 0)
ON DUPLICATE KEY UPDATE
  status = VALUES(status),
  message_ja = VALUES(message_ja),
  message_en = VALUES(message_en),
  message_ko = VALUES(message_ko),
  message_cn = VALUES(message_cn),
  delete_flg = 0,
  updated_at = CURRENT_TIMESTAMP;

INSERT INTO information_m (
  title_ja, title_en, title_ko, title_cn,
  body_ja, body_en, body_ko, body_cn,
  display_start_at, display_end_at, priority, delete_flg
)
VALUES (
  'テンプレート初期設定完了',
  'Template setup completed',
  '템플릿 초기 설정 완료',
  '模板初始化完成',
  '管理画面からこのお知らせを編集できます。',
  'You can edit this notice from the admin console.',
  '관리 화면에서 이 공지를 수정할 수 있습니다.',
  '你可以在管理后台中编辑此通知。',
  NOW(),
  NULL,
  100,
  0
);

-- Generate admin user SQL with:
--   node scripts/generate-admin-user-sql.mjs --email admin@example.com --password change-me
