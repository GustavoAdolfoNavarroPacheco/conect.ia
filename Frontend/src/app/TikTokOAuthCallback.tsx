import React, { useEffect, useRef, useState } from 'react';
import { Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { completeTikTokOAuth } from '../services/cloudFunctions';
import { getTikTokOAuthRedirectUri } from '../lib/tiktokOAuth';
import { mensajeCallable } from '../lib/callableError';

const OAUTH_DONE_PREFIX = 'campus-tiktok-oauth-done:';

type Status = 'waiting_auth' | 'processing' | 'success' | 'error';

export function TikTokOAuthCallback() {
  const { user, loading: authLoading } = useAuth();
  const [status, setStatus] = useState<Status>('waiting_auth');
  const [message, setMessage] = useState('Completando conexión con TikTok…');
  const finishedRef = useRef(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const oauthError = params.get('error');
    const oauthDesc = params.get('error_description');

    if (oauthError) {
      setStatus('error');
      const desc = oauthDesc || oauthError;
      if (/redirect/i.test(desc)) {
        setMessage(
          `La URL de retorno no coincide. En TikTok for Developers → Manage apps → tu app → Redirect URL añade exactamente: ${getTikTokOAuthRedirectUri()}`
        );
      } else if (/permissions|scope/i.test(desc)) {
        setMessage(
          `TikTok denegó permisos: ${desc}. Revisa que la app tenga los scopes user.info.basic y video.publish habilitados en TikTok for Developers.`
        );
      } else {
        setMessage(desc);
      }
      return;
    }

    const code = params.get('code');
    const state = params.get('state');

    if (!code || !state) {
      setStatus('error');
      setMessage(
        'Esta página solo sirve cuando TikTok te redirige tras autorizar. No abras /oauth/tiktok a mano. ' +
          'En Conect.ia inicia sesión → Canales → Conectar TikTok.'
      );
      return;
    }

    if (authLoading) return;

    if (!user) {
      setStatus('error');
      setMessage(
        'Debes iniciar sesión en Conect.ia con la misma cuenta antes de autorizar TikTok. Cierra esta pestaña, inicia sesión y pulsa «Conectar TikTok» otra vez.'
      );
      return;
    }

    const doneKey = `${OAUTH_DONE_PREFIX}${state}`;
    if (sessionStorage.getItem(doneKey) === '1') {
      setStatus('success');
      setMessage('TikTok ya estaba conectado.');
      window.setTimeout(() => window.location.replace('/?tiktok=success'), 800);
      return;
    }

    if (finishedRef.current) return;
    finishedRef.current = true;

    let cancelled = false;

    const finish = async () => {
      setStatus('processing');
      try {
        const res = await completeTikTokOAuth({ code, state });
        if (cancelled) return;
        sessionStorage.setItem(doneKey, '1');
        setStatus('success');
        setMessage(`Cuenta vinculada — TikTok: ${res.cuentaNombre}`);
        window.setTimeout(() => {
          window.location.replace('/?tiktok=success');
        }, 1800);
      } catch (e) {
        if (cancelled) return;
        finishedRef.current = false;
        setStatus('error');
        setMessage(mensajeCallable(e));
      }
    };

    void finish();

    return () => {
      cancelled = true;
    };
  }, [user, authLoading]);

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-background text-foreground">
      <div className="max-w-md w-full border border-border rounded-2xl p-8 shadow-lg text-center space-y-4">
        {status === 'processing' || status === 'waiting_auth' ? (
          <Loader2 className="w-10 h-10 animate-spin mx-auto text-[#010101]" />
        ) : null}
        {status === 'success' ? (
          <CheckCircle2 className="w-10 h-10 mx-auto text-emerald-600" />
        ) : null}
        {status === 'error' ? <AlertCircle className="w-10 h-10 mx-auto text-destructive" /> : null}
        <h1 className="text-lg font-semibold">TikTok — Conect.ia</h1>
        <p className="text-sm text-muted-foreground">{message}</p>
        {status === 'error' ? (
          <div className="flex flex-col gap-2 mt-2">
            <a href="/" className="text-sm font-medium text-[#010101] hover:underline">
              Volver al inicio (luego abre Canales)
            </a>
            <p className="text-xs text-muted-foreground">
              Tras autorizar, la barra del navegador debe mostrar{' '}
              <code className="text-xs">?code=…&amp;state=…</code>
            </p>
          </div>
        ) : null}
      </div>
    </div>
  );
}
