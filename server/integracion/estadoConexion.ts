/**
 * Vigencia de la conexión de cada red a partir de los tokens OAuth guardados.
 * - LinkedIn y Meta: caduca `expiresAt` (unos 60 días).
 * - TikTok: el acceso dura 24 h, pero se renueva con el refresh token. Lo que cuenta es
 *   `refreshExpiresAt` (365 días): mientras el refresh sea válido, la conexión sigue viva.
 */

const DIA_MS = 24 * 60 * 60 * 1000;
const AVISO_MS = 7 * DIA_MS;

export type EstadoToken = 'vigente' | 'por_caducar' | 'caducado' | 'sin_token';

export interface EstadoConexion {
  estado: EstadoToken;
  expiraEn: string | null;
  diasParaCaducar: number | null;
}

type TokenOAuth = {
  accessToken?: string;
  expiresAt?: number;
  refreshExpiresAt?: number;
};

/** Token de cada red de canal. Facebook e Instagram comparten el token de Meta. */
const TOKEN_DE_RED: Record<string, 'linkedin' | 'meta' | 'tiktok'> = {
  linkedin: 'linkedin',
  facebook: 'meta',
  instagram: 'meta',
  tiktok: 'tiktok',
};

export function estadoDeToken(
  token: TokenOAuth | null | undefined,
  red: string,
  ahora = Date.now()
): EstadoConexion {
  if (!token?.accessToken) {
    return { estado: 'sin_token', expiraEn: null, diasParaCaducar: null };
  }
  const limite = red === 'tiktok' ? token.refreshExpiresAt : token.expiresAt;
  if (!limite) {
    return { estado: 'vigente', expiraEn: null, diasParaCaducar: null };
  }
  const expiraEn = new Date(limite).toISOString();
  const diasParaCaducar = Math.max(0, Math.floor((limite - ahora) / DIA_MS));
  if (limite <= ahora) {
    return { estado: 'caducado', expiraEn, diasParaCaducar: 0 };
  }
  if (limite - ahora <= AVISO_MS) {
    return { estado: 'por_caducar', expiraEn, diasParaCaducar };
  }
  return { estado: 'vigente', expiraEn, diasParaCaducar };
}

export function estadoDeRed(
  red: string,
  tokens: Record<string, unknown>,
  ahora = Date.now()
): EstadoConexion {
  const clave = TOKEN_DE_RED[red];
  const token = clave ? (tokens[clave] as TokenOAuth | null | undefined) : undefined;
  return estadoDeToken(token, red, ahora);
}

/**
 * Errores que indican que la red rechazó el token (no un fallo de permisos ni de contenido).
 * 401 y 190 de Meta, `invalid_token` y `access_token_invalid` de TikTok, y expiraciones.
 */
const TOKEN_RECHAZADO =
  /\b401\b|\b190\b|invalid[_ ]token|access_token_invalid|OAuthException|Error validating access token|token[^.]{0,40}(expir|revoc|inv[aá]lid)|unauthori[sz]ed/i;

export function tokenRechazado(mensaje: string | null | undefined): boolean {
  return !!mensaje && TOKEN_RECHAZADO.test(mensaje);
}

/**
 * Añade el estado de cada token a los canales que devuelve la app. Un token caducado hace que
 * el canal aparezca como desconectado, aunque el registro guardado diga `conectado: true`.
 */
export function enriquecerCanales<T extends Record<string, unknown>>(
  canales: T,
  tokens: Record<string, unknown>,
  ahora = Date.now()
): T {
  const salida: Record<string, unknown> = { ...canales };
  for (const red of Object.keys(TOKEN_DE_RED)) {
    const canal = canales[red] as Record<string, unknown> | undefined;
    if (!canal) continue;
    const estado = estadoDeRed(red, tokens, ahora);
    salida[red] = {
      ...canal,
      conectado: canal.conectado === true && estado.estado !== 'caducado',
      estadoToken: estado.estado,
      expiraEn: estado.expiraEn,
      diasParaCaducar: estado.diasParaCaducar,
    };
  }
  return salida as T;
}
