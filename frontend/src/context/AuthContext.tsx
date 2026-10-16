import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { inicializarCuentaUsuario, type Usuario } from '../lib/db';
import { callFn } from '../lib/api';
import { mensajeErrorAuth } from '../lib/authErrors';

/** Usuario de la sesión de Auth.js. `uid` es el identificador de la cuenta (Google o correo). */
export type AppUser = {
  uid: string;
  email: string;
  displayName: string;
  photoURL: string | null;
};

type AuthState = {
  user: AppUser | null;
  profile: Usuario | null;
  loading: boolean;
  initError: string | null;
  loginGoogle: () => Promise<void>;
  loginCorreo: (email: string, password: string) => Promise<void>;
  registrarCorreo: (email: string, password: string, nombre: string) => Promise<void>;
  logout: () => Promise<void>;
};

const Ctx = createContext<AuthState | null>(null);

async function leerSesion(): Promise<AppUser | null> {
  const res = await fetch('/api/auth/session', { credentials: 'same-origin' });
  if (!res.ok) return null;
  const data = (await res.json().catch(() => null)) as {
    user?: { id?: string; name?: string | null; email?: string | null; image?: string | null };
  } | null;
  if (!data?.user?.id) return null;
  return {
    uid: data.user.id,
    email: data.user.email ?? '',
    displayName: data.user.name ?? data.user.email ?? 'Usuario',
    photoURL: data.user.image ?? null,
  };
}

async function obtenerCsrf(): Promise<string> {
  const res = await fetch('/api/auth/csrf', { credentials: 'same-origin' });
  if (!res.ok) throw new Error('No se pudo preparar el inicio de sesión. Intenta de nuevo.');
  const data = (await res.json()) as { csrfToken: string };
  return data.csrfToken;
}

/** Auth.js exige POST con token CSRF; se envía un formulario y el navegador redirige. */
function enviarFormularioAuth(accion: string, campos: Record<string, string>) {
  const form = document.createElement('form');
  form.method = 'POST';
  form.action = accion;
  for (const [name, value] of Object.entries(campos)) {
    const input = document.createElement('input');
    input.type = 'hidden';
    input.name = name;
    input.value = value;
    form.appendChild(input);
  }
  document.body.appendChild(form);
  form.submit();
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AppUser | null>(null);
  const [profile, setProfile] = useState<Usuario | null>(null);
  const [loading, setLoading] = useState(true);
  const [initError, setInitError] = useState<string | null>(null);

  const cargarPerfil = useCallback(async () => {
    setInitError(null);
    try {
      setProfile(await inicializarCuentaUsuario());
    } catch (err) {
      setProfile(null);
      setInitError(mensajeErrorAuth(err));
    }
  }, []);

  useEffect(() => {
    let cancelado = false;
    (async () => {
      const sesion = await leerSesion().catch(() => null);
      if (cancelado) return;
      setUser(sesion);
      if (sesion) await cargarPerfil();
      if (!cancelado) setLoading(false);
    })();
    return () => {
      cancelado = true;
    };
  }, [cargarPerfil]);

  const loginGoogle = useCallback(async () => {
    const csrfToken = await obtenerCsrf();
    enviarFormularioAuth('/api/auth/signin/google', { csrfToken, callbackUrl: '/' });
  }, []);

  const loginCorreo = useCallback(async (email: string, password: string) => {
    const csrfToken = await obtenerCsrf();
    enviarFormularioAuth('/api/auth/callback/credentials', {
      csrfToken,
      email: email.trim(),
      password,
      callbackUrl: '/',
    });
  }, []);

  const registrarCorreo = useCallback(
    async (email: string, password: string, nombre: string) => {
      await callFn('registrarCuenta', { email: email.trim(), password, nombre: nombre.trim() });
      await loginCorreo(email, password);
    },
    [loginCorreo]
  );

  const logout = useCallback(async () => {
    const csrfToken = await obtenerCsrf();
    enviarFormularioAuth('/api/auth/signout', { csrfToken, callbackUrl: '/' });
  }, []);

  return (
    <Ctx.Provider
      value={{ user, profile, loading, initError, loginGoogle, loginCorreo, registrarCorreo, logout }}
    >
      {children}
    </Ctx.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useAuth debe usarse dentro de AuthProvider');
  return ctx;
}
