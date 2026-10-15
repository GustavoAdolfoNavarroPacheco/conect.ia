import { getLinkedInClientId, getLinkedInClientSecret } from './linkedinOAuthConfig';

const TOKEN_URL = 'https://www.linkedin.com/oauth/v2/accessToken';
const USERINFO_URL = 'https://api.linkedin.com/v2/userinfo';

export type LinkedInTokenResponse = {
  access_token: string;
  expires_in: number;
  refresh_token?: string;
  refresh_token_expires_in?: number;
  scope?: string;
};

export type LinkedInUserInfo = {
  sub: string;
  name?: string;
  given_name?: string;
  family_name?: string;
  email?: string;
  picture?: string;
};

export async function exchangeLinkedInCode(
  code: string,
  redirectUri: string
): Promise<LinkedInTokenResponse> {
  const body = new URLSearchParams({
    grant_type: 'authorization_code',
    code,
    redirect_uri: redirectUri,
    client_id: getLinkedInClientId(),
    client_secret: getLinkedInClientSecret(),
  });

  const res = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
  });

  const text = await res.text();
  if (!res.ok) {
    throw new Error(`LinkedIn token: ${res.status} ${text.slice(0, 300)}`);
  }

  return JSON.parse(text) as LinkedInTokenResponse;
}

export async function fetchLinkedInUserInfo(accessToken: string): Promise<LinkedInUserInfo> {
  const res = await fetch(USERINFO_URL, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  const text = await res.text();
  if (!res.ok) {
    throw new Error(`LinkedIn userinfo: ${res.status} ${text.slice(0, 300)}`);
  }
  return JSON.parse(text) as LinkedInUserInfo;
}

/** URN para publicar como persona (Share API) */
export function memberUrnFromSub(sub: string): string {
  if (sub.startsWith('urn:li:person:')) return sub;
  return `urn:li:person:${sub}`;
}
