import { callFn } from '../lib/api';

export async function healthCheck() {
  return callFn<{ ok: boolean; ai: boolean; provider?: string; aiError?: string; hint?: string }>(
    'healthCheck'
  );
}

export type ChatAgentResponse = {
  respuesta: string;
  accionSugerida?: string;
  temaSugerido?: string;
  tonoSugerido?: string;
  provider?: string;
};

export async function chatWithAgent(
  mensaje: string,
  historial: { role: 'user' | 'model'; content: string }[]
): Promise<ChatAgentResponse> {
  return callFn<ChatAgentResponse>('chatWithAgent', { mensaje, historial });
}

/** Uso de hoy y límite diario por tipo de IA de la cuenta actual. */
export type CuotaIAHoy = {
  tipos: Record<'texto' | 'imagen' | 'video' | 'chat', { usado: number; limite: number }>;
};

export async function cuotaIAHoy() {
  return callFn<CuotaIAHoy>('cuotaIA');
}

export async function generateContent(
  prompt: string,
  redSocial: string,
  tono: string,
  generarImagen?: boolean
) {
  return callFn<{
    contenido: string;
    hashtags: string[];
    variaciones: string[];
    provider?: string;
    imagenGenerada?: boolean;
    imagenUrl?: string;
    imagenNota?: string;
  }>('generateContent', { prompt, redSocial, tono, generarImagen });
}

export type GenerateVideoResponse = {
  videoUrl: string;
  model?: string;
  nota?: string;
};

export async function generateVideo(
  prompt: string,
  imageUrl?: string | null
): Promise<GenerateVideoResponse> {
  return callFn<GenerateVideoResponse>('generateVideo', {
    prompt,
    imageUrl: imageUrl ?? undefined,
  });
}

export async function schedulePost(postId: string, fechaHora: string, redesDestino?: string[]) {
  return callFn<{ success: boolean }>('schedulePost', { postId, fechaHora, redesDestino });
}

export async function publishPostNow(postId: string) {
  return callFn<{ success: boolean; postId: string }>('publishPostNow', { postId });
}

export async function processDueScheduledPosts() {
  return callFn<{
    processed: number;
    results: { postId: string; success: boolean; error?: string }[];
  }>('processDueScheduledPosts');
}

export async function verifyChannelConnection(input: {
  red: string;
  integrationId?: string;
  profileUrl?: string;
  cuentaNombre?: string;
}) {
  return callFn<{ ok: boolean; cuentaNombre: string; integrationId?: string; verificadoPor?: string }>(
    'verifyChannelConnection',
    input
  );
}

export async function startLinkedInOAuth(redirectUri: string) {
  return callFn<{ authUrl: string; state: string }>('startLinkedInOAuth', { redirectUri });
}

export async function completeLinkedInOAuth(input: { code: string; state: string }) {
  return callFn<{ ok: boolean; cuentaNombre: string; memberUrn: string; email?: string }>(
    'completeLinkedInOAuth',
    input
  );
}

export async function startMetaOAuth(redirectUri: string, provider: 'facebook' | 'instagram') {
  return callFn<{ authUrl: string; state: string }>('startMetaOAuth', { redirectUri, provider });
}

export type MetaOAuthResult = {
  ok: boolean;
  facebook: { id: string; nombre: string } | null;
  instagram: { id: string; nombre: string; pagina: string } | null;
  avisoInstagram?: string;
};

export async function completeMetaOAuth(input: { code: string; state: string }) {
  return callFn<MetaOAuthResult>('completeMetaOAuth', input);
}

export async function startTikTokOAuth(redirectUri: string) {
  return callFn<{ authUrl: string; state: string }>('startTikTokOAuth', { redirectUri });
}

export type TikTokOAuthResult = {
  ok: boolean;
  cuentaNombre: string;
  openId: string;
};

export async function completeTikTokOAuth(input: { code: string; state: string }) {
  return callFn<TikTokOAuthResult>('completeTikTokOAuth', input);
}
