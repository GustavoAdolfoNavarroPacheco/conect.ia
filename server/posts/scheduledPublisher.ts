import { onSchedule } from '../platform/scheduler';
import { logger } from '../platform/logger';
import { findDueScheduledPosts, publishPostById } from './publishPostNow';

/** Cada minuto: publica posts con estado=programado y fechaProgramada <= ahora. Reemplaza n8n. */
export const scheduledPublisher = onSchedule(
  {
    schedule: 'every 1 minutes',
    region: 'us-central1',
    timeZone: 'America/Bogota',
  },
  async () => {
    const due = await findDueScheduledPosts();
    if (due.length === 0) {
      return;
    }

    logger.info(`scheduledPublisher: ${due.length} publicación(es) pendientes`);

    for (const { id, creadoPor } of due) {
      try {
        await publishPostById(id, creadoPor);
        logger.info('Publicado por scheduler', { postId: id });
      } catch (err) {
        logger.error('Fallo scheduler', { postId: id, err });
      }
    }
  }
);
