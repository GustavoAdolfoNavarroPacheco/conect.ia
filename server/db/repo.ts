import { sql, iso } from './client';
import { cifrarValor, descifrarValor } from './cifradoTokens';

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

/** Estado tras publicar o fallar: guarda resultados por red. Conserva la fecha programada. */
export async function marcarPublicacion(
  id: string,
  estado: string,
  resultados: Record<string, unknown>
): Promise<void> {
  await sql()`
    UPDATE publicaciones SET
      estado = ${estado},
      resultados = ${JSON.stringify(resultados)}::jsonb,
      publicado_en = CASE WHEN ${estado} = 'publicado' THEN now() ELSE publicado_en END,
      actualizado_en = now()
    WHERE id = ${id}`;
}

/**
 * Reclamo atómico antes de enviar: solo una ejecución consigue pasar la publicación a 'en_proceso'.
 * Si otra ya la tiene (cron, pestaña abierta, reintento), devuelve false y no se envía de nuevo.
 */
export async function reclamarPublicacion(id: string): Promise<boolean> {
  const rows = await sql()`
    UPDATE publicaciones SET
      estado = 'en_proceso',
      intentos = intentos + 1,
      actualizado_en = now()
    WHERE id = ${id}
      AND estado IN ('pendiente', 'programado', 'fallido')
      AND intentos < 5
    RETURNING id`;
  return rows.length > 0;
}

/**
 * Publicaciones 'en_proceso' sin actividad durante 15 minutos: la función se cortó a mitad de envío.
 * No se reenvían solas (la red pudo recibirlas): pasan a 'fallido' con un aviso para revisarlas.
 */
export async function marcarEnviosInterrumpidos(): Promise<number> {
  const rows = await sql()`
    UPDATE publicaciones SET
      estado = 'fallido',
      ultimo_error = 'Envío interrumpido. Revisa la red antes de reintentar para no duplicar la publicación.',
      actualizado_en = now()
    WHERE estado = 'en_proceso' AND actualizado_en < now() - interval '15 minutes'
    RETURNING id`;
  return rows.length;
}

/**
 * Guarda el resultado de una red en cuanto llega, sin esperar al resto. Si la función se corta,
 * el id externo ya queda registrado y no se pierde.
 */
export async function registrarResultadoRed(id: string, red: string, resultado: unknown): Promise<void> {
  await sql()`
    UPDATE publicaciones SET
      resultados = COALESCE(resultados, '{}'::jsonb) || jsonb_build_object(${red}::text, ${JSON.stringify(resultado)}::jsonb),
      actualizado_en = now()
    WHERE id = ${id}`;
}

/** Registra el motivo de un fallo y deja la publicación en 'fallido' (con su fecha, para reintentar). */
export async function registrarFalloPublicacion(id: string, error: string): Promise<void> {
  await sql()`
    UPDATE publicaciones SET
      estado = 'fallido',
      ultimo_error = ${error.slice(0, 500)},
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

/**
 * Programadas cuya hora ya llegó. Con `uid`, solo las de esa cuenta.
 * El filtro va en SQL para que el límite no se consuma con las publicaciones de otros usuarios.
 */
export async function publicacionesVencidas(
  limite = 20,
  uid?: string
): Promise<Array<{ id: string; creadoPor: string }>> {
  const rows = await sql()`
    SELECT id, creado_por FROM publicaciones
    WHERE estado = 'programado' AND fecha_programada <= now()
      AND (${uid ?? null}::text IS NULL OR creado_por = ${uid ?? null}::text)
    ORDER BY fecha_programada ASC NULLS FIRST
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

/**
 * Deja el canal como desconectado con el motivo, sin tocar sus datos de cuenta. Lo usa la
 * publicación cuando la red rechaza el token, para que Canales pida reconectar.
 */
export async function marcarCanalDesconectado(uid: string, red: string, motivo: string): Promise<void> {
  const canales = await obtenerCanales(uid);
  const actual = (canales?.[red] as Record<string, unknown> | undefined) ?? {};
  await guardarCanal(uid, red, {
    ...actual,
    conectado: false,
    motivo,
    desconectadoEn: new Date().toISOString(),
  });
}

/**
 * Bloqueo por clave (p. ej. `tiktok:<uid>`) para que dos ejecuciones no renueven el mismo token
 * a la vez. Devuelve false si otra ejecución lo tiene y no ha caducado todavía.
 */
export async function adquirirBloqueo(clave: string, segundos: number): Promise<boolean> {
  const rows = await sql()`
    INSERT INTO bloqueos (clave, hasta)
    VALUES (${clave}, now() + (${segundos}::int * interval '1 second'))
    ON CONFLICT (clave) DO UPDATE SET hasta = EXCLUDED.hasta
      WHERE bloqueos.hasta < now()
    RETURNING clave`;
  return rows.length > 0;
}

export async function liberarBloqueo(clave: string): Promise<void> {
  await sql()`DELETE FROM bloqueos WHERE clave = ${clave}`;
}

/**
 * Borra filas temporales que ya no sirven: estados OAuth de más de 15 min, bloqueos vencidos,
 * intentos de acceso de hace más de un día y cuotas de IA de más de 30 días.
 */
export async function limpiarDatosTemporales(): Promise<void> {
  await sql()`DELETE FROM oauth_pendientes WHERE creado_en < now() - interval '15 minutes'`;
  await sql()`DELETE FROM bloqueos WHERE hasta < now()`;
  await sql()`DELETE FROM intentos_acceso WHERE ventana_inicio < now() - interval '1 day'`;
  await sql()`DELETE FROM uso_ia WHERE dia < current_date - 30`;
}

/**
 * Descuenta `unidades` de la cuota diaria del usuario y del tope global de ese tipo.
 * Devuelve false, sin descontar nada, si cualquiera de los dos límites se superaría.
 */
export async function consumirCuotaIA(
  uid: string,
  tipo: string,
  unidades: number,
  porUsuario: number,
  global: number
): Promise<boolean> {
  if (unidades > porUsuario) return false;
  const totales = await sql()`
    SELECT COALESCE(SUM(unidades), 0)::int AS total FROM uso_ia
    WHERE dia = current_date AND tipo = ${tipo}`;
  if (Number(totales[0]?.total ?? 0) + unidades > global) return false;

  const rows = await sql()`
    INSERT INTO uso_ia (usuario_id, dia, tipo, unidades)
    VALUES (${uid}, current_date, ${tipo}, ${unidades}::int)
    ON CONFLICT (usuario_id, dia, tipo) DO UPDATE SET unidades = uso_ia.unidades + EXCLUDED.unidades
      WHERE uso_ia.unidades + EXCLUDED.unidades <= ${porUsuario}::int
    RETURNING unidades`;
  return rows.length > 0;
}

/**
 * Cuenta un intento de acceso en una ventana fija. Devuelve false cuando ya se superó el máximo
 * dentro de la ventana. Se usa por correo y por IP en el inicio de sesión y el registro.
 */
export async function registrarIntentoAcceso(clave: string, maximo: number, ventanaSegundos: number): Promise<boolean> {
  const rows = await sql()`
    INSERT INTO intentos_acceso (clave, ventana_inicio, intentos)
    VALUES (${clave}, now(), 1)
    ON CONFLICT (clave) DO UPDATE SET
      ventana_inicio = CASE
        WHEN intentos_acceso.ventana_inicio < now() - (${ventanaSegundos}::int * interval '1 second') THEN now()
        ELSE intentos_acceso.ventana_inicio END,
      intentos = CASE
        WHEN intentos_acceso.ventana_inicio < now() - (${ventanaSegundos}::int * interval '1 second') THEN 1
        ELSE intentos_acceso.intentos + 1 END
    RETURNING intentos`;
  return Number(rows[0]?.intentos ?? 0) <= maximo;
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
  // Se toman los 500 más recientes (no los 500 primeros) y se devuelven en orden cronológico.
  const rows = (await sql()`
    SELECT id, role, content, accion_sugerida, tema_sugerido, tono_sugerido, creado_en
    FROM chat_mensajes WHERE usuario_id = ${uid} ORDER BY id DESC LIMIT 500`).reverse();
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
  const fila = rows[0];
  if (!fila) return {};
  return {
    linkedin: await descifrarValor(fila.linkedin),
    meta: await descifrarValor(fila.meta),
    tiktok: await descifrarValor(fila.tiktok),
  };
}

export async function guardarTokenRed(uid: string, red: string, valor: unknown): Promise<void> {
  const columna = COLUMNA_TOKEN[red];
  if (!columna) throw new Error(`Token de red no soportado: ${red}`);
  const q = sql();
  await q.query(
    `INSERT INTO tokens_redes (usuario_id, ${columna}) VALUES ($1, $2::jsonb)
     ON CONFLICT (usuario_id) DO UPDATE SET ${columna} = EXCLUDED.${columna}, actualizado_en = now()`,
    [uid, JSON.stringify(await cifrarValor(valor))]
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
