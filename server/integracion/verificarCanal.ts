import { onCall, HttpsError } from '../platform/callable';
import { logger } from '../platform/logger';
import { guardarCanal, marcarCanalDesconectado, obtenerCanales, obtenerTokens } from '../db/repo';
import { META_GRAPH_VERSION } from './metaOAuthConfig';
import { TIKTOK_API_BASE } from './tiktokOAuthConfig';
import { esDestinoPublicoHttps } from './urlsMedia';

/** Redes con cuenta OAuth que se pueden verificar contra su API. */
const REDES_VERIFICABLES = ['linkedin', 'facebook', 'instagram', 'tiktok'] as const;
type RedVerificable = (typeof REDES_VERIFICABLES)[number];

type Comprobacion = { resultado: 'ok' | 'rechazado' | 'error'; detalle: string };

const TIMEOUT_MS = 15_000;

/**
 * Pregunta a la red con el token guardado. Solo "rechazado" marca la cuenta como caducada: un fallo
 * de red o un 5xx no desconecta a nadie.
 */
async function comprobarToken(red: RedVerificable, accessToken: string): Promise<Comprobacion> {
  const cabeceras = { Authorization: `Bearer ${accessToken}` };
  try {
    if (red === 'linkedin') {
      const res = await fetch('https://api.linkedin.com/v2/userinfo', {
        headers: cabeceras,
        signal: AbortSignal.timeout(TIMEOUT_MS),
      });
      if (res.ok) return { resultado: 'ok', detalle: 'LinkedIn confirma la cuenta conectada.' };
      if (res.status === 401) return { resultado: 'rechazado', detalle: 'LinkedIn rechazó el acceso (401).' };
      return { resultado: 'error', detalle: `LinkedIn respondió ${res.status}. Inténtalo más tarde.` };
    }

    if (red === 'tiktok') {
      const res = await fetch(`${TIKTOK_API_BASE}/user/info/?fields=display_name`, {
        headers: cabeceras,
        signal: AbortSignal.timeout(TIMEOUT_MS),
      });
      const texto = await res.text();
      const invalido = /access_token_invalid|invalid_token/i.test(texto);
      if (res.ok && !invalido) return { resultado: 'ok', detalle: 'TikTok confirma la cuenta conectada.' };
      if (res.status === 401 || invalido) return { resultado: 'rechazado', detalle: 'TikTok rechazó el acceso.' };
      return { resultado: 'error', detalle: `TikTok respondió ${res.status}. Inténtalo más tarde.` };
    }

    // Facebook e Instagram comparten el token de Meta.
    const res = await fetch(`https://graph.facebook.com/${META_GRAPH_VERSION}/me?fields=id`, {
      headers: cabeceras,
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    const texto = await res.text();
    if (res.ok) return { resultado: 'ok', detalle: 'Meta confirma la cuenta conectada.' };
    if (res.status === 401 || /"code":\s*190|OAuthException/.test(texto)) {
      return { resultado: 'rechazado', detalle: 'Meta rechazó el acceso (error 190).' };
    }
    return { resultado: 'error', detalle: `Meta respondió ${res.status}. Inténtalo más tarde.` };
  } catch (err) {
    logger.warn('verificarCanal: sin respuesta de la red', { red, err: String(err) });
    return { resultado: 'error', detalle: 'No se pudo contactar la red. Inténtalo de nuevo.' };
  }
}

/** Verifica la conexión de una red contra su API y actualiza el canal (U7 / botón Verificar). */
export const verificarCanal = onCall({ region: 'us-central1' }, async (request) => {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'Debes iniciar sesión');
  }
  const red = String(request.data?.red ?? '');
  if (!REDES_VERIFICABLES.includes(red as RedVerificable)) {
    throw new HttpsError('invalid-argument', 'Esta red no se puede verificar.');
  }
  const uid = request.auth.uid;
  const tokens = await obtenerTokens(uid);
  const clave = red === 'linkedin' ? 'linkedin' : red === 'tiktok' ? 'tiktok' : 'meta';
  const accessToken = (tokens[clave] as { accessToken?: string } | null | undefined)?.accessToken;
  if (!accessToken) {
    return { ok: false, estado: 'sin_token', mensaje: 'No hay una cuenta conectada en esta red.' };
  }

  const { resultado, detalle } = await comprobarToken(red as RedVerificable, accessToken);
  if (resultado === 'rechazado') {
    await marcarCanalDesconectado(uid, red, 'token_rechazado');
    return { ok: false, estado: 'rechazado', mensaje: `${detalle} Reconecta la cuenta.` };
  }
  if (resultado === 'ok') {
    const canales = await obtenerCanales(uid);
    const actual = (canales?.[red] as Record<string, unknown> | undefined) ?? {};
    await guardarCanal(uid, red, { ...actual, conectado: true, motivo: null, verificadoEn: new Date().toISOString() });
    return { ok: true, estado: 'ok', mensaje: detalle };
  }
  return { ok: false, estado: 'error', mensaje: detalle };
});

/**
 * Prueba un escenario de Make o n8n con la URL que escribe la persona. Va sin secreto (U1): la URL
 * no es del operador. Solo https y destinos públicos; no sigue redirecciones.
 */
export const probarWebhook = onCall({ region: 'us-central1' }, async (request) => {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'Debes iniciar sesión');
  }
  const url = typeof request.data?.url === 'string' ? request.data.url.trim() : '';
  if (!esDestinoPublicoHttps(url)) {
    throw new HttpsError('invalid-argument', 'Usa una URL https pública (sin IP, sin localhost).');
  }
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'verify_channel', test: true }),
      redirect: 'manual',
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    if (res.ok) return { ok: true, status: res.status, mensaje: `El escenario respondió ${res.status}.` };
    return { ok: false, status: res.status, mensaje: `El escenario respondió ${res.status}. Revisa que esté activo.` };
  } catch {
    return { ok: false, status: 0, mensaje: 'No se pudo llegar a la URL. Revisa que esté activa y sea pública.' };
  }
});
