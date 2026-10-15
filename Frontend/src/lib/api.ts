/** Error devuelto por el backend (`/api/fn/*`) con código tipo gRPC/HTTP. */
export class ApiError extends Error {
  readonly code: string;

  constructor(code: string, message: string) {
    super(message);
    this.name = 'ApiError';
    this.code = code;
  }
}

/**
 * Llama a una función del backend: POST /api/fn/<nombre> con JSON.
 * Envía la cookie de sesión de Auth.js (mismo origen).
 */
export async function callFn<T = unknown>(nombre: string, data?: unknown): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`/api/fn/${nombre}`, {
      method: 'POST',
      credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data ?? {}),
    });
  } catch {
    throw new ApiError('unavailable', 'Sin conexión con el servidor.');
  }

  const json = (await res.json().catch(() => null)) as
    | { result?: T; error?: { code?: string; message?: string } }
    | null;

  if (!res.ok || json?.error) {
    throw new ApiError(
      json?.error?.code ?? 'internal',
      json?.error?.message ?? `Error del servidor (${res.status})`
    );
  }
  return json?.result as T;
}
