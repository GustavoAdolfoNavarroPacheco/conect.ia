import type { VercelRequest, VercelResponse } from '@vercel/node';
import { findDueScheduledPosts, publishPostById } from '../../server/posts/publishPostNow';
import { limpiarDatosTemporales, marcarEnviosInterrumpidos } from '../../server/db/repo';
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

  // Lotes pequeños y con presupuesto de tiempo: la función tiene 60 s. Un disparador externo
  // cada 5 minutos recoge lo que quede (el cron de Vercel en Hobby es diario).
  const inicio = Date.now();
  const interrumpidas = await marcarEnviosInterrumpidos();
  if (interrumpidas > 0) logger.warn(`cron: ${interrumpidas} envío(s) interrumpido(s) marcados como fallidos`);
  await limpiarDatosTemporales();
  const vencidas = await findDueScheduledPosts(5);
  if (vencidas.length === 0) {
    res.status(200).json({ processed: 0, fallidas: 0, results: [] });
    return;
  }

  logger.info(`cron publicar-programadas: ${vencidas.length} pendiente(s)`);

  const results: Array<{ postId: string; success: boolean; error?: string }> = [];
  for (const { id, creadoPor } of vencidas) {
    if (Date.now() - inicio > 40_000) break;
    try {
      await publishPostById(id, creadoPor);
      results.push({ postId: id, success: true });
    } catch (err) {
      const error = err instanceof Error ? err.message : 'Error al publicar';
      logger.error('Fallo cron', { postId: id, error });
      results.push({ postId: id, success: false, error });
    }
  }

  // Si alguna publicación falló, la respuesta es un error: el disparador externo lo registra.
  // Las fallidas no se reintentan solas; la persona usuaria decide cuándo volver a enviarlas.
  const fallidas = results.filter((r) => !r.success).length;
  res.status(fallidas > 0 ? 500 : 200).json({ processed: results.length, fallidas, results });
}
