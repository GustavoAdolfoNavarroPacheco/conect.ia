import { logger } from '../platform/logger';

/** Error de una llamada a la API de una red social. `status` es el HTTP recibido. */
export class ErrorApi extends Error {
  readonly status: number;

  constructor(mensaje: string, status: number) {
    super(mensaje);
    this.name = 'ErrorApi';
    this.status = status;
  }
}

/**
 * Paso que solo lee o que repite sin crear nada nuevo (consultar estado, descargar un archivo,
 * subir un fragmento al mismo rango, publicar un contenedor ya creado). Se reintenta ante fallo
 * de red, 429 y 5xx.
 */
export function esReintentableLectura(err: unknown): boolean {
  if (err instanceof ErrorApi) return err.status === 429 || err.status >= 500;
  return err instanceof TypeError; // fetch lanza TypeError ante un fallo de red
}

/**
 * Paso que crea un recurso (un post, un asset, un init de subida). Solo se reintenta si la API
 * lo rechazó sin procesarlo (429 o 503). Ante otro error no se repite: la creación pudo completarse
 * aunque la respuesta se perdiera, y repetirla duplicaría la publicación.
 */
export function esReintentableCreacion(err: unknown): boolean {
  return err instanceof ErrorApi && (err.status === 429 || err.status === 503);
}

/** Reintenta `fn` con espera exponencial (1 s, 2 s, 4 s… hasta 8 s). */
export async function withRetry<T>(
  fn: () => Promise<T>,
  label: string,
  maxAttempts = 3,
  shouldRetry: (err: unknown) => boolean = esReintentableLectura
): Promise<T> {
  let lastError: unknown;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err;
      if (!shouldRetry(err)) throw err;
      const delayMs = Math.min(1000 * 2 ** (attempt - 1), 8000);
      logger.warn(`${label} intento ${attempt}/${maxAttempts} falló`, err);
      if (attempt < maxAttempts) {
        await new Promise((r) => setTimeout(r, delayMs));
      }
    }
  }
  throw lastError;
}
