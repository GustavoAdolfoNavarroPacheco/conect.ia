import React, { useState } from 'react';
import { ArrowLeft } from 'lucide-react';
import { ConectiaLogo } from './components/ConectiaLogo';
import { useAuth } from '../context/AuthContext';
import { mensajeErrorAuth } from '../lib/authErrors';
import App, { PublicLanding } from './App';

/** Login con Google + app; invitados ven landing primero */
export default function AuthGate() {
  const { user, loginGoogle, logout, initError } = useAuth();
  const [guestView, setGuestView] = useState<'landing' | 'login'>('landing');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  if (user) {
    if (initError) {
      return (
        <div className="min-h-screen flex items-center justify-center p-4 bg-slate-50">
          <div className="max-w-md bg-white border rounded-2xl p-6 shadow-sm">
            <p className="text-sm font-semibold text-red-600 mb-2">No se pudo preparar tu cuenta</p>
            <p className="text-sm text-slate-600 mb-4">{initError}</p>
            <button
              type="button"
              className="w-full py-2 rounded-xl border text-sm"
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
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#f8fafc] via-[#eff6ff] to-[#f0fdfa] dark:from-background dark:via-background dark:to-background/90 p-4 relative overflow-hidden">
      {/* Background Orbs */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden z-0 pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] rounded-full bg-gradient-to-br from-[#06b6d4]/20 to-[#1e3a8a]/20 blur-[120px] animate-pulse-slow" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[60%] rounded-full bg-gradient-to-br from-[#2BBDE8]/20 to-[#0B1F4B]/20 blur-[100px]" style={{ animation: 'pulse 8s infinite alternate' }} />
      </div>

      <div className="w-full max-w-md bg-white/60 dark:bg-card/80 backdrop-blur-xl border border-white/60 dark:border-border/50 rounded-3xl p-8 sm:p-10 shadow-[0_8px_30px_rgb(0,0,0,0.04)] relative z-10">
        <button
          type="button"
          onClick={() => setGuestView('landing')}
          className="absolute left-6 top-6 flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-[#06b6d4] transition-colors cursor-pointer"
          aria-label="Volver a inicio"
        >
          <ArrowLeft className="w-4 h-4" />
          Inicio
        </button>
        <div className="mb-8 mt-6 flex justify-center">
          <ConectiaLogo size="lg" textClassName="!text-foreground !bg-none" />
        </div>
        <p className="text-sm font-medium text-center text-muted-foreground mb-8">Automatización de redes con IA y Make</p>
        {error && <p className="mb-4 text-sm text-red-500 font-medium text-center bg-red-50 dark:bg-red-950/30 py-2 rounded-xl border border-red-100 dark:border-red-900/50">{error}</p>}
        <button
          type="button"
          disabled={loading}
          onClick={() => void handleGoogle()}
          className="w-full mt-2 py-3 bg-white/50 dark:bg-accent/30 border border-white/60 dark:border-border/50 rounded-2xl text-sm font-medium hover:bg-white/80 dark:hover:bg-accent/50 transition-all duration-300 disabled:opacity-50 shadow-sm flex items-center justify-center gap-2 cursor-pointer disabled:cursor-not-allowed"
        >
          <svg className="w-5 h-5" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
          </svg>
          {loading ? 'Redirigiendo…' : 'Continuar con Google'}
        </button>
        <p className="mt-8 text-center text-xs text-muted-foreground/80 font-medium">
          <a href="/privacidad" className="hover:text-[#06b6d4] transition-colors cursor-pointer">
            Política de privacidad
          </a>
          {' · '}
          <a href="/terminos" className="hover:text-[#06b6d4] transition-colors cursor-pointer">
            Términos y condiciones
          </a>
        </p>
      </div>
    </div>
  );
}
