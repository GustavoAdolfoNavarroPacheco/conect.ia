import { obtenerConfiguracion } from '../db/repo';
import { logger } from '../platform/logger';

export type WebhookAutomatizacion = {
  url: string;
  /** Solo se envía a la URL del operador. Nunca viaja a una URL guardada por un usuario. */
  secreto: string;
  origen: 'operador' | 'usuario';
};

function esHttps(url: string): boolean {
  try {
    return new URL(url).protocol === 'https:';
  } catch {
    return false;
  }
}

export function resolveAutomationWebhookSecret(): string {
  return (
    process.env.N8N_WEBHOOK_SECRET?.trim() || process.env.MAKE_WEBHOOK_SECRET?.trim() || ''
  );
}

/**
 * Webhook de Make/n8n para una cuenta. Prioridad: variables del operador (Vercel) y, si no
 * existen, la URL que la persona usuaria guardó en Ajustes. Solo la URL del operador recibe
 * el secreto; la de Ajustes se usa sin secreto y solo si es https.
 */
export async function resolverWebhookAutomatizacion(uid: string): Promise<WebhookAutomatizacion | null> {
  const operador = process.env.N8N_WEBHOOK_URL?.trim() || process.env.MAKE_WEBHOOK_URL?.trim() || '';
  if (operador) {
    return { url: operador, secreto: resolveAutomationWebhookSecret(), origen: 'operador' };
  }

  const config = await obtenerConfiguracion(uid);
  const propia = config?.n8nWebhookUrl?.trim() || config?.makeWebhookUrl?.trim() || '';
  if (!propia) return null;
  if (!esHttps(propia)) {
    logger.warn('Webhook de Ajustes descartado: no es https', { uid });
    return null;
  }
  return { url: propia, secreto: '', origen: 'usuario' };
}
