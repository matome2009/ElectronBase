import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

// Firebase Hosting用のWebビルド設定（Electron不要）
export default defineConfig({
  root: 'src/renderer',
  envDir: resolve(__dirname, '.'), // .env ファイルは frontend/ 直下
  build: {
    outDir: resolve(__dirname, 'dist/renderer'),
    emptyOutDir: true,
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
    proxy: {
      '/api/getNonce': {
        target: 'https://asia-northeast1-token-batch-transfer.cloudfunctions.net',
        changeOrigin: true,
        rewrite: (path: string) => path.replace('/api/getNonce', '/getNonce'),
      },
      '/api/verifySignature': {
        target: 'https://asia-northeast1-token-batch-transfer.cloudfunctions.net',
        changeOrigin: true,
        rewrite: (path: string) => path.replace('/api/verifySignature', '/verifySignature'),
      },
      '/api/sendKycNotifications': {
        target: 'https://asia-northeast1-token-batch-transfer.cloudfunctions.net',
        changeOrigin: true,
        rewrite: (path: string) => path.replace('/api/sendKycNotifications', '/sendKycNotificationsDev'),
      },
      '/api/submitKyc': {
        target: 'https://asia-northeast1-token-batch-transfer.cloudfunctions.net',
        changeOrigin: true,
        rewrite: (path: string) => path.replace('/api/submitKyc', '/submitKycDev'),
      },
      '/api/resendKycNotification': {
        target: 'https://asia-northeast1-token-batch-transfer.cloudfunctions.net',
        changeOrigin: true,
        rewrite: (path: string) => path.replace('/api/resendKycNotification', '/resendKycNotificationDev'),
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
      '/api/stripeWebhook': {
        target: 'https://asia-northeast1-token-batch-transfer.cloudfunctions.net',
        changeOrigin: true,
        rewrite: (path: string) => path.replace('/api/stripeWebhook', '/stripeWebhookDev'),
      },
      '/api/getPointsSummary': {
        target: 'https://asia-northeast1-token-batch-transfer.cloudfunctions.net',
        changeOrigin: true,
        rewrite: (path: string) => path.replace('/api/getPointsSummary', '/getPointsSummaryDev'),
      },
      '/api/updateKycEmail': {
        target: 'https://asia-northeast1-token-batch-transfer.cloudfunctions.net',
        changeOrigin: true,
        rewrite: (path: string) => path.replace('/api/updateKycEmail', '/updateKycEmailDev'),
      },
      '/api/sendTestEmail': {
        target: 'https://asia-northeast1-token-batch-transfer.cloudfunctions.net',
        changeOrigin: true,
        rewrite: (path: string) => path.replace('/api/sendTestEmail', '/sendTestEmailDev'),
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
