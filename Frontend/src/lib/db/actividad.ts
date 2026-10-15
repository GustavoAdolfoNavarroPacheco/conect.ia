import { callFn } from '../api';
import { invalidarDatos } from '../queryBus';
import type { ActividadItem } from './types';

export async function listarActividad(): Promise<ActividadItem[]> {
  return callFn<ActividadItem[]>('listarActividad');
}

export async function registrarActividad(
  _uid: string,
  data: Pick<ActividadItem, 'tipo' | 'mensaje' | 'red'>
): Promise<void> {
  await callFn('registrarActividad', { tipo: data.tipo, mensaje: data.mensaje, red: data.red ?? null });
  invalidarDatos();
}
