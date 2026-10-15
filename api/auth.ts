import { Auth } from '@auth/core';
import { authConfig } from '../server/auth/config';

/**
 * Rutas de Auth.js: /api/auth/signin/google, /callback/google, /session, /csrf, /signout...
 *
 * vercel.json reescribe /api/auth/:path* a /api/auth?path=:path*. Así no dependemos del
 * enrutamiento de catch-all, que en producción no resolvía rutas de dos niveles.
 * Aquí reconstruimos la URL original para que Auth.js vea su basePath (/api/auth).
 */
export const config = { runtime: 'edge' };

export default function handler(request: Request): Promise<Response> {
  const url = new URL(request.url);
  const ruta = url.searchParams.get('path');
  if (ruta !== null) {
    url.searchParams.delete('path');
    url.pathname = `/api/auth/${ruta}`;
  }

  const solicitud = new Request(url, {
    method: request.method,
    headers: request.headers,
    body: request.body,
    redirect: 'manual',
    duplex: 'half',
  } as RequestInit);

  return Auth(solicitud, authConfig);
}
