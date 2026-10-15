import React, { useState } from 'react';
import { AlertTriangle, Copy, ExternalLink, Loader2, ShieldCheck } from 'lucide-react';
import { startLinkedInOAuth, startMetaOAuth, startTikTokOAuth } from '../../services/cloudFunctions';
import {
  getLinkedInOAuthRedirectUri,
  LINKEDIN_REDIRECT_URLS_TO_REGISTER,
} from '../../lib/linkedinOAuth';
import {
  getMetaOAuthRedirectUri,
  META_REDIRECT_URLS_TO_REGISTER,
} from '../../lib/metaOAuth';
import {
  getTikTokOAuthRedirectUri,
  TIKTOK_REDIRECT_URLS_TO_REGISTER,
} from '../../lib/tiktokOAuth';
import {
  LINKEDIN_DEVELOPERS_URL,
  META_DEVELOPERS_URL,
  TIKTOK_DEVELOPERS_URL,
} from '../../lib/redesConfig';
import { mensajeCallable } from '../../lib/callableError';
import type { RedSocial } from '../../lib/db/types';

type Props = {
  isOpen: boolean;
  onClose: () => void;
  /** Canal que se está conectando: solo soporta OAuth real (linkedin o meta). */
  red: RedSocial;
  onSuccess: (data: { cuentaNombre: string; integrationId?: string }) => void;
};

const META_COPY: Record<string, string> = {
  titulo: 'Conectar Facebook e Instagram',
  app: 'App Conect.ia (Meta for Developers)',
  registrar: 'URIs para Meta → Configuración → Avanzado → URI de redireccionamiento de OAuth válidos',
  devUrl: META_DEVELOPERS_URL,
  boton: 'Iniciar sesión con Facebook',
  devButton: 'Abrir Meta for Developers',
  nota: 'Autoriza con la cuenta que administra tu página de Facebook y tu Instagram Business. Vuelves a /oauth/meta y quedan vinculados ambos canales.',
  pasos:
    'Si ves «redirect_uri is not allowed»: en Meta for Developers añade las URLs de abajo (Configuración → Avanzado → OAuth), crea una página en business.facebook.com si no tienes, y para Instagram vincula una cuenta Business a la página.',
};

const TIKTOK_COPY: Record<string, string> = {
  titulo: 'Conectar TikTok',
  app: 'App Conect.ia (TikTok for Developers)',
  registrar: 'URIs para TikTok → Manage apps → tu app → Redirect URL',
  devUrl: TIKTOK_DEVELOPERS_URL,
  boton: 'Continuar con TikTok',
  devButton: 'Abrir TikTok for Developers',
  nota: 'Autoriza con la cuenta de TikTok donde publicarás. Vuelves a /oauth/tiktok y la cuenta queda vinculada. TikTok publica solo videos (mp4/mov/webm).',
  pasos:
    'Crea la app en TikTok for Developers (tipo Web), activa scopes user.info.basic y video.publish, y en Redirect URL añade las URLs de abajo. Con la app aún no aprobada (audit), los videos se publican como privados; tras la revisión pasan a públicos.',
};

export function ConnectChannelModal({ isOpen, onClose, red, onSuccess }: Props) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);

  // Cada proveedor (linkedin / facebook / instagram) es un estado limpio:
  // evita que el error de un modal anterior quede visible en el siguiente.
  React.useEffect(() => {
    setError('');
    setLoading(false);
    setCopied(false);
  }, [isOpen, red]);

  if (!isOpen) return null;

  const isMeta = red === 'facebook' || red === 'instagram';
  const isTikTok = red === 'tiktok';
  const redirectUri = isMeta
    ? getMetaOAuthRedirectUri()
    : isTikTok
      ? getTikTokOAuthRedirectUri()
      : getLinkedInOAuthRedirectUri();
  const urlsToRegister = isMeta
    ? META_REDIRECT_URLS_TO_REGISTER
    : isTikTok
      ? TIKTOK_REDIRECT_URLS_TO_REGISTER
      : LINKEDIN_REDIRECT_URLS_TO_REGISTER;
  const devUrl = isMeta ? META_DEVELOPERS_URL : isTikTok ? TIKTOK_DEVELOPERS_URL : LINKEDIN_DEVELOPERS_URL;
  const copy = isMeta ? META_COPY : isTikTok ? TIKTOK_COPY : {};

  const copyRedirect = async () => {
    await navigator.clipboard.writeText(redirectUri);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleOAuth = async () => {
    setLoading(true);
    setError('');
    try {
      const { authUrl } = isMeta
        ? await startMetaOAuth(redirectUri, red === 'instagram' ? 'instagram' : 'facebook')
        : isTikTok
          ? await startTikTokOAuth(redirectUri)
          : await startLinkedInOAuth(redirectUri);
      window.location.assign(authUrl);
    } catch (e) {
      setError(mensajeCallable(e));
      setLoading(false);
    }
  };

  const title = isMeta ? META_COPY.titulo : isTikTok ? TIKTOK_COPY.titulo : 'Conectar LinkedIn';
  const appName = isMeta
    ? META_COPY.app
    : isTikTok
      ? TIKTOK_COPY.app
      : 'App Conect.ia — flujo OAuth oficial de LinkedIn Developers.';
  const buttonLabel = isMeta ? META_COPY.boton : isTikTok ? TIKTOK_COPY.boton : 'Iniciar sesión con LinkedIn';
  const devButton = isMeta ? META_COPY.devButton : isTikTok ? TIKTOK_COPY.devButton : 'Abrir LinkedIn Developers';
  const nota = isMeta
    ? META_COPY.nota
    : isTikTok
      ? TIKTOK_COPY.nota
      : 'Tras autorizar, vuelves a /oauth/linkedin y la cuenta queda vinculada.';
  const pasos = isMeta ? META_COPY.pasos : isTikTok ? TIKTOK_COPY.pasos : null;
  const devUrlLabel = isMeta
    ? META_COPY.registrar
    : isTikTok
      ? TIKTOK_COPY.registrar
      : 'URLs para LinkedIn → Auth → Authorized redirect URLs';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-card border border-border rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-border">
          <h3 className="text-lg font-semibold">{title}</h3>
          <p className="text-sm text-muted-foreground mt-1">{appName}</p>
        </div>

        <div className="p-6 space-y-4">
          {pasos && (
            <div className="p-4 bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-800 rounded-xl text-sm space-y-2">
              <p className="font-semibold text-amber-900 dark:text-amber-100 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                Consejos antes de conectar
              </p>
              <p className="text-amber-950 dark:text-amber-100 text-xs">{pasos}</p>
            </div>
          )}

          <div className="p-4 bg-accent rounded-xl text-sm space-y-3">
            <p className="font-medium">{devUrlLabel}</p>
            {urlsToRegister.map((url) => (
              <code
                key={url}
                className="block text-xs p-2 bg-background rounded border break-all font-mono"
              >
                {url}
              </code>
            ))}
            <div className="pt-2 border-t border-border">
              <p className="text-xs text-muted-foreground mb-1">Conect.ia enviará ahora:</p>
              <code className="block text-xs p-2 bg-background rounded border break-all font-mono">
                {redirectUri}
              </code>
              <button
                type="button"
                className="mt-2 text-xs flex items-center gap-1 text-[#0a66c2] hover:underline"
                onClick={() => void copyRedirect()}
              >
                <Copy className="w-3 h-3" />
                {copied ? 'Copiado' : 'Copiar URL activa'}
              </button>
            </div>
          </div>

          <a
            href={devUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 w-full py-3 rounded-xl border border-border font-medium hover:bg-accent transition-colors"
          >
            <ExternalLink className="w-4 h-4" />
            {devButton}
          </a>

          <p className="text-xs text-muted-foreground flex items-start gap-2">
            <ShieldCheck className="w-4 h-4 shrink-0 text-emerald-600" />
            {nota}
          </p>

          {error && <p className="text-sm text-destructive">{error}</p>}

          <button
            type="button"
            disabled={loading}
            className="w-full py-3 rounded-xl bg-[#1877f2] hover:bg-[#0f63d8] text-white font-medium disabled:opacity-50 flex items-center justify-center gap-2"
            style={isMeta ? undefined : { backgroundColor: isTikTok ? '#010101' : '#0a66c2' }}
            onMouseEnter={(e) => {
              if (isMeta) return;
              e.currentTarget.style.backgroundColor = isTikTok ? '#000000' : '#004182';
            }}
            onMouseLeave={(e) => {
              if (isMeta) return;
              e.currentTarget.style.backgroundColor = isTikTok ? '#010101' : '#0a66c2';
            }}
            onClick={() => void handleOAuth()}
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
            {buttonLabel}
          </button>

          <button type="button" className="w-full py-2 text-sm text-muted-foreground" onClick={onClose}>
            Cancelar
          </button>
        </div>
      </div>
    </div>
  );
}