import { onCall, HttpsError } from '../platform/callable';
import { logger } from '../platform/logger';
import { guardarCanal, marcarCanalDesconectado, obtenerTokens } from '../db/repo';
import { estadoDeRed } from './estadoConexion';
import { resolverWebhookAutomatizacion } from './automationWebhook';
import { buildAutomationWebhookHeaders } from './automationWebhookHeaders';

type VerifyRequest = {
  red: string;
  integrationId?: string;
  profileUrl?: string;
  cuentaNombre?: string;
};

export const verifyChannelConnection = onCall(
  { region: 'us-central1' },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError('unauthenticated', 'Debes iniciar sesión');
    }

    const { red, integrationId, profileUrl, cuentaNombre } = request.data as VerifyRequest;
    const redNorm = (red || '').toLowerCase();
    const allowed = ['linkedin'];
    if (!allowed.includes(redNorm)) {
      throw new HttpsError('invalid-argument', 'red no válida');
    }

    const id = integrationId?.trim() || profileUrl?.trim() || cuentaNombre?.trim();
    if (!id || id.length < 2) {
      throw new HttpsError('invalid-argument', 'Indica el ID de integración o la URL del perfil');
    }

    const uid = request.auth.uid;

    if (redNorm === 'linkedin') {
      const tokens = await obtenerTokens(uid);
      if (estadoDeRed('linkedin', tokens).estado === 'caducado') {
        await marcarCanalDesconectado(uid, 'linkedin', 'token_caducado');
        throw new HttpsError('failed-precondition', 'La conexión de LinkedIn caducó. Reconéctala en Canales.');
      }
      const li = tokens.linkedin as
        | { accessToken?: string; memberUrn?: string; displayName?: string }
        | null
        | undefined;
      if (li?.accessToken && li?.memberUrn) {
        const cuentaOAuth = li.displayName || li.memberUrn;
        await guardarCanal(uid, 'linkedin', {
          conectado: true,
          cuentaNombre: cuentaOAuth,
          proveedor: 'linkedin_oauth',
          integrationId: li.memberUrn,
          verificadoPor: 'linkedin_oauth',
          verificadoEn: new Date().toISOString(),
        });
        return {
          ok: true,
          cuentaNombre: cuentaOAuth,
          integrationId: li.memberUrn,
          verificadoPor: 'linkedin_oauth',
        };
      }
    }

    const webhook = await resolverWebhookAutomatizacion(uid);
    let verificadoPor = 'campus-local';

    if (webhook) {
      try {
        const res = await fetch(webhook.url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...buildAutomationWebhookHeaders(webhook.secreto),
          },
          body: JSON.stringify({
            action: 'verify_channel',
            provider: 'make',
            red: redNorm,
            integrationId: integrationId?.trim(),
            profileUrl: profileUrl?.trim(),
            uid,
          }),
        });
        if (!res.ok) {
          const t = await res.text();
          logger.warn('Make verify_channel failed', res.status, t.slice(0, 200));
          throw new HttpsError(
            'failed-precondition',
            'El escenario Make no confirmó la conexión. Añade una rama para action=verify_channel.'
          );
        }
        verificadoPor = 'make';
      } catch (e) {
        if (e instanceof HttpsError) throw e;
        logger.warn('verify_channel network error', e);
      }
    }

    const cuentaFinal = integrationId?.trim() || profileUrl?.trim() || cuentaNombre?.trim() || id;
    await guardarCanal(uid, redNorm, {
      conectado: true,
      cuentaNombre: cuentaFinal,
      integrationId: integrationId?.trim() || null,
      profileUrl: profileUrl?.trim() || null,
      proveedor: redNorm === 'linkedin' ? 'postiz' : 'make',
      verificadoPor,
      verificadoEn: new Date().toISOString(),
    });

    return {
      ok: true,
      cuentaNombre: cuentaFinal,
      integrationId: integrationId?.trim() || undefined,
      verificadoPor,
    };
  }
);
