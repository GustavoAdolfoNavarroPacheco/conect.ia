import React, { useEffect, useRef, useState } from 'react';
import { Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { completeLinkedInOAuth } from '../services/cloudFunctions';
import { getLinkedInOAuthRedirectUri } from '../lib/linkedinOAuth';
import { mensajeCallable } from '../lib/callableError';

const OAUTH_DONE_PREFIX = 'campus-linkedin-oauth-done:';

type Status = 'waiting_auth' | 'processing' | 'success' | 'error';

export function LinkedInOAuthCallback() {
  const { user, loading: authLoading } = useAuth();
  const [status, setStatus] = useState<Status>('waiting_auth');
  const [message, setMessage] = useState('Completando conexión con LinkedIn…');
  const finishedRef = useRef(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const oauthError = params.get('error');
    const oauthDesc = params.get('error_description');

    if (oauthError) {
      setStatus('error');
      const desc = oauthDesc || oauthError;
      if (/redirect_uri/i.test(desc)) {
        setMessage(
          `La URL de retorno no coincide. En LinkedIn Developers → Auth añade exactamente: ${getLinkedInOAuthRedirectUri()}`
        );
      } else {
        setMessage(desc);
      }
      return;
    }

    const code = params.get('code');
    const state = params.get('state');
    const hasAnyQuery = params.toString().length > 0;

    if (!code || !state) {
      setStatus('error');
      if (!hasAnyQuery) {
        setMessage(
          'Esta página solo sirve cuando LinkedIn te redirige tras autorizar. No abras /oauth/linkedin a mano. ' +
            'En Conect.ia inicia sesión → Canales → Conectar LinkedIn → Iniciar sesión con LinkedIn.'
        );
      } else if (state && !code) {
        setMessage(
          'LinkedIn no devolvió el código de autorización (cancelaste o falló el permiso). ' +
            'En developers.linkedin.com activa Products: Sign In with LinkedIn y Share on LinkedIn, pulsa Update en Auth, y vuelve a conectar.'
        );
      } else {
        setMessage('Faltan parámetros de LinkedIn. Vuelve a Canales e intenta de nuevo.');
      }
      return;
    }

    if (authLoading) return;

    if (!user) {
      setStatus('error');
      setMessage(
        'Debes iniciar sesión en Conect.ia con la misma cuenta antes de autorizar LinkedIn. Cierra esta pestaña, inicia sesión y pulsa «Conectar LinkedIn» otra vez.'
      );
      return;
    }

    const doneKey = `${OAUTH_DONE_PREFIX}${state}`;
    if (sessionStorage.getItem(doneKey) === '1') {
      setStatus('success');
      setMessage('LinkedIn ya estaba conectado.');
      window.setTimeout(() => window.location.replace('/?linkedin=success'), 800);
      return;
    }

    if (finishedRef.current) return;
    finishedRef.current = true;

    let cancelled = false;

    const finish = async () => {
      setStatus('processing');
      try {
        const res = await completeLinkedInOAuth({ code, state });
        if (cancelled) return;
        sessionStorage.setItem(doneKey, '1');
        setStatus('success');
        setMessage(`Cuenta vinculada: ${res.cuentaNombre}`);
        window.setTimeout(() => {
          window.location.replace('/?linkedin=success');
        }, 1500);
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
          <Loader2 className="w-10 h-10 animate-spin mx-auto text-[#0a66c2]" />
        ) : null}
        {status === 'success' ? (
          <CheckCircle2 className="w-10 h-10 mx-auto text-emerald-600" />
        ) : null}
        {status === 'error' ? <AlertCircle className="w-10 h-10 mx-auto text-destructive" /> : null}
        <h1 className="text-lg font-semibold">LinkedIn — Conect.ia</h1>
        <p className="text-sm text-muted-foreground">{message}</p>
        {status === 'error' ? (
          <div className="flex flex-col gap-2 mt-2">
            <a
              href="/"
              className="text-sm font-medium text-[#0a66c2] hover:underline"
            >
              Volver al inicio (luego abre Canales)
            </a>
            <p className="text-xs text-muted-foreground">
              Tras autorizar, la barra del navegador debe mostrar{' '}
              <code className="text-[10px]">?code=…&amp;state=…</code>
            </p>
          </div>
        ) : null}
      </div>
    </div>
  );
}
