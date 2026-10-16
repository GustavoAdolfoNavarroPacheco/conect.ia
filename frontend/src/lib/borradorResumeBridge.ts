import type { Borrador } from './db/types';

/** Paso de datos: Borradores → Nueva publicación (misma sesión) */
export type BorradorResumePayload = {
  borradorId: string;
  topic: string;
  tone: string;
  generatedText: string;
  imagenUrl?: string | null;
  imagenConIa?: boolean;
  titulo?: string;
};

const STORAGE_KEY = 'campus-borrador-resume';

export function saveBorradorResume(draft: Borrador): void {
  const payload: BorradorResumePayload = {
    borradorId: draft.id,
    topic: draft.promptOriginal?.trim() || draft.titulo?.trim() || '',
    tone: draft.tono?.trim() || 'profesional',
    generatedText: draft.contenidoGenerado?.trim() || '',
    imagenUrl: draft.imagenUrl ?? null,
    imagenConIa: draft.imagenConIa ?? Boolean(draft.imagenUrl),
    titulo: draft.titulo,
  };
  sessionStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
}

export function consumeBorradorResume(): BorradorResumePayload | null {
  const raw = sessionStorage.getItem(STORAGE_KEY);
  if (!raw) return null;
  sessionStorage.removeItem(STORAGE_KEY);
  try {
    const parsed = JSON.parse(raw) as BorradorResumePayload;
    if (!parsed?.borradorId) return null;
    return {
      borradorId: parsed.borradorId,
      topic: parsed.topic?.trim() || parsed.titulo?.trim() || '',
      tone: parsed.tone?.trim() || 'profesional',
      generatedText: parsed.generatedText?.trim() || '',
      imagenUrl: parsed.imagenUrl ?? null,
      imagenConIa: parsed.imagenConIa ?? Boolean(parsed.imagenUrl),
      titulo: parsed.titulo,
    };
  } catch {
    return null;
  }
}

export function resumeBorradorAndNavigate(
  draft: Borrador,
  onNavigate: (screen: string) => void
): void {
  saveBorradorResume(draft);
  onNavigate('new-post');
}
