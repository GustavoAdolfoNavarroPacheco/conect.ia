/**
 * Medios que el servidor puede descargar o pasar a una red. Solo se aceptan los almacenes que
 * controla la app (Vercel Blob) y los generadores que usa (Pollinations), por https, y las
 * imágenes en línea (data:image) con tamaño acotado. Así una URL escrita por el usuario no lleva
 * al servidor a pedir direcciones internas ni a descargar archivos enormes.
 */

const HOSTS_PERMITIDOS = [
  /\.public\.blob\.vercel-storage\.com$/,
  /^image\.pollinations\.ai$/,
  /^gen\.pollinations\.ai$/,
];

/** Tamaño máximo de una imagen en línea (data:). Las descargas por red tienen su propio límite. */
const MAX_DATA_URL_BYTES = 10 * 1024 * 1024;

/** Un medio es de video si su URL termina en una extensión de video o es un video generado por la app. */
export function esVideoMedio(url: string | null | undefined): boolean {
  if (!url) return false;
  return /\.(mp4|mov|webm|avi)(\?|#|$)/i.test(url) || /\/video-ia\//.test(url);
}

export function urlMediaPermitida(url: string | null | undefined): boolean {
  if (url === null || url === undefined || url === '') return true;
  if (url.startsWith('data:image/')) {
    return url.length <= Math.ceil(MAX_DATA_URL_BYTES * 1.4);
  }
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return false;
  }
  if (parsed.protocol !== 'https:') return false;
  if (parsed.username || parsed.password) return false;
  return HOSTS_PERMITIDOS.some((re) => re.test(parsed.hostname));
}
