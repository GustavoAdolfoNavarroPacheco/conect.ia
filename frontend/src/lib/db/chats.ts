import { callFn } from '../api';
import type { ChatMensaje } from './types';

export async function listarMensajesChat(_uid: string): Promise<ChatMensaje[]> {
  return callFn<ChatMensaje[]>('listarMensajesChat');
}
