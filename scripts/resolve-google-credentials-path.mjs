import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { getWorkspaceEnvProfile } = require('./lib/workspace-env.cjs');
const { ensureGoogleApplicationCredentialsPath } = require('./lib/google-credentials.cjs');

try {
  const profile = getWorkspaceEnvProfile(process.argv[2]);
  process.env.WORKSPACE_ENV_PROFILE = profile;
  const credentialPath = ensureGoogleApplicationCredentialsPath();
  if (credentialPath) {
    console.log(credentialPath);
  }
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
}
