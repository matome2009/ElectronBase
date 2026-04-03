import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const { loadWorkspaceEnv, normalizeEnvProfile } = require('../scripts/lib/workspace-env.cjs');
const workspaceEnvDir = resolve(__dirname, '..');

export default defineConfig(({ mode }) => {
  const profile = normalizeEnvProfile(mode);
  const fileEnv = loadWorkspaceEnv(profile, workspaceEnvDir, { required: false }).values;
  const env = {
    ...loadEnv(mode, workspaceEnvDir, 'VITE_'),
    ...Object.fromEntries(Object.entries(fileEnv).filter(([key]) => key.startsWith('VITE_'))),
    VITE_APP_ENV: profile,
  };
  const processEnvValues = Object.fromEntries(
    Object.entries(env).map(([key, value]) => [
      `import.meta.env.${key}`,
      JSON.stringify(value),
    ]),
  );

  return {
    plugins: [react()],
    envDir: workspaceEnvDir,
    define: processEnvValues,
    build: { outDir: 'dist' },
  };
});
