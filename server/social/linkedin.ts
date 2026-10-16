import type { ResultadoRed } from '../types';
import { logger } from '../platform/logger';
import { ErrorApi, esReintentableCreacion, esReintentableLectura, withRetry } from './retry';

export interface LinkedInTokens {
  accessToken?: string;
  memberUrn?: string;
  organizationId?: string | null;
  scope?: string | null;
}

// Versión de la API de LinkedIn (AAAAMM). 202504 ya está retirada: la vigente es 202609 según la
// documentación de versiones de LinkedIn. Se puede cambiar sin tocar código con LINKEDIN_API_VERSION.
const LINKEDIN_API_VERSION = process.env.LINKEDIN_API_VERSION?.trim() || '202609';
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

/**
 * La API antigua solo sirve de respaldo si /rest/posts rechazó la petición sin crear el post
 * (4xx). Un 403 o un 429 no justifican crear otra publicación por otra vía.
 */
function esRechazoSinCrear(err: unknown): boolean {
  return (
    err instanceof ErrorApi &&
    err.status >= 400 &&
    err.status < 500 &&
    err.status !== 403 &&
    err.status !== 429
  );
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
    throw new ErrorApi(parseLinkedInError(res.status, text), res.status);
  }

  const postId = res.headers.get('x-restli-id') ?? `li_${Date.now()}`;
  return { success: true, postId };
}

/** Envía el post a la API antigua (/v2/ugcPosts). Es la única llamada que crea la publicación. */
async function enviarUgcPost(accessToken: string, body: unknown): Promise<ResultadoRed> {
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
    throw new ErrorApi(parseLinkedInError(res.status, text), res.status);
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
    // Registrar el asset crea un recurso: solo se repite si LinkedIn lo rechazó sin procesarlo.
    const { uploadUrl, asset, uploadHeaders } = await withRetry(
      () => registerLinkedInImageUpload(accessToken, author),
      'linkedin registro de imagen',
      3,
      esReintentableCreacion
    );
    // Subir los bytes al mismo asset es repetible: el archivo queda igual.
    await withRetry(
      () => uploadLinkedInImage(accessToken, uploadUrl, uploadHeaders, imagenUrl),
      'linkedin subida de imagen'
    );
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

  return withRetry(
    () => enviarUgcPost(accessToken, body),
    'linkedin ugcPosts',
    3,
    esReintentableCreacion
  );
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
    throw new ErrorApi(parseLinkedInError(res.status, text), res.status);
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
    throw new ErrorApi(`No se pudo descargar la imagen para LinkedIn (${imgRes.status})`, imgRes.status);
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
    throw new ErrorApi(
      `LinkedIn upload de imagen: ${upRes.status} ${upText.slice(0, 300)}`,
      upRes.status
    );
  }
}

/** Crea el post con un medio ya subido (referenciado por su URN). */
async function enviarPostRest(accessToken: string, body: unknown): Promise<ResultadoRed> {
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
    throw new ErrorApi(parseLinkedInError(res.status, text), res.status);
  }
  return { success: true, postId: res.headers.get('x-restli-id') ?? `li_${Date.now()}` };
}

interface InicializarImagenResponse {
  value?: { uploadUrl?: string; image?: string };
}

/** Paso 1 con /rest/images: pide la URL de subida y el URN de la imagen. */
async function inicializarImagenRest(accessToken: string, author: string): Promise<{ uploadUrl: string; image: string }> {
  const res = await fetch('https://api.linkedin.com/rest/images?action=initializeUpload', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
      'X-Restli-Protocol-Version': '2.0.0',
      'LinkedIn-Version': LINKEDIN_API_VERSION,
    },
    body: JSON.stringify({ initializeUploadRequest: { owner: author } }),
  });
  const text = await res.text();
  if (!res.ok) {
    throw new ErrorApi(parseLinkedInError(res.status, text), res.status);
  }
  const parsed = JSON.parse(text) as InicializarImagenResponse;
  const uploadUrl = parsed.value?.uploadUrl;
  const image = parsed.value?.image;
  if (!uploadUrl || !image) {
    throw new Error('LinkedIn initializeUpload no devolvió uploadUrl/image');
  }
  return { uploadUrl, image };
}

/** Paso 2: descarga la imagen y la sube a la URL de LinkedIn. Subir de nuevo al mismo recurso es seguro. */
async function subirImagenRest(accessToken: string, uploadUrl: string, imagenUrl: string): Promise<void> {
  const imgRes = await fetch(imagenUrl);
  if (!imgRes.ok) {
    throw new ErrorApi(`No se pudo descargar la imagen para LinkedIn (${imgRes.status})`, imgRes.status);
  }
  const binary = Buffer.from(await imgRes.arrayBuffer());

  const upRes = await fetch(uploadUrl, {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/octet-stream',
    },
    body: binary,
  });
  if (!upRes.ok) {
    const upText = await upRes.text();
    throw new ErrorApi(`LinkedIn subida de imagen: ${upRes.status} ${upText.slice(0, 300)}`, upRes.status);
  }
}

/** Publicación con imagen por la API vigente: sube la imagen y crea el post que la referencia. */
async function publishImageViaRestApi(
  accessToken: string,
  author: string,
  contenido: string,
  imagenUrl: string
): Promise<ResultadoRed> {
  // Pedir la URL de subida crea un recurso vacío: solo se repite si LinkedIn lo rechazó sin procesarlo.
  const { uploadUrl, image } = await withRetry(
    () => inicializarImagenRest(accessToken, author),
    'linkedin imagen (inicio)',
    3,
    esReintentableCreacion
  );
  await withRetry(() => subirImagenRest(accessToken, uploadUrl, imagenUrl), 'linkedin imagen (subida)');

  const body = {
    author,
    commentary: contenido,
    visibility: 'PUBLIC',
    distribution: {
      feedDistribution: 'MAIN_FEED',
      targetEntities: [],
      thirdPartyDistributionChannels: [],
    },
    content: {
      media: { id: image, altText: 'Imagen de la publicación' },
    },
    lifecycleState: 'PUBLISHED',
    isReshareDisabledByAuthor: false,
  };
  return withRetry(() => enviarPostRest(accessToken, body), 'linkedin post con imagen', 3, esReintentableCreacion);
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

  if (!imagenUrl) {
    try {
      return await withRetry(
        () => publishTextViaPostsApi(accessToken, author, contenido),
        'linkedin posts',
        3,
        esReintentableCreacion
      );
    } catch (postsErr) {
      if (esRechazoSinCrear(postsErr)) {
        return publishViaUgcPosts(accessToken, author, contenido, null);
      }
      throw postsErr;
    }
  }
  try {
    return await publishImageViaRestApi(accessToken, author, contenido, imagenUrl);
  } catch (restErr) {
    if (!esRechazoSinCrear(restErr)) throw restErr;
    // La API vigente rechazó la petición sin crear nada: se usa la anterior y queda registrado.
    logger.warn('LinkedIn: /rest/images rechazó la petición, se usa la API anterior', restErr);
    return publishViaUgcPosts(accessToken, author, contenido, imagenUrl);
  }
}
