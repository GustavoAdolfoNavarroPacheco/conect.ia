import { HttpsError } from '../platform/callable';

/** Convierte errores de configuración/IA en códigos que el cliente puede leer. */
export function httpsErrorFrom(err: unknown): HttpsError {
  const msg = err instanceof Error ? err.message : 'Error en el servidor';
  const lower = msg.toLowerCase();

  if (
    lower.includes('leaked') ||
    lower.includes('bloqueó tu gemini') ||
    lower.includes('aistudio.google.com') ||
    lower.includes('créditos') ||
    lower.includes('credit balance') ||
    lower.includes('plans & billing') ||
    lower.includes('cuota de gemini') ||
    lower.includes('cuota de gemini agotada') ||
    lower.includes('ningún modelo gemini') ||
    lower.includes('saturado') ||
    lower.includes('high demand') ||
    lower.includes('503') ||
    lower.includes('403 forbidden') ||
    lower.includes('anthropic_api_key') ||
    lower.includes('gemini_api_key') ||
    lower.includes('api_key') ||
    lower.includes('variables de entorno de Vercel') ||
    lower.includes('google ai studio')
  ) {
    return new HttpsError('failed-precondition', msg);
  }

  if (lower.includes('unauthenticated') || lower.includes('iniciar sesión')) {
    return new HttpsError('unauthenticated', msg);
  }

  return new HttpsError('internal', msg);
}
