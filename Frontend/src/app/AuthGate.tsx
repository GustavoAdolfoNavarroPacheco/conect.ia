import React, { useEffect, useState } from 'react';
import { ArrowLeft } from 'lucide-react';
import { ConectiaLogo } from './components/ConectiaLogo';
import { useAuth } from '../context/AuthContext';
import { mensajeErrorAuth } from '../lib/authErrors';
import App, { PublicLanding } from './App';

/** Mensajes para los códigos de error que Auth.js añade a la URL (?error=...). */
const MENSAJES_ERROR: Record<string, string> = {
  CredentialsSignin: 'Correo o contraseña incorrectos.',
  OAuthSignin: 'No se pudo iniciar sesión con Google. Intenta de nuevo.',
  OAuthCallback: 'Google canceló o rechazó el inicio de sesión.',
  AccessDenied: 'Acceso denegado.',
};

function errorDesdeUrl(): string {
  const codigo = new URLSearchParams(window.location.search).get('error');
  if (!codigo) return '';
  return MENSAJES_ERROR[codigo] ?? 'No se pudo iniciar sesión. Intenta de nuevo.';
}

const CAMPO = 'field h-11';

/** Login con correo y contraseña, con Google; invitados ven la landing primero */
export default function AuthGate() {
  const { user, loginGoogle, loginCorreo, registrarCorreo, logout, initError } = useAuth();
  const [errorInicial] = useState(errorDesdeUrl);
  const [guestView, setGuestView] = useState<'landing' | 'login'>(() => (errorInicial ? 'login' : 'landing'));
  const [modo, setModo] = useState<'login' | 'registro'>('login');
  const [nombre, setNombre] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(errorInicial);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Quita el código de error de la barra de direcciones tras mostrarlo.
    if (errorInicial) window.history.replaceState(null, '', '/');
  }, [errorInicial]);

  if (user) {
    if (initError) {
      return (
        <div className="ambient-light flex h-full min-h-screen items-center justify-center bg-background p-4">
          <div className="surface w-full max-w-md animate-enter p-6">
            <p className="mb-2 text-sm font-semibold text-destructive">No se pudo preparar tu cuenta</p>
            <p className="mb-5 text-sm text-muted-foreground">{initError}</p>
            <button
              type="button"
              className="press h-10 w-full rounded-[10px] border border-border bg-card text-sm font-medium transition-colors hover:bg-accent"
              onClick={() => void logout()}
            >
              Cerrar sesión e intentar de nuevo
            </button>
          </div>
        </div>
      );
    }
    return <App productionMode />;
  }

  if (guestView === 'landing') {
    return <PublicLanding onLogin={() => setGuestView('login')} />;
  }

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!email.trim() || !password) {
      setError('Correo y contraseña son obligatorios.');
      return;
    }
    if (modo === 'registro' && password.length < 8) {
      setError('La contraseña debe tener al menos 8 caracteres.');
      return;
    }
    setLoading(true);
    try {
      if (modo === 'login') await loginCorreo(email, password);
      else await registrarCorreo(email, password, nombre);
    } catch (err) {
      setError(mensajeErrorAuth(err));
      setLoading(false);
    }
  };

  const handleGoogle = async () => {
    setLoading(true);
    setError('');
    try {
      await loginGoogle();
    } catch (err) {
      setError(mensajeErrorAuth(err));
      setLoading(false);
    }
  };

  return (
    <div className="ambient-light relative flex min-h-screen items-center justify-center overflow-hidden bg-background p-4">
      {/* Background Orbs */}
      <div className="pointer-events-none absolute inset-0 z-0 overflow-hidden" aria-hidden>
        <div className="absolute -left-32 -top-32 h-96 w-96 animate-pulse-slow rounded-full bg-brand/15 blur-[120px]" />
        <div className="absolute -bottom-32 -right-24 h-96 w-96 animate-pulse-slow rounded-full bg-brand-light/10 blur-[120px] [animation-delay:2s]" />
      </div>

      <div className="surface relative z-10 w-full max-w-md animate-enter p-8 shadow-lg sm:p-10">
        <button
          type="button"
          onClick={() => setGuestView('landing')}
          className="press absolute left-6 top-6 flex items-center gap-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
          aria-label="Volver a inicio"
        >
          <ArrowLeft className="w-4 h-4" />
          Inicio
        </button>
        <div className="mb-8 mt-6 flex justify-center">
          <ConectiaLogo size="lg" textClassName="!text-foreground !bg-none" />
        </div>
        <p className="mb-8 text-center text-sm text-muted-foreground">Automatización de redes con IA</p>

        <form onSubmit={submit} className="space-y-4">
          {modo === 'registro' && (
            <input
              type="text"
              className={CAMPO}
              placeholder="Nombre (opcional)"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
            />
          )}
          <input
            type="email"
            required
            className={CAMPO}
            placeholder="Correo electrónico"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <input
            type="password"
            required
            minLength={modo === 'registro' ? 8 : undefined}
            className={CAMPO}
            placeholder="Contraseña"
            autoComplete={modo === 'login' ? 'current-password' : 'new-password'}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          {error && <p className="rounded-[10px] border border-destructive/20 bg-destructive-soft px-3 py-2 text-center text-sm font-medium text-destructive">{error}</p>}
          <button
            type="submit"
            disabled={loading}
            className="press mt-2 h-11 w-full rounded-[10px] bg-brand text-sm font-semibold text-white shadow-xs transition-all duration-200 hover:bg-brand-deep hover:shadow-[var(--glow)] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? 'Cargando…' : modo === 'login' ? 'Entrar al Panel' : 'Crear mi cuenta'}
          </button>
        </form>

        <div className="my-5 flex items-center gap-3 text-xs text-muted-foreground">
          <span className="flex-1 h-px bg-border" />
          o
          <span className="flex-1 h-px bg-border" />
        </div>

        <button
          type="button"
          disabled={loading}
          onClick={() => void handleGoogle()}
          className="press flex h-11 w-full items-center justify-center gap-2 rounded-[10px] border border-border bg-card text-sm font-medium transition-colors duration-200 hover:bg-accent disabled:cursor-not-allowed disabled:opacity-50"
        >
          <svg className="w-5 h-5" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
          </svg>
          {loading ? 'Redirigiendo…' : 'Continuar con Google'}
        </button>

        <button
          type="button"
          className="link-underline mx-auto mt-6 block text-sm font-medium text-brand-strong"
          onClick={() => {
            setModo(modo === 'login' ? 'registro' : 'login');
            setError('');
          }}
        >
          {modo === 'login' ? '¿No tienes cuenta? Crear una' : 'Ya tengo cuenta, iniciar sesión'}
        </button>

        <p className="mt-8 text-center text-xs text-muted-foreground">
          <a href="/privacidad" className="link-underline transition-colors hover:text-foreground">
            Política de privacidad
          </a>
          {' · '}
          <a href="/terminos" className="link-underline transition-colors hover:text-foreground">
            Términos y condiciones
          </a>
        </p>
      </div>
    </div>
  );
}
