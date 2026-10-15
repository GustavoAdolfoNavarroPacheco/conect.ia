export type SesionUsuario = { uid: string; email: string; nombre: string };

/** Nombres de cookie que usa Auth.js (con prefijo __Secure- en HTTPS). */
const NOMBRES_COOKIE = ['__Secure-authjs.session-token', 'authjs.session-token'];

function leerCookie(cabecera: string, nombre: string): string | undefined {
  for (const parte of cabecera.split(';')) {
    const i = parte.indexOf('=');
    if (i < 0) continue;
    if (parte.slice(0, i).trim() === nombre) return parte.slice(i + 1).trim();
  }
  return undefined;
}

/**
 * Valida la sesión de Auth.js a partir de la cabecera Cookie.
 * Compatible con Edge y Node (solo usa Web Crypto vía @auth/core).
 */
export async function sesionDesdeCookie(cabecera: string | null | undefined): Promise<SesionUsuario | null> {
  const secret = process.env.AUTH_SECRET;
  if (!secret || !cabecera) return null;

  // import() dinámico: @auth/core es solo ESM y las funciones Node compilan a CommonJS.
  const { decode } = await import('@auth/core/jwt');

  for (const nombre of NOMBRES_COOKIE) {
    const token = leerCookie(cabecera, nombre);
    if (!token) continue;
    try {
      // En Auth.js el "salt" de la cookie de sesión es el propio nombre de la cookie.
      const payload = await decode({ token, secret, salt: nombre });
      if (payload?.sub) {
        return {
          uid: payload.sub,
          email: String(payload.email ?? ''),
          nombre: String(payload.name ?? payload.email ?? 'Usuario'),
        };
      }
    } catch {
      // Token inválido o caducado: se ignora y se trata como sin sesión.
    }
  }
  return null;
}
