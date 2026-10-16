

export type RedSocial =
  | 'linkedin'
  | 'instagram'
  | 'facebook'
  | 'twitter'
  | 'tiktok'
  | 'freelancer'
  | 'fiverr';

export type EstadoPublicacion =
  | 'borrador'
  | 'programado'
  | 'publicado'
  | 'fallido'
  | 'enviado'
  | 'parcial'
  | 'pendiente'
  | 'en_proceso';

export type EstadoBorrador = 'pendiente' | 'aprobado' | 'rechazado' | 'programado';

export type Usuario = {
  uid: string;
  email: string;
  nombre: string;
  rol: 'admin' | 'editor' | 'viewer';
  redesConectadas?: Partial<Record<RedSocial, boolean>>;
  creadoEn?: string;
  actualizadoEn?: string;
};

export type CanalRed = {
  conectado: boolean;
  cuentaNombre: string | null;
  integrationId?: string | null;
  profileUrl?: string | null;
  proveedor?: string;
  verificadoPor?: string;
  verificadoEn?: string;
};

export type CanalesDoc = {
  usuarioId: string;
  linkedin?: CanalRed;
  instagram?: CanalRed;
  facebook?: CanalRed;
  twitter?: CanalRed;
  tiktok?: CanalRed;
  freelancer?: CanalRed;
  fiverr?: CanalRed;
  actualizadoEn?: string;
};

export type Publicacion = {
  id: string;
  titulo: string;
  contenido: string;
  imagenUrl?: string | null;
  redesDestino: RedSocial[];
  estado: EstadoPublicacion;
  fechaProgramada?: string | null;
  creadoPor: string;
  resultados?: Record<string, { success: boolean; postId?: string; error?: string }>;
  /** Intentos de envío hechos (máximo 5) y el último error registrado. */
  intentos?: number;
  ultimoError?: string | null;
  publicadoEn?: string | null;
  /** El texto lo generó la IA (se declara a TikTok al publicar). */
  generadoIa?: boolean;
  n8nExecutionId?: string | null;
  creadoEn?: string;
  actualizadoEn?: string;
};

export type Borrador = {
  id: string;
  usuarioId: string;
  titulo: string;
  contenidoGenerado: string;
  hashtags?: string[];
  promptOriginal: string;
  tono: string;
  redSocial?: string;
  redesDestino: RedSocial[];
  imagenUrl?: string | null;
  imagenConIa?: boolean;
  estado: EstadoBorrador;
  n8nExecutionId?: string | null;
  programadoPara?: string | null;
  creadoEn?: string;
  actualizadoEn?: string;
};

export type ActividadItem = {
  id: string;
  usuarioId: string;
  tipo: 'publicado' | 'programado' | 'borrador' | 'error' | 'sistema';
  mensaje: string;
  red?: RedSocial | string;
  creadoEn?: string;
};

export type ChatMensaje = {
  id: string;
  role: 'user' | 'model';
  content: string;
  accionSugerida?: string | null;
  temaSugerido?: string | null;
  tonoSugerido?: string | null;
  orden?: number;
  creadoEn?: string;
};

export type Configuracion = {
  usuarioId: string;
  n8nWebhookUrl?: string;
  makeWebhookUrl?: string;
  notifications?: boolean;
  timezone?: string;
  creadoEn?: string;
  actualizadoEn?: string;
};

export type AutomationPostPayload = {
  topic: string;
  tone: string;
  include_image?: boolean;
  telegram_notify?: boolean;
  schedule_now?: boolean;
  platforms: string[];
  body?: string;
  image_url?: string | null;
  action?: 'publish' | 'verify_channel' | 'notify_scheduled';
  title?: string;
  campus_published?: boolean;
  provider?: string;
  post_id?: string;
  scheduled_at?: string;
};

export type AutomationPostResponse = {
  success?: boolean;
  message?: string;
  draft?: boolean;
  [key: string]: unknown;
};
