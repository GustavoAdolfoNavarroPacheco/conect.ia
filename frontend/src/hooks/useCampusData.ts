import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../context/AuthContext';
import {
  listarActividad,
  listarBorradores,
  listarMensajesChat,
  listarPublicaciones,
  obtenerCanales,
} from '../lib/db';
import { obtenerConfiguracion } from '../lib/db/configuracion';
import type { ActividadItem, Borrador, EstadoPublicacion, Publicacion } from '../lib/db/types';
import { actualizarMetricas, resumenAnalitica } from '../services/cloudFunctions';

/**
 * Listas de datos desde Neon vía API. Se refrescan cada pocos segundos y tras cada escritura
 * (ver `invalidarDatos` en lib/queryBus.ts).
 */
const REFRESCO_MS = 10_000;

export function usePublicaciones(filtro?: { estado?: EstadoPublicacion }) {
  const { user } = useAuth();
  const estado = filtro?.estado;
  const q = useQuery<Publicacion[]>({
    queryKey: ['publicaciones', user?.uid, estado ?? 'all'],
    queryFn: () => listarPublicaciones(estado),
    enabled: !!user,
    refetchInterval: REFRESCO_MS,
  });
  return {
    data: q.data ?? [],
    isLoading: q.isLoading,
    error: (q.error as Error | null) ?? null,
    refetch: () => void q.refetch(),
  };
}

export function useBorradores() {
  const { user } = useAuth();
  const q = useQuery<Borrador[]>({
    queryKey: ['borradores', user?.uid],
    queryFn: () => listarBorradores(),
    enabled: !!user,
    refetchInterval: REFRESCO_MS,
  });
  return {
    data: q.data ?? [],
    isLoading: q.isLoading,
    error: (q.error as Error | null) ?? null,
    refetch: () => void q.refetch(),
  };
}

export function useActividad() {
  const { user } = useAuth();
  const q = useQuery<ActividadItem[]>({
    queryKey: ['actividad', user?.uid],
    queryFn: () => listarActividad(),
    enabled: !!user,
    refetchInterval: REFRESCO_MS,
  });
  return {
    data: q.data ?? [],
    isLoading: q.isLoading,
    error: (q.error as Error | null) ?? null,
    refetch: () => void q.refetch(),
  };
}

const EVENTO_LECTURA = 'conectia:actividad-leida';
const lecturaEnMemoria = new Map<string, number>();

function claveLectura(uid: string) {
  return `conectia:actividad-leida:${uid}`;
}

/** Momento (ms) en que la persona marcó la actividad como leída. 0 si nunca lo hizo. */
function leerUltimaLectura(uid: string): number {
  let guardada = 0;
  try {
    guardada = Date.parse(localStorage.getItem(claveLectura(uid)) ?? '') || 0;
  } catch {
    // Sin almacenamiento (ventana privada o datos bloqueados): queda la copia en memoria.
  }
  return Math.max(guardada, lecturaEnMemoria.get(uid) ?? 0);
}

function guardarUltimaLectura(uid: string, ms: number) {
  lecturaEnMemoria.set(uid, ms);
  try {
    localStorage.setItem(claveLectura(uid), new Date(ms).toISOString());
  } catch {
    // Sin almacenamiento: la marca dura lo que dure la pestaña.
  }
  window.dispatchEvent(new Event(EVENTO_LECTURA));
}

/**
 * Actividad con su estado de lectura. Lo leído se guarda por persona en este navegador
 * (no en la base de datos) y se comparte entre la cabecera y el inicio.
 */
export function useActividadLeida() {
  const { user } = useAuth();
  const uid = user?.uid ?? '';
  const { data: actividad, isLoading, error, refetch } = useActividad();
  const [ultimaLectura, setUltimaLectura] = useState(() => leerUltimaLectura(uid));

  useEffect(() => {
    const sincronizar = () => setUltimaLectura(leerUltimaLectura(uid));
    sincronizar();
    window.addEventListener(EVENTO_LECTURA, sincronizar);
    return () => window.removeEventListener(EVENTO_LECTURA, sincronizar);
  }, [uid]);

  const sinLeer = useMemo(
    () => new Set(actividad.filter((a) => !a.creadoEn || Date.parse(a.creadoEn) > ultimaLectura).map((a) => a.id)),
    [actividad, ultimaLectura]
  );

  return {
    actividad,
    isLoading,
    error,
    refetch,
    cantidadSinLeer: sinLeer.size,
    esSinLeer: (a: ActividadItem) => sinLeer.has(a.id),
    marcarTodasLeidas: () => guardarUltimaLectura(uid, Date.now()),
  };
}

/** Resumen de Analítica de los últimos 30 días. */
export function useResumenAnalitica() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['analitica', user?.uid],
    queryFn: () => resumenAnalitica(),
    enabled: !!user,
    staleTime: 60_000,
  });
}

/** Mide las publicaciones recientes y, al terminar, refresca el resumen. */
export function useActualizarMetricas() {
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => actualizarMetricas(),
    onSettled: () => qc.invalidateQueries({ queryKey: ['analitica', user?.uid] }),
  });
}

export function useCanales() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['canales', user?.uid],
    queryFn: () => obtenerCanales(user!.uid),
    enabled: !!user,
    refetchInterval: 15_000,
  });
}

export function useConfiguracion() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['configuracion', user?.uid],
    queryFn: () => obtenerConfiguracion(user!.uid),
    enabled: !!user,
    staleTime: 60_000,
  });
}

export function useChatMensajes() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['chat', user?.uid],
    queryFn: () => listarMensajesChat(user!.uid),
    enabled: !!user,
    refetchInterval: 5_000,
  });
}

export function useDashboardStats() {
  const pubs = usePublicaciones();
  const borradores = useBorradores();

  const stats = useMemo(() => {
    const list = pubs.data ?? [];
    const ahora = Date.now();
    const inicioHoy = new Date();
    inicioHoy.setHours(0, 0, 0, 0);
    const finHoy = new Date(inicioHoy);
    finHoy.setDate(finHoy.getDate() + 1);
    const en7Dias = ahora + 7 * 24 * 60 * 60 * 1000;

    // Programadas con fecha válida, de la más próxima a la más lejana.
    const programadas = list
      .filter((p) => p.estado === 'programado' && p.fechaProgramada)
      .map((p) => ({ p, t: Date.parse(p.fechaProgramada as string) }))
      .filter((x) => !Number.isNaN(x.t))
      .sort((a, b) => a.t - b.t);

    const fallidas = list.filter((p) => p.estado === 'fallido');
    // La fallida más reciente: el calendario se abre en su mes.
    const instante = (p: Publicacion) => Date.parse(p.fechaProgramada ?? p.actualizadoEn ?? '') || 0;
    const ultimaFallida = fallidas.reduce<Publicacion | null>(
      (mas, p) => (!mas || instante(p) > instante(mas) ? p : mas),
      null
    );

    return {
      publicados: list.filter((p) => p.estado === 'publicado').length,
      programados: list.filter((p) => p.estado === 'programado').length,
      borradores: borradores.data?.length ?? 0,
      fallidos: fallidas.length,
      ultimaFallida,
      hoy: programadas.filter((x) => x.t >= inicioHoy.getTime() && x.t < finHoy.getTime()).length,
      proximos7: programadas.filter((x) => x.t >= ahora && x.t < en7Dias).length,
      proximas: programadas.filter((x) => x.t >= ahora).slice(0, 5).map((x) => x.p),
    };
  }, [pubs.data, borradores.data]);

  return {
    stats,
    isLoading: pubs.isLoading || borradores.isLoading,
    error: pubs.error ?? borradores.error,
    refetch: () => {
      pubs.refetch();
      borradores.refetch();
    },
  };
}

/** Estados que se ven en el calendario: lo programado y lo que ya salió (con su resultado). Borradores no. */
export const ESTADOS_EN_CALENDARIO: EstadoPublicacion[] = ['programado', 'en_proceso', 'enviado', 'parcial', 'publicado', 'fallido'];

export function usePublicacionesProgramadas(mes: number, anio: number) {
  const { data, ...rest } = usePublicaciones();
  const porDia = useMemo(() => {
    const map: Record<number, Publicacion[]> = {};
    (data ?? [])
      .filter((p) => ESTADOS_EN_CALENDARIO.includes(p.estado) && p.fechaProgramada)
      .forEach((p) => {
        const date = new Date(p.fechaProgramada as string);
        if (date.getMonth() === mes && date.getFullYear() === anio) {
          const day = date.getDate();
          if (!map[day]) map[day] = [];
          map[day].push(p);
        }
      });
    return map;
  }, [data, mes, anio]);

  return { porDia, publicaciones: data ?? [], ...rest };
}

export function useInvalidateCampus() {
  const qc = useQueryClient();
  const { user } = useAuth();
  return () => {
    if (!user) return;
    qc.invalidateQueries({ queryKey: ['publicaciones', user.uid] });
    qc.invalidateQueries({ queryKey: ['borradores', user.uid] });
    qc.invalidateQueries({ queryKey: ['actividad', user.uid] });
    qc.invalidateQueries({ queryKey: ['canales', user.uid] });
    qc.invalidateQueries({ queryKey: ['chat', user.uid] });
    qc.invalidateQueries({ queryKey: ['configuracion', user.uid] });
  };
}

/** Búsqueda global en publicaciones y borradores */
export function useCampusSearch(term: string) {
  const pubs = usePublicaciones();
  const borradores = useBorradores();
  const q = term.trim().toLowerCase();

  return useMemo(() => {
    if (!q) return { publicaciones: [], borradores: [] };
    const match = (s: string) => s.toLowerCase().includes(q);
    return {
      publicaciones: (pubs.data ?? []).filter(
        (p) => match(p.titulo) || match(p.contenido)
      ),
      borradores: (borradores.data ?? []).filter(
        (b) => match(b.titulo ?? '') || match(b.contenidoGenerado ?? '') || match(b.promptOriginal)
      ),
    };
  }, [q, pubs.data, borradores.data]);
}
