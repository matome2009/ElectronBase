const fs = require('fs');
const path = require('path');

function getRepoRoot() {
  return path.resolve(__dirname, '..', '..');
}

function normalizeEnvProfile(value) {
  const normalized = String(value || '').trim().toLowerCase();
  if (normalized === 'prd' || normalized === 'prod' || normalized === 'production') {
    return 'prd';
  }
  return 'dev';
}

function getWorkspaceEnvProfile(explicitProfile) {
  return normalizeEnvProfile(
    explicitProfile
      || process.env.WORKSPACE_ENV_PROFILE
      || process.env.APP_ENV
      || process.env.NODE_ENV,
  );
}

function getWorkspaceEnvPath(profile = getWorkspaceEnvProfile(), repoRoot = getRepoRoot()) {
  return path.join(repoRoot, `.env.${normalizeEnvProfile(profile)}`);
}

function stripMatchingQuotes(value) {
  if (value.length >= 2) {
    const first = value[0];
    const last = value[value.length - 1];
    if ((first === '"' && last === '"') || (first === '\'' && last === '\'')) {
      return value.slice(1, -1);
    }
  }
  return value;
}

function parseEnvContent(content) {
  const env = {};

  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;

    const separatorIndex = line.indexOf('=');
    if (separatorIndex <= 0) continue;

    const key = line.slice(0, separatorIndex).trim();
    const value = stripMatchingQuotes(line.slice(separatorIndex + 1).trim())
      .replace(/\\n/g, '\n');

    if (key) {
      env[key] = value;
    }
  }

  return env;
}

function loadWorkspaceEnv(profile = getWorkspaceEnvProfile(), repoRoot = getRepoRoot(), options = {}) {
  const normalizedProfile = normalizeEnvProfile(profile);
  const envPath = getWorkspaceEnvPath(normalizedProfile, repoRoot);
  const required = options.required !== false;

  if (!fs.existsSync(envPath)) {
    if (required) {
      throw new Error(`Workspace env file was not found: ${envPath}`);
    }

    return {
      profile: normalizedProfile,
      envPath,
      values: {},
    };
  }

  return {
    profile: normalizedProfile,
    envPath,
    values: parseEnvContent(fs.readFileSync(envPath, 'utf8')),
  };
}

function applyWorkspaceEnv(profile = getWorkspaceEnvProfile(), repoRoot = getRepoRoot(), options = {}) {
  const loaded = loadWorkspaceEnv(profile, repoRoot, options);
  process.env.WORKSPACE_ENV_PROFILE = loaded.profile;

  for (const [key, value] of Object.entries(loaded.values)) {
    if (process.env[key] === undefined) {
      process.env[key] = value;
    }
  }

  return loaded;
}

module.exports = {
  applyWorkspaceEnv,
  getRepoRoot,
  getWorkspaceEnvPath,
  getWorkspaceEnvProfile,
  loadWorkspaceEnv,
  normalizeEnvProfile,
  parseEnvContent,
};
