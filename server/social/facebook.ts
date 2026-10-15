import type { ResultadoRed } from '../types';
import { withRetry } from './retry';
import { META_GRAPH_VERSION } from '../integracion/metaOAuthConfig';

export interface FacebookTokens {
  accessToken?: string;
  pageId?: string | null;
}

function graphUrl(path: string, params: Record<string, string>): string {
  const qs = new URLSearchParams(params).toString();
  return `https://graph.facebook.com/${META_GRAPH_VERSION}/${path}?${qs}`;
}

function parseMetaError(status: number, text: string): string {
  try {
    const parsed = JSON.parse(text) as { error?: { message?: string; type?: string; code?: number } };
    if (parsed.error?.message) {
      const code = parsed.error.code ?? status;
      return `Facebook ${code}: ${parsed.error.message}`;
    }
  } catch {
    // texto plano
  }
  return `Facebook ${status}: ${text.slice(0, 400)}`;
}

/** Publica texto en el muro de la página (POST /{page-id}/feed). */
async function publishFeed(
  accessToken: string,
  pageId: string,
  contenido: string
): Promise<{ id: string }> {
  const res = await fetch(
    graphUrl(`${pageId}/feed`, {
      message: contenido,
      access_token: accessToken,
    }),
    { method: 'POST' }
  );
  const text = await res.text();
  if (!res.ok) {
    throw new Error(parseMetaError(res.status, text));
  }
  const parsed = JSON.parse(text) as { id: string };
  return parsed;
}

/** Publica foto con pie de texto (POST /{page-id}/photos). */
async function publishPhoto(
  accessToken: string,
  pageId: string,
  imagenUrl: string,
  contenido: string
): Promise<{ id: string }> {
  const res = await fetch(
    graphUrl(`${pageId}/photos`, {
      url: imagenUrl,
      caption: contenido,
      access_token: accessToken,
      published: 'true',
    }),
    { method: 'POST' }
  );
  const text = await res.text();
  if (!res.ok) {
    throw new Error(parseMetaError(res.status, text));
  }
  const parsed = JSON.parse(text) as { id: string };
  return parsed;
}

export async function publishToFacebook(
  tokens: FacebookTokens,
  contenido: string,
  imagenUrl: string | null
): Promise<ResultadoRed> {
  const accessToken = tokens.accessToken;
  const pageId = tokens.pageId;
  if (!accessToken || !pageId) {
    return {
      success: false,
      error: 'Facebook no conectado. Ve a Canales y autoriza con tu cuenta de Facebook (Meta).',
    };
  }

  return withRetry(async () => {
    const result = imagenUrl
      ? await publishPhoto(accessToken, pageId, imagenUrl, contenido)
      : await publishFeed(accessToken, pageId, contenido);
    return { success: true, postId: result.id };
  }, 'facebook');
}