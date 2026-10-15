import { onCall, HttpsError } from '../platform/callable';
import { logger } from '../platform/logger';
import { guardarMensajesChat } from '../db/repo';
import { generateAiText } from './aiProvider';
import { formatChatResponse } from './formatChatResponse';
import { httpsErrorFrom } from './httpsErrorFrom';
import type { ChatMessage } from '../types';

const CHAT_INSTRUCTIONS = `
Responde en español como Conect.ia, tu asistente para crear y programar publicaciones en redes sociales.
FORMATO OBLIGATORIO — TEXTO PLANO (sin markdown):
- NO uses asteriscos (*), dobles asteriscos (**), almohadillas (#), guiones bajos (_) ni backticks.
- Títulos de sección en una línea normal terminada en dos puntos, ejemplo: Ideas para Instagram:
- Listas con guion y espacio al inicio de cada línea: - primer punto
- Párrafos cortos separados por una línea en blanco.
- Comillas normales "texto" si hace falta; sin símbolos de formato.
- No escribas un bloque único muy largo; organiza por plataforma o por tema.
- Si el usuario pide crear/publicar/redactar un post o das copy listo para publicar, termina con UNA sola línea JSON (sin markdown):
{"accionSugerida":"generar_publicacion","temaSugerido":"tema corto en español","tono":"profesional"}
- Otras acciones (una línea JSON al final si aplica):
{"accionSugerida":"ver_calendario","temaSugerido":"","tono":""}
- Si no hay acción: {"accionSugerida":null,"temaSugerido":"","tono":""}
`;

interface ChatRequest {
  mensaje: string;
  historial?: ChatMessage[];
}

interface ChatResponse {
  respuesta: string;
  accionSugerida?: string;
  temaSugerido?: string;
  tonoSugerido?: string;
  provider?: string;
}

type ChatMeta = {
  accionSugerida?: string;
  temaSugerido?: string;
  tonoSugerido?: string;
};

function parseChatMeta(raw: string): { text: string; meta: ChatMeta } {
  const match = raw.match(/\{[\s\S]*"accionSugerida"[\s\S]*\}\s*$/);
  if (!match) return { text: raw.trim(), meta: {} };
  try {
    const parsed = JSON.parse(match[0]) as Record<string, unknown>;
    const accion = parsed.accionSugerida;
    return {
      text: formatChatResponse(raw.replace(match[0], '').trim()),
      meta: {
        accionSugerida:
          accion === null || accion === 'null' || accion === undefined
            ? undefined
            : String(accion),
        temaSugerido:
          typeof parsed.temaSugerido === 'string' ? parsed.temaSugerido.trim() : undefined,
        tonoSugerido:
          typeof parsed.tono === 'string'
            ? parsed.tono.trim()
            : typeof parsed.tonoSugerido === 'string'
              ? parsed.tonoSugerido.trim()
              : undefined,
      },
    };
  } catch {
    return { text: formatChatResponse(raw), meta: {} };
  }
}

export const chatWithAgent = onCall(
  { region: 'us-central1' },
  async (request): Promise<ChatResponse> => {
    if (!request.auth) {
      throw new HttpsError('unauthenticated', 'Debes iniciar sesión');
    }

    const { mensaje, historial = [] } = request.data as ChatRequest;
    if (!mensaje?.trim()) {
      throw new HttpsError('invalid-argument', 'mensaje es obligatorio');
    }

    const uid = request.auth.uid;

    try {
      const historyText = historial
        .slice(-10)
        .map((m) => `${m.role === 'user' ? 'Usuario' : 'Asistente'}: ${m.content}`)
        .join('\n');

      const prompt = `${CHAT_INSTRUCTIONS}
${historyText ? `\nHistorial:\n${historyText}\n` : ''}
Usuario: ${mensaje}`;

      const { text: raw, provider } = await generateAiText(prompt);

      const { text: respuesta, meta } = parseChatMeta(raw);
      const accionSugerida = meta.accionSugerida;
      const temaSugerido =
        meta.temaSugerido ||
        (accionSugerida === 'generar_publicacion' ? mensaje.trim().slice(0, 200) : undefined);
      const tonoSugerido = meta.tonoSugerido || 'profesional';

      await guardarMensajesChat(uid, [
        { role: 'user', content: mensaje },
        {
          role: 'model',
          content: respuesta,
          accionSugerida: accionSugerida ?? null,
          temaSugerido: temaSugerido ?? null,
          tonoSugerido: tonoSugerido ?? null,
        },
      ]);

      return { respuesta, accionSugerida, temaSugerido, tonoSugerido, provider };
    } catch (err) {
      logger.error('chatWithAgent error', err);
      throw httpsErrorFrom(err);
    }
  }
);
