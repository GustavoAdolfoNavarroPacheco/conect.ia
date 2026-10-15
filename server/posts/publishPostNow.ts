import { logger } from '../platform/logger';
import {
  guardarTokenRed,
  marcarPublicacion,
  obtenerPublicacion,
  obtenerTokens,
  publicacionesVencidas,
} from '../db/repo';
import type { RedSocial, ResultadoRed } from '../types';
import { publishToInstagram } from '../social/instagram';
import { publishToFacebook } from '../social/facebook';
import { publishToLinkedIn } from '../social/linkedin';
import { publishToTikTok } from '../social/tiktok';
import { resolveAutomationWebhookUrl, resolveAutomationWebhookSecret } from '../integracion/automationWebhook';
import { buildAutomationWebhookHeaders } from '../integracion/automationWebhookHeaders';
import type { AutomationPostPayload } from '../integracion/automationTypes';

export async function publishPostById(postId: string, userId: string): Promise<void> {
  const post = await obtenerPublicacion(postId);

  if (!post) {
    throw new Error(`Publicación ${postId} no encontrada`);
  }

  if (post.creadoPor !== userId) {
    throw new Error('No autorizado para publicar esta publicación');
  }

  const tokens = await obtenerTokens(userId);

  const webhookUrl = await resolveAutomationWebhookUrl(userId);
  if (webhookUrl) {
    const secret = resolveAutomationWebhookSecret();
    const li = tokens.linkedin as { memberUrn?: string; displayName?: string } | undefined;

    const payload: AutomationPostPayload = {
      topic: post.titulo,
      tone: 'neutral',
      include_image: !!post.imagenUrl,
      telegram_notify: false,
      schedule_now: true,
      title: post.titulo,
      body: post.contenido,
      platforms: post.redesDestino as any,
      image_url: post.imagenUrl,
      post_id: post.id,
      action: 'publish',
      provider: 'make',
      linkedin_member_urn: li?.memberUrn,
      linkedin_display_name: li?.displayName,
    };

    const res = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...buildAutomationWebhookHeaders(secret),
      },
      body: JSON.stringify(payload),
    });

    const text = await res.text();
    if (!res.ok) {
      await marcarPublicacion(postId, 'fallido', { webhook: { success: false, error: text.slice(0, 200) } });
      throw new Error(`Make Webhook falló: ${res.status} ${text.slice(0, 100)}`);
    }

    await marcarPublicacion(postId, 'publicado', { webhook: { success: true } });
    return;
  }

  const resultados: Record<string, ResultadoRed> = {};

  const meta = tokens.meta as
    | {
        accessToken?: string;
        pages?: Array<{
          id: string;
          name: string;
          accessToken: string;
          igId?: string | null;
          igUsername?: string | null;
        }>;
      }
    | undefined;

  const tasks = post.redesDestino.map(async (red) => {
    try {
      switch (red) {
        case 'instagram': {
          const ig = meta?.pages?.find((p) => p.igId);
          resultados.instagram = await publishToInstagram(
            ig
              ? { accessToken: ig.accessToken, igAccountId: ig.igId }
              : {},
            post.contenido,
            post.imagenUrl
          );
          break;
        }
        case 'facebook': {
          const fbPage = meta?.pages?.find((p) => p.accessToken) ?? meta?.pages?.[0];
          resultados.facebook = await publishToFacebook(
            fbPage ? { accessToken: fbPage.accessToken, pageId: fbPage.id } : {},
            post.contenido,
            post.imagenUrl
          );
          break;
        }
        case 'linkedin':
          resultados.linkedin = await publishToLinkedIn(
            tokens.linkedin ?? {},
            post.contenido,
            post.imagenUrl
          );
          break;
        case 'tiktok': {
          const tiktokTokens = (tokens.tiktok ?? {}) as {
            accessToken?: string;
            refreshToken?: string;
            openId?: string;
            expiresAt?: number;
            displayName?: string;
          };
          const persistTiktok = async (next: unknown) => {
            await guardarTokenRed(userId, 'tiktok', next);
          };
          resultados.tiktok = await publishToTikTok(
            tiktokTokens,
            post.contenido,
            post.imagenUrl,
            persistTiktok
          );
          break;
        }
        case 'freelancer':
          resultados.freelancer = {
            success: false,
            error: 'Freelancer.com aún no conectado. Próximamente en Canales.',
          };
          break;
        case 'fiverr':
          resultados.fiverr = {
            success: false,
            error: 'Fiverr se publica manualmente (sin API oficial). Usa Canales → Fiverr → Pregenerado.',
          };
          break;
        default:
          resultados[red] = { success: false, error: `Red ${red} aún no implementada` };
      }
    } catch (err) {
      logger.error(`Error publicando en ${red}`, err);
      resultados[red] = {
        success: false,
        error: err instanceof Error ? err.message : 'Error desconocido',
      };
    }
  });

  await Promise.all(tasks);

  const allOk = Object.values(resultados).every((r) => r?.success);
  const anyOk = Object.values(resultados).some((r) => r?.success);

  await marcarPublicacion(postId, anyOk ? 'publicado' : 'fallido', resultados);

  if (!anyOk) {
    const detalle = Object.entries(resultados)
      .map(([red, r]) => `${red}: ${r?.error ?? 'error desconocido'}`)
      .join(' · ');
    throw new Error(detalle || 'No se pudo publicar en ninguna red');
  }
}

export async function findDueScheduledPosts(): Promise<Array<{ id: string; creadoPor: string }>> {
  return publicacionesVencidas(20);
}
