import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';
import { createRequire } from 'module';
import { buildFunctionsProxy } from './vite.functions';

const require = createRequire(import.meta.url);
const { loadWorkspaceEnv, normalizeEnvProfile } = require('../scripts/lib/workspace-env.cjs');
const workspaceEnvDir = resolve(__dirname, '..');

// Firebase Hosting用のWebビルド設定（Electron不要）
export default defineConfig(({ mode }) => {
  const profile = normalizeEnvProfile(mode);
  const fileEnv = loadWorkspaceEnv(profile, workspaceEnvDir, { required: false }).values;
  const env = {
    ...loadEnv(mode, workspaceEnvDir, 'VITE_'),
    ...Object.fromEntries(Object.entries(fileEnv).filter(([key]) => key.startsWith('VITE_'))),
    VITE_APP_ENV: profile,
  };

  // 2. VITE_ で始まるキーをすべて抽出して define 用のオブジェクトを動的生成
  const processEnvValues = Object.fromEntries(
    Object.entries(env).map(([key, value]) => [
      `import.meta.env.${key}`,
      JSON.stringify(value),
    ])
  );

  // デバッグ用ログ：ビルド時にターミナルで確認（重要！）
  console.log(`\n--- 🛠️  Vite Build Debug ---`);
  console.log(`Mode: ${mode}`);
  console.log(`EnvDir: ${workspaceEnvDir}`);
  console.log(`EnvProfile: ${profile}`);
  console.log(`API Key Loaded: ${env.VITE_FIREBASE_API_KEY ? '✅ Yes' : '❌ No'}`);
  console.log(`---------------------------\n`);

  return {
    root: 'src/renderer',
    envDir: workspaceEnvDir,
    
    // 💡 重要: ビルド時に環境変数を強制的に焼き込む
    define: processEnvValues,
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
      proxy: buildFunctionsProxy(env, 'Dev'),
    },
  }
});
