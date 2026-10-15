import { onCall, HttpsError } from '../platform/callable';
import { logger } from '../platform/logger';
import { findDueScheduledPosts, publishPostById } from './publishPostNow';

/** Publica posts programados vencidos del usuario (útil en local: el scheduler no corre en emulador). */
export const processDueScheduledPosts = onCall({ region: 'us-central1' }, async (request) => {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'Debes iniciar sesión');
  }

  const uid = request.auth.uid;
  const due = await findDueScheduledPosts();
  const mine = due.filter((p) => p.creadoPor === uid);

  if (mine.length === 0) {
    return { processed: 0, results: [] as { postId: string; success: boolean; error?: string }[] };
  }

  logger.info(`processDueScheduledPosts: ${mine.length} para uid ${uid}`);

  const results: { postId: string; success: boolean; error?: string }[] = [];
  for (const { id, creadoPor } of mine) {
    try {
      await publishPostById(id, creadoPor);
      results.push({ postId: id, success: true });
    } catch (err) {
      const error = err instanceof Error ? err.message : 'Error al publicar';
      results.push({ postId: id, success: false, error });
    }
  }

  return { processed: results.length, results };
});
