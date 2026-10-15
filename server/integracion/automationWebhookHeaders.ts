/** Cabeceras de autenticación para webhooks Make / n8n */
export function buildAutomationWebhookHeaders(secret: string): Record<string, string> {
  if (!secret?.trim()) return {};
  const s = secret.trim();
  return {
    'X-Campus-Secret': s,
    'x-make-apikey': s,
  };
}
