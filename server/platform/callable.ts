/**
 * Equivalentes mínimos de `firebase-functions/v2/https` sobre Vercel.
 * Las funciones siguen exportándose con `onCall(opciones, handler)`; el
 * despachador (`api/fn/[name].ts`) las invoca con `{ auth, data }`.
 */

export type ErrorCode =
  | 'unauthenticated'
  | 'permission-denied'
  | 'not-found'
  | 'invalid-argument'
  | 'failed-precondition'
  | 'internal';

export class HttpsError extends Error {
  readonly code: ErrorCode;

  constructor(code: ErrorCode, message: string) {
    super(message);
    this.name = 'HttpsError';
    this.code = code;
  }
}

export type CallableRequest<T = any> = {
  auth?: { uid: string; email: string; nombre: string };
  data: T;
};

export type CallableHandler<T = any, R = any> = (request: CallableRequest<T>) => Promise<R>;

export type Callable<T = any, R = any> = {
  run: CallableHandler<T, R>;
};

export function onCall<T = any, R = any>(_opciones: unknown, handler: CallableHandler<T, R>): Callable<T, R> {
  return { run: handler };
}
