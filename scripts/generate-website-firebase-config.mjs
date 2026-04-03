import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const { getWorkspaceEnvPath, getWorkspaceEnvProfile } = require('./lib/workspace-env.cjs');

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const profile = getWorkspaceEnvProfile(process.argv[2] || 'prd');
const rootEnvPath = getWorkspaceEnvPath(profile, resolve(__dirname, '..'));
const outputPath = resolve(__dirname, '..', 'website', 'js', 'firebaseConfig.js');

if (!existsSync(rootEnvPath)) {
  console.error(`Workspace env file was not found: ${rootEnvPath}`);
  process.exit(1);
}

function parseEnv(content) {
  const env = {};
  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;

    const separatorIndex = line.indexOf('=');
    if (separatorIndex <= 0) continue;

    const key = line.slice(0, separatorIndex).trim();
    let value = line.slice(separatorIndex + 1).trim();
    if (
      value.length >= 2 &&
      ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith('\'') && value.endsWith('\'')))
    ) {
      value = value.slice(1, -1);
    }
    env[key] = value.replace(/\\n/g, '\n');
  }
  return env;
}

function required(env, key) {
  const value = env[key];
  if (!value) {
    throw new Error(`${key} is required in /.env`);
  }
  return value;
}

const env = parseEnv(readFileSync(rootEnvPath, 'utf8'));
const dbRoot = profile;
const firestoreDatabaseId = env.WEBSITE_FIRESTORE_DATABASE_ID || `${dbRoot}-firebase-store`;
const realtimeDatabaseEnvPath = profile;

const firebaseConfig = {
  apiKey: required(env, 'VITE_FIREBASE_API_KEY'),
  authDomain: required(env, 'VITE_FIREBASE_AUTH_DOMAIN'),
  databaseURL: required(env, 'VITE_FIREBASE_DATABASE_URL'),
  projectId: required(env, 'VITE_FIREBASE_PROJECT_ID'),
  storageBucket: required(env, 'VITE_FIREBASE_STORAGE_BUCKET'),
  messagingSenderId: required(env, 'VITE_FIREBASE_MESSAGING_SENDER_ID'),
  appId: required(env, 'VITE_FIREBASE_APP_ID'),
};

const output = `// Auto-generated from ../.env. Do not edit directly.
export const firebaseConfig = ${JSON.stringify(firebaseConfig, null, 2)};

export const firestoreDatabaseId = ${JSON.stringify(firestoreDatabaseId)};

export const realtimeDatabaseEnvPath = ${JSON.stringify(realtimeDatabaseEnvPath)};
`;

writeFileSync(outputPath, output);
console.log(`Generated ${outputPath}`);
