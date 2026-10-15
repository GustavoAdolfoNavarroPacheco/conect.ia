import type { VercelRequest, VercelResponse } from '@vercel/node';
import { findDueScheduledPosts, publishPostById } from '../../server/posts/publishPostNow';
import { logger } from '../../server/platform/logger';

/**
 * Cron de Vercel (vercel.json → crons). Publica las publicaciones programadas
 * cuya fecha ya venció. Vercel envía `Authorization: Bearer $CRON_SECRET`.
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  const secreto = process.env.CRON_SECRET?.trim();
  if (!secreto || req.headers.authorization !== `Bearer ${secreto}`) {
    res.status(401).json({ error: 'No autorizado' });
    return;
  }

  const vencidas = await findDueScheduledPosts();
  if (vencidas.length === 0) {
    res.status(200).json({ processed: 0, results: [] });
    return;
  }

  logger.info(`cron publicar-programadas: ${vencidas.length} pendiente(s)`);

  const results: Array<{ postId: string; success: boolean; error?: string }> = [];
  for (const { id, creadoPor } of vencidas) {
    try {
      await publishPostById(id, creadoPor);
      results.push({ postId: id, success: true });
    } catch (err) {
      const error = err instanceof Error ? err.message : 'Error al publicar';
      logger.error('Fallo cron', { postId: id, error });
      results.push({ postId: id, success: false, error });
    }
  }

  res.status(200).json({ processed: results.length, results });
}
