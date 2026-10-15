import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { flushSync } from 'react-dom';

export type ThemeMode = 'light' | 'dark';

type ThemeState = {
  mode: ThemeMode;
  toggleTheme: () => void;
  setTheme: (mode: ThemeMode) => void;
};

const ThemeCtx = createContext<ThemeState | null>(null);
const STORAGE_KEY = 'conect-ia-theme';
const DURACION_FUNDIDO_MS = 450;

function temaInicial(): ThemeMode {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved === 'dark' || saved === 'light') return saved;
  } catch {
    // Sin acceso a localStorage: se usa la preferencia del sistema.
  }
  return window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

function aplicarTema(mode: ThemeMode) {
  const root = document.documentElement;
  root.setAttribute('data-theme', mode);
  root.classList.toggle('dark', mode === 'dark');
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [mode, setMode] = useState<ThemeMode>(temaInicial);

  useEffect(() => {
    aplicarTema(mode);
    try {
      localStorage.setItem(STORAGE_KEY, mode);
    } catch {
      // Preferencia no persistida; el tema sigue funcionando en esta sesión.
    }
  }, [mode]);

  /** Cambia el tema con un fundido: View Transitions si existe, transición de colores si no. */
  const setTheme = useCallback((next: ThemeMode) => {
    const reduceMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    const doc = document as Document & { startViewTransition?: (cb: () => void) => unknown };

    if (!reduceMotion && typeof doc.startViewTransition === 'function') {
      doc.startViewTransition(() => {
        flushSync(() => setMode(next));
        aplicarTema(next);
      });
      return;
    }

    const root = document.documentElement;
    root.classList.add('theme-fading');
    setMode(next);
    window.setTimeout(() => root.classList.remove('theme-fading'), DURACION_FUNDIDO_MS);
  }, []);

  const toggleTheme = useCallback(() => setTheme(mode === 'dark' ? 'light' : 'dark'), [mode, setTheme]);

  return (
    <ThemeCtx.Provider value={{ mode, toggleTheme, setTheme }}>
      {children}
    </ThemeCtx.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeCtx);
  if (!ctx) throw new Error('useTheme dentro de ThemeProvider');
  return ctx;
}
