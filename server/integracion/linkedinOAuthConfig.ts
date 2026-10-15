import { defineSecret } from '../platform/params';

const linkedinClientIdSecret = defineSecret('LINKEDIN_CLIENT_ID');
const linkedinClientSecretSecret = defineSecret('LINKEDIN_CLIENT_SECRET');

const SIGN_IN_SCOPES = ['openid', 'profile', 'email'] as const;
const POST_SCOPE = 'w_member_social';

/**
 * Scopes OAuth. `w_member_social` exige el producto "Share on LinkedIn" aprobado en Developers.
 * Mientras LinkedIn aprueba ese producto, en variables de entorno de Vercel usa:
 *   LINKEDIN_OAUTH_INCLUDE_POST_SCOPE=false
 * o define LINKEDIN_OAUTH_SCOPES=openid profile email
 */
export function getLinkedInOAuthScopes(): string {
  const override = process.env.LINKEDIN_OAUTH_SCOPES?.trim();
  if (override) return override;

  const includePost = process.env.LINKEDIN_OAUTH_INCLUDE_POST_SCOPE !== 'false';
  const scopes: string[] = [...SIGN_IN_SCOPES];
  if (includePost) scopes.push(POST_SCOPE);
  return scopes.join(' ');
}

/** @deprecated usa getLinkedInOAuthScopes() */
export const LINKEDIN_OAUTH_SCOPES = [
  'openid',
  'profile',
  'email',
  'w_member_social',
].join(' ');

export function getLinkedInClientId(): string {
  try {
    const s = linkedinClientIdSecret.value();
    if (s?.trim()) return s.trim();
  } catch {
    // emulador
  }
  const env = process.env.LINKEDIN_CLIENT_ID?.trim();
  if (!env) throw new Error('LINKEDIN_CLIENT_ID no configurado en variables de entorno de Vercel');
  return env;
}

export function getLinkedInClientSecret(): string {
  try {
    const s = linkedinClientSecretSecret.value();
    if (s?.trim()) return s.trim();
  } catch {
    // emulador
  }
  const env = process.env.LINKEDIN_CLIENT_SECRET?.trim();
  if (!env) throw new Error('LINKEDIN_CLIENT_SECRET no configurado en variables de entorno de Vercel');
  if (/PEGA_AQUI|tu_primary_client_secret|placeholder/i.test(env)) {
    throw new Error(
      'LINKEDIN_CLIENT_SECRET inválido. Copia el Primary Client Secret desde LinkedIn Developers → Auth.'
    );
  }
  return env;
}
