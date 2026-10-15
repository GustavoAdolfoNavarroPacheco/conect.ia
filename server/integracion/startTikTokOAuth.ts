import { onCall, HttpsError } from '../platform/callable';
import { guardarPendienteOAuth } from '../db/repo';
import { createHash, randomBytes } from 'crypto';
import {
  getTikTokClientKey,
  getTikTokClientSecret,
  getTikTokOAuthScopes,
  getTikTokRedirectUri,
  TIKTOK_AUTH_URL,
} from './tiktokOAuthConfig';

function normalizeRedirectUri(uri: string): string {
  const trimmed = uri.trim();
  try {
    const url = new URL(trimmed);
    let path = url.pathname.replace(/\/+$/, '');
    if (!path || path === '/') path = '/oauth/tiktok';
    return `${url.protocol}//${url.host}${path}`;
  } catch {
    return trimmed.replace(/\/+$/, '');
  }
}

export const startTikTokOAuth = onCall({ region: 'us-central1' }, async (request) => {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'Debes iniciar sesión');
  }

  const { redirectUri } = request.data as { redirectUri?: string };
  const serverRedirect = getTikTokRedirectUri();
  const redirect = normalizeRedirectUri(serverRedirect || (redirectUri ?? ''));
  if (!redirect || !/^https?:\/\//i.test(redirect)) {
    throw new HttpsError('invalid-argument', 'redirectUri inválida');
  }

  let clientKey: string;
  try {
    clientKey = getTikTokClientKey();
    getTikTokClientSecret();
  } catch (e) {
    throw new HttpsError(
      'failed-precondition',
      e instanceof Error ? e.message : 'TikTok OAuth no configurado en el servidor'
    );
  }

  const state = randomBytes(24).toString('hex');
  const codeVerifier = randomBytes(32).toString('base64url');
  const codeChallenge = createHash('sha256').update(codeVerifier).digest('base64url');
  const uid = request.auth.uid;

  await guardarPendienteOAuth({ state, uid, red: 'tiktok', redirectUri: redirect, codeVerifier });

  const params = new URLSearchParams({
    client_key: clientKey,
    response_type: 'code',
    scope: getTikTokOAuthScopes(),
    redirect_uri: redirect,
    state,
    code_challenge: codeChallenge,
    code_challenge_method: 'S256',
  });

  const authUrl = `${TIKTOK_AUTH_URL}?${params.toString()}`;

  return { authUrl, state };
});
