import type { QueryClient } from '@tanstack/react-query';

/**
 * Puente entre la capa de datos (sin React) y React Query: tras cada escritura
 * se invalidan las listas para que la UI vuelva a leer desde Neon.
 */
let cliente: QueryClient | null = null;

export function registrarQueryClient(c: QueryClient) {
  cliente = c;
}

export function invalidarDatos() {
  void cliente?.invalidateQueries();
}
