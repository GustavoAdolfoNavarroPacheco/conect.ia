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

const INSTRUCCION_IMAGEN = `  ,
  "promptImagen": "Descripción en INGLÉS de UNA escena concreta que ilustre el tema del post: qué se ve, quién aparece si aplica, lugar, luz, paleta de colores y encuadre. 1-2 frases. Sin texto, letras ni logotipos dentro de la imagen."`;

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
  "variaciones": ["versión alternativa breve"]${generarImagen ? INSTRUCCION_IMAGEN : ''}
}`;

    // La función tiene 60 s: la imagen usa lo que queda tras el texto, dejando margen para responder.
    const inicio = Date.now();
    const PRESUPUESTO_TOTAL_MS = 52_000;

    try {
      const { text, provider } = await generateAiText(userPrompt);
      const parsed = parsePostJson(text);

      let imagenUrl: string | undefined;
      let imagenGenerada = false;
      let imagenNota: string | undefined;

      if (generarImagen) {
        const keys = getAiKeys();
        if (!keys.gemini) {
          imagenNota = 'Configura GEMINI_API_KEY para generar imágenes con IA.';
        } else {
          // El prompt lo escribe la IA a partir del tema; si no lo devolvió, se usa el tema tal cual.
          const promptImagen = parsed.promptImagen?.trim() || `${prompt} — tema para una publicación en ${red}`;
          const presupuesto = PRESUPUESTO_TOTAL_MS - (Date.now() - inicio);
          const resultado = await generateGeminiImage(keys.gemini, promptImagen, red, presupuesto);
          if (resultado.ok) {
            imagenUrl = resultado.image.publicUrl ?? resultado.image.dataUrl;
            imagenGenerada = true;
            if (resultado.image.model === 'pollinations') {
              imagenNota = 'Imagen generada con Pollinations (respaldo activado en IMAGE_FALLBACK).';
            }
          } else {
            imagenNota = resultado.motivo;
          }
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
