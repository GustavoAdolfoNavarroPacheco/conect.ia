import type { ResultadoRed } from '../types';
import { ErrorApi, esReintentableCreacion, esReintentableLectura, withRetry } from './retry';
import { descargarConLimite } from './descarga';
import { logger } from '../platform/logger';
import { TIKTOK_API_BASE } from '../integracion/tiktokOAuthConfig';
import { refreshTikTokAccessToken } from '../integracion/tiktokOAuthApi';

export interface TikTokTokens {
  accessToken?: string;
  refreshToken?: string;
  openId?: string;
  expiresAt?: number;
  displayName?: string;
}

const CHUNK_SIZE = 10 * 1024 * 1024;
const MIN_CHUNK_SIZE = 5 * 1024 * 1024;
const MAX_BUFFER_BYTES = 200 * 1024 * 1024;
const MAX_ATTEMPTS_STATUS = 60;

/**
 * Plan de chunks según la guía de TikTok (Media Transfer):
 * - Videos < 5 MB: se suben enteros (chunk_size = tamaño total del video).
 * - total_chunk_count = video_size / chunk_size, redondeado hacia abajo.
 * - El último chunk absorbe los bytes sobrantes (puede superar chunk_size).
 */
function buildChunkPlan(videoSize: number): { chunkSize: number; totalChunks: number } {
  if (videoSize < MIN_CHUNK_SIZE) {
    return { chunkSize: videoSize, totalChunks: 1 };
  }
  const chunkSize = Math.min(CHUNK_SIZE, videoSize);
  return { chunkSize, totalChunks: Math.max(1, Math.floor(videoSize / chunkSize)) };
}

function contentTypeFor(url: string): string {
  if (/\.mov$/i.test(url)) return 'video/quicktime';
  if (/\.webm$/i.test(url)) return 'video/webm';
  if (/\.avi$/i.test(url)) return 'video/x-msvideo';
  return 'video/mp4';
}

function isVideoUrl(url: string): boolean {
  // URLs con extensión conocida, o cualquier URL https (p. ej. video IA sin extensión).
  if (/\.(mp4|mov|webm|avi)$/i.test(url)) return true;
  return /^https?:\/\//i.test(url);
}

function parseTikTokError(status: number, text: string, ctx: string): Error {
  try {
    const parsed = JSON.parse(text) as {
      error?: { code?: string; message?: string; log_id?: string };
    };
    if (parsed.error?.code && parsed.error.code !== 'ok') {
      return new ErrorApi(`TikTok ${parsed.error.code}: ${parsed.error.message || ''}`.trim(), status);
    }
  } catch {
    // texto plano
  }
  return new ErrorApi(`TikTok ${ctx} ${status}: ${text.slice(0, 400)}`, status);
}

/** TikTok limita las llamadas por minuto: el error llega con este código. */
function esLimiteDeCuota(err: unknown): boolean {
  return /rate_limit_exceeded/i.test(err instanceof Error ? err.message : String(err));
}

/** TikTok renueva la cuota cada minuto: ante rate_limit espera 60 s y repite solo esa llamada. */
async function conEsperaPorCuota<T>(fn: () => Promise<T>): Promise<T> {
  try {
    return await fn();
  } catch (err) {
    if (!esLimiteDeCuota(err)) throw err;
    logger.warn('Límite de TikTok: esperando 60 s antes de reintentar');
    await new Promise((r) => setTimeout(r, 60_000));
    return fn();
  }
}

/** Renueva el access token de TikTok si expiró (vigencia 24 h, refresh 365 días). */
export async function refreshTikTokTokenIfNeeded(
  tokens: TikTokTokens,
  persist?: (next: TikTokTokens) => Promise<void>
): Promise<TikTokTokens> {
  if (!tokens.accessToken || !tokens.refreshToken) return tokens;
  if (tokens.expiresAt && Date.now() < tokens.expiresAt - 60_000) return tokens;

  const refreshed = await refreshTikTokAccessToken(tokens.refreshToken);
  const next: TikTokTokens = {
    ...tokens,
    accessToken: refreshed.access_token,
    refreshToken: refreshed.refresh_token || tokens.refreshToken,
    expiresAt: Date.now() + refreshed.expires_in * 1000,
  };
  if (persist) {
    // TikTok rota el refresh token: si no se guarda el nuevo, el anterior ya no sirve. Se informa, no se pierde en silencio.
    await persist(next);
  }
  return next;
}

/** Inicializa la publicación (Direct Post, FILE_UPLOAD) y devuelve publish_id + upload_url. */
async function initVideoPublish(
  accessToken: string,
  title: string,
  videoSize: number,
  chunkPlan: { chunkSize: number; totalChunks: number },
  privacyLevel: string,
  generadoIa = false
): Promise<{ publishId: string; uploadUrl: string }> {
  const body = {
    post_info: {
      title: title.trim().slice(0, 2200) || 'Video publicado desde Conect.ia',
      privacy_level: privacyLevel,
      disable_duet: false,
      disable_comment: false,
      disable_stitch: false,
      // Divulgación de contenido generado con IA (Q21), según el campo de la Content Posting API.
      is_aigc: generadoIa,
    },
    source_info: {
      source: 'FILE_UPLOAD',
      video_size: videoSize,
      chunk_size: chunkPlan.chunkSize,
      total_chunk_count: chunkPlan.totalChunks,
    },
  };

  const res = await fetch(`${TIKTOK_API_BASE}/post/publish/video/init/`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json; charset=UTF-8',
    },
    body: JSON.stringify(body),
  });
  const text = await res.text();
  if (!res.ok) {
    throw parseTikTokError(res.status, text, 'init');
  }
  const parsed = JSON.parse(text) as {
    data?: { publish_id?: string; upload_url?: string };
    error?: { code?: string; message?: string };
  };
  if (parsed.error?.code && parsed.error.code !== 'ok') {
    throw new Error(`TikTok ${parsed.error.code}: ${parsed.error.message || ''}`.trim());
  }
  if (!parsed.data?.publish_id) {
    throw new Error(`TikTok init: respuesta sin publish_id (${text.slice(0, 200)})`);
  }
  return {
    publishId: parsed.data.publish_id,
    uploadUrl: parsed.data.upload_url ?? '',
  };
}

/**
 * Sube el video en chunks al upload_url de TikTok. Cada fragmento va con su mismo rango
 * (Content-Range), así que repetirlo ante un fallo transitorio deja el archivo igual.
 */
async function uploadVideo(
  uploadUrl: string,
  buffer: Buffer,
  contentType: string,
  chunkSize: number,
  totalChunks: number
): Promise<void> {
  const total = buffer.length;
  const lastIndex = totalChunks - 1;

  for (let i = 0; i < totalChunks; i++) {
    const start = i * chunkSize;
    const end = i === lastIndex ? total - 1 : start + chunkSize - 1;
    const data = buffer.subarray(start, end + 1);
    const chunk = new Uint8Array(data.length);
    chunk.set(data);

    await withRetry(async () => {
      const res = await fetch(uploadUrl, {
        method: 'PUT',
        headers: {
          'Content-Type': contentType,
          'Content-Range': `bytes ${start}-${end}/${total}`,
        },
        body: chunk,
      });
      if (!res.ok) {
        const text = await res.text();
        throw parseTikTokError(res.status, text, 'upload');
      }
    }, 'tiktok fragmento');
  }
}

interface EstadoPublicacion {
  status: string;
  videoId?: string;
  failReason?: string;
}

/** Consulta el estado de una publicación ya creada. Es una lectura: se puede repetir sin efectos. */
async function consultarEstadoPublicacion(accessToken: string, publishId: string): Promise<EstadoPublicacion> {
  const res = await fetch(`${TIKTOK_API_BASE}/post/publish/status/fetch/`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json; charset=UTF-8',
    },
    body: JSON.stringify({ publish_id: publishId }),
  });
  const text = await res.text();
  if (!res.ok) {
    throw parseTikTokError(res.status, text, 'status');
  }
  const parsed = JSON.parse(text) as {
    data?: { status?: string; video_id?: string; fail_reason?: string };
    error?: { code?: string; message?: string };
  };
  if (parsed.error?.code && parsed.error.code !== 'ok') {
    throw new Error(`TikTok ${parsed.error.code}: ${parsed.error.message || ''}`.trim());
  }
  return {
    status: parsed.data?.status ?? '',
    videoId: parsed.data?.video_id,
    failReason: parsed.data?.fail_reason,
  };
}

/**
 * Consulta el estado hasta PUBLISH_COMPLETE. Un FAILED no se reintenta: se informa tal cual.
 * Los fallos transitorios al consultar no cancelan la espera.
 */
async function waitPublishComplete(
  accessToken: string,
  publishId: string
): Promise<string> {
  for (let attempt = 1; attempt <= MAX_ATTEMPTS_STATUS; attempt++) {
    let estado: EstadoPublicacion | null = null;
    try {
      estado = await consultarEstadoPublicacion(accessToken, publishId);
    } catch (err) {
      if (!esLimiteDeCuota(err) && !esReintentableLectura(err)) throw err;
      if (esLimiteDeCuota(err)) await new Promise((r) => setTimeout(r, 60_000));
    }

    if (estado?.status === 'PUBLISH_COMPLETE') {
      return estado.videoId ?? publishId;
    }
    if (estado?.status === 'FAILED') {
      throw new Error(`TikTok rechazó el video: ${estado.failReason || 'error de procesamiento'}`);
    }
    if (estado?.status === 'SEND_TO_USER_INBOX') {
      throw new Error('TikTok envió el video a tu bandeja de entrada en vez de publicarlo (revisa la app).');
    }
    await new Promise((r) => setTimeout(r, 5000));
  }
  throw new Error('TikTok tardó demasiado en procesar el video.');
}

/** Valores válidos del enum `privacy_level` (en orden de preferencia). */
const PRIVACY_PREFERENCE = ['PUBLIC_TO_EVERYONE', 'MUTUAL_FOLLOW_FRIENDS', 'SELF_ONLY'];

/** Cache en memoria de las opciones de privacidad por token (TTL 5 min) para no quemar cuota. */
const creatorInfoCache = new Map<string, { options: string[]; expiresAt: number }>();
const CREATOR_INFO_TTL_MS = 5 * 60_000;

/** Consulta las opciones de privacidad permitidas para el creador (requerido antes de publicar). */
async function queryCreatorPrivacyOptions(accessToken: string): Promise<string[]> {
  const cached = creatorInfoCache.get(accessToken);
  if (cached && cached.expiresAt > Date.now()) return cached.options;

  const res = await fetch(`${TIKTOK_API_BASE}/post/publish/creator_info/query/`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json; charset=UTF-8',
    },
    body: '{}',
  });
  const text = await res.text();
  if (!res.ok) {
    throw parseTikTokError(res.status, text, 'creator_info');
  }
  const parsed = JSON.parse(text) as { data?: { privacy_level_options?: string[] } };
  const options = parsed.data?.privacy_level_options ?? [];
  creatorInfoCache.set(accessToken, { options, expiresAt: Date.now() + CREATOR_INFO_TTL_MS });
  return options;
}

/** Descarga el video completo y valida tamaño y tipo. Es una lectura: se puede repetir. */
async function descargarVideo(videoUrl: string): Promise<{ buffer: Buffer; contentType: string }> {
  // Corta la descarga al superar 200 MB, sin cargar el archivo entero antes de comprobarlo.
  const { buffer, contentType: tipo } = await descargarConLimite(videoUrl, MAX_BUFFER_BYTES, 'TikTok');
  if (!buffer.length) {
    throw new Error('TikTok: el archivo de video está vacío');
  }
  const contentType = tipo.startsWith('video/') ? tipo : contentTypeFor(videoUrl);
  return { buffer, contentType };
}

/**
 * Publica un video en TikTok vía Content Posting API (Direct Post).
 * Flujo: descarga → init (FILE_UPLOAD) → upload en chunks → poll de estado.
 * Solo el init crea la publicación; por eso es el único paso que no se repite sin límite.
 */
export async function publishToTikTok(
  tokens: TikTokTokens,
  contenido: string,
  videoUrl: string | null,
  persistTokens?: (next: TikTokTokens) => Promise<void>,
  opciones: { generadoIa?: boolean } = {}
): Promise<ResultadoRed> {
  let current = tokens;
  if (!current.accessToken || !current.refreshToken) {
    return {
      success: false,
      error:
        'TikTok no conectado. Ve a Canales → Conectar TikTok y autoriza con tu cuenta.',
    };
  }

  if (!videoUrl) {
    return {
      success: false,
      error:
        'TikTok solo publica videos (mp4/mov/webm): sube un archivo de video o usa un video con IA; texto solo no es compatible.',
    };
  }
  if (!isVideoUrl(videoUrl)) {
    return {
      success: false,
      error:
        'TikTok solo publica videos (mp4/mov/webm). La imagen actual no es compatible: sube un archivo de video.',
    };
  }

  try {
    current = await refreshTikTokTokenIfNeeded(current, persistTokens);
  } catch (err) {
    return {
      success: false,
      error: `No se pudo renovar el acceso de TikTok. Reconecta TikTok en Canales. Detalle: ${
        err instanceof Error ? err.message : 'error desconocido'
      }`,
    };
  }

  const accessToken = current.accessToken!;
  const { buffer, contentType } = await withRetry(() => descargarVideo(videoUrl), 'tiktok descarga');
  const chunkPlan = buildChunkPlan(buffer.length);

  let allowedPrivacies: string[] = [];
  try {
    allowedPrivacies = await queryCreatorPrivacyOptions(accessToken);
  } catch {
    // Si creator_info falla, se usa la preferencia por defecto.
  }
  const candidates = allowedPrivacies.length
    ? PRIVACY_PREFERENCE.filter((p) => allowedPrivacies.includes(p))
    : ['PUBLIC_TO_EVERYONE', 'SELF_ONLY'];
  const privacyCandidates = candidates.length ? candidates : ['SELF_ONLY'];

  let initResult: { publishId: string; uploadUrl: string } | null = null;
  let initError: Error | null = null;

  for (const privacy of privacyCandidates) {
    try {
      initResult = await conEsperaPorCuota(() =>
        withRetry(
          () => initVideoPublish(accessToken, contenido, buffer.length, chunkPlan, privacy, opciones.generadoIa === true),
          'tiktok init',
          3,
          esReintentableCreacion
        )
      );
      break;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      initError = err instanceof Error ? err : new Error(msg);
      if (esLimiteDeCuota(err)) {
        throw new Error(
          'TikTok excedió el límite de solicitudes por minuto (6 por token). Espera 1 minuto y publica de nuevo.'
        );
      }
      const blockedByAudit = /unaudited_client_can_only_post_to_private/i.test(msg);
      if (blockedByAudit && privacy !== privacyCandidates[privacyCandidates.length - 1]) {
        continue;
      }
      throw err;
    }
  }
  if (!initResult) {
    throw initError ?? new Error('TikTok no pudo inicializar la publicación');
  }

  await uploadVideo(
    initResult.uploadUrl,
    buffer,
    contentType,
    chunkPlan.chunkSize,
    chunkPlan.totalChunks
  );

  const videoId = await waitPublishComplete(accessToken, initResult.publishId);
  return { success: true, postId: videoId };
}
