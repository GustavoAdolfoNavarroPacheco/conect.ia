import { HttpsError } from '../platform/callable';
import { consumirCuotaIA } from '../db/repo';

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
  const porUsuario = entero(`CUOTA_IA_${tipo.toUpperCase()}`, CUOTA_POR_USUARIO[tipo]);
  const global = entero(`TOPE_IA_${tipo.toUpperCase()}`, TOPE_GLOBAL[tipo]);
  const ok = await consumirCuotaIA(uid, tipo, unidades, porUsuario, global);
  if (!ok) {
    throw new HttpsError(
      'resource-exhausted',
      `Llegaste al límite diario de ${ETIQUETA[tipo]}. Vuelve mañana (se reinicia a medianoche UTC).`
    );
  }
}
