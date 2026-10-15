import type { ResultadoRed } from '../types';
import { withRetry } from './retry';
import { META_GRAPH_VERSION } from '../integracion/metaOAuthConfig';

export interface InstagramTokens {
  accessToken?: string;
  igAccountId?: string | null;
}

const GRAPH_URL = `https://graph.facebook.com/${META_GRAPH_VERSION}`;

function parseMetaError(status: number, text: string, red: string): string {
  try {
    const parsed = JSON.parse(text) as { error?: { message?: string; code?: number } };
    if (parsed.error?.message) {
      return `${red} ${parsed.error.code ?? status}: ${parsed.error.message}`;
    }
  } catch {
    // texto plano
  }
  return `${red} ${status}: ${text.slice(0, 400)}`;
}

function isVideoUrl(url: string): boolean {
  return /\.(mp4|mov|avi)$/i.test(url);
}

/** Crea el media container de IG (imagen o video) y devuelve su creation_id. */
async function createMediaContainer(
  accessToken: string,
  igAccountId: string,
  mediaUrl: string,
  caption: string
): Promise<string> {
  const body = new URLSearchParams({
    access_token: accessToken,
    caption,
  });
  if (isVideoUrl(mediaUrl)) {
    body.set('media_type', 'VIDEO');
    body.set('video_url', mediaUrl);
  } else {
    body.set('image_url', mediaUrl);
  }

  const res = await fetch(`${GRAPH_URL}/${igAccountId}/media`, {
    method: 'POST',
    body: body.toString(),
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
  });
  const text = await res.text();
  if (!res.ok) {
    throw new Error(parseMetaError(res.status, text, 'Instagram'));
  }
  const parsed = JSON.parse(text) as { id: string };
  return parsed.id;
}

async function waitContainerReady(
  accessToken: string,
  containerId: string
): Promise<void> {
  const maxAttempts = 20;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const res = await fetch(
      `${GRAPH_URL}/${containerId}?fields=status_code&access_token=${accessToken}`
    );
    const text = await res.text();
    if (!res.ok) {
      throw new Error(parseMetaError(res.status, text, 'Instagram'));
    }
    const parsed = JSON.parse(text) as { status_code?: string };
    if (parsed.status_code === 'FINISHED') return;
    if (parsed.status_code === 'ERROR') {
      throw new Error('Instagram rechazó el media (status ERROR). Verifica el formato de la imagen o video.');
    }
    await new Promise((r) => setTimeout(r, 3000));
  }
  throw new Error('Instagram tardó demasiado en procesar el media.');
}

async function publishContainer(
  accessToken: string,
  igAccountId: string,
  containerId: string
): Promise<string> {
  const body = new URLSearchParams({
    access_token: accessToken,
    creation_id: containerId,
  });
  const res = await fetch(`${GRAPH_URL}/${igAccountId}/media_publish`, {
    method: 'POST',
    body: body.toString(),
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
  });
  const text = await res.text();
  if (!res.ok) {
    throw new Error(parseMetaError(res.status, text, 'Instagram'));
  }
  const parsed = JSON.parse(text) as { id: string };
  return parsed.id;
}

/** Publica en Instagram vía Meta Graph API (cuenta Business) usando el flujo container + publish. */
export async function publishToInstagram(
  tokens: InstagramTokens,
  contenido: string,
  imagenUrl: string | null
): Promise<ResultadoRed> {
  const accessToken = tokens.accessToken;
  const igAccountId = tokens.igAccountId;

  if (!accessToken || !igAccountId) {
    return {
      success: false,
      error:
        'Instagram no conectado. Vincula una cuenta Instagram Business a tu página de Facebook y reconecta en Canales.',
    };
  }

  if (!imagenUrl) {
    return {
      success: false,
      error: 'Instagram requiere una imagen o video para publicar (solo texto no es compatible).',
    };
  }

  return withRetry(async () => {
    const containerId = await createMediaContainer(accessToken, igAccountId, imagenUrl, contenido);
    await waitContainerReady(accessToken, containerId);
    const mediaId = await publishContainer(accessToken, igAccountId, containerId);
    return { success: true, postId: mediaId };
  }, 'instagram');
}