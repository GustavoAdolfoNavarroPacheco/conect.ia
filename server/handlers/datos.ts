import { onCall, HttpsError } from '../platform/callable';
import { obtenerTokens } from '../db/repo';
import { enriquecerCanales } from '../integracion/estadoConexion';
import { urlMediaPermitida } from '../integracion/urlsMedia';

/** Límites de texto y de redes que acepta una publicación. */
const MAX_TITULO = 200;
const MAX_CONTENIDO = 10_000;
const MAX_REDES = 12;

/** Valida lo que llega del navegador antes de guardarlo. Lanza un error claro si algo no cumple. */
function validarPublicacion(p: {
  titulo?: unknown;
  contenido?: unknown;
  redesDestino?: unknown;
  imagenUrl?: unknown;
}): void {
  if (typeof p.titulo === 'string' && p.titulo.length > MAX_TITULO) {
    throw new HttpsError('invalid-argument', `El título es demasiado largo (máximo ${MAX_TITULO} caracteres).`);
  }
  if (typeof p.contenido === 'string' && p.contenido.length > MAX_CONTENIDO) {
    throw new HttpsError('invalid-argument', `El texto es demasiado largo (máximo ${MAX_CONTENIDO} caracteres).`);
  }
  if (p.redesDestino !== undefined) {
    const redes = p.redesDestino;
    const valida =
      Array.isArray(redes) &&
      redes.length <= MAX_REDES &&
      redes.every((r) => typeof r === 'string' && /^[a-z]{2,20}$/.test(r));
    if (!valida) throw new HttpsError('invalid-argument', 'Lista de redes no válida.');
  }
  if (p.imagenUrl !== undefined && p.imagenUrl !== null && !urlMediaPermitida(String(p.imagenUrl))) {
    throw new HttpsError(
      'invalid-argument',
      'El medio debe estar en el almacén de la app o venir de un generador de IA por https.'
    );
  }
}

/** Redes que se conectan por OAuth: su estado lo escribe el servidor, no el navegador. */
const REDES_OAUTH = ['linkedin', 'instagram', 'facebook', 'tiktok'];
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
  const estado = requireString(d.estado, 'estado');
  // El usuario solo puede crear borradores, pendientes o programadas; el envío lo fija el servidor.
  if (!['borrador', 'pendiente', 'programado'].includes(estado)) {
    throw new HttpsError('invalid-argument', 'Estado no permitido al crear una publicación.');
  }
  validarPublicacion(d);
  const id = await crearPublicacion(uid, {
    titulo: String(d.titulo ?? ''),
    contenido: String(d.contenido ?? ''),
    redesDestino: Array.isArray(d.redesDestino) ? d.redesDestino.map(String) : [],
    estado,
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
  validarPublicacion(p);
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
  const canales = await obtenerCanales(uid);
  if (!canales) return null;
  // El estado de cada conexión sale de sus tokens: un token caducado aparece como desconectado.
  return enriquecerCanales(canales, await obtenerTokens(uid));
});

export const guardarCanalDatos = onCall({ region: 'us-central1' }, async (request) => {
  const uid = requireUid(request);
  const red = requireString(request.data?.red, 'red');
  const patch = request.data?.patch;
  if (!patch || typeof patch !== 'object') {
    throw new HttpsError('invalid-argument', 'patch es obligatorio');
  }
  const p = patch as Record<string, unknown>;

  if (REDES_OAUTH.includes(red)) {
    // Las redes OAuth solo se pueden desconectar desde el navegador. Conectarlas exige su inicio de sesión.
    if (p.conectado === true) {
      throw new HttpsError('permission-denied', 'Conecta esta red desde Canales con su inicio de sesión.');
    }
    await guardarCanal(uid, red, { conectado: false, cuentaNombre: null });
    return { ok: true };
  }

  // Canal manual: solo se guardan estos dos campos, con límite de longitud.
  const conectado = p.conectado === true;
  const cuentaNombre = conectado && typeof p.cuentaNombre === 'string' ? p.cuentaNombre.trim().slice(0, 120) : null;
  await guardarCanal(uid, red, { conectado, cuentaNombre });
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
