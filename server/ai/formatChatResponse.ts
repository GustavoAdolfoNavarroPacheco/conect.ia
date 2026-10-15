/** Quita markdown y deja texto plano legible para el chat. */
function stripMarkdown(text: string): string {
  let t = text;
  t = t.replace(/\r\n/g, '\n');
  t = t.replace(/```[a-z]*\n?/gi, '').replace(/```/g, '');
  t = t.replace(/\*\*([^*]+)\*\*/g, '$1');
  t = t.replace(/__([^_]+)__/g, '$1');
  t = t.replace(/\*([^*\n]+)\*/g, '$1');
  t = t.replace(/\*\*/g, '').replace(/\*/g, '');
  t = t.replace(/__?/g, '');
  t = t.replace(/`([^`]+)`/g, '$1');
  t = t.replace(/^#{1,6}\s+/gm, '');
  t = t.replace(/^[•]\s+/gm, '- ');
  t = t.replace(/^\*\s+/gm, '- ');
  t = t.replace(/[""]/g, '"').replace(/['']/g, "'");
  return t;
}

/** Normaliza saltos de línea y listas del asistente (solo texto plano). */
export function formatChatResponse(raw: string): string {
  let text = stripMarkdown(raw.trim());
  text = text.replace(/\{"accionSugerida"[^}]+\}\s*/g, '').trim();
  text = text.replace(/([.!?])\s+(\d+\.\s)/g, '$1\n\n$2');
  text = text.replace(/([.!?])\s+(-\s)/g, '$1\n\n$2');
  text = text.replace(/\n{3,}/g, '\n\n');
  return text.trim();
}
