import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';
import { buildFunctionsProxy } from './vite.functions';

// Firebase Hosting用のWebビルド設定（Electron不要）
export default defineConfig(({ mode }) => {
  // 1. 環境変数を明示的にロード（frontend直下の .env.development 等）
  const envDir = resolve(__dirname, '.');
  const env = loadEnv(mode, envDir, 'VITE_');

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
  console.log(`EnvDir: ${envDir}`);
  console.log(`API Key Loaded: ${env.VITE_FIREBASE_API_KEY ? '✅ Yes' : '❌ No'}`);
  console.log(`---------------------------\n`);

  return {
    root: 'src/renderer',
    // ここでディレクトリを教えてあげる
    envDir: resolve(__dirname, '.'), 
    
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
