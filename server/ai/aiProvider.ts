import { GoogleGenerativeAI } from '@google/generative-ai';
import { defineSecret } from '../platform/params';
import { logger } from '../platform/logger';

export const geminiApiKey = defineSecret('GEMINI_API_KEY');
export const anthropicApiKey = defineSecret('ANTHROPIC_API_KEY');

export const CAMPUS_SYSTEM_PROMPT = `Eres Conect.ia, el agente de marketing digital para creadores, freelancers y marcas.
Generas contenido para redes sociales (Instagram, Facebook, LinkedIn, TikTok, YouTube).
Responde en español, tono profesional y cercano. Incluye hashtags relevantes cuando aplique.
Marca: Conect.ia — publicaciones profesionales en LinkedIn, Facebook, Instagram, TikTok, Freelancer y Fiverr.
Enfócate en ideas que mantengan las redes activas y llamen la atención del público objetivo.`;

// claude-3-5-haiku-20241022 está retirado. Se puede cambiar con ANTHROPIC_MODEL sin tocar código.
const CLAUDE_MODEL = process.env.ANTHROPIC_MODEL?.trim() || 'claude-haiku-5-5';

/** Modelos en orden (los 2.x están bloqueados para claves nuevas; se usan los 3.x vía Interactions API). */
function geminiModelsToTry(): string[] {
  const raw = process.env.GEMINI_MODEL?.trim() ?? '';
  const custom = /^[a-z0-9][a-z0-9.-]*$/i.test(raw) ? raw : '';
  const defaults = ['gemini-3.5-flash', 'gemini-3.6-flash', 'gemini-3.1-flash-lite'];
  return custom ? [custom, ...defaults.filter((m) => m !== custom)] : defaults;
}

type GoogleApiError = { error?: { code?: number; message?: string; status?: string } };

function parseGoogleApiErrorBody(body: string): GoogleApiError | null {
  try {
    return JSON.parse(body) as GoogleApiError;
  } catch {
    return null;
  }
}

function parseGeminiHttpError(status: number, body: string): Error {
  const parsed = parseGoogleApiErrorBody(body);
  const apiMsg = parsed?.error?.message ?? body;
  const lower = apiMsg.toLowerCase();

  if (lower.includes('leaked') || lower.includes('reported as leaked')) {
    return new Error(
      'Google bloqueó tu GEMINI_API_KEY (fue expuesta públicamente). Crea una clave NUEVA en https://aistudio.google.com/apikey y actualiza solo variables de entorno de Vercel. No la pegues en chats ni en git.'
    );
  }
  if (status === 403) {
    return new Error(
      `Gemini rechazó la petición (403). Revisa que la clave sea de AI Studio y que Generative Language API esté activa. Detalle: ${apiMsg.slice(0, 160)}`
    );
  }
  if (status === 429 || lower.includes('quota')) {
    return new Error(
      `Cuota de Gemini agotada (429). Espera unos minutos, usa GEMINI_MODEL=gemini-3.1-flash-lite en variables de entorno de Vercel, o activa facturación en Google AI Studio.`
    );
  }
  if (status === 401 || lower.includes('api key not valid')) {
    return new Error('Clave de Gemini inválida. Crea una nueva en https://aistudio.google.com/apikey');
  }
  if (status === 404) {
    return new Error(
      `Modelo Gemini no disponible (404). Prueba GEMINI_MODEL=gemini-3.5-flash en variables de entorno de Vercel`
    );
  }
  if (status === 503 || lower.includes('high demand') || lower.includes('overloaded')) {
    return new Error(
      'Gemini está saturado (503). Espera 30 segundos y pulsa de nuevo; el sistema probará otro modelo automáticamente.'
    );
  }
  return new Error(`Error de Gemini (${status}): ${apiMsg.slice(0, 180)}`);
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

function parseGeminiError(err: unknown): Error {
  const msg = err instanceof Error ? err.message : String(err);
  if (msg.includes('leaked') || msg.includes('expuesta públicamente')) return err instanceof Error ? err : new Error(msg);
  if (msg.includes('API key not valid') || msg.includes('API_KEY_INVALID')) {
    return new Error('Clave de Gemini inválida. Crea una nueva en https://aistudio.google.com/apikey');
  }
  const status = msg.match(/\b(403|404|429)\b/)?.[1];
  if (status === '403' && msg.toLowerCase().includes('forbidden')) {
    return new Error(
      'Gemini 403 Forbidden: suele ser clave bloqueada o incorrecta. Usa una API key nueva de AI Studio en variables de entorno de Vercel.'
    );
  }
  return new Error(msg.length > 220 ? `${msg.slice(0, 220)}…` : msg);
}

function isGeminiModelNotFound(err: unknown): boolean {
  const msg = (err instanceof Error ? err.message : String(err)).toLowerCase();
  return msg.includes('404') && (msg.includes('not found') || msg.includes('no disponible'));
}

function isGeminiQuota(err: unknown): boolean {
  const msg = (err instanceof Error ? err.message : String(err)).toLowerCase();
  return msg.includes('429') || msg.includes('quota') || msg.includes('cuota');
}

function isGeminiTransient(err: unknown): boolean {
  const msg = (err instanceof Error ? err.message : String(err)).toLowerCase();
  return (
    isGeminiQuota(err) ||
    msg.includes('503') ||
    msg.includes('high demand') ||
    msg.includes('saturado') ||
    msg.includes('overloaded')
  );
}

function isGeminiLeakedKey(err: unknown): boolean {
  const msg = (err instanceof Error ? err.message : String(err)).toLowerCase();
  return msg.includes('leaked') || msg.includes('expuesta públicamente') || msg.includes('bloqueó tu gemini');
}

function envKeys(...names: string[]): string {
  for (const name of names) {
    const v = process.env[name]?.trim();
    if (v) return v;
  }
  return '';
}

function readSecret(secret: ReturnType<typeof defineSecret>, envFallback: string): string {
  try {
    const v = secret.value();
    if (v?.trim()) return v.trim();
  } catch {
    // Emulador sin secret montado
  }
  return envKeys(envFallback);
}

export type AiProvider = 'anthropic' | 'gemini';

export function getAiKeys(): { anthropic: string; gemini: string } {
  return {
    anthropic:
      readSecret(anthropicApiKey, 'ANTHROPIC_API_KEY') || envKeys('CLAVE_API_CLAUDE'),
    gemini: readSecret(geminiApiKey, 'GEMINI_API_KEY') || envKeys('CLAVE_API_GEMINI'),
  };
}

/** Orden único de proveedores: el mismo para generar texto y para el estado de salud. */
export function ordenDeProveedores(): AiProvider[] {
  const prefer = (process.env.AI_PROVIDER || 'auto').toLowerCase();
  return prefer === 'anthropic' ? ['anthropic', 'gemini'] : ['gemini', 'anthropic'];
}

export function resolveAiProvider(): { provider: AiProvider; apiKey: string } {
  const keys = getAiKeys();
  for (const provider of ordenDeProveedores()) {
    const apiKey = provider === 'anthropic' ? keys.anthropic : keys.gemini;
    if (apiKey) return { provider, apiKey };
  }

  throw new Error(
    'Configura GEMINI_API_KEY en variables de entorno de Vercel (clave de https://aistudio.google.com/apikey)'
  );
}

function parseAnthropicError(status: number, errText: string): Error {
  let apiMsg = errText;
  try {
    const j = JSON.parse(errText) as { error?: { message?: string } };
    if (j.error?.message) apiMsg = j.error.message;
  } catch {
    // texto plano
  }

  const lower = apiMsg.toLowerCase();
  if (lower.includes('credit balance') || lower.includes('billing')) {
    return new Error(
      'Tu cuenta de Anthropic no tiene créditos. Añade GEMINI_API_KEY (AI Studio) en variables de entorno de Vercel'
    );
  }
  if (status === 401) {
    return new Error('Clave de Anthropic inválida.');
  }
  return new Error(`Error de Anthropic (${status}): ${apiMsg.slice(0, 180)}`);
}

function isAnthropicRecoverable(err: unknown): boolean {
  const msg = (err instanceof Error ? err.message : String(err)).toLowerCase();
  return msg.includes('créditos') || msg.includes('credit balance') || msg.includes('billing');
}

async function callAnthropic(apiKey: string, userPrompt: string): Promise<string> {
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: CLAUDE_MODEL,
      max_tokens: 2048,
      system: CAMPUS_SYSTEM_PROMPT,
      messages: [{ role: 'user', content: userPrompt }],
    }),
  });

  if (!res.ok) {
    const errText = await res.text();
    logger.error('Anthropic API error', { status: res.status, errText });
    throw parseAnthropicError(res.status, errText);
  }

  const data = (await res.json()) as { content?: { type: string; text?: string }[] };
  const block = data.content?.find((c) => c.type === 'text');
  return block?.text?.trim() ?? '';
}

/** Llamada REST directa a Gemini vía Interactions API (claves nuevas no pueden usar :generateContent). */
const GEMINI_INTERACTIONS_URL = 'https://generativelanguage.googleapis.com/v1beta/interactions';

async function callGeminiRest(
  apiKey: string,
  modelName: string,
  userPrompt: string
): Promise<string> {
  const url = `${GEMINI_INTERACTIONS_URL}?key=${encodeURIComponent(apiKey)}`;
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Api-Revision': '2026-05-20',
    },
    body: JSON.stringify({
      model: modelName,
      system_instruction: CAMPUS_SYSTEM_PROMPT,
      input: userPrompt,
    }),
  });

  const body = await res.text();
  if (!res.ok) {
    logger.error('Gemini API error', { status: res.status, model: modelName, body: body.slice(0, 400) });
    throw parseGeminiHttpError(res.status, body);
  }

  const data = JSON.parse(body) as {
    status?: string;
    steps?: { type?: string; content?: { type?: string; text?: string }[] }[];
    error?: { message?: string };
  };
  const modelStep = data.steps?.find((s) => s.type === 'model_output');
  const text = modelStep?.content?.map((p) => p.text ?? '').join('') ?? '';
  if (!text.trim()) throw new Error('Gemini respondió sin texto');
  return text.trim();
}

async function callGemini(apiKey: string, userPrompt: string): Promise<string> {
  const models = geminiModelsToTry();
  let lastErr: unknown;
  let sawQuota = false;
  let saw404 = false;

  for (const modelName of models) {
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        return await callGeminiRest(apiKey, modelName, userPrompt);
      } catch (err) {
        lastErr = err;
        if (isGeminiLeakedKey(err)) throw err;
        if (isGeminiQuota(err) || isGeminiTransient(err)) sawQuota = true;
        if (isGeminiModelNotFound(err)) saw404 = true;
        if (isGeminiTransient(err) && attempt === 0) {
          logger.warn(`Gemini ${modelName} ocupado, reintento…`);
          await sleep(2000);
          continue;
        }
        if (isGeminiTransient(err) || isGeminiModelNotFound(err)) {
          logger.warn(`Gemini ${modelName}: ${err instanceof Error ? err.message : err}`);
          break;
        }
        throw parseGeminiError(err);
      }
    }
  }

  if (sawQuota) {
    throw new Error(
      'Cuota de Gemini agotada (429). Espera 1–2 minutos y vuelve a intentar, o activa facturación en https://aistudio.google.com'
    );
  }
  if (saw404) {
    throw new Error(
      'Ningún modelo Gemini disponible. En variables de entorno de Vercel usa GEMINI_MODEL=gemini-3.5-flash y reinicia npm run dev'
    );
  }
  throw parseGeminiError(lastErr ?? new Error('Sin respuesta de Gemini'));
}

export async function generateAiText(userPrompt: string): Promise<{ text: string; provider: AiProvider }> {
  const keys = getAiKeys();
  const tryOrder = ordenDeProveedores();

  let lastError: Error | null = null;

  for (const provider of tryOrder) {
    const apiKey = provider === 'anthropic' ? keys.anthropic : keys.gemini;
    if (!apiKey) continue;

    try {
      const text =
        provider === 'anthropic'
          ? await callAnthropic(apiKey, userPrompt)
          : await callGemini(apiKey, userPrompt);
      return { text, provider };
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
      const hasOther = provider === 'anthropic' ? Boolean(keys.gemini) : Boolean(keys.anthropic);
      if (hasOther && (provider !== 'anthropic' || isAnthropicRecoverable(err))) {
        logger.warn(`IA ${provider} falló`, lastError.message);
        continue;
      }
      throw lastError;
    }
  }

  throw (
    lastError ??
    new Error('Configura GEMINI_API_KEY en variables de entorno de Vercel (https://aistudio.google.com/apikey)')
  );
}

export function getGeminiModel() {
  const keys = getAiKeys();
  if (!keys.gemini) {
    throw new Error('getGeminiModel requiere GEMINI_API_KEY en variables de entorno de Vercel');
  }
  const genAI = new GoogleGenerativeAI(keys.gemini);
  return genAI.getGenerativeModel({
    model: geminiModelsToTry()[0],
    systemInstruction: CAMPUS_SYSTEM_PROMPT,
  });
}
