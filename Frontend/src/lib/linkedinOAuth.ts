/** Normaliza la URI para que coincida carácter a carácter con LinkedIn Developers */
export function normalizeLinkedInRedirectUri(uri: string): string {
  const trimmed = uri.trim();
  try {
    const url = new URL(trimmed);
    let path = url.pathname.replace(/\/+$/, '');
    if (!path || path === '/') {
      path = '/oauth/linkedin';
    }
    return `${url.protocol}//${url.host}${path}`;
  } catch {
    return trimmed.replace(/\/+$/, '');
  }
}

/** URIs que debes registrar en LinkedIn (pestaña Auth → Authorized redirect URLs) */
export const LINKEDIN_REDIRECT_URLS_TO_REGISTER = [
  'https://conectia-campuslands.vercel.app/oauth/linkedin',
  'http://localhost:3000/oauth/linkedin',
  'http://localhost:5173/oauth/linkedin',
  'http://127.0.0.1:5173/oauth/linkedin',
] as const;

/** URI de retorno que usa Conect.ia al conectar */
export function getLinkedInOAuthRedirectUri(): string {
  const fromEnv = import.meta.env.VITE_LINKEDIN_OAUTH_REDIRECT_URI?.trim();
  if (fromEnv) {
    return normalizeLinkedInRedirectUri(fromEnv);
  }
  if (typeof window !== 'undefined' && import.meta.env.DEV) {
    const port = window.location.port || '5173';
    return `http://localhost:${port}/oauth/linkedin`;
  }
  if (typeof window !== 'undefined') {
    return normalizeLinkedInRedirectUri(`${window.location.origin}/oauth/linkedin`);
  }
  return 'http://localhost:5173/oauth/linkedin';
}

export function isLinkedInOAuthCallbackPath(): boolean {
  if (typeof window === 'undefined') return false;
  const p = window.location.pathname.replace(/\/+$/, '') || '/';
  return p === '/oauth/linkedin';
}
