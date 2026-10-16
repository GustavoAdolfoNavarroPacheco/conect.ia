import { onCall, HttpsError } from '../platform/callable';
import { actualizarMetricasUsuario, construirResumenAnalitica } from './metricas';

/** Mide las publicaciones recientes con las redes que tienen permiso. Límite: una vez cada 30 min. */
export const actualizarMetricas = onCall({ region: 'us-central1' }, async (request) => {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'Debes iniciar sesión');
  }
  return actualizarMetricasUsuario(request.auth.uid);
});

/** Datos de la pantalla Analítica. */
export const resumenAnalitica = onCall({ region: 'us-central1' }, async (request) => {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'Debes iniciar sesión');
  }
  return construirResumenAnalitica(request.auth.uid);
});
