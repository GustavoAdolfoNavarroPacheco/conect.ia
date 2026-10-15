import { obtenerConfiguracion } from '../db/repo';

/** URL webhook: prioridad override → variables de entorno (n8n, Make) → Ajustes guardados en Neon */
export async function resolveAutomationWebhookUrl(
  uid: string,
  override?: string
): Promise<string> {
  if (override?.trim()) return override.trim();

  const fromEnvN8n = process.env.N8N_WEBHOOK_URL?.trim();
  if (fromEnvN8n) return fromEnvN8n;

  const fromEnvMake = process.env.MAKE_WEBHOOK_URL?.trim();
  if (fromEnvMake) return fromEnvMake;

  const config = await obtenerConfiguracion(uid);
  const n8nUrl = config?.n8nWebhookUrl?.trim();
  if (n8nUrl) return n8nUrl;
  return config?.makeWebhookUrl?.trim() ?? '';
}

export function resolveAutomationWebhookSecret(): string {
  return (
    process.env.N8N_WEBHOOK_SECRET?.trim() || process.env.MAKE_WEBHOOK_SECRET?.trim() || ''
  );
}
