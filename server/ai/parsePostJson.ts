import type { GenerateContentResponse } from '../types';

/** Extrae JSON del post aunque venga envuelto en markdown. */
export function parsePostJson(text: string): GenerateContentResponse {
  const cleaned = text.replace(/```json\s*/gi, '').replace(/```/g, '').trim();
  const match = cleaned.match(/\{[\s\S]*\}/);
  if (!match) {
    return {
      contenido: cleaned.slice(0, 3000),
      hashtags: [],
      variaciones: [],
    };
  }
  const parsed = JSON.parse(match[0]) as Partial<GenerateContentResponse>;
  return {
    contenido: String(parsed.contenido ?? cleaned).trim(),
    hashtags: Array.isArray(parsed.hashtags) ? parsed.hashtags.map(String) : [],
    variaciones: Array.isArray(parsed.variaciones) ? parsed.variaciones.map(String) : [],
  };
}
