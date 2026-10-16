import { HttpsError, onCall } from '../platform/callable';
import { consumirCuotaIA, usoIADelDia } from '../db/repo';

export type TipoIA = 'texto' | 'imagen' | 'video' | 'chat';

/** Generaciones por usuario y día (UTC). Se cambian con CUOTA_IA_TEXTO, CUOTA_IA_IMAGEN, etc. */
const CUOTA_POR_USUARIO: Record<TipoIA, number> = { texto: 40, imagen: 15, video: 3, chat: 60 };

/** Tope del conjunto de usuarios por día, para acotar el coste total. Se cambia con TOPE_IA_TEXTO, etc. */
const TOPE_GLOBAL: Record<TipoIA, number> = { texto: 2000, imagen: 500, video: 100, chat: 3000 };

const ETIQUETA: Record<TipoIA, string> = {
  texto: 'textos',
  imagen: 'imágenes',
  video: 'videos',
  chat: 'mensajes del asistente',
};

function entero(nombre: string, porDefecto: number): number {
  const valor = Number(process.env[nombre]);
  return Number.isInteger(valor) && valor > 0 ? valor : porDefecto;
}

/**
 * Descuenta la generación antes de llamar al proveedor. Si el usuario o el conjunto ya llegaron
 * al límite del día, lanza un error claro y no se gasta nada.
 */
export async function exigirCuotaIA(uid: string, tipo: TipoIA, unidades = 1): Promise<void> {
  const ok = await consumirCuotaIA(uid, tipo, unidades, limitePorUsuario(tipo), topeGlobal(tipo));
  if (!ok) {
    throw new HttpsError(
      'resource-exhausted',
      `Llegaste al límite diario de ${ETIQUETA[tipo]}. Vuelve mañana (se reinicia a medianoche UTC).`
    );
  }
}

/** Límite diario por usuario de un tipo (se cambia con CUOTA_IA_<TIPO>). */
export function limitePorUsuario(tipo: TipoIA): number {
  return entero(`CUOTA_IA_${tipo.toUpperCase()}`, CUOTA_POR_USUARIO[tipo]);
}

/** Tope del conjunto de usuarios por día (se cambia con TOPE_IA_<TIPO>). */
export function topeGlobal(tipo: TipoIA): number {
  return entero(`TOPE_IA_${tipo.toUpperCase()}`, TOPE_GLOBAL[tipo]);
}

export const TIPOS_IA: TipoIA[] = ['texto', 'imagen', 'video', 'chat'];

/** Uso de hoy y límite diario de cada tipo para la persona usuaria. */
export async function consultarCuotaIA(uid: string) {
  const usados = await usoIADelDia(uid);
  const tipos = {} as Record<TipoIA, { usado: number; limite: number }>;
  for (const tipo of TIPOS_IA) {
    tipos[tipo] = { usado: usados[tipo] ?? 0, limite: limitePorUsuario(tipo) };
  }
  return { tipos };
}

/** Cuota de hoy de la persona autenticada. La usa el panel del asistente. */
export const cuotaIAHoy = onCall({ region: 'us-central1' }, async (request) => {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'Debes iniciar sesión');
  }
  return consultarCuotaIA(request.auth.uid);
});
