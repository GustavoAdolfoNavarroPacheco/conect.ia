import type { VercelRequest, VercelResponse } from '@vercel/node';
import { CALLABLES } from '../../server/registry';
import { HttpsError, type ErrorCode } from '../../server/platform/callable';
import { logger } from '../../server/platform/logger';
import { sesionDesdeCookie } from '../../server/auth/sesion';

/** HTTP status para cada código de error (el cuerpo siempre lleva `code` y `message`). */
const STATUS: Record<ErrorCode, number> = {
  unauthenticated: 401,
  'permission-denied': 403,
  'not-found': 404,
  'invalid-argument': 400,
  'failed-precondition': 400,
  internal: 500,
};

function aError(err: unknown): HttpsError {
  if (err instanceof HttpsError) return err;
  const message = err instanceof Error ? err.message : 'Error en el servidor';
  logger.error('fn error', err);
  return new HttpsError('internal', message);
}

/** Despachador único para las funciones invocables (evita el límite de funciones de Vercel Hobby). */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    res.status(405).json({ error: { code: 'invalid-argument', message: 'Método no permitido' } });
    return;
  }

  const nombre = String(req.query.name ?? '');
  const callable = CALLABLES[nombre];
  if (!callable) {
    res.status(404).json({ error: { code: 'not-found', message: `Función desconocida: ${nombre}` } });
    return;
  }

  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : req.body ?? {};
    const auth = await sesionDesdeCookie(req.headers.cookie);
    const result = await callable.run({ auth: auth ?? undefined, data: body });
    res.status(200).json({ result: result ?? null });
  } catch (err) {
    const e = aError(err);
    res.status(STATUS[e.code]).json({ error: { code: e.code, message: e.message } });
  }
}
