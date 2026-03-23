import React, { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { WagmiConfig } from 'wagmi';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { wagmiConfig } from './config/web3';
import MainLayout from './components/MainLayout';
import LoginScreen from './components/LoginScreen';
import { ErrorBoundary } from './components/ErrorBoundary';
import { ErrorDialog } from './components/ErrorDialog';
import { ModalProvider } from './components/AppModal';
import { useGlobalErrorHandler } from './hooks/useGlobalErrorHandler';
import { initFirebase } from './services/FirebaseService';
import { AuthService } from './services/AuthService';
import './styles/globals.css';
import './i18n';

const queryClient = new QueryClient();

// Firebase 初期化（一度だけ）
initFirebase();

function AuthenticatedApp() {
  const { error, clearError } = useGlobalErrorHandler();
  const [isLoggedIn, setIsLoggedIn] = useState<boolean | null>(null);

  useEffect(() => {
    const unsubscribe = AuthService.onAuthStateChanged((user) => {
      setIsLoggedIn(!!user);
    });
    return unsubscribe;
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
  return (
    <ErrorBoundary>
      <ModalProvider>
        <WagmiConfig config={wagmiConfig}>
          <QueryClientProvider client={queryClient}>
            <BrowserRouter>
              <Routes>
                <Route path="/*" element={<AuthenticatedApp />} />
              </Routes>
            </BrowserRouter>
          </QueryClientProvider>
        </WagmiConfig>
      </ModalProvider>
    </ErrorBoundary>
  );
}

export default App;
