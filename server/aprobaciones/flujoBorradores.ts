import { sql } from '../db/client';
import { crearPublicacion } from '../db/repo';
import { HttpsError } from '../platform/callable';

/**
 * Flujo de aprobación de borradores (Aprobaciones):
 *   pendiente → en_revision → aprobado → programado
 * Enviar a revisión lo puede hacer cualquier miembro. Aprobar y pedir cambios, solo un administrador.
 * El rol se lee de la base, nunca del navegador. Cada paso exige el estado de origen dentro del UPDATE.
 */
export type AccionBorrador = 'enviar' | 'aprobar' | 'pedir_cambios' | 'programar';

const ACCIONES: AccionBorrador[] = ['enviar', 'aprobar', 'pedir_cambios', 'programar'];
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const MARGEN_PROGRAMAR_MS = 60_000;

export type EntradaMover = {
  id: string;
  accion: AccionBorrador;
  comentario?: string;
  fechaHora?: string;
};

export type ResultadoMover = { estado: string; publicacionId?: string };

function sinCambio(mensaje: string): never {
  throw new HttpsError('failed-precondition', mensaje);
}

/** Valida la entrada del navegador antes de tocar la base. */
export function validarEntradaMover(data: unknown): EntradaMover {
  const d = (data ?? {}) as Record<string, unknown>;
  if (typeof d.id !== 'string' || !UUID.test(d.id)) {
    throw new HttpsError('invalid-argument', 'Borrador no válido');
  }
  if (typeof d.accion !== 'string' || !ACCIONES.includes(d.accion as AccionBorrador)) {
    throw new HttpsError('invalid-argument', 'Acción no válida');
  }
  if (d.comentario !== undefined && typeof d.comentario !== 'string') {
    throw new HttpsError('invalid-argument', 'El comentario debe ser texto');
  }
  if (d.fechaHora !== undefined && typeof d.fechaHora !== 'string') {
    throw new HttpsError('invalid-argument', 'La fecha debe ser texto');
  }
  return {
    id: d.id,
    accion: d.accion as AccionBorrador,
    comentario: typeof d.comentario === 'string' ? d.comentario.trim() : undefined,
    fechaHora: typeof d.fechaHora === 'string' ? d.fechaHora : undefined,
  };
}

/** Ejecuta una transición del flujo para un borrador de la cuenta `uid`. */
export async function moverBorrador(uid: string, entrada: EntradaMover): Promise<ResultadoMover> {
  const [usuario] = await sql()`SELECT rol FROM usuarios WHERE uid = ${uid}`;
  const esAdministrador = usuario?.rol === 'admin';
  const { id } = entrada;

  switch (entrada.accion) {
    case 'enviar': {
      const filas = await sql()`
        UPDATE borradores SET estado = 'en_revision', revision_comentario = NULL, actualizado_en = now()
        WHERE id = ${id} AND usuario_id = ${uid} AND estado = 'pendiente'
        RETURNING id`;
      if (!filas.length) sinCambio('Solo un borrador sin revisar se puede enviar a revisión.');
      return { estado: 'en_revision' };
    }

    case 'aprobar': {
      if (!esAdministrador) throw new HttpsError('permission-denied', 'Solo un administrador puede aprobar.');
      const filas = await sql()`
        UPDATE borradores SET estado = 'aprobado', revisado_por = ${uid}, revisado_en = now(),
          revision_comentario = NULL, actualizado_en = now()
        WHERE id = ${id} AND usuario_id = ${uid} AND estado = 'en_revision'
        RETURNING id`;
      if (!filas.length) sinCambio('Solo un borrador en revisión se puede aprobar.');
      return { estado: 'aprobado' };
    }

    case 'pedir_cambios': {
      if (!esAdministrador) throw new HttpsError('permission-denied', 'Solo un administrador puede pedir cambios.');
      const comentario = entrada.comentario ?? '';
      if (comentario.length < 3 || comentario.length > 500) {
        throw new HttpsError('invalid-argument', 'Escribe qué debe cambiar (entre 3 y 500 caracteres).');
      }
      const filas = await sql()`
        UPDATE borradores SET estado = 'pendiente', revision_comentario = ${comentario}, revisado_por = ${uid},
          revisado_en = now(), actualizado_en = now()
        WHERE id = ${id} AND usuario_id = ${uid} AND estado = 'en_revision'
        RETURNING id`;
      if (!filas.length) sinCambio('Solo un borrador en revisión puede recibir cambios.');
      return { estado: 'pendiente' };
    }

    case 'programar': {
      const fecha = new Date(entrada.fechaHora ?? '');
      if (Number.isNaN(fecha.getTime()) || fecha.getTime() < Date.now() + MARGEN_PROGRAMAR_MS) {
        throw new HttpsError('invalid-argument', 'La fecha debe ser futura.');
      }
      // Primero se marca el borrador (el estado de origen evita programarlo dos veces); si falla crear la publicación, se revierte.
      const [borrador] = await sql()`
        UPDATE borradores SET estado = 'programado', programado_para = ${fecha.toISOString()}::timestamptz,
          actualizado_en = now()
        WHERE id = ${id} AND usuario_id = ${uid} AND estado = 'aprobado'
        RETURNING titulo, contenido_generado, hashtags, redes_destino, imagen_url`;
      if (!borrador) sinCambio('Solo un borrador aprobado se puede programar.');

      try {
        const etiquetas = ((borrador.hashtags ?? []) as string[])
          .map((h) => (h.startsWith('#') ? h : `#${h}`))
          .join(' ');
        const publicacionId = await crearPublicacion(uid, {
          titulo: borrador.titulo,
          contenido: [borrador.contenido_generado, etiquetas].filter(Boolean).join('\n\n'),
          redesDestino: (borrador.redes_destino ?? []) as string[],
          estado: 'programado',
          imagenUrl: borrador.imagen_url ?? null,
          fechaProgramada: fecha.toISOString(),
          // Los borradores salen del asistente de IA: el texto se declara como generado (TikTok lo exige).
          generadoIa: true,
        });
        return { estado: 'programado', publicacionId };
      } catch (e) {
        await sql()`
          UPDATE borradores SET estado = 'aprobado', programado_para = NULL, actualizado_en = now()
          WHERE id = ${id} AND usuario_id = ${uid} AND estado = 'programado'`;
        throw e;
      }
    }
  }
}
