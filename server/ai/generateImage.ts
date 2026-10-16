import { logger } from '../platform/logger';
import { guardarMedioGenerado } from './guardarMedio';

export type GeneratedImage = {
  /** Imagen en base64 (JPEG). El frontend la sube a Blob antes de guardar la publicación. */
  dataUrl: string;
  mimeType: string;
  model: string;
  /** URL pública cuando el respaldo la sirve desde un proveedor externo. */
  publicUrl?: string;
};

export type ResultadoImagen =
  | { ok: true; image: GeneratedImage }
  | { ok: false; motivo: string; cuotaGratuita: boolean };

/**
 * Modelos de imagen de Gemini (API Interactions), del más recomendado al más económico.
 * Referencia: https://ai.google.dev/gemini-api/docs/image-generation
 */
const MODELOS_IMAGEN = ['gemini-nano-banana-2.1', 'gemini-3.1-flash-lite-image'];

const INTERACTIONS_URL = 'https://generativelanguage.googleapis.com/v1beta/interactions';

/** Tiempo máximo por llamada a Gemini; la función de Vercel tiene 60 s en total. */
const TIMEOUT_MAX_MS = 25_000;
/** Por debajo de este margen no merece la pena intentar una imagen. */
const MARGEN_MINIMO_MS = 8_000;

/** Relación de aspecto por red: Instagram cuadrado, TikTok vertical, el resto horizontal. */
const FORMATO_POR_RED: Record<string, '1:1' | '4:5' | '9:16' | '16:9'> = {
  instagram: '1:1',
  tiktok: '9:16',
  facebook: '16:9',
  linkedin: '16:9',
  youtube: '16:9',
};

const ESTILO = 'Professional social media photo, high quality, natural lighting. No text, letters, logos or watermarks in the image.';

function modelosAProbar(): string[] {
  const custom = process.env.GEMINI_IMAGE_MODEL?.trim();
  if (custom && /^[a-z0-9][a-z0-9.-]*$/i.test(custom)) {
    return [custom, ...MODELOS_IMAGEN.filter((m) => m !== custom)];
  }
  return MODELOS_IMAGEN;
}

/** IMAGE_FALLBACK acepta `pollinations`, `true` o `1` (igual que antes). */
function usarRespaldoPollinations(): boolean {
  const mode = (process.env.IMAGE_FALLBACK || '').toLowerCase();
  return mode === 'pollinations' || mode === 'true' || mode === '1';
}

type Bloque = { base64: string; mimeType: string };

function bloqueDeImagen(o: Record<string, unknown>): Bloque | null {
  if (o.type === 'image' && typeof o.data === 'string' && o.data.length > 500) {
    return { base64: o.data, mimeType: String(o.mime_type ?? o.mimeType ?? 'image/jpeg') };
  }
  const inline = (o.inlineData ?? o.inline_data) as { data?: unknown; mimeType?: string; mime_type?: string } | undefined;
  if (inline && typeof inline.data === 'string' && inline.data.length > 500) {
    return { base64: inline.data, mimeType: String(inline.mimeType ?? inline.mime_type ?? 'image/jpeg') };
  }
  return null;
}

/**
 * Busca la imagen final de la respuesta. Prefiere los pasos `model_output` (la salida final)
 * y toma el último bloque de imagen; las imágenes de pasos de pensamiento no se usan.
 */
function extraerImagen(data: unknown): Bloque | null {
  if (!data || typeof data !== 'object') return null;
  const pasos = (data as { steps?: unknown }).steps;
  if (Array.isArray(pasos)) {
    const salidas = pasos.filter((p): p is Record<string, unknown> => !!p && typeof p === 'object' && (p as Record<string, unknown>).type === 'model_output');
    let hallada: Bloque | null = null;
    for (const paso of salidas) {
      const contenido = Array.isArray(paso.content) ? paso.content : [];
      for (const bloque of contenido) {
        if (bloque && typeof bloque === 'object') {
          const img = bloqueDeImagen(bloque as Record<string, unknown>);
          if (img) hallada = img;
        }
      }
    }
    if (hallada) return hallada;
  }
  // Forma alternativa: buscar en el resto de la respuesta.
  let encontrada: Bloque | null = null;
  const recorrer = (o: unknown) => {
    if (encontrada || !o || typeof o !== 'object') return;
    if (Array.isArray(o)) {
      o.forEach(recorrer);
      return;
    }
    const r = o as Record<string, unknown>;
    encontrada = bloqueDeImagen(r);
    if (encontrada) return;
    Object.values(r).forEach(recorrer);
  };
  recorrer(data);
  return encontrada;
}

/** Traduce un error de Google a un motivo que la persona usuaria pueda resolver. */
function motivoDeError(status: number, cuerpo: string): { motivo: string; cuotaGratuita: boolean } {
  const msg = (() => {
    try {
      return (JSON.parse(cuerpo) as { error?: { message?: string } }).error?.message ?? cuerpo;
    } catch {
      return cuerpo;
    }
  })();
  const bajo = msg.toLowerCase();
  if (bajo.includes('free tier') || bajo.includes('limit: 0')) {
    return {
      motivo:
        'La clave de Gemini está en el plan gratuito, que no incluye generación de imágenes. Activa la facturación del proyecto en Google AI Studio (https://ai.dev/rate-limit) y vuelve a intentar.',
      cuotaGratuita: true,
    };
  }
  if (status === 429) {
    return { motivo: 'Cuota de imágenes de Gemini agotada por hoy. Vuelve a intentar más tarde.', cuotaGratuita: false };
  }
  if (status === 401 || status === 403 || bajo.includes('api key')) {
    return { motivo: 'Gemini rechazó la clave (401/403). Revisa GEMINI_API_KEY en Vercel.', cuotaGratuita: false };
  }
  return { motivo: `Gemini no devolvió imagen (${status}): ${msg.slice(0, 160)}`, cuotaGratuita: false };
}

type Intento =
  | { ok: true; image: GeneratedImage }
  | { ok: false; motivo: string; cuotaGratuita: boolean; claveInvalida: boolean };

async function generarConModelo(
  apiKey: string,
  modelo: string,
  prompt: string,
  formato: string,
  timeoutMs: number
): Promise<Intento> {
  const res = await fetch(INTERACTIONS_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-goog-api-key': apiKey,
      'Api-Revision': '2026-05-20',
    },
    body: JSON.stringify({
      model: modelo,
      input: prompt,
      response_format: { type: 'image', mime_type: 'image/jpeg', aspect_ratio: formato, image_size: '1K' },
    }),
    signal: AbortSignal.timeout(timeoutMs),
  });

  const cuerpo = await res.text();
  if (!res.ok) {
    logger.warn('Gemini imagen rechazada', { modelo, status: res.status, cuerpo: cuerpo.slice(0, 200) });
    const { motivo, cuotaGratuita } = motivoDeError(res.status, cuerpo);
    const claveInvalida = res.status === 401 || res.status === 403 || cuerpo.toLowerCase().includes('api key');
    return { ok: false, motivo, cuotaGratuita, claveInvalida };
  }

  let data: unknown = null;
  try {
    data = JSON.parse(cuerpo);
  } catch {
    return { ok: false, motivo: 'Respuesta de Gemini no válida.', cuotaGratuita: false, claveInvalida: false };
  }
  const img = extraerImagen(data);
  if (!img) {
    logger.warn('Gemini imagen sin bloque de imagen', { modelo, claves: data && typeof data === 'object' ? Object.keys(data) : [] });
    return { ok: false, motivo: 'Gemini respondió sin imagen.', cuotaGratuita: false, claveInvalida: false };
  }
  return {
    ok: true,
    image: { dataUrl: `data:${img.mimeType};base64,${img.base64}`, mimeType: img.mimeType, model: modelo },
  };
}

/** Respaldo opcional (solo con IMAGE_FALLBACK activado). Usa el mismo prompt inteligente. */
async function generarConPollinations(prompt: string, formato: string, timeoutMs: number): Promise<GeneratedImage | null> {
  try {
    const [w, h] = formato === '9:16' ? [720, 1280] : formato === '1:1' ? [1024, 1024] : [1280, 720];
    const corto = Array.from(prompt).slice(0, 600).join('');
    const url = `https://image.pollinations.ai/prompt/${encodeURIComponent(corto)}?width=${w}&height=${h}&nologo=true&model=flux`;
    const res = await fetch(url, { signal: AbortSignal.timeout(timeoutMs) });
    if (!res.ok) return null;
    const buf = Buffer.from(await res.arrayBuffer());
    if (buf.length < 1000) return null;
    const mime = res.headers.get('content-type')?.split(';')[0] || 'image/jpeg';
    // La URL del proveedor generaría otra imagen en cada descarga: se guarda en Blob cuando hay almacén.
    const publicUrl = await guardarMedioGenerado(buf, mime, 'imagen-ia', mime.includes('png') ? 'png' : 'jpg').catch(
      () => undefined
    );
    return {
      dataUrl: `data:${mime};base64,${buf.toString('base64')}`,
      mimeType: mime,
      model: 'pollinations',
      publicUrl,
    };
  } catch (e) {
    logger.warn('Pollinations falló', e);
    return null;
  }
}

/**
 * Genera una imagen a partir del prompt en inglés que escribe la IA.
 * Respeta un presupuesto de tiempo (`presupuestoMs`) para no superar el límite de la función.
 * No devuelve imágenes de stock sin relación con el tema.
 */
export async function generateGeminiImage(
  apiKey: string,
  promptImagen: string,
  red: string,
  presupuestoMs: number
): Promise<ResultadoImagen> {
  const formato = Object.prototype.hasOwnProperty.call(FORMATO_POR_RED, red) ? FORMATO_POR_RED[red] : '16:9';
  const prompt = `${promptImagen.trim()}. ${ESTILO}`;
  const limite = Date.now() + presupuestoMs;
  const quedan = () => limite - Date.now();

  let ultimo: { motivo: string; cuotaGratuita: boolean } = { motivo: 'Sin respuesta de Gemini.', cuotaGratuita: false };
  for (const modelo of modelosAProbar()) {
    if (quedan() < MARGEN_MINIMO_MS) {
      ultimo = { motivo: 'La imagen tardó demasiado y no se generó. Vuelve a intentar.', cuotaGratuita: false };
      break;
    }
    try {
      const r = await generarConModelo(apiKey, modelo, prompt, formato, Math.min(TIMEOUT_MAX_MS, quedan()));
      if (r.ok) {
        logger.info('Imagen generada', { modelo });
        return r;
      }
      ultimo = { motivo: r.motivo, cuotaGratuita: r.cuotaGratuita };
      // Sin cuota gratuita o con clave inválida, los demás modelos fallarían igual.
      if (r.cuotaGratuita || r.claveInvalida) break;
    } catch (e) {
      const esTiempo = e instanceof Error && (e.name === 'TimeoutError' || e.name === 'AbortError');
      logger.warn('generateImage', modelo, e);
      ultimo = {
        motivo: esTiempo ? 'Gemini tardó demasiado en generar la imagen. Vuelve a intentar.' : 'Error de red al generar la imagen.',
        cuotaGratuita: false,
      };
    }
  }

  if (usarRespaldoPollinations() && quedan() > MARGEN_MINIMO_MS) {
    const poll = await generarConPollinations(prompt, formato, Math.min(20_000, quedan()));
    if (poll) return { ok: true, image: poll };
  }

  return { ok: false, ...ultimo };
}
