import { del, put } from '@vercel/blob';
import { randomUUID } from 'node:crypto';

/**
 * Guarda un medio generado por IA en Vercel Blob y devuelve su URL fija. Una URL de proveedor
 * suele volver a generar el medio en cada descarga, así que lo publicado podría no ser lo que
 * vio la persona usuaria. Sin BLOB_READ_WRITE_TOKEN devuelve undefined.
 */
export async function guardarMedioGenerado(
  contenido: Buffer,
  contentType: string,
  carpeta: string,
  extension: string
): Promise<string | undefined> {
  if (!process.env.BLOB_READ_WRITE_TOKEN?.trim()) return undefined;
  const blob = await put(`${carpeta}/${randomUUID()}.${extension}`, contenido, {
    access: 'public',
    contentType,
    addRandomSuffix: false,
  });
  return blob.url;
}

/** Borra un medio guardado con `guardarMedioGenerado`. Un fallo no interrumpe el flujo. */
export async function borrarMedioGenerado(url: string): Promise<void> {
  if (!process.env.BLOB_READ_WRITE_TOKEN?.trim()) return;
  await del(url).catch(() => undefined);
}
