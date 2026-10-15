import { onCall, HttpsError } from '../platform/callable';
import { logger } from '../platform/logger';
import { publishPostById } from './publishPostNow';

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
