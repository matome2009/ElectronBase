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
const generatedBanner = `# Auto-generated from ../.env.${profile}. Do not edit directly.\n`;

if (!existsSync(rootEnvPath)) {
  console.error(`Workspace env file was not found: ${rootEnvPath}`);
  process.exit(1);
}

const rootEnv = readFileSync(rootEnvPath, 'utf8');
const next = generatedBanner + rootEnv;
const current = existsSync(functionsEnvPath) ? readFileSync(functionsEnvPath, 'utf8') : '';

if (current === next) {
  console.log('functions/.env is already up to date');
  process.exit(0);
}

writeFileSync(functionsEnvPath, next);
console.log(`Synced functions/.env from root .env.${profile}`);
