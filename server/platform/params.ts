/**
 * Sustituto de `defineSecret` de Firebase: en Vercel los secretos son
 * variables de entorno (Settings → Environment Variables).
 */
export type EnvSecret = { value: () => string };

export function defineSecret(name: string): EnvSecret {
  return {
    value: () => process.env[name] ?? '',
  };
}
