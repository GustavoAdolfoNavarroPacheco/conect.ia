import { onCall } from '../platform/callable';
import { getAiKeys, resolveAiProvider } from './aiProvider';

/** Comprueba que Functions responde y si hay API de IA configurada */
export const healthCheck = onCall({ region: 'us-central1' }, async () => {
  const keys = getAiKeys();
  let ai = false;
  let provider = '';
  let aiError = '';
  try {
    const r = resolveAiProvider();
    ai = true;
    provider = r.provider;
  } catch (e) {
    aiError = e instanceof Error ? e.message : 'Sin API IA';
  }
  return {
    ok: true,
    ai,
    provider,
    aiError,
    hasAnthropic: Boolean(keys.anthropic),
    hasGemini: Boolean(keys.gemini),
    hint: ai
      ? keys.anthropic && keys.gemini
        ? 'IA lista (Anthropic + Gemini; fallback automático)'
        : 'IA lista'
      : 'Crea variables de entorno de Vercel con ANTHROPIC_API_KEY o GEMINI_API_KEY',
  };
});
