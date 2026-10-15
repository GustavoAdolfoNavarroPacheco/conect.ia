import { callFn } from '../api';
import { invalidarDatos } from '../queryBus';
import type { CanalRed, CanalesDoc, RedSocial } from './types';

export async function obtenerCanales(_uid: string): Promise<CanalesDoc | null> {
  return callFn<CanalesDoc | null>('obtenerCanales');
}

export async function guardarCanal(
  _uid: string,
  red: RedSocial,
  patch: Partial<CanalRed>
): Promise<void> {
  await callFn('guardarCanal', { red, patch });
  invalidarDatos();
}
