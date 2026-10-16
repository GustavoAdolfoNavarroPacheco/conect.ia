import { logger } from '../platform/logger';
import {
  adquirirBloqueo,
  guardarTokenRed,
  liberarBloqueo,
  marcarCanalDesconectado,
  marcarPublicacion,
  obtenerPublicacion,
  obtenerTokens,
  publicacionesVencidas,
  registrarFalloPublicacion,
  registrarResultadoRed,
  reclamarPublicacion,
} from '../db/repo';
import { estadoDeRed, tokenRechazado } from '../integracion/estadoConexion';
import type { RedSocial, ResultadoRed } from '../types';
import { publishToInstagram } from '../social/instagram';
import { publishToFacebook } from '../social/facebook';
import { publishToLinkedIn } from '../social/linkedin';
import { publishToTikTok } from '../social/tiktok';
import { resolverWebhookAutomatizacion } from '../integracion/automationWebhook';
import { estadoTrasEnvioMake, mensajeDeFalloEnvio } from './estadoEnvio';
import { buildAutomationWebhookHeaders } from '../integracion/automationWebhookHeaders';
import type { AutomationPostPayload } from '../integracion/automationTypes';

/**
 * Envía una publicación a sus redes. Es idempotente: reclama la publicación antes de enviar,
 * así que dos ejecuciones simultáneas (cron, pestaña abierta, reintento) no la envían dos veces.
 * Cualquier fallo queda registrado en la publicación con su motivo.
 */
export async function publishPostById(postId: string, userId: string): Promise<void> {
  const post = await obtenerPublicacion(postId);

  if (!post) {
    throw new Error(`Publicación ${postId} no encontrada`);
  }

  if (post.creadoPor !== userId) {
    throw new Error('No autorizado para publicar esta publicación');
  }

  if (post.estado === 'publicado') return; // ya enviada: no se repite

  const reclamada = await reclamarPublicacion(postId);
  if (!reclamada) {
    throw new Error('La publicación ya se está enviando, ya se publicó o llegó al máximo de intentos.');
  }

  try {
    await enviarPublicacion(post, userId);
  } catch (err) {
    const mensaje = mensajeDeFalloEnvio(err);
    logger.error('Publicación fallida', { postId, mensaje });
    await registrarFalloPublicacion(postId, mensaje);
    throw err;
  }
}

type PublicacionEnvio = NonNullable<Awaited<ReturnType<typeof obtenerPublicacion>>>;

async function enviarPublicacion(post: PublicacionEnvio, userId: string): Promise<void> {
  const postId = post.id;
  const tokens = await obtenerTokens(userId);

  const webhook = await resolverWebhookAutomatizacion(userId);
  if (webhook) {
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

    const res = await fetch(webhook.url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...buildAutomationWebhookHeaders(webhook.secreto),
      },
      body: JSON.stringify(payload),
      // La función tiene 60 s: si el escenario tarda más, se corta y queda registrado como fallo.
      signal: AbortSignal.timeout(45_000),
    });

    const text = await res.text();
    let respuesta: { success?: boolean; linkedin_status?: string; error?: string } | null = null;
    try {
      respuesta = JSON.parse(text) as { success?: boolean; linkedin_status?: string; error?: string };
    } catch {
      // Respuesta no JSON: Make aceptó la petición, pero no confirmó la publicación.
    }

    if (!res.ok || respuesta?.success === false) {
      const detalle = text.slice(0, 200);
      await marcarPublicacion(postId, 'fallido', { webhook: { success: false, error: detalle } });
      throw new Error(`Make Webhook falló: ${res.status} ${detalle.slice(0, 100)}`);
    }

    await marcarPublicacion(postId, estadoTrasEnvioMake(respuesta), {
      webhook: { success: true, confirmado: respuesta !== null },
    });
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
    // Con el token caducado no se llama a la red: se pide reconectar en Canales.
    if (estadoDeRed(red, tokens).estado === 'caducado') {
      resultados[red] = {
        success: false,
        error: 'La conexión caducó. Reconecta la red en Canales para volver a publicar.',
      };
      await marcarCanalDesconectado(userId, red, 'token_caducado');
      await registrarResultadoRed(postId, red, resultados[red]);
      return;
    }
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
          // Un solo envío de TikTok a la vez por usuario: así no se renueva el token dos veces.
          const claveTiktok = `tiktok:${userId}`;
          if (!(await adquirirBloqueo(claveTiktok, 180))) {
            resultados.tiktok = {
              success: false,
              error: 'TikTok ya está publicando o renovando el acceso. Espera un minuto y vuelve a intentarlo.',
            };
            break;
          }
          try {
            resultados.tiktok = await publishToTikTok(
              tiktokTokens,
              post.contenido,
              post.imagenUrl,
              persistTiktok
            );
          } finally {
            await liberarBloqueo(claveTiktok);
          }
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
    // Un token que la red rechaza deja el canal como desconectado: Canales pedirá reconectar.
    if (!resultados[red]?.success && tokenRechazado(resultados[red]?.error)) {
      await marcarCanalDesconectado(userId, red, 'token_rechazado');
    }
    // Se guarda al terminar cada red: si la función se corta, el id externo no se pierde.
    await registrarResultadoRed(postId, red, resultados[red]);
  });

  await Promise.all(tasks);

  const allOk = Object.values(resultados).every((r) => r?.success);
  const anyOk = Object.values(resultados).some((r) => r?.success);

  // Éxito parcial: sale en algunas redes y falla en otras. Queda `parcial` con el detalle por red.
  const estado = allOk ? 'publicado' : anyOk ? 'parcial' : 'fallido';
  await marcarPublicacion(postId, estado, resultados);

  if (!anyOk) {
    const detalle = Object.entries(resultados)
      .map(([red, r]) => `${red}: ${r?.error ?? 'error desconocido'}`)
      .join(' · ');
    throw new Error(detalle || 'No se pudo publicar en ninguna red');
  }
}

/** Programadas vencidas. Con `uid`, solo las de esa cuenta; `limite` acota cada ejecución. */
export async function findDueScheduledPosts(
  limite = 20,
  uid?: string
): Promise<Array<{ id: string; creadoPor: string }>> {
  return publicacionesVencidas(limite, uid);
}
