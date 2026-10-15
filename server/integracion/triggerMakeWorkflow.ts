import { onCall, HttpsError } from '../platform/callable';
import { logger } from '../platform/logger';
import { obtenerTokens } from '../db/repo';
import type { AutomationPostPayload, AutomationPostResponse } from './automationTypes';
import { crearBorradorEnBaseDatos, registrarEjecucion } from './n8nPersistence';
import {
  resolveAutomationWebhookSecret,
  resolveAutomationWebhookUrl,
} from './automationWebhook';
import { buildAutomationWebhookHeaders } from './automationWebhookHeaders';

export const triggerMakeWorkflow = onCall(
  { region: 'us-central1', timeoutSeconds: 300 },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError('unauthenticated', 'Debes iniciar sesión');
    }

    const payload = request.data as AutomationPostPayload & { webhookUrl?: string };
    if (!payload?.topic?.trim() && !payload?.body?.trim()) {
      throw new HttpsError('invalid-argument', 'topic o body es obligatorio');
    }

    const uid = request.auth.uid;
    const url = await resolveAutomationWebhookUrl(uid, payload.webhookUrl);

    if (!url) {
      throw new HttpsError(
        'failed-precondition',
        'Webhook no configurado. Añade MAKE_WEBHOOK_URL en variables de entorno de Vercel o la URL del escenario Make en Ajustes.'
      );
    }

    const action = payload.action ?? 'publish';
    const skipBorrador =
      action === 'notify_published' ||
      action === 'notify_scheduled' ||
      action === 'verify_channel';

    const borradorId = skipBorrador ? '' : await crearBorradorEnBaseDatos(uid, payload);
    const executionId = skipBorrador
      ? `notify-${Date.now()}`
      : await registrarEjecucion(uid, payload, borradorId);
    const secret = resolveAutomationWebhookSecret();

    const tokens = await obtenerTokens(uid);
    const li = tokens.linkedin as
      | { memberUrn?: string; displayName?: string }
      | undefined;

    const body: AutomationPostPayload = {
      ...payload,
      provider: 'make',
      action: payload.action ?? 'publish',
      linkedin_member_urn: payload.linkedin_member_urn ?? li?.memberUrn,
      linkedin_display_name: payload.linkedin_display_name ?? li?.displayName,
    };

    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...buildAutomationWebhookHeaders(secret),
        },
        body: JSON.stringify(body),
      });

      const text = await res.text();
      let data: AutomationPostResponse;
      try {
        data = JSON.parse(text) as AutomationPostResponse;
      } catch {
        data = { success: res.ok, body: text };
      }

      if (!res.ok) {
        const detail = data.error ?? text.slice(0, 200) ?? `Make HTTP ${res.status}`;
        logger.warn('Make scenario HTTP error', { status: res.status, action, detail });
        throw new Error(
          res.status >= 500
            ? `Escenario Make falló (${res.status}). Revisa History en Make o desactiva el webhook en Ajustes.`
            : detail
        );
      }

      logger.info('Make scenario OK', { uid, borradorId, executionId, action });
      return { ...data, executionId, borradorId: borradorId || undefined };
    } catch (err) {
      logger.error('Make scenario error', err);
      throw new HttpsError(
        'internal',
        err instanceof Error ? err.message : 'Error al ejecutar escenario Make'
      );
    }
  }
);
