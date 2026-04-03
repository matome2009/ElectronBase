import { useEffect, useState } from 'react';
import { BrowserRouter, MemoryRouter, Routes, Route } from 'react-router-dom';
import { WagmiConfig } from 'wagmi';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { GoogleOAuthProvider } from '@react-oauth/google';
import { wagmiConfig } from './config/web3';
import MainLayout from './views/MainLayout';
import LoginScreen from './views/LoginScreen';
import { ErrorBoundary } from './components/ErrorBoundary';
import { ErrorDialog } from './components/ErrorDialog';
import { ModalProvider } from './components/AppModal';
import { useGlobalErrorHandler } from './hooks/useGlobalErrorHandler';
import { initFirebase } from './services/FirebaseService';
import { AuthService } from './services/AuthService';
import { LoggingService } from './services/LoggingService';
import './styles/globals.css';
import './i18n';

const queryClient = new QueryClient();

// Firebase 初期化（一度だけ）
initFirebase();

function AuthenticatedApp() {
  const { error, clearError } = useGlobalErrorHandler();
  const [isLoggedIn, setIsLoggedIn] = useState<boolean | null>(null);

  useEffect(() => {
    let cleanup: (() => void) | undefined;
    let initialResolved = false;

    const init = async () => {
      // Tauri Google リダイレクト結果を先に処理する。
      try {
        await AuthService.handleGoogleRedirectResult();
      } catch {}

      cleanup = AuthService.onAuthStateChanged((user) => {
        initialResolved = true;
        setIsLoggedIn(!!user);
      });

      // Tauri環境: initializeAuth(browserLocalPersistence)はlocalStorageから
      // 同期的にユーザーを読み込むため、onAuthStateChangedを待たずに即座に状態を確定できる
      // （gapi_iframesのCORSハングでonAuthStateChangedが発火しない問題の回避）
      if ('__TAURI_INTERNALS__' in window || '__TAURI__' in window) {
        if (!initialResolved) {
          setIsLoggedIn(!!AuthService.getCurrentUser());
        }
      }
    };

    // WebでFirebase Auth初期化がハングした場合のフォールバック（通常は発火しない）
    const fallbackTimer = setTimeout(() => {
      if (!initialResolved) {
        LoggingService.warn('onAuthStateChanged timeout: Firebase Auth初期化がタイムアウト');
        setIsLoggedIn(false);
      }
    }, 5000);

    init();
    return () => {
      cleanup?.();
      clearTimeout(fallbackTimer);
    };
  }, []);

  if (isLoggedIn === null) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600" />
      </div>
    );
  }

  if (!isLoggedIn) {
    return <LoginScreen onLogin={() => setIsLoggedIn(true)} />;
  }

  return (
    <>
      <MainLayout />
      <ErrorDialog error={error} onClose={clearError} />
    </>
  );
}

function App() {
  const isTauri = '__TAURI_INTERNALS__' in window || '__TAURI__' in window;
  const RouterComponent = isTauri ? MemoryRouter : BrowserRouter;

  const content = (
    <ModalProvider>
      <WagmiConfig config={wagmiConfig}>
        <QueryClientProvider client={queryClient}>
          <RouterComponent>
            <Routes>
              <Route path="/*" element={<AuthenticatedApp />} />
            </Routes>
          </RouterComponent>
        </QueryClientProvider>
      </WagmiConfig>
    </ModalProvider>
  );

  return (
    <ErrorBoundary>
      {isTauri ? content : (
        <GoogleOAuthProvider clientId={import.meta.env.VITE_GOOGLE_CLIENT_ID}>
          {content}
        </GoogleOAuthProvider>
      )}
    </ErrorBoundary>
  );
}

export default App;
