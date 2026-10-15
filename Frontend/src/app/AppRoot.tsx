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
      <div className="min-h-screen flex items-center justify-center bg-[#fafafa] text-slate-600">
        Cargando Conect.ia…
      </div>
    );
  }

  if (IS_PRODUCTION_APP) {
    return <AuthGate />;
  }

  return <App />;
}

export default function AppRoot() {
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
