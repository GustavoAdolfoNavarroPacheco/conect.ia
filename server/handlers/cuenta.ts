import { onCall, HttpsError } from '../platform/callable';
import { crearCuentaCorreo, existeCorreo, registrarIntentoAcceso } from '../db/repo';
import { hashPassword } from '../auth/password';

const CORREO = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MIN_PASSWORD = 8;
const MAX_PASSWORD = 200;

/**
 * Registro con correo y contraseña. No requiere sesión: el inicio de sesión
 * posterior lo hace Auth.js (proveedor Credentials).
 */
export const registrarCuenta = onCall({ region: 'us-central1' }, async (request) => {
  const datos = request.data ?? {};
  const email = typeof datos.email === 'string' ? datos.email.trim().toLowerCase() : '';
  const password = typeof datos.password === 'string' ? datos.password : '';
  const nombreEntrada = typeof datos.nombre === 'string' ? datos.nombre.trim() : '';

  if (!email || email.length > 254 || !CORREO.test(email)) {
    throw new HttpsError('invalid-argument', 'Escribe un correo electrónico válido.');
  }
  if (password.length < MIN_PASSWORD || password.length > MAX_PASSWORD) {
    throw new HttpsError('invalid-argument', `La contraseña debe tener entre ${MIN_PASSWORD} y ${MAX_PASSWORD} caracteres.`);
  }

  // Límites por IP y por correo. El mensaje no dice si el correo ya tiene cuenta.
  if (request.ip && !(await registrarIntentoAcceso(`registro:ip:${request.ip}`, 10, 3600))) {
    throw new HttpsError('resource-exhausted', 'Demasiados intentos de registro desde tu red. Espera una hora.');
  }
  if (!(await registrarIntentoAcceso(`registro:correo:${email}`, 3, 3600))) {
    throw new HttpsError('resource-exhausted', 'Demasiados intentos con ese correo. Espera una hora.');
  }

  if (await existeCorreo(email)) {
    throw new HttpsError('failed-precondition', 'No se pudo crear la cuenta. Si ya tienes una, inicia sesión.');
  }

  const nombre = (nombreEntrada || email.split('@')[0] || 'Usuario').slice(0, 120);
  const uid = `correo_${crypto.randomUUID()}`;
  await crearCuentaCorreo(uid, email, nombre, await hashPassword(password));

  return { ok: true };
});
