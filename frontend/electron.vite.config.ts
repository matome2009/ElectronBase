import { defineConfig, externalizeDepsPlugin } from 'electron-vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';
import { readFileSync } from 'fs';

const pkg = JSON.parse(readFileSync(resolve(__dirname, 'package.json'), 'utf-8'));

export default defineConfig({
  main: {
    plugins: [externalizeDepsPlugin()],
    build: { outDir: 'dist/main' }
  },
  preload: {
    plugins: [externalizeDepsPlugin()],
    build: { outDir: 'dist/preload' }
  },
  renderer: {
    root: 'src/renderer',
    define: {
      'import.meta.env.VITE_APP_VERSION': JSON.stringify(pkg.version),
    },
    build: {
      outDir: 'dist/renderer',
      rollupOptions: {
        input: resolve(__dirname, 'src/renderer/index.html')
      }
    },
    resolve: {
      alias: {
        '@': resolve(__dirname, 'src/renderer')
      }
    },
    plugins: [react()],
    server: {
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
      }
    }
  }
});
