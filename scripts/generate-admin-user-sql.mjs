#!/usr/bin/env node

import crypto from 'node:crypto';

const args = process.argv.slice(2);

function readArg(name, fallback = '') {
  const direct = args.find((arg) => arg.startsWith(`--${name}=`));
  if (direct) {
    return direct.slice(name.length + 3);
  }

  const index = args.findIndex((arg) => arg === `--${name}`);
  if (index >= 0 && args[index + 1]) {
    return args[index + 1];
  }

  return fallback;
}

const email = readArg('email');
const password = readArg('password');
const level = readArg('level', 'admin');

if (!email || !password) {
  console.error('Usage: node scripts/generate-admin-user-sql.mjs --email admin@example.com --password secret123 [--level admin]');
  process.exit(1);
}

if (!['viewer', 'admin', 'superadmin'].includes(level)) {
  console.error('level must be one of: viewer, admin, superadmin');
  process.exit(1);
}

const passwordHash = crypto.createHash('sha512').update(password).digest('hex');

const sql = `INSERT INTO admin_users (mail_address, password_hash, auth_level, failed_login_attempts, locked_until, delete_flg)
VALUES ('${email.replace(/'/g, "''")}', '${passwordHash}', '${level}', 0, NULL, 0)
ON DUPLICATE KEY UPDATE
  password_hash = VALUES(password_hash),
  auth_level = VALUES(auth_level),
  failed_login_attempts = 0,
  locked_until = NULL,
  delete_flg = 0;`;

console.log(sql);
