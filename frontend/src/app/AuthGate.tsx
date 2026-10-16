import React, { useEffect, useState } from 'react';
import { AnimatePresence, MotionConfig, motion } from 'motion/react';
import { ArrowLeft, Eye, EyeOff, Loader2, Lock, Mail, User } from 'lucide-react';
import { ConectiaLogo } from './components/ConectiaLogo';
import { AuthShowcase } from './components/AuthShowcase';
import { AuthField } from './components/ruixen/AuthField';
import { PasswordStrength } from './components/ruixen/PasswordStrength';
import { SlidingTabs } from './components/ruixen/SlidingTabs';
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

const ETIQUETA = 'text-sm font-medium text-foreground';

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
  const [verPassword, setVerPassword] = useState(false);
  const [errores, setErrores] = useState<{ email?: string; password?: string }>({});

  useEffect(() => {
    // Quita el código de error de la barra de direcciones tras mostrarlo.
    if (errorInicial) window.history.replaceState(null, '', '/');
  }, [errorInicial]);

  if (user) {
    if (initError) {
      return (
        <div className="ambient-light flex min-h-dvh items-center justify-center bg-background p-4">
          <div role="alert" className="surface w-full max-w-md animate-enter p-6">
            <p className="mb-2 text-sm font-semibold text-destructive">No se pudo preparar tu cuenta</p>
            <p className="mb-5 text-sm text-muted-foreground">{initError}</p>
            <button
              type="button"
              className="press h-11 w-full rounded-[10px] border border-border bg-card text-sm font-medium transition-colors duration-150 hover:bg-accent"
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

  const cambiarModo = (m: 'login' | 'registro') => {
    setModo(m);
    setError('');
    setErrores({});
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    const nuevos: { email?: string; password?: string } = {};
    if (!email.trim()) nuevos.email = 'Escribe tu correo electrónico.';
    if (!password) nuevos.password = 'Escribe tu contraseña.';
    else if (modo === 'registro' && password.length < 8) nuevos.password = 'Usa al menos 8 caracteres.';
    setErrores(nuevos);
    if (nuevos.email || nuevos.password) return;
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
    <MotionConfig reducedMotion="user">
      <div className="grid min-h-dvh bg-background lg:grid-cols-[minmax(0,1.05fr)_minmax(0,1fr)]">
        <AuthShowcase />

        <main className="ambient-light relative flex min-h-dvh flex-col items-center justify-center overflow-x-hidden p-4 sm:p-8">
          <div className="w-full max-w-md">
            {/* Fuera de la tarjeta, alineado a su borde izquierdo */}
            <button
              type="button"
              onClick={() => setGuestView('landing')}
              className="mb-4 flex h-10 items-center gap-2 rounded-[10px] text-sm font-medium text-muted-foreground transition-colors duration-150 hover:text-foreground"
            >
              <ArrowLeft className="h-4 w-4" />
              Volver al inicio
            </button>

            <div className="surface animate-enter p-6 !shadow-[var(--elev-md)] sm:p-10">
              <div className="mb-6 flex justify-center lg:hidden">
                <ConectiaLogo size="lg" textClassName="!text-foreground !bg-none" />
              </div>

              <div className="mb-6 text-center lg:text-left">
                <h1 className="text-2xl font-semibold tracking-tight text-foreground">
                  {modo === 'login' ? 'Bienvenido de nuevo' : 'Crea tu cuenta'}
                </h1>
                <p className="mt-1 text-sm text-muted-foreground">
                  {modo === 'login' ? 'Entra a tu panel para seguir publicando.' : 'Empieza a programar tus redes en minutos.'}
                </p>
              </div>

              <SlidingTabs
                ariaLabel="Modo de acceso"
                value={modo}
                onChange={cambiarModo}
                className="mb-6"
                options={[
                  { value: 'login', label: 'Entrar' },
                  { value: 'registro', label: 'Crear cuenta' },
                ]}
              />

              {/* Solo fallos del servidor; los de cada campo van bajo el campo */}
              {error && (
                <div role="alert" className="mb-4 rounded-xl border border-destructive/20 bg-destructive-soft px-4 py-3 text-sm text-foreground">
                  {error}
                </div>
              )}

              <form onSubmit={submit} noValidate className="space-y-4" aria-busy={loading}>
                <AnimatePresence initial={false}>
                  {modo === 'registro' && (
                    <motion.div
                      key="nombre"
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
                      className="-mx-1 overflow-hidden px-1"
                    >
                      <AuthField
                        id="acceso-nombre"
                        label="Nombre (opcional)"
                        icon={<User />}
                        type="text"
                        autoComplete="name"
                        disabled={loading}
                        value={nombre}
                        onChange={(e) => setNombre(e.target.value)}
                      />
                    </motion.div>
                  )}
                </AnimatePresence>

                <AuthField
                  id="acceso-email"
                  label="Correo electrónico"
                  icon={<Mail />}
                  type="email"
                  autoComplete="email"
                  disabled={loading}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  error={errores.email}
                />

                <AuthField
                  id="acceso-password"
                  label="Contraseña"
                  icon={<Lock />}
                  type={verPassword ? 'text' : 'password'}
                  autoComplete={modo === 'login' ? 'current-password' : 'new-password'}
                  disabled={loading}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  error={errores.password}
                  trailing={
                    <button
                      type="button"
                      aria-label={verPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                      aria-pressed={verPassword}
                      onClick={() => setVerPassword((v) => !v)}
                      className="press flex h-10 w-10 items-center justify-center rounded-[10px] text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                    >
                      {verPassword ? <EyeOff className="h-[18px] w-[18px]" /> : <Eye className="h-[18px] w-[18px]" />}
                    </button>
                  }
                />

                <AnimatePresence initial={false}>
                  {modo === 'registro' && (
                    <motion.div
                      key="fortaleza"
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
                      className="overflow-hidden"
                    >
                      <PasswordStrength password={password} />
                    </motion.div>
                  )}
                </AnimatePresence>

                <button
                  type="submit"
                  disabled={loading}
                  className="press flex h-12 w-full items-center justify-center gap-2 rounded-[12px] bg-brand text-sm font-semibold text-white shadow-[var(--glow)] transition-colors duration-150 hover:bg-brand-strong disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {loading && <Loader2 className="h-4 w-4 animate-spin" />}
                  {loading ? 'Un momento…' : modo === 'login' ? 'Entrar al panel' : 'Crear mi cuenta'}
                </button>
              </form>

              <div className="my-5 flex items-center gap-3 text-xs text-muted-foreground" aria-hidden>
                <span className="h-px flex-1 bg-border" />
                o
                <span className="h-px flex-1 bg-border" />
              </div>

              <button
                type="button"
                disabled={loading}
                onClick={() => void handleGoogle()}
                className="press flex h-12 w-full items-center justify-center gap-2 rounded-[12px] border border-border bg-card text-sm font-medium transition-colors duration-150 hover:bg-accent disabled:cursor-not-allowed disabled:opacity-50"
              >
                <svg className="h-5 w-5" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" aria-hidden>
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                </svg>
                Continuar con Google
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
        </main>
      </div>
    </MotionConfig>
  );
}
