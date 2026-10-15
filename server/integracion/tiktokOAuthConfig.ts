import { defineSecret } from '../platform/params';

const tiktokClientKeySecret = defineSecret('TIKTOK_CLIENT_KEY');
const tiktokClientSecretSecret = defineSecret('TIKTOK_CLIENT_SECRET');

/** Base de la Content Posting API de TikTok. */
export const TIKTOK_API_BASE = process.env.TIKTOK_API_BASE?.trim() || 'https://open.tiktokapis.com/v2';

/** URL de autorización OAuth (v2). */
export const TIKTOK_AUTH_URL =
  process.env.TIKTOK_AUTH_URL?.trim() || 'https://www.tiktok.com/v2/auth/authorize/';

/**
 * URI de retorno configurada en el servidor (TIKTOK_REDIRECT_URI en variables de entorno de Vercel).
 * Tiene prioridad sobre la que envíe el cliente, para que coincida con la registrada
 * en TikTok for Developers (panel → Redirect URL).
 */
export function getTikTokRedirectUri(): string {
  return process.env.TIKTOK_REDIRECT_URI?.trim() ?? '';
}

const SCOPES = ['user.info.basic', 'user.info.profile', 'video.publish'];

export function getTikTokOAuthScopes(): string {
  const override = process.env.TIKTOK_OAUTH_SCOPES?.trim();
  if (override) return override;
  return SCOPES.join(',');
}

function readEnvSecret(secret: ReturnType<typeof defineSecret>, envKey: string): string {
  try {
    const s = secret.value();
    if (s?.trim()) return s.trim();
  } catch {
    // emulador
  }
  return process.env[envKey]?.trim() ?? '';
}

/** Client Key de la app TikTok (público; se usa también como client_id en OAuth). */
export function getTikTokClientKey(): string {
  const env = readEnvSecret(tiktokClientKeySecret, 'TIKTOK_CLIENT_KEY');
  if (!env) throw new Error('TIKTOK_CLIENT_KEY no configurado en variables de entorno de Vercel');
  if (/PEGA_AQUI|placeholder|tu_client_key/i.test(env)) {
    throw new Error(
      'TIKTOK_CLIENT_KEY inválido. Cópialo desde TikTok for Developers → Manage apps → Development → Client Key.'
    );
  }
  return env;
}

/** Client Secret de la app TikTok (privado). */
export function getTikTokClientSecret(): string {
  const env = readEnvSecret(tiktokClientSecretSecret, 'TIKTOK_CLIENT_SECRET');
  if (!env) throw new Error('TIKTOK_CLIENT_SECRET no configurado en variables de entorno de Vercel');
  if (/PEGA_AQUI|placeholder|tu_client_secret/i.test(env)) {
    throw new Error(
      'TIKTOK_CLIENT_SECRET inválido. Cópialo desde TikTok for Developers → Manage apps → Development → Client Secret.'
    );
  }
  return env;
}
