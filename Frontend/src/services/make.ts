import { callFn } from '../lib/api';
import type { AutomationPostPayload, AutomationPostResponse } from '../lib/db/types';

/** Dispara el webhook de Make/n8n. El servidor decide la URL y el secreto: el navegador no los envía. */
export async function ejecutarFlujoPublicacion(
  payload: AutomationPostPayload
): Promise<AutomationPostResponse & { executionId?: string; borradorId?: string }> {
  return callFn<AutomationPostResponse & { executionId?: string; borradorId?: string }>(
    'triggerMakeWorkflow',
    payload
  );
}

/** URL del webhook: n8n primero, luego Make (Ajustes guardados en la base de datos) */
export function getAutomationWebhookUrl(config?: {
  makeWebhookUrl?: string;
  n8nWebhookUrl?: string;
} | null): string {
  return config?.n8nWebhookUrl?.trim() || config?.makeWebhookUrl?.trim() || '';
}
