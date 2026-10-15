import { ApiError } from './api';

/** Mensaje legible para errores de las funciones del backend. */
export function mensajeCallable(err: unknown): string {
  if (err instanceof ApiError) {
    if (err.code === 'unauthenticated') return 'Debes iniciar sesión.';
    if (err.code === 'unavailable') return 'Sin conexión con el servidor. Revisa tu internet e inténtalo de nuevo.';
    if (err.code === 'internal' && (!err.message || err.message === 'internal')) {
      return 'El servidor no respondió. Revisa los registros de la función en Vercel.';
    }
    return err.message;
  }
  if (err instanceof Error) return err.message;
  return 'Error al llamar al servidor.';
}
