import mysql from 'mysql2/promise';

function getConfig(env: 'dev' | 'prd') {
  const suffix = env === 'prd' ? 'PRD' : 'DEV';
  return {
    host:     process.env[`TIDB_HOST_${suffix}`]!,
    port:     parseInt(process.env[`TIDB_PORT_${suffix}`] || '4000'),
    user:     process.env[`TIDB_USER_${suffix}`]!,
    password: process.env[`TIDB_PASS_${suffix}`]!,
    database: process.env[`TIDB_DB_${suffix}`]!,   // dev / prd (user_t, login_t)
    ssl: { rejectUnauthorized: true },
  };
}

function getAdminConfig(env: 'dev' | 'prd') {
  const suffix = env === 'prd' ? 'PRD' : 'DEV';
  return {
    host:     process.env[`TIDB_HOST_${suffix}`]!,
    port:     parseInt(process.env[`TIDB_PORT_${suffix}`] || '4000'),
    user:     process.env[`TIDB_USER_${suffix}`]!,
    password: process.env[`TIDB_PASS_${suffix}`]!,
    database: process.env[`TIDB_DB_ADMIN_${suffix}`]!,  // dev_admin / prd_admin
    ssl: { rejectUnauthorized: true },
  };
}

export async function getConnection(env: 'dev' | 'prd') {
  return mysql.createConnection(getConfig(env));
}

export async function getAdminConnection(env: 'dev' | 'prd') {
  return mysql.createConnection(getAdminConfig(env));
}

export async function initTable(env: 'dev' | 'prd') {
  const conn = await getConnection(env);
  await conn.execute(`
    CREATE TABLE IF NOT EXISTS platform_versions (
      id            INT AUTO_INCREMENT PRIMARY KEY,
      platform      VARCHAR(20)  NOT NULL,
      version       VARCHAR(20)  NOT NULL,
      release_notes TEXT,
      download_url  VARCHAR(500),
      created_at    DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at    DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      UNIQUE KEY uq_platform (platform)
    )
  `);
  await conn.end();
}

/**
 * ユーザー管理テーブルの初期化（user_t, login_t）
 * ※ TiDB上では既にテーブル作成済みのため、IF NOT EXISTSで冪等に実行
 */
export async function initUserTables(env: 'dev' | 'prd') {
  const conn = await getConnection(env);
  try {
    await conn.execute(`
      CREATE TABLE IF NOT EXISTS user_t (
        id         INT AUTO_INCREMENT PRIMARY KEY,
        user_id    VARCHAR(36) UNIQUE,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        last_login_at DATETIME NULL DEFAULT NULL,
        delete_flg INT NOT NULL DEFAULT 0
      )
    `);
    await conn.execute(`
      CREATE TABLE IF NOT EXISTS login_t (
        id         INT AUTO_INCREMENT PRIMARY KEY,
        user_id    VARCHAR(36)  NOT NULL,
        login_type ENUM('wallet', 'google', 'line', 'apple') NOT NULL,
        login_key  VARCHAR(500) NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        delete_flg INT NOT NULL DEFAULT 0,
        UNIQUE KEY uq_login (login_type, login_key, delete_flg)
      )
    `);
  } finally {
    await conn.end();
  }
}

export async function ensureLastLoginAtColumn(env: 'dev' | 'prd'): Promise<void> {
  const conn = await getConnection(env);
  try {
    await conn.execute(`
      ALTER TABLE user_t
      ADD COLUMN IF NOT EXISTS last_login_at DATETIME NULL DEFAULT NULL
    `);
  } finally {
    await conn.end();
  }
}

/**
 * 既存のlogin_t.login_type ENUMに 'apple' を追加するマイグレーション
 * ※ TiDB上でENUMを変更する場合に一度だけ実行する
 */
export async function migrateAppleLoginType(env: 'dev' | 'prd'): Promise<void> {
  const conn = await getConnection(env);
  try {
    await conn.execute(
      `ALTER TABLE login_t MODIFY COLUMN login_type ENUM('wallet', 'google', 'line', 'apple') NOT NULL`,
    );
  } finally {
    await conn.end();
  }
}

export async function findUserByLogin(
  env: 'dev' | 'prd',
  loginType: 'wallet' | 'google' | 'line' | 'apple',
  loginKey: string,
): Promise<string | null> {
  const conn = await getConnection(env);
  try {
    const [rows] = await conn.execute<Array<{ user_id: string } & mysql.RowDataPacket>>(
      'SELECT user_id FROM login_t WHERE login_type = ? AND login_key = ? AND delete_flg = 0 LIMIT 1',
      [loginType, loginKey],
    );
    return rows.length > 0 ? rows[0].user_id : null;
  } finally {
    await conn.end();
  }
}

/**
 * user_t に新規ユーザーを作成
 */
export async function createUser(env: 'dev' | 'prd', userId: string): Promise<void> {
  const conn = await getConnection(env);
  try {
    await conn.execute('INSERT INTO user_t (user_id) VALUES (?)', [userId]);
  } finally {
    await conn.end();
  }
}

/**
 * login_t にログイン連携を追加
 */
export async function createLogin(
  env: 'dev' | 'prd',
  userId: string,
  loginType: 'wallet' | 'google' | 'line' | 'apple',
  loginKey: string,
): Promise<void> {
  const conn = await getConnection(env);
  try {
    await conn.execute(
      'INSERT INTO login_t (user_id, login_type, login_key, delete_flg) VALUES (?, ?, ?, 0)',
      [userId, loginType, loginKey],
    );
  } finally {
    await conn.end();
  }
}

/**
 * user_t の last_login_at を現在時刻で更新する
 */
export async function updateLastLoginAt(env: 'dev' | 'prd', userId: string): Promise<void> {
  const conn = await getConnection(env);
  try {
    await conn.execute('UPDATE user_t SET last_login_at = NOW() WHERE user_id = ?', [userId]);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (message.includes("Unknown column 'last_login_at'")) {
      await conn.end();
      await ensureLastLoginAtColumn(env);
      const retryConn = await getConnection(env);
      try {
        await retryConn.execute('UPDATE user_t SET last_login_at = NOW() WHERE user_id = ?', [userId]);
      } finally {
        await retryConn.end();
      }
      return;
    }
    throw error;
  } finally {
    try {
      await conn.end();
    } catch {
      // ignore close errors after fallback path
    }
  }
}

/**
 * ゲストユーザー（login_t に紐付けなし）かつ last_login_at が1年以上前のユーザーデータを物理削除する。
 * last_login_at が NULL の場合は created_at を基準にする。
 */
export async function deleteInactiveGuestUsers(env: 'dev' | 'prd'): Promise<number> {
  const conn = await getConnection(env);
  try {
    // 対象ユーザーを特定
    const [rows] = await conn.execute<Array<{ user_id: string } & mysql.RowDataPacket>>(
      `SELECT u.user_id FROM user_t u
       WHERE u.delete_flg = 0
         AND NOT EXISTS (
           SELECT 1 FROM login_t l WHERE l.user_id = u.user_id AND l.delete_flg = 0
         )
         AND (
           (u.last_login_at IS NOT NULL AND u.last_login_at < DATE_SUB(NOW(), INTERVAL 1 YEAR))
           OR
           (u.last_login_at IS NULL AND u.created_at < DATE_SUB(NOW(), INTERVAL 1 YEAR))
         )`,
    );

    if (rows.length === 0) return 0;

    const userIds = rows.map((r) => r.user_id);
    const placeholders = userIds.map(() => '?').join(',');

    // 関連データを物理削除（順序：子→親）
    await conn.execute(`DELETE FROM transactions_t WHERE user_id IN (${placeholders})`, userIds);
    await conn.execute(`DELETE FROM transaction_sync_cursors_t WHERE user_id IN (${placeholders})`, userIds);
    await conn.execute(`DELETE FROM watched_wallets_t WHERE user_id IN (${placeholders})`, userIds);
    await conn.execute(`DELETE FROM wallet_contacts_t WHERE user_id IN (${placeholders})`, userIds);
    await conn.execute(`DELETE FROM user_t WHERE user_id IN (${placeholders})`, userIds);

    return userIds.length;
  } finally {
    await conn.end();
  }
}

/**
 * ユーザー検索 → 存在しなければ user_t + login_t を新規作成してUUIDを返す
 */
export async function findOrCreateUser(
  env: 'dev' | 'prd',
  loginType: 'wallet' | 'google' | 'line' | 'apple',
  loginKey: string,
  newUserId: string,
): Promise<string> {
  const existing = await findUserByLogin(env, loginType, loginKey);
  if (existing) return existing;

  await createUser(env, newUserId);
  await createLogin(env, newUserId, loginType, loginKey);
  return newUserId;
}

/**
 * 既存ユーザーに新しいログイン方法を追加（アカウント連携）
 * すでに別ユーザーに紐づいている場合は Error をスロー
 */
export async function linkLoginToUser(
  env: 'dev' | 'prd',
  userId: string,
  loginType: 'wallet' | 'google' | 'line' | 'apple',
  loginKey: string,
): Promise<void> {
  const existing = await findUserByLogin(env, loginType, loginKey);
  if (existing && existing !== userId) {
    throw new Error('This login is already linked to another account');
  }
  if (existing === userId) return; // すでに連携済み

  await createLogin(env, userId, loginType, loginKey);
}
