import { onCall, HttpsError } from '../platform/callable';
import { moverBorrador, validarEntradaMover } from './flujoBorradores';

/** Transición del flujo de aprobación de un borrador (enviar, aprobar, pedir cambios o programar). */
export const moverBorradorCallable = onCall({ region: 'us-central1' }, async (request) => {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'Debes iniciar sesión');
  }
  return moverBorrador(request.auth.uid, validarEntradaMover(request.data));
});
