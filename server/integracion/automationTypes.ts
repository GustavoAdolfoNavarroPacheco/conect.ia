export type RedSocial = 'linkedin' | 'instagram' | 'facebook' | 'twitter' | 'tiktok';

/** Payload POST al webhook Make (mismo contrato que el JSON n8n en Flujo_Automatizacion/) */
export interface AutomationPostPayload {
  topic: string;
  tone: string;
  include_image: boolean;
  telegram_notify: boolean;
  schedule_now: boolean;
  platforms: RedSocial[];
  action?: 'publish' | 'verify_channel' | 'notify_published' | 'notify_scheduled';
  provider?: 'make' | 'n8n';
  /** true = LinkedIn ya publicó Conect.ia (OAuth); Make solo notifica / registra */
  campus_published?: boolean;
  post_id?: string;
  scheduled_at?: string;
  linkedin_member_urn?: string;
  linkedin_display_name?: string;
  title?: string;
  body?: string;
  hashtags?: string[];
  image_url?: string | null;
  integrationId?: string;
  profileUrl?: string;
}

export interface AutomationPostResponse {
  success: boolean;
  title?: string;
  body?: string;
  hashtags?: string[];
  image_generated?: boolean;
  platforms_published?: string[];
  post_ids?: string[];
  linkedin_status?: string;
  preview_url?: string;
  error?: string;
}

/** @deprecated usar AutomationPostPayload */
export type N8nCampusPostPayload = AutomationPostPayload;
/** @deprecated usar AutomationPostResponse */
export type N8nCampusPostResponse = AutomationPostResponse;
