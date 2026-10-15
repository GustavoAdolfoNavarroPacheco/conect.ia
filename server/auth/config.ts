import Google from '@auth/core/providers/google';
import type { AuthConfig } from '@auth/core/types';

/**
 * Auth.js (@auth/core) con Google. Sesión en JWT firmado con AUTH_SECRET:
 * no requiere base de datos para iniciar sesión; el perfil de la cuenta se
 * crea en Neon la primera vez que el frontend llama a `inicializarCuenta`.
 */
export const authConfig: AuthConfig = {
  basePath: '/api/auth',
  secret: process.env.AUTH_SECRET,
  trustHost: true,
  session: { strategy: 'jwt', maxAge: 60 * 60 * 24 * 30 },
  providers: [
    Google({
      clientId: process.env.AUTH_GOOGLE_ID,
      clientSecret: process.env.AUTH_GOOGLE_SECRET,
      authorization: { params: { prompt: 'select_account' } },
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
