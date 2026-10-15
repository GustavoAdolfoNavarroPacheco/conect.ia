import type { ResultadoRed } from '../types';
import { withRetry } from './retry';

export interface LinkedInTokens {
  accessToken?: string;
  memberUrn?: string;
  organizationId?: string | null;
  scope?: string | null;
}

const LINKEDIN_API_VERSION = process.env.LINKEDIN_API_VERSION?.trim() || '202504';
const POST_SCOPE = 'w_member_social';

function missingPostScopeMessage(): string {
  return (
    'Tu cuenta de LinkedIn no tiene permiso para publicar (falta w_member_social). ' +
    'En variables de entorno de Vercel pon LINKEDIN_OAUTH_INCLUDE_POST_SCOPE=true, reinicia npm run dev, ' +
    've a Canales → desconecta y vuelve a conectar LinkedIn. ' +
    'En LinkedIn Developers activa el producto "Share on LinkedIn".'
  );
}

function hasPostScope(scope?: string | null): boolean {
  if (!scope) return false;
  return scope.split(/[\s,]+/).includes(POST_SCOPE);
}

function parseLinkedInError(status: number, text: string): string {
  if (/ACCESS_DENIED|w_member_social|ugcPosts\.CREATE/i.test(text)) {
    return missingPostScopeMessage();
  }
  return `LinkedIn ${status}: ${text.slice(0, 400)}`;
}

async function publishTextViaPostsApi(
  accessToken: string,
  author: string,
  contenido: string
): Promise<ResultadoRed> {
  const body = {
    author,
    commentary: contenido,
    visibility: 'PUBLIC',
    distribution: {
      feedDistribution: 'MAIN_FEED',
      targetEntities: [],
      thirdPartyDistributionChannels: [],
    },
    lifecycleState: 'PUBLISHED',
    isReshareDisabledByAuthor: false,
  };

  const res = await fetch('https://api.linkedin.com/rest/posts', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
      'X-Restli-Protocol-Version': '2.0.0',
      'LinkedIn-Version': LINKEDIN_API_VERSION,
    },
    body: JSON.stringify(body),
  });

  const text = await res.text();
  if (!res.ok) {
    throw new Error(parseLinkedInError(res.status, text));
  }

  const postId = res.headers.get('x-restli-id') ?? `li_${Date.now()}`;
  return { success: true, postId };
}

async function publishViaUgcPosts(
  accessToken: string,
  author: string,
  contenido: string,
  imagenUrl?: string | null
): Promise<ResultadoRed> {
  const shareContent: Record<string, unknown> = {
    shareCommentary: { text: contenido },
    shareMediaCategory: imagenUrl ? 'IMAGE' : 'NONE',
  };

  if (imagenUrl) {
    const { uploadUrl, asset, uploadHeaders } = await registerLinkedInImageUpload(
      accessToken,
      author
    );
    await uploadLinkedInImage(accessToken, uploadUrl, uploadHeaders, imagenUrl);
    shareContent.media = [
      {
        status: 'READY',
        media: asset,
        altText: 'Imagen de la publicación',
      },
    ];
  }

  const body = {
    author,
    lifecycleState: 'PUBLISHED',
    specificContent: {
      'com.linkedin.ugc.ShareContent': shareContent,
    },
    visibility: {
      'com.linkedin.ugc.MemberNetworkVisibility': 'PUBLIC',
    },
  };

  const res = await fetch('https://api.linkedin.com/v2/ugcPosts', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
      'X-Restli-Protocol-Version': '2.0.0',
    },
    body: JSON.stringify(body),
  });

  const text = await res.text();
  if (!res.ok) {
    throw new Error(parseLinkedInError(res.status, text));
  }

  let postId: string | undefined;
  try {
    const parsed = JSON.parse(text) as { id?: string };
    postId = parsed.id;
  } catch {
    postId = res.headers.get('x-restli-id') ?? undefined;
  }

  return { success: true, postId: postId ?? `li_${Date.now()}` };
}

interface RegisterUploadResponse {
  value?: {
    asset?: string;
    uploadMechanism?: {
      'com.linkedin.digitalmedia.uploading.MediaUploadHttpRequest'?: {
        uploadUrl?: string;
        headers?: Record<string, string>;
      };
    };
  };
}

/** Paso a) registra el upload en LinkedIn y devuelve uploadUrl + asset URN. */
async function registerLinkedInImageUpload(
  accessToken: string,
  author: string
): Promise<{ uploadUrl: string; asset: string; uploadHeaders: Record<string, string> }> {
  const res = await fetch('https://api.linkedin.com/v2/assets?action=registerUpload', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
      'X-Restli-Protocol-Version': '2.0.0',
    },
    body: JSON.stringify({
      registerUploadRequest: {
        recipes: ['urn:li:digitalmediaRecipe:feedshare-image'],
        owner: author,
        serviceRelationships: [
          { relationshipType: 'OWNER', identifier: 'urn:li:userGeneratedContent' },
        ],
      },
    }),
  });

  const text = await res.text();
  if (!res.ok) {
    throw new Error(parseLinkedInError(res.status, text));
  }

  const parsed = JSON.parse(text) as RegisterUploadResponse;
  const mechanism =
    parsed.value?.uploadMechanism?.['com.linkedin.digitalmedia.uploading.MediaUploadHttpRequest'];
  const uploadUrl = mechanism?.uploadUrl;
  const asset = parsed.value?.asset;
  if (!uploadUrl || !asset) {
    throw new Error('LinkedIn registerUpload no devolvió uploadUrl/asset');
  }
  return { uploadUrl, asset, uploadHeaders: mechanism?.headers ?? {} };
}

/** Paso b) descarga la imagen desde imagenUrl y la sube a la uploadUrl de LinkedIn. */
async function uploadLinkedInImage(
  accessToken: string,
  uploadUrl: string,
  uploadHeaders: Record<string, string>,
  imagenUrl: string
): Promise<void> {
  const imgRes = await fetch(imagenUrl);
  if (!imgRes.ok) {
    throw new Error(`No se pudo descargar la imagen para LinkedIn (${imgRes.status})`);
  }
  const binary = Buffer.from(await imgRes.arrayBuffer());

  const upRes = await fetch(uploadUrl, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/octet-stream',
      ...uploadHeaders,
    },
    body: binary,
  });
  const upText = await upRes.text();
  if (!upRes.ok) {
    throw new Error(`LinkedIn upload de imagen: ${upRes.status} ${upText.slice(0, 300)}`);
  }
}

export async function publishToLinkedIn(
  tokens: LinkedInTokens,
  contenido: string,
  imagenUrl?: string | null
): Promise<ResultadoRed> {
  const accessToken = tokens.accessToken;
  const author = tokens.organizationId || tokens.memberUrn;

  if (!accessToken || !author) {
    return {
      success: false,
      error: 'LinkedIn no conectado. Ve a Canales y autoriza con LinkedIn Developers.',
    };
  }

  if (!hasPostScope(tokens.scope)) {
    return { success: false, error: missingPostScopeMessage() };
  }

  return withRetry(async () => {
    if (!imagenUrl) {
      try {
        return await publishTextViaPostsApi(accessToken, author, contenido);
      } catch (postsErr) {
        const msg = postsErr instanceof Error ? postsErr.message : String(postsErr);
        if (!/ACCESS_DENIED|403|w_member_social/i.test(msg)) {
          return publishViaUgcPosts(accessToken, author, contenido, null);
        }
        throw postsErr;
      }
    }
    return publishViaUgcPosts(accessToken, author, contenido, imagenUrl);
  }, 'linkedin');
}
