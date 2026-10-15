/** Normaliza la URI para que coincida carácter a carácter con TikTok for Developers */
export function normalizeTikTokRedirectUri(uri: string): string {
  const trimmed = uri.trim();
  try {
    const url = new URL(trimmed);
    let path = url.pathname.replace(/\/+$/, '');
    if (!path || path === '/') {
      path = '/oauth/tiktok';
    }
    return `${url.protocol}//${url.host}${path}`;
  } catch {
    return trimmed.replace(/\/+$/, '');
  }
}

/** URIs que debes registrar en TikTok (Manage apps → App → Redirect URL) */
export const TIKTOK_REDIRECT_URLS_TO_REGISTER = [
  'http://localhost:5173/oauth/tiktok',
  'http://127.0.0.1:5173/oauth/tiktok',
] as const;

/** URI de retorno que usa Conect.ia al conectar TikTok */
export function getTikTokOAuthRedirectUri(): string {
  const fromEnv = import.meta.env.VITE_TIKTOK_OAUTH_REDIRECT_URI?.trim();
  if (fromEnv) {
    return normalizeTikTokRedirectUri(fromEnv);
  }
  if (typeof window !== 'undefined' && import.meta.env.DEV) {
    const port = window.location.port || '5173';
    return `http://localhost:${port}/oauth/tiktok`;
  }
  if (typeof window !== 'undefined') {
    return normalizeTikTokRedirectUri(`${window.location.origin}/oauth/tiktok`);
  }
  return 'http://localhost:5173/oauth/tiktok';
}

export function isTikTokOAuthCallbackPath(): boolean {
  if (typeof window === 'undefined') return false;
  const p = window.location.pathname.replace(/\/+$/, '') || '/';
  return p === '/oauth/tiktok';
}
