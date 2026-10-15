import { onCall, HttpsError } from '../platform/callable';
import { logger } from '../platform/logger';
import { obtenerPublicacion, programarPublicacion } from '../db/repo';

interface SchedulePostRequest {
  postId: string;
  fechaHora: string; // ISO 8601
  redesDestino?: string[];
}

export const schedulePost = onCall(
  { region: 'us-central1' },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError('unauthenticated', 'Debes iniciar sesión');
    }

    const { postId, fechaHora, redesDestino } = request.data as SchedulePostRequest;
    if (!postId || !fechaHora) {
      throw new HttpsError('invalid-argument', 'postId y fechaHora son obligatorios');
    }

    const fecha = new Date(fechaHora);
    if (Number.isNaN(fecha.getTime()) || fecha.getTime() <= Date.now()) {
      throw new HttpsError('invalid-argument', 'fechaHora debe ser una fecha futura válida');
    }

    const publicacion = await obtenerPublicacion(postId);

    if (!publicacion) {
      throw new HttpsError('not-found', 'Publicación no encontrada');
    }

    if (publicacion.creadoPor !== request.auth.uid) {
      throw new HttpsError('permission-denied', 'No puedes programar esta publicación');
    }

    await programarPublicacion(postId, request.auth.uid, fecha, redesDestino);
    logger.info('Post programado', { postId, fechaHora });

    return { success: true, postId, fechaProgramada: fecha.toISOString() };
  }
);
