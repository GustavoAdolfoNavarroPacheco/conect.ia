import { callFn } from '../api';
import type { Usuario } from './types';

/**
 * Crea (si no existe) el perfil, canales, configuración y actividad inicial del
 * usuario de la sesión. Idempotente: el servidor no sobrescribe datos existentes.
 */
export async function inicializarCuentaUsuario(): Promise<Usuario> {
  return callFn<Usuario>('inicializarCuenta');
}
