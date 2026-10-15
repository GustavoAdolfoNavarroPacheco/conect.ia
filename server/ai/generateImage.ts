import { logger } from '../platform/logger';

export type GeneratedImage = {
  dataUrl: string;
  mimeType: string;
  model: string;
  /** URL https pública (Pollinations/Picsum) — LinkedIn la usa sin almacenamiento propio */
  publicUrl?: string;
};

const IMAGEN_MODELS = ['imagen-4.0-fast-generate-001', 'imagen-4.0-generate-001'];

const GEMINI_IMAGE_MODELS = [
  'gemini-2.5-flash-image',
  'gemini-2.0-flash-preview-image-generation',
];

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

function imageModelsToTry(): string[] {
  const custom = process.env.GEMINI_IMAGE_MODEL?.trim();
  if (custom && /^[a-z0-9][a-z0-9.-]*$/i.test(custom)) {
    if (custom.startsWith('imagen-')) {
      return [custom, ...IMAGEN_MODELS.filter((m) => m !== custom)];
    }
    return [custom, ...GEMINI_IMAGE_MODELS.filter((m) => m !== custom), ...IMAGEN_MODELS];
  }
  return [...GEMINI_IMAGE_MODELS, ...IMAGEN_MODELS];
}

function usePollinationsFallback(): boolean {
  const mode = (process.env.IMAGE_FALLBACK || 'pollinations').toLowerCase();
  return mode === 'pollinations' || mode === 'true' || mode === '1';
}

function toDataUrl(base64: string, mime = 'image/png'): GeneratedImage {
  return { dataUrl: `data:${mime};base64,${base64}`, mimeType: mime, model: '' };
}

async function generateWithImagen(
  apiKey: string,
  modelName: string,
  prompt: string
): Promise<GeneratedImage | null> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:predict?key=${encodeURIComponent(apiKey)}`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      instances: [{ prompt }],
      parameters: { sampleCount: 1, aspectRatio: '16:9', personGeneration: 'allow_adult' },
    }),
  });

  const body = await res.text();
  if (!res.ok) {
    logger.warn('Imagen skip', { model: modelName, status: res.status, body: body.slice(0, 200) });
    return null;
  }

  const data = JSON.parse(body) as {
    predictions?: { bytesBase64Encoded?: string; mimeType?: string }[];
  };
  const pred = data.predictions?.[0];
  if (!pred?.bytesBase64Encoded) return null;
  const out = toDataUrl(pred.bytesBase64Encoded, pred.mimeType || 'image/png');
  out.model = modelName;
  return out;
}

async function generateWithGeminiImageModel(
  apiKey: string,
  modelName: string,
  prompt: string
): Promise<GeneratedImage | null> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${encodeURIComponent(apiKey)}`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ role: 'user', parts: [{ text: `Generate an image: ${prompt}` }] }],
      generationConfig: { responseModalities: ['TEXT', 'IMAGE'] },
    }),
  });

  const body = await res.text();
  if (!res.ok) {
    logger.warn('Gemini image skip', { model: modelName, status: res.status, body: body.slice(0, 200) });
    return null;
  }

  const data = JSON.parse(body) as {
    candidates?: { content?: { parts?: { inlineData?: { mimeType?: string; data?: string } }[] } }[];
  };
  const parts = data.candidates?.[0]?.content?.parts ?? [];
  const img = parts.find((p) => p.inlineData?.data);
  if (!img?.inlineData?.data) return null;

  const mime = img.inlineData.mimeType || 'image/png';
  const out = toDataUrl(img.inlineData.data, mime);
  out.model = modelName;
  return out;
}

/** Respaldo gratuito cuando Google Imagen/Gemini image no está disponible (cuota o plan). */
async function generatePollinationsFallback(prompt: string): Promise<GeneratedImage | null> {
  const short = prompt.slice(0, 350).replace(/[^\w\s,.-áéíóúñÁÉÍÓÚÑ]/g, ' ');
  const url = `https://image.pollinations.ai/prompt/${encodeURIComponent(short)}?width=1280&height=720&nologo=true&model=flux`;
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(90000) });
    if (!res.ok) {
      logger.warn('Pollinations skip', { status: res.status });
      return null;
    }
    const buf = Buffer.from(await res.arrayBuffer());
    if (buf.length < 1000) return null;
    const mime = res.headers.get('content-type')?.split(';')[0] || 'image/jpeg';
    const out = toDataUrl(buf.toString('base64'), mime);
    out.model = 'pollinations-fallback';
    out.publicUrl = url;
    logger.info('Imagen vía fallback Pollinations');
    return out;
  } catch (e) {
    logger.warn('Pollinations fallback failed', e);
    return null;
  }
}

/** Stock photo por seed (gratis) cuando Pollinations exige pago (402). */
async function generatePicsumFallback(prompt: string): Promise<GeneratedImage | null> {
  const { createHash } = await import('crypto');
  const seed = createHash('md5').update(prompt).digest('hex').slice(0, 16);
  const url = `https://picsum.photos/seed/${seed}/1280/720`;
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(30000), redirect: 'follow' });
    if (!res.ok) return null;
    const buf = Buffer.from(await res.arrayBuffer());
    if (buf.length < 1000) return null;
    const mime = res.headers.get('content-type')?.split(';')[0] || 'image/jpeg';
    const out = toDataUrl(buf.toString('base64'), mime);
    out.model = 'picsum-fallback';
    out.publicUrl = url;
    logger.info('Imagen vía fallback Picsum (stock)');
    return out;
  } catch (e) {
    logger.warn('Picsum fallback failed', e);
    return null;
  }
}

/** Genera imagen: Gemini 2.5 Flash Image (Nano Banana) → Imagen 4 → fallback opcional. */
export async function generateGeminiImage(
  apiKey: string,
  imagePrompt: string
): Promise<GeneratedImage | null> {
  const prompt = [
    'professional social media marketing campaign, vibrant colors, social network icons',
    imagePrompt,
    'professional social media photo, bright modern, inspiring',
  ].join(', ');

  for (const modelName of imageModelsToTry()) {
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const result = modelName.startsWith('imagen-')
          ? await generateWithImagen(apiKey, modelName, prompt)
          : await generateWithGeminiImageModel(apiKey, modelName, prompt);
        if (result) {
          logger.info('Imagen generada', { model: result.model });
          return result;
        }
      } catch (e) {
        logger.warn('generateImage', modelName, e);
      }
      await sleep(3000);
    }
  }

  if (usePollinationsFallback()) {
    const poll = await generatePollinationsFallback(prompt);
    if (poll) return poll;
    return generatePicsumFallback(prompt);
  }

  return null;
}
