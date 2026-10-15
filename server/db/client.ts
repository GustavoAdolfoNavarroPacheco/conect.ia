import { neon } from '@neondatabase/serverless';
import { HttpsError } from '../platform/callable';

/** Forma que usamos del cliente de Neon: consultas etiquetadas, query y transacciones. */
export type Filas = Record<string, any>[];
export type SqlClient = {
  (strings: TemplateStringsArray, ...params: unknown[]): Promise<Filas>;
  query(text: string, params?: unknown[]): Promise<Filas>;
  transaction(consultas: Promise<unknown>[]): Promise<unknown[]>;
};

let cliente: SqlClient | null = null;

/** Cliente HTTP de Neon (sin pool): seguro en funciones serverless. */
export function sql(): SqlClient {
  if (cliente) return cliente;
  const url = process.env.DATABASE_URL?.trim();
  if (!url) {
    throw new HttpsError(
      'failed-precondition',
      'DATABASE_URL no configurado. Añádelo en Vercel → Settings → Environment Variables (cadena de conexión de Neon).'
    );
  }
  cliente = neon(url) as unknown as SqlClient;
  return cliente;
}

export function iso(value: unknown): string | null {
  if (!value) return null;
  const d = value instanceof Date ? value : new Date(String(value));
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}
