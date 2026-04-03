const crypto = require('crypto');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { applyWorkspaceEnv } = require('./workspace-env.cjs');

function getRepoRoot() {
  return path.resolve(__dirname, '..', '..');
}

function parseJsonValue(rawValue, envName) {
  try {
    return JSON.parse(rawValue);
  } catch (error) {
    throw new Error(`${envName} is not valid JSON: ${error.message}`);
  }
}

function getServiceAccountPath(repoRoot) {
  const rawPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;
  if (!rawPath) return '';
  return path.isAbsolute(rawPath) ? rawPath : path.resolve(repoRoot, rawPath);
}

function resolveGoogleCredentials(repoRoot = getRepoRoot()) {
  applyWorkspaceEnv(undefined, repoRoot, { required: false });

  if (process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON) {
    return {
      serviceAccount: parseJsonValue(
        process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON,
        'GOOGLE_APPLICATION_CREDENTIALS_JSON',
      ),
      credentialPath: '',
      source: 'json',
    };
  }

  if (process.env.GOOGLE_APPLICATION_CREDENTIALS_BASE64) {
    const decoded = Buffer.from(
      process.env.GOOGLE_APPLICATION_CREDENTIALS_BASE64,
      'base64',
    ).toString('utf8');

    return {
      serviceAccount: parseJsonValue(decoded, 'GOOGLE_APPLICATION_CREDENTIALS_BASE64'),
      credentialPath: '',
      source: 'base64',
    };
  }

  const credentialPath = getServiceAccountPath(repoRoot);
  if (credentialPath) {
    if (!fs.existsSync(credentialPath)) {
      throw new Error(`GOOGLE_APPLICATION_CREDENTIALS file was not found: ${credentialPath}`);
    }

    return {
      serviceAccount: parseJsonValue(
        fs.readFileSync(credentialPath, 'utf8'),
        'GOOGLE_APPLICATION_CREDENTIALS',
      ),
      credentialPath,
      source: 'path',
    };
  }

  return {
    serviceAccount: null,
    credentialPath: '',
    source: 'default',
  };
}

function materializeGoogleCredentialsFile(serviceAccount) {
  const json = JSON.stringify(serviceAccount, null, 2);
  const fingerprint = crypto.createHash('sha256').update(json).digest('hex').slice(0, 12);
  const projectId = serviceAccount.project_id || 'default';
  const outputDir = path.join(os.tmpdir(), 'electronbase');
  const outputPath = path.join(
    outputDir,
    `google-application-credentials-${projectId}-${fingerprint}.json`,
  );

  fs.mkdirSync(outputDir, { recursive: true, mode: 0o700 });
  fs.writeFileSync(outputPath, `${json}\n`, { mode: 0o600 });
  return outputPath;
}

function ensureGoogleApplicationCredentialsPath(repoRoot = getRepoRoot()) {
  const { serviceAccount, credentialPath } = resolveGoogleCredentials(repoRoot);

  if (credentialPath) {
    process.env.GOOGLE_APPLICATION_CREDENTIALS = credentialPath;
    return credentialPath;
  }

  if (!serviceAccount) return '';

  const materializedPath = materializeGoogleCredentialsFile(serviceAccount);
  process.env.GOOGLE_APPLICATION_CREDENTIALS = materializedPath;
  return materializedPath;
}

function buildFirebaseAdminOptions({ admin, databaseURL, repoRoot = getRepoRoot() }) {
  const { serviceAccount } = resolveGoogleCredentials(repoRoot);
  const options = {};

  if (serviceAccount) {
    options.credential = admin.credential.cert(serviceAccount);
  }

  if (databaseURL) {
    options.databaseURL = databaseURL;
  }

  return options;
}

module.exports = {
  buildFirebaseAdminOptions,
  ensureGoogleApplicationCredentialsPath,
  getRepoRoot,
  resolveGoogleCredentials,
};
