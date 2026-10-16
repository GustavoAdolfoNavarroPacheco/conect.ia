import type { RedSocial } from './db/types';

/** Red principal de respaldo (usada cuando no hay ninguna seleccionada). */
export const RED_PRINCIPAL: RedSocial = 'linkedin';

export type TipoConexion = 'oauth' | 'manual' | 'proximamente';

export interface RedConfig {
  id: RedSocial;
  nombre: string;
  tipo: TipoConexion;
  /** La red exige imagen/video (no acepta solo texto). */
  requiereMedia: boolean;
  color: string;
  /** Canal OAuth compartido (misma app de terceros). */
  grupoOAuth?: 'linkedin' | 'meta' | 'tiktok';
  descripcion: string;
  disponible: boolean;
}

/** Catálogo universal de redes soportadas por Conect.ia. */
export const CATALOGO_REDES: RedConfig[] = [
  {
    id: 'linkedin',
    nombre: 'LinkedIn',
    tipo: 'oauth',
    requiereMedia: false,
    color: '#0a66c2',
    grupoOAuth: 'linkedin',
    descripcion: 'OAuth oficial · API LinkedIn Developers',
    disponible: true,
  },
  {
    id: 'facebook',
    nombre: 'Facebook',
    tipo: 'oauth',
    requiereMedia: false,
    color: '#1877f2',
    grupoOAuth: 'meta',
    descripcion: 'OAuth oficial · Meta Graph API (páginas)',
    disponible: true,
  },
  {
    id: 'instagram',
    nombre: 'Instagram',
    tipo: 'oauth',
    requiereMedia: true,
    color: '#e1306c',
    grupoOAuth: 'meta',
    descripcion: 'OAuth oficial · Meta Graph API (Business)',
    disponible: true,
  },
  {
    id: 'tiktok',
    nombre: 'TikTok',
    tipo: 'oauth',
    requiereMedia: true,
    color: '#010101',
    grupoOAuth: 'tiktok',
    descripcion: 'OAuth oficial · TikTok Content Posting API (video)',
    disponible: true,
  },
  {
    id: 'freelancer',
    nombre: 'Freelancer.com',
    tipo: 'proximamente',
    requiereMedia: false,
    color: '#29b2fe',
    descripcion: 'Próximamente · API oficial OAuth2',
    disponible: false,
  },
  {
    id: 'fiverr',
    nombre: 'Fiverr',
    tipo: 'manual',
    requiereMedia: false,
    color: '#1dbf73',
    descripcion: 'Manual guiado · sin API pública oficial',
    disponible: true,
  },
];

export function redConfig(red: RedSocial): RedConfig | undefined {
  return CATALOGO_REDES.find((r) => r.id === red);
}

/** Redes seleccionables al crear/publicar una publicación. */
export const REDES_PUBLICACION: RedSocial[] = CATALOGO_REDES.map((r) => r.id);

/** URLs de ayuda para cada red (registrar OAuth / crear página, etc). */
export const META_DEVELOPERS_URL =
  import.meta.env.VITE_META_DEVELOPERS_URL ||
  'https://developers.facebook.com/apps';

export const LINKEDIN_DEVELOPERS_URL =
  import.meta.env.VITE_LINKEDIN_DEVELOPERS_URL ||
  'https://www.linkedin.com/developers/apps';

export const TIKTOK_DEVELOPERS_URL =
  import.meta.env.VITE_TIKTOK_DEVELOPERS_URL ||
  'https://developers.tiktok.com/apps';