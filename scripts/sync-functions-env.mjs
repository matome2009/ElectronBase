import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const { getWorkspaceEnvPath, getWorkspaceEnvProfile } = require('./lib/workspace-env.cjs');

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const profile = getWorkspaceEnvProfile(process.argv[2]);
const rootEnvPath = getWorkspaceEnvPath(profile, resolve(__dirname, '..'));
const functionsEnvPath = resolve(__dirname, '..', 'functions', '.env');
const generatedBanner = `# Auto-generated from ../.env.${profile}. Do not edit directly.\n# Reserved Firebase keys are remapped for Cloud Functions compatibility.\n`;
const reservedPrefixes = ['X_GOOGLE_', 'FIREBASE_', 'EXT_'];
const reservedKeyAliases = new Map([
  ['FIREBASE_PROJECT_ID', 'APP_FIREBASE_PROJECT_ID'],
  ['FIREBASE_FUNCTIONS_REGION', 'APP_FIREBASE_FUNCTIONS_REGION'],
  ['FIREBASE_DATABASE_URL', 'APP_FIREBASE_DATABASE_URL'],
]);

function transformForFunctionsEnv(content) {
  const outputLines = [];

  for (const rawLine of content.split(/\r?\n/)) {
    const trimmed = rawLine.trim();

    if (!trimmed || trimmed.startsWith('#')) {
      outputLines.push(rawLine);
      continue;
    }

    const separatorIndex = rawLine.indexOf('=');
    if (separatorIndex <= 0) {
      outputLines.push(rawLine);
      continue;
    }

    const key = rawLine.slice(0, separatorIndex).trim();
    const value = rawLine.slice(separatorIndex + 1);
    const alias = reservedKeyAliases.get(key);

    if (alias) {
      outputLines.push(`${alias}=${value}`);
      continue;
    }

    if (reservedPrefixes.some(prefix => key.startsWith(prefix))) {
      continue;
    }

    outputLines.push(rawLine);
  }

  return outputLines.join('\n');
}

if (!existsSync(rootEnvPath)) {
  console.error(`Workspace env file was not found: ${rootEnvPath}`);
  process.exit(1);
}

const rootEnv = readFileSync(rootEnvPath, 'utf8');
const next = generatedBanner + transformForFunctionsEnv(rootEnv);
const current = existsSync(functionsEnvPath) ? readFileSync(functionsEnvPath, 'utf8') : '';

if (current === next) {
  console.log('functions/.env is already up to date');
  process.exit(0);
}

writeFileSync(functionsEnvPath, next);
console.log(`Synced functions/.env from root .env.${profile}`);
