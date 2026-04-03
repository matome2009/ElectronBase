import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';
import { readFileSync } from 'fs';
import { createRequire } from 'module';
import { buildFunctionsProxy } from './vite.functions';

const require = createRequire(import.meta.url);
const { loadWorkspaceEnv, normalizeEnvProfile } = require('../scripts/lib/workspace-env.cjs');
const pkg = JSON.parse(readFileSync(resolve(__dirname, 'package.json'), 'utf-8'));
const workspaceEnvDir = resolve(__dirname, '..');

// @see https://tauri.app/v2/guides/getting-started/setup/vite/
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
    root: 'src/renderer',
    envDir: workspaceEnvDir,

    // Tauri が期待する固定ポートを確保する
    clearScreen: false,

    define: {
      'import.meta.env.VITE_APP_VERSION': JSON.stringify(pkg.version),
      ...processEnvValues,
    },

    build: {
      outDir: resolve(__dirname, 'dist/renderer'),
      emptyOutDir: true,
      // Tauri は Chromium を内蔵しているため最新の ES をターゲットにできる
      target: ['es2021', 'chrome100'],
      minify: process.env.TAURI_DEBUG ? false : 'esbuild',
      rollupOptions: {
        input: resolve(__dirname, 'src/renderer/index.html'),
      },
    },

    resolve: {
      alias: {
        '@': resolve(__dirname, 'src/renderer'),
      },
    },

    plugins: [react()],

    server: {
      port: 5173,
      strictPort: true,
      // Tauri CLI が設定する TAURI_DEV_HOST に対応（モバイル開発時など）
      host: process.env.TAURI_DEV_HOST || false,
      headers: {
        'Cross-Origin-Opener-Policy': 'unsafe-none',
        'Cross-Origin-Embedder-Policy': 'unsafe-none',
      },
      proxy: buildFunctionsProxy(env, 'Dev'),
    },
  };
});
