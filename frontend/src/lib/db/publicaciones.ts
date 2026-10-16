import { callFn } from '../api';
import { invalidarDatos } from '../queryBus';
import type { EstadoPublicacion, Publicacion, RedSocial } from './types';

export async function listarPublicaciones(estado?: EstadoPublicacion): Promise<Publicacion[]> {
  return callFn<Publicacion[]>('listarPublicaciones', estado ? { estado } : {});
}

export async function crearPublicacion(
  _uid: string,
  data: {
    titulo: string;
    contenido: string;
    redesDestino: RedSocial[];
    estado: EstadoPublicacion;
    imagenUrl?: string | null;
    fechaProgramada?: Date | null;
  }
): Promise<string> {
  const { id } = await callFn<{ id: string }>('crearPublicacion', {
    titulo: data.titulo,
    contenido: data.contenido,
    redesDestino: data.redesDestino,
    estado: data.estado,
    imagenUrl: data.imagenUrl ?? null,
    fechaProgramada: data.fechaProgramada ? data.fechaProgramada.toISOString() : null,
  });
  invalidarDatos();
  return id;
}

export async function actualizarPublicacion(
  postId: string,
  patch: Partial<Pick<Publicacion, 'titulo' | 'contenido' | 'estado' | 'imagenUrl'>> & {
    fechaProgramada?: Date;
  }
): Promise<void> {
  await callFn('actualizarPublicacion', {
    postId,
    patch: {
      ...patch,
      fechaProgramada: patch.fechaProgramada ? patch.fechaProgramada.toISOString() : undefined,
    },
  });
  invalidarDatos();
}

export async function eliminarPublicacion(postId: string): Promise<void> {
  await callFn('eliminarPublicacion', { postId });
  invalidarDatos();
}
