import { onCall, HttpsError } from '../platform/callable';
import { guardarPendienteOAuth } from '../db/repo';
import { randomBytes } from 'crypto';
import {
  getMetaClientId,
  getMetaClientSecret,
  getMetaOAuthScopes,
  META_GRAPH_VERSION,
  type MetaProvider,
} from './metaOAuthConfig';

function normalizeRedirectUri(uri: string): string {
  const trimmed = uri.trim();
  try {
    const url = new URL(trimmed);
    let path = url.pathname.replace(/\/+$/, '');
    if (!path || path === '/') path = '/oauth/meta';
    return `${url.protocol}//${url.host}${path}`;
  } catch {
    return trimmed.replace(/\/+$/, '');
  }
}

export const startMetaOAuth = onCall({ region: 'us-central1' }, async (request) => {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'Debes iniciar sesión');
  }

  const { redirectUri, provider } = request.data as { redirectUri?: string; provider?: string };
  const redirect = normalizeRedirectUri(redirectUri ?? '');
  if (!redirect || !/^https?:\/\//i.test(redirect)) {
    throw new HttpsError('invalid-argument', 'redirectUri inválida');
  }

  const metaProvider: MetaProvider = provider === 'instagram' ? 'instagram' : 'facebook';

  let clientId: string;
  try {
    clientId = getMetaClientId(metaProvider);
    getMetaClientSecret(metaProvider);
  } catch (e) {
    throw new HttpsError(
      'failed-precondition',
      e instanceof Error ? e.message : 'Meta OAuth no configurado en el servidor'
    );
  }

  const state = randomBytes(24).toString('hex');
  const uid = request.auth.uid;

  await guardarPendienteOAuth({ state, uid, red: 'meta', provider: metaProvider, redirectUri: redirect });

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirect,
    state,
    scope: getMetaOAuthScopes(),
    response_type: 'code',
  });

  const authUrl = `https://www.facebook.com/${META_GRAPH_VERSION}/dialog/oauth?${params.toString()}`;

  return { authUrl, state };
});