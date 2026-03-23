"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getConnection = getConnection;
exports.getAdminConnection = getAdminConnection;
exports.initTable = initTable;
exports.initUserTables = initUserTables;
exports.findUserByLogin = findUserByLogin;
exports.createUser = createUser;
exports.createLogin = createLogin;
exports.findOrCreateUser = findOrCreateUser;
exports.linkLoginToUser = linkLoginToUser;
const promise_1 = __importDefault(require("mysql2/promise"));
function getConfig(env) {
    const suffix = env === 'prd' ? 'PRD' : 'DEV';
    return {
        host: process.env[`TIDB_HOST_${suffix}`],
        port: parseInt(process.env[`TIDB_PORT_${suffix}`] || '4000'),
        user: process.env[`TIDB_USER_${suffix}`],
        password: process.env[`TIDB_PASS_${suffix}`],
        database: process.env[`TIDB_DB_${suffix}`], // dev / prd (user_t, login_t)
        ssl: { rejectUnauthorized: true },
    };
}
function getAdminConfig(env) {
    const suffix = env === 'prd' ? 'PRD' : 'DEV';
    return {
        host: process.env[`TIDB_HOST_${suffix}`],
        port: parseInt(process.env[`TIDB_PORT_${suffix}`] || '4000'),
        user: process.env[`TIDB_USER_${suffix}`],
        password: process.env[`TIDB_PASS_${suffix}`],
        database: process.env[`TIDB_DB_ADMIN_${suffix}`], // dev_admin / prd_admin
        ssl: { rejectUnauthorized: true },
    };
}
async function getConnection(env) {
    return promise_1.default.createConnection(getConfig(env));
}
async function getAdminConnection(env) {
    return promise_1.default.createConnection(getAdminConfig(env));
}
async function initTable(env) {
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
async function initUserTables(env) {
    const conn = await getConnection(env);
    try {
        await conn.execute(`
      CREATE TABLE IF NOT EXISTS user_t (
        id         INT AUTO_INCREMENT PRIMARY KEY,
        user_id    VARCHAR(36) UNIQUE,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        delete_flg INT NOT NULL DEFAULT 0
      )
    `);
        await conn.execute(`
      CREATE TABLE IF NOT EXISTS login_t (
        id         INT AUTO_INCREMENT PRIMARY KEY,
        user_id    VARCHAR(36)  NOT NULL,
        login_type ENUM('wallet', 'google', 'line') NOT NULL,
        login_key  VARCHAR(500) NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        delete_flg INT NOT NULL DEFAULT 0,
        UNIQUE KEY uq_login (login_type, login_key, delete_flg)
      )
    `);
    }
    finally {
        await conn.end();
    }
}
/**
 * login_t からユーザーIDを検索（delete_flg=0のみ有効）
 * 見つからない場合は null を返す
 */
async function findUserByLogin(env, loginType, loginKey) {
    const conn = await getConnection(env);
    try {
        const [rows] = await conn.execute('SELECT user_id FROM login_t WHERE login_type = ? AND login_key = ? AND delete_flg = 0 LIMIT 1', [loginType, loginKey]);
        return rows.length > 0 ? rows[0].user_id : null;
    }
    finally {
        await conn.end();
    }
}
/**
 * user_t に新規ユーザーを作成
 */
async function createUser(env, userId) {
    const conn = await getConnection(env);
    try {
        await conn.execute('INSERT INTO user_t (user_id) VALUES (?)', [userId]);
    }
    finally {
        await conn.end();
    }
}
/**
 * login_t にログイン連携を追加
 */
async function createLogin(env, userId, loginType, loginKey) {
    const conn = await getConnection(env);
    try {
        await conn.execute('INSERT INTO login_t (user_id, login_type, login_key, delete_flg) VALUES (?, ?, ?, 0)', [userId, loginType, loginKey]);
    }
    finally {
        await conn.end();
    }
}
/**
 * ユーザー検索 → 存在しなければ user_t + login_t を新規作成してUUIDを返す
 */
async function findOrCreateUser(env, loginType, loginKey, newUserId) {
    const existing = await findUserByLogin(env, loginType, loginKey);
    if (existing)
        return existing;
    await createUser(env, newUserId);
    await createLogin(env, newUserId, loginType, loginKey);
    return newUserId;
}
/**
 * 既存ユーザーに新しいログイン方法を追加（アカウント連携）
 * すでに別ユーザーに紐づいている場合は Error をスロー
 */
async function linkLoginToUser(env, userId, loginType, loginKey) {
    const existing = await findUserByLogin(env, loginType, loginKey);
    if (existing && existing !== userId) {
        throw new Error('This login is already linked to another account');
    }
    if (existing === userId)
        return; // すでに連携済み
    await createLogin(env, userId, loginType, loginKey);
}
//# sourceMappingURL=tidb.js.map