import { onCall, HttpsError } from '../platform/callable';
import { logger } from '../platform/logger';
import { exigirCuotaIA } from './cuotaIA';
import { guardarMedioGenerado } from './guardarMedio';

export type GeneratedVideo = {
  videoUrl: string;
  model: string;
  nota?: string;
};

const DEFAULT_MODELS = ['wan-fast', 'seedance-2.0-mini', 'p-video', 'veo'];

const VIDEO_BASE = 'https://gen.pollinations.ai/video';

function videoModelsToTry(): string[] {
  const custom = process.env.POLLINATIONS_VIDEO_MODEL?.trim();
  if (custom && /^[a-z0-9][a-z0-9.-]*$/i.test(custom)) {
    return [custom, ...DEFAULT_MODELS.filter((m) => m !== custom)];
  }
  return DEFAULT_MODELS;
}

function pollinationsKey(): string {
  return process.env.POLLINATIONS_API_KEY?.trim() ?? '';
}

function sanitizePrompt(prompt: string): string {
  return prompt
    .slice(0, 600)
    .replace(/[^\w\s,.:;!?'"áéíóúñÁÉÍÓÚÑ@#/()\-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

async function generateWithModel(
  key: string,
  model: string,
  prompt: string,
  imageUrl?: string
): Promise<GeneratedVideo | null> {
  const duration = parseInt(process.env.POLLINATIONS_VIDEO_DURATION?.trim() || '4', 10) || 4;
  const aspectRatio = process.env.POLLINATIONS_VIDEO_ASPECT?.trim() || '9:16';
  const audio = (process.env.POLLINATIONS_VIDEO_AUDIO ?? 'true') !== 'false';

  const params = new URLSearchParams({
    model,
    duration: String(duration),
    aspectRatio,
    audio: audio ? 'true' : 'false',
  });
  if (imageUrl) params.set('image', imageUrl);

  const url = `${VIDEO_BASE}/${encodeURIComponent(prompt)}?${params.toString()}`;

  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${key}` },
    signal: AbortSignal.timeout(240_000),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => '');
    logger.warn('Video skip', { model, status: res.status, body: body.slice(0, 200) });
    return null;
  }

  const ctype = res.headers.get('content-type') || '';
  if (!ctype.includes('video') && !ctype.includes('mp4')) {
    logger.warn('Video skip (respuesta no es video)', { model, ctype });
    return null;
  }

  // Esta respuesta ya es el video generado: se guarda tal cual en Blob. Así se genera una sola vez
  // y se publica exactamente lo que se previsualizó (antes, cada descarga generaba otro video).
  const buffer = Buffer.from(await res.arrayBuffer());
  if (buffer.length === 0) {
    logger.warn('Video skip (respuesta vacía)', { model });
    return null;
  }
  const videoUrl = await guardarMedioGenerado(buffer, ctype.split(';')[0].trim() || 'video/mp4', 'video-ia', 'mp4');
  if (!videoUrl) {
    throw new Error('No se pudo guardar el video en Blob. Revisa BLOB_READ_WRITE_TOKEN en Vercel.');
  }
  return { videoUrl, model };
}

/**
 * Genera un video vertical (9:16, TikTok) con la API de Pollinations (modelos
 * wan/seedance/veo). Requiere POLLINATIONS_API_KEY en variables de entorno de Vercel
 * (clave gratis en https://enter.pollinations.ai/keys).
 */
export const generateVideo = onCall(
  { region: 'us-central1', timeoutSeconds: 300, memory: '1GiB' },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError('unauthenticated', 'Debes iniciar sesión');
    }

    const { prompt, imageUrl } = request.data as { prompt?: string; imageUrl?: string };
    const trimmed = prompt?.trim();
    if (!trimmed) {
      throw new HttpsError('invalid-argument', 'prompt es obligatorio');
    }

    const key = pollinationsKey();
    if (!key) {
      throw new HttpsError(
        'failed-precondition',
        'POLLINATIONS_API_KEY no configurado. Crea una clave gratis en https://enter.pollinations.ai/keys y añádela a variables de entorno de Vercel'
      );
    }
    // Sin almacén no se genera: el video no podría publicarse siempre igual.
    if (!process.env.BLOB_READ_WRITE_TOKEN?.trim()) {
      throw new HttpsError(
        'failed-precondition',
        'Configura BLOB_READ_WRITE_TOKEN en Vercel: el video generado se guarda en Blob para publicarlo tal como lo viste.'
      );
    }

    await exigirCuotaIA(request.auth.uid, 'video');

    const clean = sanitizePrompt(trimmed);
    const cleanImage = imageUrl?.trim() || undefined;

    let lastError = 'No se pudo generar el video';
    for (const model of videoModelsToTry()) {
      try {
        const out = await generateWithModel(key, model, clean, cleanImage);
        if (out) {
          logger.info('Video generado', { model: out.model });
          return {
            videoUrl: out.videoUrl,
            model: out.model,
            nota:
              'Video vertical (9:16) generado con IA. TikTok tarda unos segundos en procesarlo al publicar.',
          };
        }
      } catch (e) {
        lastError = e instanceof Error ? e.message : String(e);
        logger.warn('generateVideo', model, e);
      }
    }

    throw new HttpsError('internal', lastError);
  }
);
