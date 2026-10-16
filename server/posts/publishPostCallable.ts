import { onCall, HttpsError } from '../platform/callable';
import { logger } from '../platform/logger';
import { publishPostById, reintentarRedesFallidas } from './publishPostNow';
import { ultimoCicloProgramador } from '../db/repo';

interface PublishNowRequest {
  postId: string;
}

export const publishPostNow = onCall(
  { region: 'us-central1' },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError('unauthenticated', 'Debes iniciar sesión');
    }

    const { postId } = request.data as PublishNowRequest;
    if (!postId) {
      throw new HttpsError('invalid-argument', 'postId es obligatorio');
    }

    try {
      await publishPostById(postId, request.auth.uid);
      return { success: true, postId };
    } catch (err) {
      logger.error('publishPostNow error', err);
      const msg = err instanceof Error ? err.message : 'Error al publicar';
      if (/no encontrada|not found/i.test(msg)) {
        throw new HttpsError('not-found', msg);
      }
      if (/LinkedIn no conectado|no autorizado|w_member_social|Share on LinkedIn|permiso para publicar/i.test(msg)) {
        throw new HttpsError('failed-precondition', msg);
      }
      if (/linkedin.*403|ACCESS_DENIED|ugcPosts/i.test(msg)) {
        throw new HttpsError('failed-precondition', msg);
      }
      throw new HttpsError('internal', msg);
    }
  }
);

/** Reintenta solo las redes que fallaron de una publicación parcial o fallida. */
export const reintentarRedes = onCall({ region: 'us-central1' }, async (request) => {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'Debes iniciar sesión');
  }
  const postId = typeof request.data?.postId === 'string' ? request.data.postId : '';
  if (!postId) {
    throw new HttpsError('invalid-argument', 'postId es obligatorio');
  }
  try {
    await reintentarRedesFallidas(postId, request.auth.uid);
    return { success: true, postId };
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Error al reintentar';
    logger.error('reintentarRedes error', err);
    if (/no encontrada/i.test(msg)) throw new HttpsError('not-found', msg);
    if (/solo se reintentan|no hay redes|ya se está enviando/i.test(msg)) {
      throw new HttpsError('failed-precondition', msg);
    }
    throw new HttpsError('internal', msg);
  }
});

/** Último ciclo del programador (cron). Sirve para avisar si dejó de ejecutarse. */
export const estadoProgramador = onCall({ region: 'us-central1' }, async (request) => {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'Debes iniciar sesión');
  }
  return { ultimoCiclo: await ultimoCicloProgramador() };
});
