import { getTikTokClientKey, getTikTokClientSecret, TIKTOK_API_BASE } from './tiktokOAuthConfig';

export interface TikTokTokenResponse {
  access_token: string;
  expires_in: number;
  refresh_token: string;
  refresh_expires_in: number;
  open_id: string;
  scope: string;
  token_type: string;
}

export interface TikTokCreatorInfo {
  creator_username?: string;
  creator_nickname?: string;
  creator_avatar_url?: string;
  privacy_level_options?: string[];
}

interface TikTokApiError {
  code?: string;
  message?: string;
  log_id?: string;
}

interface TikTokResponse<T> {
  data?: T;
  error?: TikTokApiError;
}

function parseTikTokError(text: string, fallback: string): Error {
  try {
    const parsed = JSON.parse(text) as TikTokResponse<unknown>;
    if (parsed.error?.code && parsed.error.code !== 'ok') {
      const msg = parsed.error.message || parsed.error.code;
      return new Error(`TikTok ${parsed.error.code}: ${msg}`);
    }
  } catch {
    // texto plano
  }
  return new Error(`${fallback}: ${text.slice(0, 300)}`);
}

async function postForm(url: string, body: URLSearchParams): Promise<TikTokTokenResponse> {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
  });
  const text = await res.text();
  if (!res.ok) {
    throw parseTikTokError(text, `TikTok token ${res.status}`);
  }
  const parsed = JSON.parse(text) as TikTokTokenResponse;
  if (!parsed.access_token) {
    throw parseTikTokError(text, `TikTok token ${res.status}`);
  }
  return parsed;
}

/** Intercambia el code de autorización por access token (24 h) + refresh token (365 días). */
export async function exchangeTikTokCode(
  code: string,
  redirectUri: string,
  codeVerifier?: string
): Promise<TikTokTokenResponse> {
  const body = new URLSearchParams({
    client_key: getTikTokClientKey(),
    client_secret: getTikTokClientSecret(),
    code,
    grant_type: 'authorization_code',
    redirect_uri: redirectUri,
  });
  if (codeVerifier) {
    body.set('code_verifier', codeVerifier);
  }
  return postForm(`${TIKTOK_API_BASE}/oauth/token/`, body);
}

/** Renueva el access token con el refresh token. */
export async function refreshTikTokAccessToken(
  refreshToken: string
): Promise<TikTokTokenResponse> {
  const body = new URLSearchParams({
    client_key: getTikTokClientKey(),
    client_secret: getTikTokClientSecret(),
    grant_type: 'refresh_token',
    refresh_token: refreshToken,
  });
  return postForm(`${TIKTOK_API_BASE}/oauth/token/`, body);
}

/** Datos públicos del creador (nombre de usuario, niveles de privacidad permitidos). */
export async function fetchTikTokCreatorInfo(
  accessToken: string
): Promise<TikTokCreatorInfo> {
  const res = await fetch(`${TIKTOK_API_BASE}/post/publish/creator_info/query/`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json; charset=UTF-8',
    },
    body: '{}',
  });
  const text = await res.text();
  if (!res.ok) {
    throw parseTikTokError(text, `TikTok creator info ${res.status}`);
  }
  const parsed = JSON.parse(text) as TikTokResponse<TikTokCreatorInfo>;
  if (parsed.error?.code && parsed.error.code !== 'ok') {
    throw new Error(`TikTok creator info: ${parsed.error.message || parsed.error.code}`);
  }
  return parsed.data ?? {};
}

/** Perfil del usuario (display name). Requiere scope user.info.profile. */
export async function fetchTikTokUserInfo(accessToken: string): Promise<{
  open_id?: string;
  display_name?: string;
  avatar_url?: string;
}> {
  const params = new URLSearchParams({ fields: 'open_id,avatar_url,display_name' });
  const res = await fetch(`${TIKTOK_API_BASE}/user/info/?${params.toString()}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  const text = await res.text();
  if (!res.ok) {
    throw parseTikTokError(text, `TikTok user info ${res.status}`);
  }
  const parsed = JSON.parse(text) as TikTokResponse<{
    user?: { open_id?: string; display_name?: string; avatar_url?: string };
  }>;
  return parsed.data?.user ?? {};
}
