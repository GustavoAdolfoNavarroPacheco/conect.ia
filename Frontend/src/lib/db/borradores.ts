import { callFn } from '../api';
import { invalidarDatos } from '../queryBus';
import type { Borrador, RedSocial } from './types';

export type BorradorWriteData = {
  titulo: string;
  contenidoGenerado: string;
  promptOriginal: string;
  tono: string;
  redesDestino: RedSocial[];
  hashtags?: string[];
  imagenUrl?: string | null;
  imagenConIa?: boolean;
};

export async function listarBorradores(): Promise<Borrador[]> {
  return callFn<Borrador[]>('listarBorradores');
}

export async function crearBorrador(_uid: string, data: BorradorWriteData): Promise<string> {
  const { id } = await callFn<{ id: string }>('crearBorrador', data);
  invalidarDatos();
  return id;
}

export async function actualizarBorrador(draftId: string, data: BorradorWriteData): Promise<void> {
  await callFn('actualizarBorrador', { draftId, ...data });
  invalidarDatos();
}

export async function eliminarBorrador(draftId: string): Promise<void> {
  await callFn('eliminarBorrador', { draftId });
  invalidarDatos();
}
