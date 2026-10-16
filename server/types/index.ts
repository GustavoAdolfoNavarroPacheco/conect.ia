export type RedSocial =
  | 'instagram'
  | 'facebook'
  | 'linkedin'
  | 'tiktok'
  | 'youtube'
  | 'freelancer'
  | 'fiverr';

export type EstadoPublicacion = 'borrador' | 'programado' | 'publicado' | 'parcial' | 'enviado' | 'fallido';

export interface ResultadoRed {
  success: boolean;
  postId?: string;
  error?: string;
}

export interface Publicacion {
  id: string;
  titulo: string;
  contenido: string;
  imagenUrl: string | null;
  redesDestino: RedSocial[];
  estado: EstadoPublicacion;
  /** ISO 8601 */
  fechaProgramada: string | null;
  creadoPor: string;
  resultados?: Partial<Record<RedSocial, ResultadoRed>>;
  /** ISO 8601 */
  creadoEn: string | null;
  actualizadoEn: string | null;
}

export interface ChatMessage {
  role: 'user' | 'model';
  content: string;
}

export interface GenerateContentRequest {
  prompt: string;
  redSocial: string;
  tono: string;
}

export interface GenerateContentResponse {
  contenido: string;
  hashtags: string[];
  variaciones: string[];
  provider?: string;
  imagenGenerada?: boolean;
  imagenUrl?: string;
  imagenNota?: string;
  /** Prompt en inglés que escribe la IA para la imagen (no se envía al frontend). */
  promptImagen?: string;
}
