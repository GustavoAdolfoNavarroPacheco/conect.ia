import { useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
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
    return {
      publicados: list.filter((p) => p.estado === 'publicado').length,
      programados: list.filter((p) => p.estado === 'programado').length,
      borradores: borradores.data?.length ?? 0,
      fallidos: list.filter((p) => p.estado === 'fallido').length,
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

export function usePublicacionesProgramadas(mes: number, anio: number) {
  const { data, ...rest } = usePublicaciones();
  const porDia = useMemo(() => {
    const map: Record<number, Publicacion[]> = {};
    (data ?? [])
      .filter((p) => p.estado === 'programado' && p.fechaProgramada)
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
