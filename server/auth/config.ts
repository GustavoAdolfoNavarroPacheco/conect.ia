import Google from '@auth/core/providers/google';
import Credentials from '@auth/core/providers/credentials';
import type { AuthConfig } from '@auth/core/types';
import { buscarCuentaCorreo } from '../db/repo';
import { verificarPassword } from './password';

/**
 * Auth.js (@auth/core) con Google y con correo y contraseña. Sesión en JWT firmado
 * con AUTH_SECRET (requerido por el proveedor Credentials). El perfil de la cuenta
 * se crea en Neon con `inicializarCuenta` o, para correo, al registrarse.
 */
export const authConfig: AuthConfig = {
  basePath: '/api/auth',
  secret: process.env.AUTH_SECRET,
  trustHost: true,
  session: { strategy: 'jwt', maxAge: 60 * 60 * 24 * 30 },
  // Auth.js redirige aquí en lugar de sus páginas por defecto. Los errores llegan como ?error=...
  pages: { signIn: '/', error: '/' },
  providers: [
    Google({
      clientId: process.env.AUTH_GOOGLE_ID,
      clientSecret: process.env.AUTH_GOOGLE_SECRET,
      authorization: { params: { prompt: 'select_account' } },
    }),
    Credentials({
      name: 'Correo',
      credentials: {
        email: { label: 'Correo', type: 'email' },
        password: { label: 'Contraseña', type: 'password' },
      },
      async authorize(credenciales) {
        const email = typeof credenciales?.email === 'string' ? credenciales.email.trim() : '';
        const password = typeof credenciales?.password === 'string' ? credenciales.password : '';
        if (!email || !password) return null;

        const cuenta = await buscarCuentaCorreo(email);
        if (!cuenta) return null;
        if (!(await verificarPassword(password, cuenta.passwordHash))) return null;

        return { id: cuenta.uid, email: cuenta.email, name: cuenta.nombre };
      },
    }),
  ],
  callbacks: {
    jwt({ token, profile }) {
      // Identificador estable de la cuenta de Google (sub), usado como uid en Neon.
      if (profile?.sub) token.sub = profile.sub;
      return token;
    },
    session({ session, token }) {
      if (session.user && token.sub) {
        (session.user as { id?: string }).id = token.sub;
      }
      return session;
    },
  },
};
