import { callFn } from '../api';
import { invalidarDatos } from '../queryBus';
import type { Configuracion } from './types';

export async function obtenerConfiguracion(_uid: string): Promise<Configuracion | null> {
  return callFn<Configuracion | null>('obtenerConfiguracion');
}

export async function guardarConfiguracion(
  _uid: string,
  data: Partial<Pick<Configuracion, 'n8nWebhookUrl' | 'makeWebhookUrl' | 'notifications' | 'timezone'>>
): Promise<void> {
  await callFn('guardarConfiguracion', { data });
  invalidarDatos();
}
