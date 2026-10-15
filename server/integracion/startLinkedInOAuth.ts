import { onCall, HttpsError } from '../platform/callable';
import { guardarPendienteOAuth } from '../db/repo';
import { randomBytes } from 'crypto';
import {
  getLinkedInClientId,
  getLinkedInClientSecret,
  getLinkedInOAuthScopes,
} from './linkedinOAuthConfig';

function normalizeRedirectUri(uri: string): string {
  const trimmed = uri.trim();
  try {
    const url = new URL(trimmed);
    let path = url.pathname.replace(/\/+$/, '');
    if (!path || path === '/') path = '/oauth/linkedin';
    return `${url.protocol}//${url.host}${path}`;
  } catch {
    return trimmed.replace(/\/+$/, '');
  }
}

export const startLinkedInOAuth = onCall({ region: 'us-central1' }, async (request) => {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'Debes iniciar sesión');
  }

  const { redirectUri } = request.data as { redirectUri?: string };
  const redirect = normalizeRedirectUri(redirectUri ?? '');
  if (!redirect || !/^https?:\/\//i.test(redirect)) {
    throw new HttpsError('invalid-argument', 'redirectUri inválida');
  }

  let clientId: string;
  try {
    clientId = getLinkedInClientId();
    getLinkedInClientSecret();
  } catch (e) {
    throw new HttpsError(
      'failed-precondition',
      e instanceof Error ? e.message : 'LinkedIn OAuth no configurado en el servidor'
    );
  }

  const state = randomBytes(24).toString('hex');
  const uid = request.auth.uid;

  await guardarPendienteOAuth({ state, uid, red: 'linkedin', redirectUri: redirect });

  const params = new URLSearchParams({
    response_type: 'code',
    client_id: clientId,
    redirect_uri: redirect,
    state,
    scope: getLinkedInOAuthScopes(),
  });

  const authUrl = `https://www.linkedin.com/oauth/v2/authorization?${params.toString()}`;

  return { authUrl, state };
});
