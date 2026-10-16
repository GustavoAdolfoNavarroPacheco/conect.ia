import { upload } from '@vercel/blob/client';

/** Sube el archivo directo a Vercel Blob (sin pasar por el servidor ni su límite de tamaño). */
export async function subirArchivoPublicacion(uid: string, file: File): Promise<string> {
  const nombre = file.name.replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 120) || 'archivo';
  const pathname = `publicaciones/${uid}/${Date.now()}_${nombre}`;
  const blob = await upload(pathname, file, {
    access: 'public',
    handleUploadUrl: '/api/blob-upload',
    contentType: file.type || 'application/octet-stream',
    multipart: file.size > 20 * 1024 * 1024,
  });
  return blob.url;
}

function isPublicHttpsUrl(url: string): boolean {
  return /^https:\/\//i.test(url);
}

/** LinkedIn exige URL https pública; sube data URLs de IA a Blob. */
export async function subirDataUrlPublicacion(uid: string, dataUrl: string): Promise<string> {
  if (!dataUrl.startsWith('data:')) return dataUrl;
  const res = await fetch(dataUrl);
  const blob = await res.blob();
  const ext = blob.type.includes('png') ? 'png' : 'jpg';
  const file = new File([blob], `ia-${Date.now()}.${ext}`, { type: blob.type || 'image/jpeg' });
  return subirArchivoPublicacion(uid, file);
}

/**
 * Resuelve URL para publicar en redes.
 * - https:// → se usa tal cual (Pollinations, Picsum, etc.)
 * - data: → intenta subir a Blob; si falla devuelve null (publicación solo texto)
 */
export async function resolverUrlPublicacion(
  uid: string,
  url: string | null | undefined
): Promise<string | null> {
  if (!url) return null;
  if (isPublicHttpsUrl(url)) return url;
  if (url.startsWith('data:')) {
    try {
      return await subirDataUrlPublicacion(uid, url);
    } catch {
      return null;
    }
  }
  return url;
}

/** true si había imagen pero no se pudo resolver para LinkedIn */
export function imagenQuedoSinResolver(
  original: string | null | undefined,
  resolved: string | null
): boolean {
  return Boolean(original?.trim()) && !resolved;
}
