import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { registrarQueryClient } from '../lib/queryBus';
import { AuthProvider, useAuth } from '../context/AuthContext';
import { ThemeProvider } from '../context/ThemeContext';
import App from './App';
import AuthGate from './AuthGate';
import { LinkedInOAuthCallback } from './LinkedInOAuthCallback';
import { MetaOAuthCallback } from './MetaOAuthCallback';
import { TikTokOAuthCallback } from './TikTokOAuthCallback';
import { isLinkedInOAuthCallbackPath } from '../lib/linkedinOAuth';
import { isMetaOAuthCallbackPath } from '../lib/metaOAuth';
import { isTikTokOAuthCallbackPath } from '../lib/tiktokOAuth';
import { useScrollReveal } from '../hooks/useScrollReveal';
import { useSmoothScroll } from '../hooks/useSmoothScroll';
import { ConectiaLogo } from './components/ConectiaLogo';

const queryClient = new QueryClient({
  defaultOptions: { queries: { staleTime: 30_000, retry: 1 } },
});
registrarQueryClient(queryClient);

/** true = app Conect.ia (sin barra de diseño Figma) */
export const IS_PRODUCTION_APP = import.meta.env.VITE_APP_MODE === 'production';

function AppWithAuth() {
  const { loading } = useAuth();

  if (loading) {
    return (
      <div className="ambient-light flex h-full flex-col items-center justify-center gap-4 bg-background" role="status">
        <div className="animate-pulse-slow">
          <ConectiaLogo size="lg" />
        </div>
        <span className="text-sm text-muted-foreground">Cargando…</span>
      </div>
    );
  }

  if (IS_PRODUCTION_APP) {
    return <AuthGate />;
  }

  return <App />;
}

export default function AppRoot() {
  useScrollReveal();
  useSmoothScroll();
  const oauthCallback =
    typeof window !== 'undefined' &&
    (isLinkedInOAuthCallbackPath() || isMetaOAuthCallbackPath() || isTikTokOAuthCallbackPath());
  const isMeta = typeof window !== 'undefined' && isMetaOAuthCallbackPath();
  const isTikTok = typeof window !== 'undefined' && isTikTokOAuthCallbackPath();

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <AuthProvider>
          {oauthCallback ? (
            isMeta ? (
              <MetaOAuthCallback />
            ) : isTikTok ? (
              <TikTokOAuthCallback />
            ) : (
              <LinkedInOAuthCallback />
            )
          ) : (
            <AppWithAuth />
          )}
        </AuthProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}
