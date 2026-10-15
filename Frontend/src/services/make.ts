import { callFn } from '../lib/api';
import type { AutomationPostPayload, AutomationPostResponse } from '../lib/db/types';

/** Llama a la función del servidor que dispara el webhook de Make/n8n (secretos solo en servidor). */
export async function ejecutarFlujoPublicacion(
  payload: AutomationPostPayload,
  webhookUrl?: string
): Promise<AutomationPostResponse & { executionId?: string; borradorId?: string }> {
  return callFn<AutomationPostResponse & { executionId?: string; borradorId?: string }>(
    'triggerMakeWorkflow',
    { ...payload, webhookUrl }
  );
}

/** URL del webhook: n8n primero, luego Make (Ajustes guardados en la base de datos) */
export function getAutomationWebhookUrl(config?: {
  makeWebhookUrl?: string;
  n8nWebhookUrl?: string;
} | null): string {
  return config?.n8nWebhookUrl?.trim() || config?.makeWebhookUrl?.trim() || '';
}
