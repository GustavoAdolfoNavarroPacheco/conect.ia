import { sql, iso } from './client';

/**
 * Acceso a datos de Conect.ia sobre Neon (PostgreSQL). Las respuestas usan
 * los mismos nombres de campo que el frontend.
 */

const CANAL_VACIO = { conectado: false, cuentaNombre: null };

/** Columnas de `canales` permitidas (no se pueden parametrizar identificadores). */
const COLUMNA_CANAL: Record<string, string> = {
  linkedin: 'linkedin',
  instagram: 'instagram',
  facebook: 'facebook',
  twitter: 'twitter',
  tiktok: 'tiktok',
  freelancer: 'freelancer',
  fiverr: 'fiverr',
};

/** Redes cuyos tokens OAuth se guardan en `tokens_redes`. */
const COLUMNA_TOKEN: Record<string, string> = { linkedin: 'linkedin', meta: 'meta', tiktok: 'tiktok' };

// ---------------------------------------------------------------- usuarios

export type UsuarioRow = {
  uid: string;
  email: string;
  nombre: string;
  rol: string;
  redesConectadas: Record<string, boolean>;
  creadoEn: string | null;
  actualizadoEn: string | null;
};

function mapUsuario(r: Record<string, any>): UsuarioRow {
  return {
    uid: r.uid,
    email: r.email,
    nombre: r.nombre,
    rol: r.rol,
    redesConectadas: r.redes_conectadas ?? {},
    creadoEn: iso(r.creado_en),
    actualizadoEn: iso(r.actualizado_en),
  };
}

/** Crea o actualiza el perfil y el "motor" de datos del usuario (idempotente). */
export async function asegurarCuenta(uid: string, email: string, nombre: string): Promise<UsuarioRow> {
  const q = sql();
  await q.transaction([
    q`INSERT INTO usuarios (uid, email, nombre, rol, redes_conectadas)
      VALUES (${uid}, ${email}, ${nombre}, 'editor',
              '{"linkedin":false,"instagram":false,"facebook":false,"twitter":false,"tiktok":false}'::jsonb)
      ON CONFLICT (uid) DO UPDATE SET
        email = EXCLUDED.email,
        nombre = COALESCE(NULLIF(usuarios.nombre, ''), EXCLUDED.nombre),
        actualizado_en = now()`,
    q`INSERT INTO canales (usuario_id) VALUES (${uid}) ON CONFLICT (usuario_id) DO NOTHING`,
    q`INSERT INTO configuracion (usuario_id) VALUES (${uid}) ON CONFLICT (usuario_id) DO NOTHING`,
    q`INSERT INTO actividad (usuario_id, tipo, mensaje, red)
      SELECT ${uid}, 'sistema', 'Cuenta lista en Conect.ia. ¡Bienvenido!', 'linkedin'
      WHERE NOT EXISTS (SELECT 1 FROM actividad WHERE usuario_id = ${uid})`,
  ]);
  const rows = await q`SELECT * FROM usuarios WHERE uid = ${uid}`;
  return mapUsuario(rows[0]!);
}

// ------------------------------------------------------------ publicaciones

export type PublicacionRow = {
  id: string;
  titulo: string;
  contenido: string;
  imagenUrl: string | null;
  redesDestino: string[];
  estado: string;
  fechaProgramada: string | null;
  creadoPor: string;
  resultados: Record<string, unknown>;
  n8nExecutionId: string | null;
  creadoEn: string | null;
  actualizadoEn: string | null;
};

function mapPublicacion(r: Record<string, any>): PublicacionRow {
  return {
    id: r.id,
    titulo: r.titulo,
    contenido: r.contenido,
    imagenUrl: r.imagen_url ?? null,
    redesDestino: r.redes_destino ?? [],
    estado: r.estado,
    fechaProgramada: iso(r.fecha_programada),
    creadoPor: r.creado_por,
    resultados: r.resultados ?? {},
    n8nExecutionId: r.n8n_execution_id ?? null,
    creadoEn: iso(r.creado_en),
    actualizadoEn: iso(r.actualizado_en),
  };
}

export async function crearPublicacion(
  uid: string,
  data: {
    titulo: string;
    contenido: string;
    redesDestino: string[];
    estado: string;
    imagenUrl?: string | null;
    fechaProgramada?: string | null;
  }
): Promise<string> {
  const rows = await sql()`
    INSERT INTO publicaciones (titulo, contenido, imagen_url, redes_destino, estado, fecha_programada, creado_por)
    VALUES (${data.titulo}, ${data.contenido}, ${data.imagenUrl ?? null}, ${JSON.stringify(data.redesDestino)}::jsonb,
            ${data.estado}, ${data.fechaProgramada ?? null}::timestamptz, ${uid})
    RETURNING id`;
  return rows[0]!.id as string;
}

/** Actualiza solo los campos presentes en `patch`. Verifica que el dueño sea `uid`. */
export async function actualizarPublicacion(
  id: string,
  uid: string,
  patch: {
    titulo?: string;
    contenido?: string;
    estado?: string;
    imagenUrl?: string | null;
    fechaProgramada?: string | null;
    redesDestino?: string[];
  }
): Promise<boolean> {
  const tieneImagen = patch.imagenUrl !== undefined;
  const tieneFecha = patch.fechaProgramada !== undefined;
  const tieneRedes = patch.redesDestino !== undefined;
  const rows = await sql()`
    UPDATE publicaciones SET
      titulo = COALESCE(${patch.titulo ?? null}, titulo),
      contenido = COALESCE(${patch.contenido ?? null}, contenido),
      estado = COALESCE(${patch.estado ?? null}, estado),
      imagen_url = CASE WHEN ${tieneImagen} THEN ${patch.imagenUrl ?? null} ELSE imagen_url END,
      fecha_programada = CASE WHEN ${tieneFecha} THEN ${patch.fechaProgramada ?? null}::timestamptz ELSE fecha_programada END,
      redes_destino = CASE WHEN ${tieneRedes} THEN ${JSON.stringify(patch.redesDestino ?? [])}::jsonb ELSE redes_destino END,
      actualizado_en = now()
    WHERE id = ${id} AND creado_por = ${uid}
    RETURNING id`;
  return rows.length > 0;
}

/** Estado tras publicar o fallar: guarda resultados por red y limpia la fecha programada. */
export async function marcarPublicacion(
  id: string,
  estado: string,
  resultados: Record<string, unknown>
): Promise<void> {
  await sql()`
    UPDATE publicaciones SET
      estado = ${estado},
      resultados = ${JSON.stringify(resultados)}::jsonb,
      fecha_programada = NULL,
      actualizado_en = now()
    WHERE id = ${id}`;
}

export async function eliminarPublicacion(id: string, uid: string): Promise<boolean> {
  const rows = await sql()`DELETE FROM publicaciones WHERE id = ${id} AND creado_por = ${uid} RETURNING id`;
  return rows.length > 0;
}

export async function obtenerPublicacion(id: string): Promise<PublicacionRow | null> {
  const rows = await sql()`SELECT * FROM publicaciones WHERE id = ${id}`;
  return rows[0] ? mapPublicacion(rows[0]) : null;
}

export async function listarPublicaciones(uid: string, estado?: string): Promise<PublicacionRow[]> {
  const rows = await sql()`
    SELECT * FROM publicaciones
    WHERE creado_por = ${uid} AND (${estado ?? null}::text IS NULL OR estado = ${estado ?? null}::text)
    ORDER BY creado_en DESC
    LIMIT 500`;
  return rows.map(mapPublicacion);
}

export async function publicacionesVencidas(limite = 20): Promise<Array<{ id: string; creadoPor: string }>> {
  const rows = await sql()`
    SELECT id, creado_por FROM publicaciones
    WHERE estado = 'programado' AND fecha_programada <= now()
    ORDER BY fecha_programada ASC
    LIMIT ${limite}`;
  return rows.map((r) => ({ id: r.id as string, creadoPor: r.creado_por as string }));
}

export async function programarPublicacion(
  id: string,
  uid: string,
  fecha: Date,
  redesDestino?: string[]
): Promise<boolean> {
  const tieneRedes = Boolean(redesDestino?.length);
  const rows = await sql()`
    UPDATE publicaciones SET
      estado = 'programado',
      fecha_programada = ${fecha.toISOString()}::timestamptz,
      redes_destino = CASE WHEN ${tieneRedes} THEN ${JSON.stringify(redesDestino ?? [])}::jsonb ELSE redes_destino END,
      actualizado_en = now()
    WHERE id = ${id} AND creado_por = ${uid}
    RETURNING id`;
  return rows.length > 0;
}

// ------------------------------------------------------------------ borradores

export type BorradorRow = {
  id: string;
  usuarioId: string;
  titulo: string;
  contenidoGenerado: string;
  hashtags: string[];
  promptOriginal: string;
  tono: string;
  redSocial: string | null;
  redesDestino: string[];
  imagenUrl: string | null;
  imagenConIa: boolean;
  estado: string;
  n8nExecutionId: string | null;
  programadoPara: string | null;
  creadoEn: string | null;
  actualizadoEn: string | null;
};

function mapBorrador(r: Record<string, any>): BorradorRow {
  return {
    id: r.id,
    usuarioId: r.usuario_id,
    titulo: r.titulo,
    contenidoGenerado: r.contenido_generado,
    hashtags: r.hashtags ?? [],
    promptOriginal: r.prompt_original,
    tono: r.tono,
    redSocial: r.red_social ?? null,
    redesDestino: r.redes_destino ?? [],
    imagenUrl: r.imagen_url ?? null,
    imagenConIa: Boolean(r.imagen_con_ia),
    estado: r.estado,
    n8nExecutionId: r.n8n_execution_id ?? null,
    programadoPara: iso(r.programado_para),
    creadoEn: iso(r.creado_en),
    actualizadoEn: iso(r.actualizado_en),
  };
}

export type BorradorInput = {
  titulo: string;
  contenidoGenerado: string;
  promptOriginal: string;
  tono: string;
  redesDestino: string[];
  /** Red principal o 'multi' (por defecto, la primera de redesDestino). */
  redSocial?: string;
  hashtags?: string[];
  imagenUrl?: string | null;
  imagenConIa?: boolean;
};

export async function crearBorrador(uid: string, data: BorradorInput): Promise<string> {
  const rows = await sql()`
    INSERT INTO borradores (usuario_id, titulo, contenido_generado, hashtags, prompt_original, tono,
                            red_social, redes_destino, imagen_url, imagen_con_ia, estado)
    VALUES (${uid}, ${data.titulo}, ${data.contenidoGenerado}, ${JSON.stringify(data.hashtags ?? [])}::jsonb,
            ${data.promptOriginal}, ${data.tono}, ${data.redSocial ?? data.redesDestino[0] ?? 'linkedin'},
            ${JSON.stringify(data.redesDestino)}::jsonb, ${data.imagenUrl ?? null}, ${data.imagenConIa ?? false},
            'pendiente')
    RETURNING id`;
  return rows[0]!.id as string;
}

export async function actualizarBorrador(id: string, uid: string, data: BorradorInput): Promise<boolean> {
  const rows = await sql()`
    UPDATE borradores SET
      titulo = ${data.titulo},
      contenido_generado = ${data.contenidoGenerado},
      hashtags = ${JSON.stringify(data.hashtags ?? [])}::jsonb,
      prompt_original = ${data.promptOriginal},
      tono = ${data.tono},
      red_social = ${data.redesDestino[0] ?? 'linkedin'},
      redes_destino = ${JSON.stringify(data.redesDestino)}::jsonb,
      imagen_url = ${data.imagenUrl ?? null},
      imagen_con_ia = ${data.imagenConIa ?? false},
      actualizado_en = now()
    WHERE id = ${id} AND usuario_id = ${uid}
    RETURNING id`;
  return rows.length > 0;
}

export async function eliminarBorrador(id: string, uid: string): Promise<boolean> {
  const rows = await sql()`DELETE FROM borradores WHERE id = ${id} AND usuario_id = ${uid} RETURNING id`;
  return rows.length > 0;
}

export async function listarBorradores(uid: string): Promise<BorradorRow[]> {
  const rows = await sql()`SELECT * FROM borradores WHERE usuario_id = ${uid} ORDER BY creado_en DESC LIMIT 500`;
  return rows.map(mapBorrador);
}

// ------------------------------------------------------------------ ejecuciones n8n / Make

export async function registrarEjecucion(
  uid: string,
  payload: unknown,
  borradorId: string | null
): Promise<string> {
  const rows = await sql()`
    INSERT INTO ejecuciones_n8n (usuario_id, borrador_id, payload, estado)
    VALUES (${uid}, ${borradorId}::uuid, ${JSON.stringify(payload ?? {})}::jsonb, 'enviado')
    RETURNING id`;
  return rows[0]!.id as string;
}

// ------------------------------------------------------------------ canales

export type CanalesRow = Record<string, unknown> & { usuarioId: string; actualizadoEn: string | null };

export async function obtenerCanales(uid: string): Promise<CanalesRow | null> {
  const rows = await sql()`SELECT * FROM canales WHERE usuario_id = ${uid}`;
  const r = rows[0];
  if (!r) return null;
  return {
    usuarioId: r.usuario_id,
    linkedin: r.linkedin ?? CANAL_VACIO,
    instagram: r.instagram ?? CANAL_VACIO,
    facebook: r.facebook ?? CANAL_VACIO,
    twitter: r.twitter ?? CANAL_VACIO,
    tiktok: r.tiktok ?? CANAL_VACIO,
    freelancer: r.freelancer ?? undefined,
    fiverr: r.fiverr ?? undefined,
    actualizadoEn: iso(r.actualizado_en),
  };
}

/** Reemplaza el mapa de una red (igual que `setDoc(..., { [red]: patch }, { merge: true })`). */
export async function guardarCanal(uid: string, red: string, patch: Record<string, unknown>): Promise<void> {
  const columna = COLUMNA_CANAL[red];
  if (!columna) throw new Error(`Red de canal no soportada: ${red}`);
  const q = sql();
  await q.query(
    `INSERT INTO canales (usuario_id, ${columna}) VALUES ($1, $2::jsonb)
     ON CONFLICT (usuario_id) DO UPDATE SET ${columna} = EXCLUDED.${columna}, actualizado_en = now()`,
    [uid, JSON.stringify(patch)]
  );
}

// ------------------------------------------------------------------ configuración

export type ConfiguracionRow = {
  usuarioId: string;
  n8nWebhookUrl: string;
  makeWebhookUrl: string;
  notifications: boolean;
  timezone: string;
  actualizadoEn: string | null;
};

export async function obtenerConfiguracion(uid: string): Promise<ConfiguracionRow | null> {
  const rows = await sql()`SELECT * FROM configuracion WHERE usuario_id = ${uid}`;
  const r = rows[0];
  if (!r) return null;
  return {
    usuarioId: r.usuario_id,
    n8nWebhookUrl: r.n8n_webhook_url,
    makeWebhookUrl: r.make_webhook_url,
    notifications: r.notifications,
    timezone: r.timezone,
    actualizadoEn: iso(r.actualizado_en),
  };
}

export async function guardarConfiguracion(
  uid: string,
  data: Partial<{ n8nWebhookUrl: string; makeWebhookUrl: string; notifications: boolean; timezone: string }>
): Promise<void> {
  await sql()`
    INSERT INTO configuracion (usuario_id, n8n_webhook_url, make_webhook_url, notifications, timezone)
    VALUES (${uid}, COALESCE(${data.n8nWebhookUrl ?? null}::text, ''), COALESCE(${data.makeWebhookUrl ?? null}::text, ''),
            COALESCE(${data.notifications ?? null}::boolean, true), COALESCE(${data.timezone ?? null}::text, 'America/Bogota'))
    ON CONFLICT (usuario_id) DO UPDATE SET
      n8n_webhook_url = COALESCE(${data.n8nWebhookUrl ?? null}::text, configuracion.n8n_webhook_url),
      make_webhook_url = COALESCE(${data.makeWebhookUrl ?? null}::text, configuracion.make_webhook_url),
      notifications = COALESCE(${data.notifications ?? null}::boolean, configuracion.notifications),
      timezone = COALESCE(${data.timezone ?? null}::text, configuracion.timezone),
      actualizado_en = now()`;
}

// ------------------------------------------------------------------ actividad

export async function registrarActividad(uid: string, tipo: string, mensaje: string, red: string | null): Promise<void> {
  await sql()`INSERT INTO actividad (usuario_id, tipo, mensaje, red) VALUES (${uid}, ${tipo}, ${mensaje}, ${red})`;
}

export async function listarActividad(uid: string): Promise<Array<Record<string, unknown>>> {
  const rows = await sql()`
    SELECT id, usuario_id, tipo, mensaje, red, creado_en FROM actividad
    WHERE usuario_id = ${uid} ORDER BY creado_en DESC LIMIT 100`;
  return rows.map((r) => ({
    id: r.id,
    usuarioId: r.usuario_id,
    tipo: r.tipo,
    mensaje: r.mensaje,
    red: r.red,
    creadoEn: iso(r.creado_en),
  }));
}

// ------------------------------------------------------------------ chat

export type ChatRow = {
  role: string;
  content: string;
  accionSugerida?: string | null;
  temaSugerido?: string | null;
  tonoSugerido?: string | null;
};

export async function guardarMensajesChat(uid: string, mensajes: ChatRow[]): Promise<void> {
  const q = sql();
  await q.transaction(
    mensajes.map(
      (m) => q`INSERT INTO chat_mensajes (usuario_id, role, content, accion_sugerida, tema_sugerido, tono_sugerido)
               VALUES (${uid}, ${m.role}, ${m.content}, ${m.accionSugerida ?? null}, ${m.temaSugerido ?? null}, ${m.tonoSugerido ?? null})`
    )
  );
}

export async function listarMensajesChat(uid: string): Promise<Array<Record<string, unknown>>> {
  const rows = await sql()`
    SELECT id, role, content, accion_sugerida, tema_sugerido, tono_sugerido, creado_en
    FROM chat_mensajes WHERE usuario_id = ${uid} ORDER BY id ASC LIMIT 500`;
  return rows.map((r, i) => ({
    id: String(r.id),
    role: r.role,
    content: r.content,
    accionSugerida: r.accion_sugerida ?? null,
    temaSugerido: r.tema_sugerido ?? null,
    tonoSugerido: r.tono_sugerido ?? null,
    creadoEn: iso(r.creado_en),
    orden: i,
  }));
}

// ------------------------------------------------------------------ tokens OAuth y estados pendientes

export async function obtenerTokens(uid: string): Promise<Record<string, any>> {
  const rows = await sql()`SELECT linkedin, meta, tiktok FROM tokens_redes WHERE usuario_id = ${uid}`;
  return rows[0] ?? {};
}

export async function guardarTokenRed(uid: string, red: string, valor: unknown): Promise<void> {
  const columna = COLUMNA_TOKEN[red];
  if (!columna) throw new Error(`Token de red no soportado: ${red}`);
  const q = sql();
  await q.query(
    `INSERT INTO tokens_redes (usuario_id, ${columna}) VALUES ($1, $2::jsonb)
     ON CONFLICT (usuario_id) DO UPDATE SET ${columna} = EXCLUDED.${columna}, actualizado_en = now()`,
    [uid, JSON.stringify(valor)]
  );
}

export async function guardarPendienteOAuth(p: {
  state: string;
  uid: string;
  red: string;
  provider?: string | null;
  redirectUri: string;
  codeVerifier?: string | null;
}): Promise<void> {
  await sql()`
    INSERT INTO oauth_pendientes (state, usuario_id, red, provider, redirect_uri, code_verifier)
    VALUES (${p.state}, ${p.uid}, ${p.red}, ${p.provider ?? null}, ${p.redirectUri}, ${p.codeVerifier ?? null})`;
}

export async function obtenerPendienteOAuth(
  state: string
): Promise<{ uid: string; red: string; provider: string | null; redirectUri: string; codeVerifier: string | null } | null> {
  const rows = await sql()`SELECT * FROM oauth_pendientes WHERE state = ${state}`;
  const r = rows[0];
  if (!r) return null;
  return {
    uid: r.usuario_id,
    red: r.red,
    provider: r.provider ?? null,
    redirectUri: r.redirect_uri,
    codeVerifier: r.code_verifier ?? null,
  };
}

export async function borrarPendienteOAuth(state: string): Promise<void> {
  await sql()`DELETE FROM oauth_pendientes WHERE state = ${state}`;
}

// ------------------------------------------------------------------ cuentas con correo y contraseña

/** true si ya existe cualquier cuenta con ese correo (con contraseña o de Google). */
export async function existeCorreo(email: string): Promise<boolean> {
  const rows = await sql()`SELECT 1 FROM usuarios WHERE lower(email) = lower(${email}) LIMIT 1`;
  return rows.length > 0;
}

/** Cuenta con contraseña para iniciar sesión por correo. Las cuentas de Google no tienen contraseña. */
export async function buscarCuentaCorreo(
  email: string
): Promise<{ uid: string; email: string; nombre: string; passwordHash: string } | null> {
  const rows = await sql()`
    SELECT uid, email, nombre, password_hash FROM usuarios
    WHERE lower(email) = lower(${email}) AND password_hash IS NOT NULL
    LIMIT 1`;
  const r = rows[0];
  if (!r) return null;
  return { uid: r.uid, email: r.email, nombre: r.nombre, passwordHash: r.password_hash };
}

/** Crea la cuenta con contraseña y, después, su motor de datos (canales, configuración, actividad). */
export async function crearCuentaCorreo(
  uid: string,
  email: string,
  nombre: string,
  passwordHash: string
): Promise<void> {
  await sql()`
    INSERT INTO usuarios (uid, email, nombre, password_hash)
    VALUES (${uid}, ${email}, ${nombre}, ${passwordHash})`;
  await asegurarCuenta(uid, email, nombre);
}
