import { existsSync, readFileSync } from 'fs';
import { resolve } from 'path';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const { getWorkspaceEnvPath, getWorkspaceEnvProfile } = require('../../../scripts/lib/workspace-env.cjs');

const profile = getWorkspaceEnvProfile();
const candidateEnvPaths = [
  resolve(__dirname, '../../.env'),
  getWorkspaceEnvPath(profile, resolve(__dirname, '../../..')),
];

function stripMatchingQuotes(value: string) {
  if (value.length >= 2) {
    const first = value[0];
    const last = value[value.length - 1];
    if ((first === '"' && last === '"') || (first === '\'' && last === '\'')) {
      return value.slice(1, -1);
    }
  }
  return value;
}

function loadEnvFile(path: string) {
  if (!existsSync(path)) return;

  const content = readFileSync(path, 'utf8');
  const lines = content.split(/\r?\n/);

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;

    const separatorIndex = line.indexOf('=');
    if (separatorIndex <= 0) continue;

    const key = line.slice(0, separatorIndex).trim();
    if (!key || process.env[key] !== undefined) continue;

    const value = stripMatchingQuotes(line.slice(separatorIndex + 1).trim())
      .replace(/\\n/g, '\n');
    process.env[key] = value;
  }
}

for (const envPath of candidateEnvPaths) {
  loadEnvFile(envPath);
}
