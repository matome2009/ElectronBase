import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';
import { readFileSync } from 'fs';

const pkg = JSON.parse(readFileSync(resolve(__dirname, 'package.json'), 'utf-8'));

// @see https://tauri.app/v2/guides/getting-started/setup/vite/
export default defineConfig({
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
    proxy: {
      '/api/getNonce': {
        target: 'https://asia-northeast1-token-batch-transfer.cloudfunctions.net',
        changeOrigin: true,
        rewrite: (path: string) => path.replace('/api/getNonce', '/getNonce'),
      },
      '/api/verifyWalletConnect': {
        target: 'https://asia-northeast1-token-batch-transfer.cloudfunctions.net',
        changeOrigin: true,
        rewrite: (path: string) => path.replace('/api/verifyWalletConnect', '/verifyWalletConnect'),
      },
      '/api/verifyGoogleToken': {
        target: 'https://asia-northeast1-token-batch-transfer.cloudfunctions.net',
        changeOrigin: true,
        rewrite: (path: string) => path.replace('/api/verifyGoogleToken', '/verifyGoogleToken'),
      },
      '/api/verifyLineToken': {
        target: 'https://asia-northeast1-token-batch-transfer.cloudfunctions.net',
        changeOrigin: true,
        rewrite: (path: string) => path.replace('/api/verifyLineToken', '/verifyLineToken'),
      },
      '/api/startAsGuest': {
        target: 'https://asia-northeast1-token-batch-transfer.cloudfunctions.net',
        changeOrigin: true,
        rewrite: (path: string) => path.replace('/api/startAsGuest', '/startAsGuest'),
      },
      '/api/linkLogin': {
        target: 'https://asia-northeast1-token-batch-transfer.cloudfunctions.net',
        changeOrigin: true,
        rewrite: (path: string) => path.replace('/api/linkLogin', '/linkLogin'),
      },
      '/api/createCheckoutSession': {
        target: 'https://asia-northeast1-token-batch-transfer.cloudfunctions.net',
        changeOrigin: true,
        rewrite: (path: string) => path.replace('/api/createCheckoutSession', '/createCheckoutSessionDev'),
      },
      '/api/verifyCheckoutSession': {
        target: 'https://asia-northeast1-token-batch-transfer.cloudfunctions.net',
        changeOrigin: true,
        rewrite: (path: string) => path.replace('/api/verifyCheckoutSession', '/verifyCheckoutSessionDev'),
      },
      '/api/cancelSubscription': {
        target: 'https://asia-northeast1-token-batch-transfer.cloudfunctions.net',
        changeOrigin: true,
        rewrite: (path: string) => path.replace('/api/cancelSubscription', '/cancelSubscriptionDev'),
      },
      '/api/reactivateSubscription': {
        target: 'https://asia-northeast1-token-batch-transfer.cloudfunctions.net',
        changeOrigin: true,
        rewrite: (path: string) => path.replace('/api/reactivateSubscription', '/reactivateSubscriptionDev'),
      },
      '/api/reportUsage': {
        target: 'https://asia-northeast1-token-batch-transfer.cloudfunctions.net',
        changeOrigin: true,
        rewrite: (path: string) => path.replace('/api/reportUsage', '/reportUsageDev'),
      },
      '/api/getPointsSummary': {
        target: 'https://asia-northeast1-token-batch-transfer.cloudfunctions.net',
        changeOrigin: true,
        rewrite: (path: string) => path.replace('/api/getPointsSummary', '/getPointsSummaryDev'),
      },
      '/api/getVersions': {
        target: 'https://asia-northeast1-token-batch-transfer.cloudfunctions.net',
        changeOrigin: true,
        rewrite: (path: string) => path.replace('/api/getVersions', '/getVersionsDev'),
      },
      '/api/getMaintenance': {
        target: 'https://asia-northeast1-token-batch-transfer.cloudfunctions.net',
        changeOrigin: true,
        rewrite: (path: string) => path.replace('/api/getMaintenance', '/getMaintenanceDev'),
      },
      '/api/getMaintenanceAll': {
        target: 'https://asia-northeast1-token-batch-transfer.cloudfunctions.net',
        changeOrigin: true,
        rewrite: (path: string) => path.replace('/api/getMaintenanceAll', '/getMaintenanceAllDev'),
      },
    },
  },
});
