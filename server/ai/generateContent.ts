import { onCall, HttpsError } from '../platform/callable';
import { httpsErrorFrom } from './httpsErrorFrom';
import { logger } from '../platform/logger';
import { generateAiText, getAiKeys } from './aiProvider';
import { generateGeminiImage } from './generateImage';
import { parsePostJson } from './parsePostJson';
import type { GenerateContentRequest, GenerateContentResponse } from '../types';

const RED_HINTS: Record<string, string> = {
  instagram: 'Máximo impacto visual, emojis moderados, CTA claro, 5-10 hashtags.',
  facebook: 'Tono conversacional, pregunta al final, enlace si aplica.',
  linkedin: 'Profesional, párrafos cortos, valor para educadores y emprendedores.',
  tiktok: 'Hook en la primera línea, lenguaje dinámico y breve.',
  youtube: 'Título llamativo y descripción con palabras clave SEO.',
};

export const generateContent = onCall(
  { region: 'us-central1' },
  async (request): Promise<GenerateContentResponse> => {
    if (!request.auth) {
      throw new HttpsError('unauthenticated', 'Debes iniciar sesión');
    }

    const { prompt, redSocial, tono, generarImagen } = request.data as GenerateContentRequest & {
      generarImagen?: boolean;
    };
    if (!prompt?.trim()) {
      throw new HttpsError('invalid-argument', 'prompt es obligatorio');
    }

    const red = (redSocial || 'instagram').toLowerCase();
    const hint = RED_HINTS[red] ?? RED_HINTS.instagram;

    const userPrompt = `Red social: ${red}
Tono: ${tono || 'profesional'}
Instrucción: ${prompt}

${hint}

Responde ÚNICAMENTE con JSON válido (sin markdown ni texto extra):
{
  "contenido": "texto del post con párrafos separados por \\n\\n",
  "hashtags": ["tag1", "tag2"],
  "variaciones": ["versión alternativa breve"]
}`;

    try {
      const { text, provider } = await generateAiText(userPrompt);
      const parsed = parsePostJson(text);

      let imagenUrl: string | undefined;
      let imagenGenerada = false;
      let imagenNota: string | undefined;

      if (generarImagen) {
        const keys = getAiKeys();
        if (keys.gemini) {
          const img = await generateGeminiImage(keys.gemini, `${prompt} — red ${red}`);
          if (img) {
            imagenUrl = img.publicUrl ?? img.dataUrl;
            imagenGenerada = true;
            if (img.model === 'pollinations-fallback') {
              imagenNota =
                'Imagen de respaldo Pollinations (cuota Google agotada). Para IA nativa: facturación en AI Studio + gemini-2.5-flash-image.';
            } else if (img.model === 'picsum-fallback') {
              imagenNota =
                'Imagen stock de respaldo (Picsum). Para IA generada: clave AIzaSy en GEMINI_API_KEY y facturación en AI Studio.';
            }
          } else {
            imagenNota =
              'No se pudo generar imagen. Activa IMAGE_FALLBACK=pollinations en variables de entorno de Vercel o facturación en AI Studio (gemini-2.5-flash-image).';
          }
        } else {
          imagenNota = 'Configura GEMINI_API_KEY para imágenes con IA.';
        }
      }

      return {
        contenido: parsed.contenido,
        hashtags: parsed.hashtags,
        variaciones: parsed.variaciones,
        provider,
        imagenGenerada,
        imagenUrl,
        imagenNota,
      };
    } catch (err) {
      logger.error('generateContent error', err);
      throw httpsErrorFrom(err);
    }
  }
);
