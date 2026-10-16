import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto';

/**
 * Cifrado de los tokens OAuth en la base de datos (AES-256-GCM).
 *
 * Con `TOKEN_ENCRYPTION_KEY` (32 bytes en base64) los tokens nuevos se guardan cifrados.
 * Sin esa variable se guardan en claro, para no romper la publicación durante la transición.
 * Los tokens en claro que ya existen se siguen leyendo; `scripts/cifrar-tokens.ts` los cifra.
 */

/** Marca de un valor cifrado. Ningún token en claro tiene esta clave, así que no hay ambigüedad. */
const MARCA = 'cifrado-v1';

function claveDeCifrado(): Buffer | null {
  const raw = process.env.TOKEN_ENCRYPTION_KEY?.trim();
  if (!raw) return null;
  const clave = Buffer.from(raw, 'base64');
  if (clave.length !== 32) {
    throw new Error(
      'TOKEN_ENCRYPTION_KEY debe ser una clave de 32 bytes en base64 (genérala con: openssl rand -base64 32).'
    );
  }
  return clave;
}

export function esCifrado(valor: unknown): boolean {
  return !!valor && typeof valor === 'object' && MARCA in (valor as Record<string, unknown>);
}

export function cifrarValor(valor: unknown): unknown {
  const clave = claveDeCifrado();
  if (!clave) return valor;
  const iv = randomBytes(12);
  const cifrador = createCipheriv('aes-256-gcm', clave, iv);
  const datos = Buffer.concat([cifrador.update(JSON.stringify(valor), 'utf8'), cifrador.final()]);
  return {
    [MARCA]: {
      iv: iv.toString('base64'),
      tag: cifrador.getAuthTag().toString('base64'),
      datos: datos.toString('base64'),
    },
  };
}

export function descifrarValor(valor: unknown): unknown {
  if (!esCifrado(valor)) return valor;
  const clave = claveDeCifrado();
  if (!clave) {
    throw new Error('Hay tokens cifrados y falta TOKEN_ENCRYPTION_KEY en las variables de entorno.');
  }
  const { iv, tag, datos } = (valor as Record<string, { iv: string; tag: string; datos: string }>)[MARCA];
  const descifrador = createDecipheriv('aes-256-gcm', clave, Buffer.from(iv, 'base64'));
  descifrador.setAuthTag(Buffer.from(tag, 'base64'));
  const texto = Buffer.concat([descifrador.update(Buffer.from(datos, 'base64')), descifrador.final()]);
  return JSON.parse(texto.toString('utf8'));
}
