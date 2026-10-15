/** Normaliza la URI para que coincida carácter a carácter con Meta for Developers */
export function normalizeMetaRedirectUri(uri: string): string {
  const trimmed = uri.trim();
  try {
    const url = new URL(trimmed);
    let path = url.pathname.replace(/\/+$/, '');
    if (!path || path === '/') {
      path = '/oauth/meta';
    }
    return `${url.protocol}//${url.host}${path}`;
  } catch {
    return trimmed.replace(/\/+$/, '');
  }
}

/** URIs que debes registrar en Meta (App → Configuración → avanzado → URIs de redireccionamiento de OAuth válidos) */
export const META_REDIRECT_URLS_TO_REGISTER = [
  'http://localhost:5173/oauth/meta',
  'http://127.0.0.1:5173/oauth/meta',
] as const;

/** URI de retorno que usa Conect.ia al conectar Facebook/Instagram */
export function getMetaOAuthRedirectUri(): string {
  const fromEnv = import.meta.env.VITE_META_OAUTH_REDIRECT_URI?.trim();
  if (fromEnv) {
    return normalizeMetaRedirectUri(fromEnv);
  }
  if (typeof window !== 'undefined' && import.meta.env.DEV) {
    const port = window.location.port || '5173';
    return `http://localhost:${port}/oauth/meta`;
  }
  if (typeof window !== 'undefined') {
    return normalizeMetaRedirectUri(`${window.location.origin}/oauth/meta`);
  }
  return 'http://localhost:5173/oauth/meta';
}

export function isMetaOAuthCallbackPath(): boolean {
  if (typeof window === 'undefined') return false;
  const p = window.location.pathname.replace(/\/+$/, '') || '/';
  return p === '/oauth/meta';
}