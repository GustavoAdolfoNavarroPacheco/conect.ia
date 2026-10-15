import { defineSecret } from '../platform/params';

const metaClientIdSecret = defineSecret('META_CLIENT_ID');
const metaClientSecretSecret = defineSecret('META_CLIENT_SECRET');
const facebookAppIdSecret = defineSecret('FACEBOOK_APP_ID');
const instagramAppIdSecret = defineSecret('INSTAGRAM_APP_ID');
const facebookClientSecretSecret = defineSecret('FACEBOOK_CLIENT_SECRET');
const instagramClientSecretSecret = defineSecret('INSTAGRAM_CLIENT_SECRET');

export type MetaProvider = 'facebook' | 'instagram';

/** Última versión estable de Graph API. Actualiza aquí cuando convenga. */
export const META_GRAPH_VERSION = process.env.META_GRAPH_VERSION?.trim() || 'v23.0';

const SCOPES = [
  'email',
  'pages_show_list',
  'pages_manage_posts',
  'pages_read_engagement',
  'business_management',
  'instagram_basic',
  'instagram_content_publish',
];

export function getMetaOAuthScopes(): string {
  const override = process.env.META_OAUTH_SCOPES?.trim();
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

/**
 * App ID real de Facebook (no confundir con INSTAGRAM_APP_ID).
 * Fallback a META_CLIENT_ID por compatibilidad.
 */
export function getFacebookClientId(): string {
  const id = readEnvSecret(facebookAppIdSecret, 'FACEBOOK_APP_ID');
  if (id) return id;
  return getMetaClientId();
}

/**
 * App ID de Instagram (no confundir con FACEBOOK_APP_ID).
 * Fallback a META_CLIENT_ID por compatibilidad.
 */
export function getInstagramClientId(): string {
  const id = readEnvSecret(instagramAppIdSecret, 'INSTAGRAM_APP_ID');
  if (id) return id;
  return getMetaClientId();
}

export function getMetaClientId(provider?: MetaProvider): string {
  if (provider === 'facebook') return getFacebookClientId();
  if (provider === 'instagram') return getInstagramClientId();
  const env = readEnvSecret(metaClientIdSecret, 'META_CLIENT_ID');
  if (!env) throw new Error('META_CLIENT_ID no configurado en variables de entorno de Vercel');
  return env;
}

export function getMetaClientSecret(provider?: MetaProvider): string {
  const { secret, envKey } =
    provider === 'facebook'
      ? { secret: facebookClientSecretSecret, envKey: 'FACEBOOK_CLIENT_SECRET' }
      : provider === 'instagram'
        ? { secret: instagramClientSecretSecret, envKey: 'INSTAGRAM_CLIENT_SECRET' }
        : { secret: metaClientSecretSecret, envKey: 'META_CLIENT_SECRET' };

  const custom = readEnvSecret(secret, envKey);
  const env = (custom || process.env.META_CLIENT_SECRET?.trim() || '').trim();
  if (!env) throw new Error(`${envKey} no configurado en variables de entorno de Vercel`);
  if (/PEGA_AQUI|tu_app_secret|placeholder/i.test(env)) {
    throw new Error(
      `${envKey} inválido. Copia el App Secret desde Meta for Developers → Configuración.`
    );
  }
  return env;
}