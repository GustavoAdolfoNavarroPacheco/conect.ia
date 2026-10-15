import { Auth } from '@auth/core';
import { authConfig } from '../../server/auth/config';

/** Rutas de Auth.js: /api/auth/signin/google, /callback/google, /session, /csrf, /signout */
export const config = { runtime: 'edge' };

export default function handler(request: Request): Promise<Response> {
  return Auth(request, authConfig);
}
