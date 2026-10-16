import { sql } from '../db/client';
import { obtenerTokens } from '../db/repo';
import { META_GRAPH_VERSION } from '../integracion/metaOAuthConfig';

/** Ventana de análisis, en días. */
export const DIAS_ANALITICA = 30;
/** Publicaciones medidas mínimas para mostrar la mejor hora propia. Por debajo no se inventa nada. */
export const MINIMO_PARA_MEJOR_HORA = 10;

/** Tiempo mínimo entre dos actualizaciones de la misma cuenta, para no gastar cuota de Meta. */
const ESPERA_MS = 30 * 60 * 1000;
const MAX_PUBLICACIONES = 30;
const LOTE = 6;
const TIMEOUT_MS = 15_000;

/**
 * Redes que se miden hoy. LinkedIn y TikTok necesitan permisos de analítica
 * que esta app no tiene; se muestran como "requiere permiso" y no se consultan.
 */
export type RedMedida = 'facebook' | 'instagram';

const ZONA = 'America/Bogota';
/** Bandas horarias de la mejor hora (hora local de Bogotá). */
const BANDAS = [
  { desde: 7, hasta: 10, etiqueta: '07–10' },
  { desde: 10, hasta: 13, etiqueta: '10–13' },
  { desde: 13, hasta: 17, etiqueta: '13–17' },
  { desde: 17, hasta: 21, etiqueta: '17–21' },
];
const INDICE_DIA: Record<string, number> = { Mon: 0, Tue: 1, Wed: 2, Thu: 3, Fri: 4, Sat: 5, Sun: 6 };

type PaginaMeta = { id: string; accessToken: string; igId?: string | null };
type Medida = { alcance: number | null; interacciones: number; aviso?: string };

function esRedMedida(red: unknown): red is RedMedida {
  return red === 'facebook' || red === 'instagram';
}

/** Lectura a Graph con el token en la cabecera (nunca en la URL). */
async function leerGraph(url: string, accessToken: string): Promise<any> {
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}` },
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
  const texto = await res.text();
  if (!res.ok) {
    let detalle = texto.slice(0, 200);
    try {
      detalle = (JSON.parse(texto) as { error?: { message?: string } }).error?.message ?? detalle;
    } catch {
      // Respuesta que no es JSON: se queda el texto.
    }
    throw new Error(`${res.status}: ${detalle}`);
  }
  return JSON.parse(texto);
}

/** Valor de un insight de Graph. Si Meta no lo entrega, queda sin dato. */
async function insight(url: string, accessToken: string): Promise<number | null> {
  const datos = await leerGraph(url, accessToken);
  const valor = datos?.data?.[0]?.values?.[0]?.value;
  return typeof valor === 'number' ? valor : null;
}

async function medirFacebook(postId: string, accessToken: string): Promise<Medida> {
  const base = `https://graph.facebook.com/${META_GRAPH_VERSION}/${encodeURIComponent(postId)}`;
  const datos = await leerGraph(`${base}?fields=likes.summary(true),comments.summary(true),shares`, accessToken);
  const interacciones =
    (datos.likes?.summary?.total_count ?? 0) + (datos.comments?.summary?.total_count ?? 0) + (datos.shares?.count ?? 0);
  try {
    return { alcance: await insight(`${base}/insights?metric=post_impressions_unique`, accessToken), interacciones };
  } catch {
    return { alcance: null, interacciones, aviso: 'Meta no devolvió el alcance de la publicación.' };
  }
}

async function medirInstagram(mediaId: string, accessToken: string): Promise<Medida> {
  const base = `https://graph.facebook.com/${META_GRAPH_VERSION}/${encodeURIComponent(mediaId)}`;
  const datos = await leerGraph(`${base}?fields=like_count,comments_count`, accessToken);
  const interacciones = (datos.like_count ?? 0) + (datos.comments_count ?? 0);
  try {
    return { alcance: await insight(`${base}/insights?metric=reach`, accessToken), interacciones };
  } catch {
    return { alcance: null, interacciones, aviso: 'Instagram no devolvió el alcance de la publicación.' };
  }
}

/** Página de la publicación: en Facebook, la que aparece en el id; en Instagram, la que tiene cuenta vinculada. */
function paginaPara(red: RedMedida, postId: string, paginas: PaginaMeta[]): PaginaMeta | undefined {
  if (red === 'facebook') return paginas.find((p) => postId.startsWith(`${p.id}_`)) ?? paginas[0];
  return paginas.find((p) => p.igId);
}

async function medirRed(red: RedMedida, postId: string, paginas: PaginaMeta[]): Promise<Medida> {
  const pagina = paginaPara(red, postId, paginas);
  if (!pagina) throw new Error('Sin conexión de Meta. Reconecta la red en Canales.');
  return red === 'facebook'
    ? medirFacebook(postId, pagina.accessToken)
    : medirInstagram(postId, pagina.accessToken);
}

async function guardarMedida(publicacionId: string, uid: string, red: RedMedida, medida: Medida): Promise<void> {
  await sql()`
    INSERT INTO metricas_publicacion (publicacion_id, usuario_id, red, dia, alcance, interacciones, medido_en)
    VALUES (${publicacionId}, ${uid}, ${red}, CURRENT_DATE, ${medida.alcance}, ${medida.interacciones}, now())
    ON CONFLICT (publicacion_id, red, dia)
    DO UPDATE SET alcance = EXCLUDED.alcance, interacciones = EXCLUDED.interacciones, medido_en = now()`;
}

export type ActualizacionMetricas = {
  actualizado: boolean;
  /** Presente cuando no se consultó nada porque la cuenta se actualizó hace poco. */
  motivo?: 'reciente';
  medidas: number;
  avisos: string[];
  medidoEn: string | null;
};

/** Mide las publicaciones recientes en Facebook e Instagram y guarda una fila por día. */
export async function actualizarMetricasUsuario(uid: string): Promise<ActualizacionMetricas> {
  const [ultimaFila] = await sql()`SELECT MAX(medido_en) AS ultima FROM metricas_publicacion WHERE usuario_id = ${uid}`;
  const ultima = ultimaFila?.ultima ? new Date(ultimaFila.ultima) : null;
  if (ultima && Date.now() - ultima.getTime() < ESPERA_MS) {
    return { actualizado: false, motivo: 'reciente', medidas: 0, avisos: [], medidoEn: ultima.toISOString() };
  }

  const publicaciones = await sql()`
    SELECT id, resultados FROM publicaciones
    WHERE creado_por = ${uid} AND estado IN ('publicado', 'parcial')
      AND COALESCE(publicado_en, creado_en) >= now() - make_interval(days => ${DIAS_ANALITICA}::int)
    ORDER BY COALESCE(publicado_en, creado_en) DESC
    LIMIT ${MAX_PUBLICACIONES}`;

  const tokens = await obtenerTokens(uid);
  const paginas: PaginaMeta[] = tokens.meta?.pages ?? [];
  const avisos: string[] = [];
  let medidas = 0;

  const medirPublicacion = async (post: Record<string, any>) => {
    const resultados = (post.resultados ?? {}) as Record<string, { success?: boolean; postId?: string }>;
    const redes = (['facebook', 'instagram'] as const).filter((red) => resultados[red]?.success && resultados[red]?.postId);
    await Promise.all(
      redes.map(async (red) => {
        try {
          const medida = await medirRed(red, resultados[red].postId as string, paginas);
          await guardarMedida(post.id, uid, red, medida);
          medidas++;
          if (medida.aviso) avisos.push(`${red}: ${medida.aviso}`);
        } catch (e) {
          avisos.push(`${red}: ${e instanceof Error ? e.message : 'no se pudo medir'}`);
        }
      })
    );
  };

  for (let i = 0; i < publicaciones.length; i += LOTE) {
    await Promise.all(publicaciones.slice(i, i + LOTE).map(medirPublicacion));
  }

  return { actualizado: true, medidas, avisos, medidoEn: new Date().toISOString() };
}

export type ResumenAnalitica = {
  dias: number;
  publicaciones: { total: number; publicadas: number; fallidas: number };
  kpis: { alcance: number | null; interacciones: number; tasa: number | null; publicacionesMedidas: number };
  /** Alcance medido cada día, por red (suma de las publicaciones medidas ese día). */
  serie: { dia: string; facebook: number | null; instagram: number | null }[];
  /** Interacciones de la última medición de cada publicación; `null` si la red no tiene datos. */
  interaccionesPorRed: Record<RedMedida, number | null>;
  /** Redes publicadas en la ventana que no tienen analítica en esta app. */
  redesSinAnalitica: string[];
  mejorHora: {
    suficiente: boolean;
    minimo: number;
    medidas: number;
    celdas: { dia: number; banda: number; promedio: number; muestras: number }[];
  };
  mejores: { id: string; titulo: string; fecha: string | null; redes: RedMedida[]; alcance: number | null; interacciones: number }[];
  ultimaMedicion: string | null;
};

/** Día de la semana (0 = lunes) y banda horaria de una fecha, en hora de Bogotá. Fuera de bandas → null. */
function celdaDeFecha(fecha: Date): { dia: number; banda: number } | null {
  const partes = new Intl.DateTimeFormat('en-US', {
    timeZone: ZONA,
    weekday: 'short',
    hour: 'numeric',
    hourCycle: 'h23',
  }).formatToParts(fecha);
  const dia = INDICE_DIA[partes.find((p) => p.type === 'weekday')?.value ?? ''];
  const hora = Number(partes.find((p) => p.type === 'hour')?.value);
  const banda = BANDAS.findIndex((b) => hora >= b.desde && hora < b.hasta);
  if (dia === undefined || banda < 0) return null;
  return { dia, banda };
}

/** Panel de Analítica: KPI, serie diaria, interacciones por red, mejor hora propia y mejores publicaciones. */
export async function construirResumenAnalitica(uid: string): Promise<ResumenAnalitica> {
  const [posts, filas] = await Promise.all([
    sql()`
      SELECT id, titulo, estado, redes_destino, COALESCE(publicado_en, creado_en) AS fecha FROM publicaciones
      WHERE creado_por = ${uid} AND estado IN ('publicado', 'parcial', 'fallido')
        AND COALESCE(publicado_en, creado_en) >= now() - make_interval(days => ${DIAS_ANALITICA}::int)`,
    sql()`
      SELECT publicacion_id, red, dia::text AS dia, alcance, interacciones, medido_en FROM metricas_publicacion
      WHERE usuario_id = ${uid} AND dia >= CURRENT_DATE - ${DIAS_ANALITICA}::int
      ORDER BY dia DESC, medido_en DESC`,
  ]);

  // Última medición de cada publicación en cada red (las filas vienen del día más reciente).
  const ultimas = new Map<string, Record<string, any>>();
  for (const f of filas) {
    const clave = `${f.publicacion_id}|${f.red}`;
    if (!ultimas.has(clave)) ultimas.set(clave, f);
  }
  const ultimos = [...ultimas.values()].filter((f) => esRedMedida(f.red));

  // Serie diaria: solo días con mediciones.
  const porDia = new Map<string, { dia: string; facebook: number | null; instagram: number | null }>();
  for (const f of filas) {
    if (!esRedMedida(f.red) || f.alcance == null) continue;
    const fila = porDia.get(f.dia) ?? { dia: f.dia, facebook: null, instagram: null };
    fila[f.red] = (fila[f.red] ?? 0) + f.alcance;
    porDia.set(f.dia, fila);
  }

  const interaccionesPorRed: Record<RedMedida, number | null> = { facebook: null, instagram: null };
  for (const f of ultimos) {
    if (f.interacciones == null) continue;
    interaccionesPorRed[f.red as RedMedida] = (interaccionesPorRed[f.red as RedMedida] ?? 0) + f.interacciones;
  }

  // Por publicación: suma de las redes medidas.
  const porPost = new Map<string, { redes: RedMedida[]; alcance: number | null; interacciones: number }>();
  for (const f of ultimos) {
    const acum = porPost.get(f.publicacion_id) ?? { redes: [], alcance: null, interacciones: 0 };
    acum.redes.push(f.red as RedMedida);
    if (f.alcance != null) acum.alcance = (acum.alcance ?? 0) + f.alcance;
    acum.interacciones += f.interacciones ?? 0;
    porPost.set(f.publicacion_id, acum);
  }

  const alcances = ultimos.filter((f) => f.alcance != null);
  const alcanceTotal = alcances.length ? alcances.reduce((s, f) => s + f.alcance, 0) : null;
  const interaccionesConAlcance = alcances.reduce((s, f) => s + (f.interacciones ?? 0), 0);

  const info = new Map(posts.map((p) => [p.id as string, p]));
  const mejores = [...porPost.entries()]
    .map(([id, v]) => ({
      id,
      titulo: (info.get(id)?.titulo as string) || 'Sin título',
      fecha: info.get(id)?.fecha ? new Date(info.get(id)?.fecha).toISOString() : null,
      redes: v.redes,
      alcance: v.alcance,
      interacciones: v.interacciones,
    }))
    .sort((a, b) => b.interacciones - a.interacciones || (b.alcance ?? 0) - (a.alcance ?? 0))
    .slice(0, 5);

  // Mejor hora: media de interacciones por día y banda, solo con publicaciones medidas.
  const acumCelda = new Map<string, { dia: number; banda: number; suma: number; muestras: number }>();
  for (const [id, v] of porPost) {
    const fecha = info.get(id)?.fecha;
    const celda = fecha ? celdaDeFecha(new Date(fecha)) : null;
    if (!celda) continue;
    const clave = `${celda.dia}-${celda.banda}`;
    const c = acumCelda.get(clave) ?? { ...celda, suma: 0, muestras: 0 };
    c.suma += v.interacciones;
    c.muestras += 1;
    acumCelda.set(clave, c);
  }

  const ultimaFila = filas[0];
  return {
    dias: DIAS_ANALITICA,
    publicaciones: {
      total: posts.length,
      publicadas: posts.filter((p) => p.estado !== 'fallido').length,
      fallidas: posts.filter((p) => p.estado === 'fallido').length,
    },
    kpis: {
      alcance: alcanceTotal,
      interacciones: ultimos.reduce((s, f) => s + (f.interacciones ?? 0), 0),
      tasa: alcanceTotal ? interaccionesConAlcance / alcanceTotal : null,
      publicacionesMedidas: porPost.size,
    },
    serie: [...porDia.values()].sort((a, b) => a.dia.localeCompare(b.dia)),
    interaccionesPorRed,
    redesSinAnalitica: [
      ...new Set(posts.flatMap((p) => (p.redes_destino ?? []) as string[])),
    ].filter((r) => r === 'linkedin' || r === 'tiktok'),
    mejorHora: {
      suficiente: porPost.size >= MINIMO_PARA_MEJOR_HORA,
      minimo: MINIMO_PARA_MEJOR_HORA,
      medidas: porPost.size,
      celdas: [...acumCelda.values()].map((c) => ({
        dia: c.dia,
        banda: c.banda,
        promedio: c.suma / c.muestras,
        muestras: c.muestras,
      })),
    },
    mejores,
    ultimaMedicion: ultimaFila?.medido_en ? new Date(ultimaFila.medido_en).toISOString() : null,
  };
}
