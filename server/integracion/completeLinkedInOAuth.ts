import { onCall, HttpsError } from '../platform/callable';
import { logger } from '../platform/logger';
import {
  borrarPendienteOAuth,
  guardarCanal,
  guardarTokenRed,
  obtenerPendienteOAuth,
  obtenerTokens,
} from '../db/repo';
import {
  exchangeLinkedInCode,
  fetchLinkedInUserInfo,
  memberUrnFromSub,
} from './linkedinOAuthApi';

export const completeLinkedInOAuth = onCall({ region: 'us-central1' }, async (request) => {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'Debes iniciar sesión');
  }

  const { code, state } = request.data as { code?: string; state?: string };
  if (!code?.trim() || !state?.trim()) {
    throw new HttpsError('invalid-argument', 'code y state son obligatorios');
  }

  const uid = request.auth.uid;
  const pending = await obtenerPendienteOAuth(state.trim());

  if (!pending) {
    const tokens = await obtenerTokens(uid);
    const linkedin = tokens.linkedin as
      | { accessToken?: string; displayName?: string; memberUrn?: string; email?: string | null }
      | null
      | undefined;
    if (linkedin?.accessToken && linkedin.displayName) {
      logger.info('LinkedIn OAuth idempotent replay', { uid });
      return {
        ok: true,
        cuentaNombre: linkedin.displayName,
        memberUrn: linkedin.memberUrn ?? '',
        email: linkedin.email ?? undefined,
      };
    }
    throw new HttpsError(
      'failed-precondition',
      'Sesión OAuth expirada o inválida. Vuelve a Canales → Conectar LinkedIn e inicia el flujo de nuevo (no recargues esta página).'
    );
  }

  if (pending.uid !== uid || pending.red !== 'linkedin') {
    throw new HttpsError('permission-denied', 'El estado OAuth no corresponde a tu usuario');
  }

  const redirectUri = pending.redirectUri;

  try {
    const tokenRes = await exchangeLinkedInCode(code.trim(), redirectUri);
    const userInfo = await fetchLinkedInUserInfo(tokenRes.access_token);
    const memberUrn = memberUrnFromSub(userInfo.sub);
    const displayName =
      userInfo.name ||
      [userInfo.given_name, userInfo.family_name].filter(Boolean).join(' ') ||
      userInfo.email ||
      memberUrn;

    const expiresAt = Date.now() + (tokenRes.expires_in ?? 5184000) * 1000;

    await guardarTokenRed(uid, 'linkedin', {
      accessToken: tokenRes.access_token,
      refreshToken: tokenRes.refresh_token ?? null,
      expiresAt,
      memberUrn,
      organizationId: null,
      displayName,
      email: userInfo.email ?? null,
      picture: userInfo.picture ?? null,
      scope: tokenRes.scope ?? null,
      actualizadoEn: new Date().toISOString(),
    });

    await guardarCanal(uid, 'linkedin', {
      conectado: true,
      cuentaNombre: displayName,
      proveedor: 'linkedin_oauth',
      integrationId: memberUrn,
      profileUrl: null,
      verificadoPor: 'linkedin_oauth',
      verificadoEn: new Date().toISOString(),
    });

    await borrarPendienteOAuth(state.trim());

    logger.info('LinkedIn OAuth connected', { uid, memberUrn });

    return {
      ok: true,
      cuentaNombre: displayName,
      memberUrn,
      email: userInfo.email,
    };
  } catch (err) {
    logger.error('completeLinkedInOAuth', err);
    throw new HttpsError(
      'internal',
      err instanceof Error ? err.message : 'No se pudo completar la conexión con LinkedIn'
    );
  }
});
