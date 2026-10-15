import { crearBorrador, registrarEjecucion as guardarEjecucion } from '../db/repo';
import type { AutomationPostPayload } from './automationTypes';

export async function crearBorradorEnBaseDatos(
  uid: string,
  payload: AutomationPostPayload
): Promise<string> {
  return crearBorrador(
    uid,
    {
      titulo: payload.title?.trim() || payload.topic?.trim() || '',
      contenidoGenerado: payload.body?.trim() ?? '',
      promptOriginal: payload.topic,
      tono: payload.tone,
      redesDestino: payload.platforms,
      redSocial: payload.platforms.length === 1 ? payload.platforms[0] : 'multi',
      imagenUrl: payload.image_url ?? null,
      imagenConIa: Boolean(payload.include_image && payload.image_url),
    }
  );
}

export async function registrarEjecucion(
  uid: string,
  payload: AutomationPostPayload,
  borradorId: string
): Promise<string> {
  return guardarEjecucion(uid, payload, borradorId || null);
}
