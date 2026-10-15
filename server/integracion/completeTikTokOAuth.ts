import { onCall, HttpsError } from '../platform/callable';
import { logger } from '../platform/logger';
import {
  borrarPendienteOAuth,
  guardarCanal,
  guardarTokenRed,
  obtenerPendienteOAuth,
} from '../db/repo';
import {
  exchangeTikTokCode,
  fetchTikTokCreatorInfo,
  fetchTikTokUserInfo,
} from './tiktokOAuthApi';

export const completeTikTokOAuth = onCall({ region: 'us-central1' }, async (request) => {
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
    throw new HttpsError(
      'failed-precondition',
      'Sesión OAuth expirada o inválida. Vuelve a Canales → Conectar TikTok e inicia el flujo de nuevo (no recargues esta página).'
    );
  }

  if (pending.uid !== uid || pending.red !== 'tiktok') {
    throw new HttpsError('permission-denied', 'El estado OAuth no corresponde a tu usuario');
  }

  const redirectUri = pending.redirectUri;
  const codeVerifier = pending.codeVerifier ?? undefined;

  try {
    const token = await exchangeTikTokCode(code.trim(), redirectUri, codeVerifier);
    const accessToken = token.access_token;

    let displayName = '';
    try {
      const userInfo = await fetchTikTokUserInfo(accessToken);
      displayName = userInfo.display_name ?? '';
    } catch (e) {
      logger.info('TikTok user info no disponible', { uid, error: String(e) });
    }

    let creatorInfo: Awaited<ReturnType<typeof fetchTikTokCreatorInfo>> = {};
    try {
      creatorInfo = await fetchTikTokCreatorInfo(accessToken);
    } catch (e) {
      logger.info('TikTok creator info no disponible', { uid, error: String(e) });
    }

    const expiresAt = Date.now() + token.expires_in * 1000;
    const refreshExpiresAt = Date.now() + token.refresh_expires_in * 1000;

    await guardarTokenRed(uid, 'tiktok', {
      accessToken,
      refreshToken: token.refresh_token,
      expiresAt,
      refreshExpiresAt,
      openId: token.open_id,
      scope: token.scope,
      displayName: displayName || creatorInfo.creator_nickname || '',
      username: creatorInfo.creator_username || '',
      actualizadoEn: new Date().toISOString(),
    });

    await guardarCanal(uid, 'tiktok', {
      conectado: true,
      cuentaNombre: displayName || creatorInfo.creator_nickname || creatorInfo.creator_username || 'TikTok',
      integrationId: token.open_id,
      profileUrl: creatorInfo.creator_username ? `https://www.tiktok.com/@${creatorInfo.creator_username}` : null,
      proveedor: 'tiktok_oauth',
      verificadoPor: 'tiktok_oauth',
      verificadoEn: new Date().toISOString(),
    });

    await borrarPendienteOAuth(state.trim());

    logger.info('TikTok OAuth connected', { uid, displayName });

    return {
      ok: true,
      cuentaNombre: displayName || creatorInfo.creator_nickname || creatorInfo.creator_username || 'TikTok',
      openId: token.open_id,
    };
  } catch (err) {
    logger.error('completeTikTokOAuth', err);
    throw new HttpsError(
      'internal',
      err instanceof Error ? err.message : 'No se pudo completar la conexión con TikTok'
    );
  }
});
