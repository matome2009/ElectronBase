import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';
import { readFileSync } from 'fs';
import { buildFunctionsProxy } from './vite.functions';

const pkg = JSON.parse(readFileSync(resolve(__dirname, 'package.json'), 'utf-8'));

// @see https://tauri.app/v2/guides/getting-started/setup/vite/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, resolve(__dirname, '.'), 'VITE_');

  return {
    root: 'src/renderer',
    envDir: resolve(__dirname, '.'),

    // Tauri が期待する固定ポートを確保する
    clearScreen: false,

    define: {
      'import.meta.env.VITE_APP_VERSION': JSON.stringify(pkg.version),
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
