import { onCall, HttpsError } from '../platform/callable';
import {
  actualizarBorrador,
  actualizarPublicacion,
  asegurarCuenta,
  crearBorrador,
  crearPublicacion,
  eliminarBorrador,
  eliminarPublicacion,
  guardarCanal,
  guardarConfiguracion,
  listarActividad,
  listarBorradores,
  listarMensajesChat,
  listarPublicaciones,
  obtenerCanales,
  obtenerConfiguracion,
  registrarActividad,
} from '../db/repo';

/**
 * Operaciones de datos sobre Neon, invocadas desde el navegador vía /api/fn.
 * Todas exigen sesión; las de escritura comprueban que el registro sea del usuario.
 */

function requireUid(request: { auth?: { uid: string } }): string {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'Debes iniciar sesión');
  }
  return request.auth.uid;
}

function requireString(value: unknown, campo: string): string {
  if (typeof value !== 'string' || !value.trim()) {
    throw new HttpsError('invalid-argument', `${campo} es obligatorio`);
  }
  return value.trim();
}

function optionalIso(value: unknown, campo: string): string | null | undefined {
  if (value === undefined) return undefined;
  if (value === null || value === '') return null;
  const fecha = new Date(String(value));
  if (Number.isNaN(fecha.getTime())) {
    throw new HttpsError('invalid-argument', `${campo} no es una fecha válida`);
  }
  return fecha.toISOString();
}

export const inicializarCuenta = onCall({ region: 'us-central1' }, async (request) => {
  const uid = requireUid(request);
  const { email, nombre } = request.auth!;
  return asegurarCuenta(uid, email, nombre);
});

export const listarPublicacionesDatos = onCall({ region: 'us-central1' }, async (request) => {
  const uid = requireUid(request);
  const estado = typeof request.data?.estado === 'string' ? request.data.estado : undefined;
  return listarPublicaciones(uid, estado);
});

export const crearPublicacionDatos = onCall({ region: 'us-central1' }, async (request) => {
  const uid = requireUid(request);
  const d = request.data ?? {};
  const id = await crearPublicacion(uid, {
    titulo: String(d.titulo ?? ''),
    contenido: String(d.contenido ?? ''),
    redesDestino: Array.isArray(d.redesDestino) ? d.redesDestino.map(String) : [],
    estado: requireString(d.estado, 'estado'),
    imagenUrl: typeof d.imagenUrl === 'string' ? d.imagenUrl : null,
    fechaProgramada: optionalIso(d.fechaProgramada, 'fechaProgramada') ?? null,
  });
  return { id };
});

export const actualizarPublicacionDatos = onCall({ region: 'us-central1' }, async (request) => {
  const uid = requireUid(request);
  const postId = requireString(request.data?.postId, 'postId');
  const p = request.data?.patch ?? {};
  // El estado de envío (publicado, parcial, enviado, fallido) lo fija el servidor, nunca el cliente.
  if (typeof p.estado === 'string' && !['borrador', 'pendiente', 'programado'].includes(p.estado)) {
    throw new HttpsError('invalid-argument', 'El estado de envío lo actualiza el servidor.');
  }
  const ok = await actualizarPublicacion(postId, uid, {
    titulo: typeof p.titulo === 'string' ? p.titulo : undefined,
    contenido: typeof p.contenido === 'string' ? p.contenido : undefined,
    estado: typeof p.estado === 'string' ? p.estado : undefined,
    imagenUrl: p.imagenUrl === undefined ? undefined : (p.imagenUrl as string | null),
    fechaProgramada: optionalIso(p.fechaProgramada, 'fechaProgramada'),
    redesDestino: Array.isArray(p.redesDestino) ? p.redesDestino.map(String) : undefined,
  });
  if (!ok) throw new HttpsError('not-found', 'Publicación no encontrada');
  return { ok: true };
});

export const eliminarPublicacionDatos = onCall({ region: 'us-central1' }, async (request) => {
  const uid = requireUid(request);
  const postId = requireString(request.data?.postId, 'postId');
  const ok = await eliminarPublicacion(postId, uid);
  if (!ok) throw new HttpsError('not-found', 'Publicación no encontrada');
  return { ok: true };
});

export const listarBorradoresDatos = onCall({ region: 'us-central1' }, async (request) => {
  const uid = requireUid(request);
  return listarBorradores(uid);
});

export const crearBorradorDatos = onCall({ region: 'us-central1' }, async (request) => {
  const uid = requireUid(request);
  const d = request.data ?? {};
  const id = await crearBorrador(uid, {
    titulo: String(d.titulo ?? ''),
    contenidoGenerado: String(d.contenidoGenerado ?? ''),
    promptOriginal: String(d.promptOriginal ?? ''),
    tono: String(d.tono ?? ''),
    redesDestino: Array.isArray(d.redesDestino) ? d.redesDestino.map(String) : [],
    hashtags: Array.isArray(d.hashtags) ? d.hashtags.map(String) : [],
    imagenUrl: typeof d.imagenUrl === 'string' ? d.imagenUrl : null,
    imagenConIa: Boolean(d.imagenConIa),
  });
  return { id };
});

export const actualizarBorradorDatos = onCall({ region: 'us-central1' }, async (request) => {
  const uid = requireUid(request);
  const draftId = requireString(request.data?.draftId, 'draftId');
  const d = request.data ?? {};
  const ok = await actualizarBorrador(draftId, uid, {
    titulo: String(d.titulo ?? ''),
    contenidoGenerado: String(d.contenidoGenerado ?? ''),
    promptOriginal: String(d.promptOriginal ?? ''),
    tono: String(d.tono ?? ''),
    redesDestino: Array.isArray(d.redesDestino) ? d.redesDestino.map(String) : [],
    hashtags: Array.isArray(d.hashtags) ? d.hashtags.map(String) : [],
    imagenUrl: typeof d.imagenUrl === 'string' ? d.imagenUrl : null,
    imagenConIa: Boolean(d.imagenConIa),
  });
  if (!ok) throw new HttpsError('not-found', 'Borrador no encontrado');
  return { ok: true };
});

export const eliminarBorradorDatos = onCall({ region: 'us-central1' }, async (request) => {
  const uid = requireUid(request);
  const draftId = requireString(request.data?.draftId, 'draftId');
  const ok = await eliminarBorrador(draftId, uid);
  if (!ok) throw new HttpsError('not-found', 'Borrador no encontrado');
  return { ok: true };
});

export const obtenerCanalesDatos = onCall({ region: 'us-central1' }, async (request) => {
  const uid = requireUid(request);
  return obtenerCanales(uid);
});

export const guardarCanalDatos = onCall({ region: 'us-central1' }, async (request) => {
  const uid = requireUid(request);
  const red = requireString(request.data?.red, 'red');
  const patch = request.data?.patch;
  if (!patch || typeof patch !== 'object') {
    throw new HttpsError('invalid-argument', 'patch es obligatorio');
  }
  await guardarCanal(uid, red, patch as Record<string, unknown>);
  return { ok: true };
});

export const obtenerConfiguracionDatos = onCall({ region: 'us-central1' }, async (request) => {
  const uid = requireUid(request);
  return obtenerConfiguracion(uid);
});

export const guardarConfiguracionDatos = onCall({ region: 'us-central1' }, async (request) => {
  const uid = requireUid(request);
  const d = request.data?.data ?? {};
  await guardarConfiguracion(uid, {
    n8nWebhookUrl: typeof d.n8nWebhookUrl === 'string' ? d.n8nWebhookUrl : undefined,
    makeWebhookUrl: typeof d.makeWebhookUrl === 'string' ? d.makeWebhookUrl : undefined,
    notifications: typeof d.notifications === 'boolean' ? d.notifications : undefined,
    timezone: typeof d.timezone === 'string' ? d.timezone : undefined,
  });
  return { ok: true };
});

export const registrarActividadDatos = onCall({ region: 'us-central1' }, async (request) => {
  const uid = requireUid(request);
  const tipo = requireString(request.data?.tipo, 'tipo');
  const mensaje = requireString(request.data?.mensaje, 'mensaje');
  const red = typeof request.data?.red === 'string' ? request.data.red : null;
  await registrarActividad(uid, tipo, mensaje, red);
  return { ok: true };
});

export const listarActividadDatos = onCall({ region: 'us-central1' }, async (request) => {
  const uid = requireUid(request);
  return listarActividad(uid);
});

export const listarMensajesChatDatos = onCall({ region: 'us-central1' }, async (request) => {
  const uid = requireUid(request);
  return listarMensajesChat(uid);
});
