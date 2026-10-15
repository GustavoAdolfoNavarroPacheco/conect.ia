import { onCall, HttpsError } from '../platform/callable';
import { logger } from '../platform/logger';
import {
  borrarPendienteOAuth,
  guardarCanal,
  guardarTokenRed,
  obtenerPendienteOAuth,
} from '../db/repo';
import {
  exchangeMetaCode,
  exchangeMetaLongLivedToken,
  fetchMetaPages,
  type MetaPageInfo,
} from './metaOAuthApi';

function pickFacebookPage(pages: MetaPageInfo[]): MetaPageInfo | null {
  return pages.find((p) => p.accessToken) ?? pages[0] ?? null;
}

function pickInstagramAccount(pages: MetaPageInfo[]): MetaPageInfo | null {
  return pages.find((p) => p.igId) ?? null;
}

export const completeMetaOAuth = onCall({ region: 'us-central1' }, async (request) => {
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
      'Sesión OAuth expirada o inválida. Vuelve a Canales → Conectar Facebook/Instagram e inicia el flujo de nuevo (no recargues esta página).'
    );
  }

  if (pending.uid !== uid || pending.red !== 'meta') {
    throw new HttpsError('permission-denied', 'El estado OAuth no corresponde a tu usuario');
  }

  const redirectUri = pending.redirectUri;
  const provider = pending.provider === 'instagram' ? 'instagram' : 'facebook';

  try {
    const shortToken = await exchangeMetaCode(code.trim(), redirectUri, provider);
    const longLived = await exchangeMetaLongLivedToken(shortToken.access_token, provider);
    const accessToken = longLived.access_token || shortToken.access_token;
    const pages = await fetchMetaPages(accessToken);

    if (pages.length === 0) {
      throw new Error(
        'No se encontraron páginas de Facebook en tu cuenta. Crea una página en business.facebook.com o verifica los permisos de la app Meta.'
      );
    }

    const expiresAt = Date.now() + (longLived.expires_in ?? shortToken.expires_in ?? 5184000) * 1000;

    await guardarTokenRed(uid, 'meta', {
      accessToken,
      expiresAt,
      pages,
      actualizadoEn: new Date().toISOString(),
    });

    const fbPage = pickFacebookPage(pages);
    if (fbPage) {
      await guardarCanal(uid, 'facebook', {
        conectado: true,
        cuentaNombre: fbPage.name,
        integrationId: fbPage.id,
        proveedor: 'meta_oauth',
        verificadoPor: 'meta_oauth',
        verificadoEn: new Date().toISOString(),
      });
    }

    const ig = pickInstagramAccount(pages);
    const instagramConectado = Boolean(ig);
    await guardarCanal(uid, 'instagram', {
      conectado: instagramConectado,
      cuentaNombre: ig?.igUsername ?? null,
      integrationId: ig?.igId ?? null,
      proveedor: 'meta_oauth',
      verificadoPor: 'meta_oauth',
      verificadoEn: new Date().toISOString(),
    });

    await borrarPendienteOAuth(state.trim());

    logger.info('Meta OAuth connected', { uid, pages: pages.length, instagramConectado });

    return {
      ok: true,
      facebook: fbPage ? { id: fbPage.id, nombre: fbPage.name } : null,
      instagram: ig
        ? { id: ig.igId, nombre: ig.igUsername, pagina: ig.name }
        : null,
      avisoInstagram: instagramConectado
        ? undefined
        : 'Facebook conectado. Para Instagram: vincula una cuenta Instagram Business a una de tus páginas de Facebook.',
    };
  } catch (err) {
    logger.error('completeMetaOAuth', err);
    throw new HttpsError(
      'internal',
      err instanceof Error ? err.message : 'No se pudo completar la conexión con Meta'
    );
  }
});
