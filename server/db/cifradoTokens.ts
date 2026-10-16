/**
 * Cifrado de los tokens OAuth en la base de datos (AES-256-GCM con Web Crypto).
 *
 * Usa `crypto.subtle` y no `node:crypto` a propósito: `api/auth` es una función Edge, y el
 * repositorio de datos llega hasta allí a través de la configuración de Auth.js. Web Crypto
 * funciona igual en Edge y en Node.
 *
 * Con `TOKEN_ENCRYPTION_KEY` (32 bytes en base64) los tokens nuevos se guardan cifrados.
 * Sin esa variable se guardan en claro, para no romper la publicación durante la transición.
 * Los tokens en claro que ya existen se siguen leyendo; `scripts/cifrar-tokens.ts` los cifra.
 */

/** Marca de un valor cifrado. Ningún token en claro tiene esta clave, así que no hay ambigüedad. */
const MARCA = 'cifrado-v1';
const TAG_BYTES = 16;
const IV_BYTES = 12;

const codificador = new TextEncoder();
const decodificador = new TextDecoder();

function aBase64(bytes: Uint8Array): string {
  let binario = '';
  for (const b of bytes) binario += String.fromCharCode(b);
  return btoa(binario);
}

function deBase64(texto: string): Uint8Array<ArrayBuffer> {
  const binario = atob(texto);
  const bytes = new Uint8Array(binario.length);
  for (let i = 0; i < binario.length; i++) bytes[i] = binario.charCodeAt(i);
  return bytes;
}

function claveDeCifrado(): Uint8Array<ArrayBuffer> | null {
  const raw = process.env.TOKEN_ENCRYPTION_KEY?.trim();
  if (!raw) return null;
  let clave: Uint8Array<ArrayBuffer>;
  try {
    clave = deBase64(raw);
  } catch {
    throw new Error('TOKEN_ENCRYPTION_KEY no es base64 válido (genérala con: openssl rand -base64 32).');
  }
  if (clave.length !== 32) {
    throw new Error(
      'TOKEN_ENCRYPTION_KEY debe ser una clave de 32 bytes en base64 (genérala con: openssl rand -base64 32).'
    );
  }
  return clave;
}

async function importarClave(clave: Uint8Array<ArrayBuffer>): Promise<CryptoKey> {
  return crypto.subtle.importKey('raw', clave, { name: 'AES-GCM' }, false, ['encrypt', 'decrypt']);
}

export function esCifrado(valor: unknown): boolean {
  return !!valor && typeof valor === 'object' && MARCA in (valor as Record<string, unknown>);
}

export async function cifrarValor(valor: unknown): Promise<unknown> {
  const clave = claveDeCifrado();
  if (!clave) return valor;
  const iv = crypto.getRandomValues(new Uint8Array(IV_BYTES));
  const cifrado = new Uint8Array(
    await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, await importarClave(clave), codificador.encode(JSON.stringify(valor)))
  );
  // Web Crypto añade la etiqueta de autenticación al final del cifrado; se guarda aparte.
  const datos = cifrado.slice(0, cifrado.length - TAG_BYTES);
  const tag = cifrado.slice(cifrado.length - TAG_BYTES);
  return {
    [MARCA]: {
      iv: aBase64(iv),
      tag: aBase64(tag),
      datos: aBase64(datos),
    },
  };
}

export async function descifrarValor(valor: unknown): Promise<unknown> {
  if (!esCifrado(valor)) return valor;
  const clave = claveDeCifrado();
  if (!clave) {
    throw new Error('Hay tokens cifrados y falta TOKEN_ENCRYPTION_KEY en las variables de entorno.');
  }
  const { iv, tag, datos } = (valor as Record<string, { iv: string; tag: string; datos: string }>)[MARCA];
  const datosBytes = deBase64(datos);
  const tagBytes = deBase64(tag);
  const cifrado = new Uint8Array(datosBytes.length + tagBytes.length);
  cifrado.set(datosBytes, 0);
  cifrado.set(tagBytes, datosBytes.length);
  // Si los datos fueron alterados, Web Crypto lanza error: no se devuelve un token corrupto.
  const texto = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: deBase64(iv) },
    await importarClave(clave),
    cifrado
  );
  return JSON.parse(decodificador.decode(texto));
}
