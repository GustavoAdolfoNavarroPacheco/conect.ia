/**
 * Hash de contraseñas con PBKDF2-SHA256 (Web Crypto).
 * Usa Web Crypto y no node:crypto para poder ejecutarse también en la ruta Edge de Auth.js.
 * Formato guardado: pbkdf2_sha256$<iteraciones>$<sal base64>$<hash base64>
 */

const ITERACIONES = 310_000; // recomendación OWASP para PBKDF2-HMAC-SHA256
const LONGITUD_BYTES = 32;
const ALGORITMO = 'pbkdf2_sha256';

const codificador = new TextEncoder();

function aBase64(bytes: Uint8Array): string {
  let binario = '';
  for (const b of bytes) binario += String.fromCharCode(b);
  return btoa(binario);
}

function deBase64(texto: string): Uint8Array {
  const binario = atob(texto);
  const bytes = new Uint8Array(binario.length);
  for (let i = 0; i < binario.length; i++) bytes[i] = binario.charCodeAt(i);
  return bytes;
}

async function derivar(password: string, sal: Uint8Array, iteraciones: number): Promise<Uint8Array> {
  const clave = await crypto.subtle.importKey('raw', codificador.encode(password), 'PBKDF2', false, [
    'deriveBits',
  ]);
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', hash: 'SHA-256', salt: sal as BufferSource, iterations: iteraciones },
    clave,
    LONGITUD_BYTES * 8
  );
  return new Uint8Array(bits);
}

export async function hashPassword(password: string): Promise<string> {
  const sal = crypto.getRandomValues(new Uint8Array(16));
  const hash = await derivar(password, sal, ITERACIONES);
  return `${ALGORITMO}$${ITERACIONES}$${aBase64(sal)}$${aBase64(hash)}`;
}

/** Comparación en tiempo constante. Devuelve false si el formato guardado no es válido. */
export async function verificarPassword(password: string, almacenado: string): Promise<boolean> {
  const [algoritmo, iteracionesTexto, salTexto, hashTexto] = almacenado.split('$');
  if (algoritmo !== ALGORITMO || !iteracionesTexto || !salTexto || !hashTexto) return false;

  const iteraciones = Number(iteracionesTexto);
  if (!Number.isInteger(iteraciones) || iteraciones < 1) return false;

  const calculado = await derivar(password, deBase64(salTexto), iteraciones);
  const esperado = deBase64(hashTexto);
  if (calculado.length !== esperado.length) return false;

  let diferencia = 0;
  for (let i = 0; i < calculado.length; i++) diferencia |= calculado[i]! ^ esperado[i]!;
  return diferencia === 0;
}
