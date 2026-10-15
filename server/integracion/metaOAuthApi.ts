import {
  getMetaClientId,
  getMetaClientSecret,
  META_GRAPH_VERSION,
  type MetaProvider,
} from './metaOAuthConfig';

export interface MetaPageInfo {
  id: string;
  name: string;
  accessToken: string;
  igId?: string | null;
  igUsername?: string | null;
}

export interface MetaTokenResponse {
  access_token: string;
  token_type?: string;
  expires_in?: number;
}

export async function exchangeMetaCode(
  code: string,
  redirectUri: string,
  provider?: MetaProvider
): Promise<MetaTokenResponse> {
  const params = new URLSearchParams({
    client_id: getMetaClientId(provider),
    client_secret: getMetaClientSecret(provider),
    redirect_uri: redirectUri,
    code,
  });
  const res = await fetch(
    `https://graph.facebook.com/${META_GRAPH_VERSION}/oauth/access_token?${params.toString()}`
  );
  const text = await res.text();
  if (!res.ok) {
    throw new Error(`Meta token: ${res.status} ${text.slice(0, 300)}`);
  }
  return JSON.parse(text) as MetaTokenResponse;
}

/** Convierte el token corto en token de larga duración (60 días). */
export async function exchangeMetaLongLivedToken(
  shortToken: string,
  provider?: MetaProvider
): Promise<MetaTokenResponse> {
  const params = new URLSearchParams({
    grant_type: 'fb_exchange_token',
    client_id: getMetaClientId(provider),
    client_secret: getMetaClientSecret(provider),
    fb_exchange_token: shortToken,
  });
  const res = await fetch(
    `https://graph.facebook.com/${META_GRAPH_VERSION}/oauth/access_token?${params.toString()}`
  );
  const text = await res.text();
  if (!res.ok) {
    throw new Error(`Meta long-lived token: ${res.status} ${text.slice(0, 300)}`);
  }
  return JSON.parse(text) as MetaTokenResponse;
}

/** Páginas gestionadas por el usuario (incluye cuentas Instagram Business vinculadas). */
export async function fetchMetaPages(accessToken: string): Promise<MetaPageInfo[]> {
  const params = new URLSearchParams({
    access_token: accessToken,
    fields:
      'id,name,access_token,instagram_business_account{id,username}',
  });
  const res = await fetch(
    `https://graph.facebook.com/${META_GRAPH_VERSION}/me/accounts?${params.toString()}`
  );
  const text = await res.text();
  if (!res.ok) {
    throw new Error(`Meta pages: ${res.status} ${text.slice(0, 300)}`);
  }
  const parsed = JSON.parse(text) as {
    data?: Array<{
      id: string;
      name: string;
      access_token: string;
      instagram_business_account?: { id?: string; username?: string } | null;
    }>;
  };

  return (parsed.data ?? []).map((p) => ({
    id: p.id,
    name: p.name,
    accessToken: p.access_token,
    igId: p.instagram_business_account?.id ?? null,
    igUsername: p.instagram_business_account?.username ?? null,
  }));
}