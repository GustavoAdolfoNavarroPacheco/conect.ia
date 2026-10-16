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

/** Verifica la conexión de una red contra su API y actualiza su estado (botón Verificar). */
export type VerificacionCanal = { ok: boolean; estado: string; mensaje: string };

export async function verificarCanal(red: 'linkedin' | 'facebook' | 'instagram' | 'tiktok') {
  return callFn<VerificacionCanal>('verificarCanal', { red });
}

/** Prueba un escenario de Make o n8n con la URL que escribe la persona. */
export async function probarWebhook(url: string) {
  return callFn<{ ok: boolean; status: number; mensaje: string }>('probarWebhook', { url });
}

/** Reintenta solo las redes que fallaron. Las que ya publicaron no se vuelven a enviar. */
export async function reintentarRedes(postId: string) {
  return callFn<{ success: boolean; postId: string }>('reintentarRedes', { postId });
}

/** Último ciclo del programador (cron). `null` si nunca se ha registrado. */
export type EstadoProgramador = {
  ultimoCiclo: { ejecutadoEn: string | null; procesadas: number; fallidas: number } | null;
};

export async function estadoProgramador() {
  return callFn<EstadoProgramador>('estadoProgramador');
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

/** Analítica (M9): mide las publicaciones con las redes que tienen permiso. Una actualización cada 30 min como mínimo. */
export type ActualizacionMetricas = {
  actualizado: boolean;
  motivo?: 'reciente';
  medidas: number;
  avisos: string[];
  medidoEn: string | null;
};

export async function actualizarMetricas() {
  return callFn<ActualizacionMetricas>('actualizarMetricas');
}

export type RedMedida = 'facebook' | 'instagram';

/** Resumen de los últimos 30 días para la pantalla Analítica (L1, L5). */
export type ResumenAnalitica = {
  dias: number;
  publicaciones: { total: number; publicadas: number; fallidas: number };
  kpis: { alcance: number | null; interacciones: number; tasa: number | null; publicacionesMedidas: number };
  serie: { dia: string; facebook: number | null; instagram: number | null }[];
  interaccionesPorRed: Record<RedMedida, number | null>;
  redesSinAnalitica: string[];
  mejorHora: {
    suficiente: boolean;
    minimo: number;
    medidas: number;
    celdas: { dia: number; banda: number; promedio: number; muestras: number }[];
  };
  mejores: {
    id: string;
    titulo: string;
    fecha: string | null;
    redes: RedMedida[];
    alcance: number | null;
    interacciones: number;
  }[];
  ultimaMedicion: string | null;
};

export async function resumenAnalitica() {
  return callFn<ResumenAnalitica>('resumenAnalitica');
}
