import type { VercelRequest, VercelResponse } from '@vercel/node';
import { handleUpload, type HandleUploadBody } from '@vercel/blob/client';
import { sesionDesdeCookie } from '../server/auth/sesion';

/**
 * Token de subida directa al navegador (Vercel Blob). Evita el límite de ~4,5 MB
 * del cuerpo de las funciones: el archivo nunca pasa por el servidor.
 * Solo permite subir dentro de publicaciones/<uid-propio>/.
 *
 * Runtime Node (no Edge): @vercel/blob/client usa módulos de Node que el empaquetado Edge no resuelve.
 */

const MAX_BYTES = 200 * 1024 * 1024;

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    res.status(405).json({ error: { message: 'Método no permitido' } });
    return;
  }

  const body = (typeof req.body === 'string' ? JSON.parse(req.body) : req.body) as HandleUploadBody;

  const headers = new Headers();
  for (const [nombre, valor] of Object.entries(req.headers)) {
    if (valor !== undefined) headers.set(nombre, Array.isArray(valor) ? valor.join(', ') : valor);
  }
  const request = new Request(`https://${req.headers.host ?? 'localhost'}${req.url ?? '/api/blob-upload'}`, {
    method: 'POST',
    headers,
  });

  try {
    const respuesta = await handleUpload({
      body,
      request,
      onBeforeGenerateToken: async (pathname) => {
        const sesion = await sesionDesdeCookie(req.headers.cookie);
        if (!sesion) {
          throw new Error('Debes iniciar sesión para subir archivos');
        }
        if (!pathname.startsWith(`publicaciones/${sesion.uid}/`)) {
          throw new Error('Ruta de subida no permitida');
        }
        return {
          allowedContentTypes: ['image/*', 'video/*'],
          maximumSizeInBytes: MAX_BYTES,
        };
      },
      onUploadCompleted: async () => {
        // Sin acciones extra: la URL pública se guarda al crear la publicación.
      },
    });
    res.status(200).json(respuesta);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'No se pudo preparar la subida';
    res.status(400).json({ error: { message } });
  }
}
