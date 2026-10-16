/**
 * Maquetas decorativas de la landing (aria-hidden): reflejan pantallas reales de la app con datos de ejemplo.
 * El patrón de tarjeta de "próximas" y de publicación sigue la idea de las vistas previas de Ruixen UI
 * (schedule-card, social-card) con código propio.
 */
import * as React from 'react';
import { motion, useInView } from 'motion/react';
import {
  BarChart3,
  CalendarClock,
  Check,
  CheckCircle2,
  Facebook,
  Heart,
  Home,
  Instagram,
  Linkedin,
  MessageCircle,
  MessageSquare,
  Music2,
  PenSquare,
  Send,
  Share2,
  Sparkles,
} from 'lucide-react';
import { cn } from '../../components/ui/utils';

type Red = 'linkedin' | 'facebook' | 'instagram' | 'tiktok';

const COLOR_RED: Record<Red, string> = {
  linkedin: 'text-[#0a66c2]',
  facebook: 'text-[#1877f2]',
  instagram: 'text-[#e1306c]',
  tiktok: 'text-foreground',
};

export function RedIcono({ red, className }: { red: Red; className?: string }) {
  const clase = cn('h-3.5 w-3.5', COLOR_RED[red], className);
  if (red === 'linkedin') return <Linkedin className={clase} />;
  if (red === 'facebook') return <Facebook className={clase} />;
  if (red === 'instagram') return <Instagram className={clase} />;
  return <Music2 className={clase} />;
}

/* ------------------------------------------------------------------ hero */

const PROXIMAS: { hora: string; titulo: string; redes: Red[]; proxima?: boolean }[] = [
  { hora: '9:00 a. m.', titulo: 'Inscripciones abiertas: cohorte de noviembre', redes: ['linkedin', 'facebook'], proxima: true },
  { hora: '12:15 p. m.', titulo: 'Carrusel: 5 hábitos de buenos desarrolladores', redes: ['instagram', 'facebook'] },
  { hora: '6:00 p. m.', titulo: 'Tip de productividad para estudiantes', redes: ['instagram'] },
];

const NAV_DEMO = [
  { icon: <Home />, label: 'Inicio', activo: true },
  { icon: <PenSquare />, label: 'Nueva publicación' },
  { icon: <CalendarClock />, label: 'Calendario' },
  { icon: <BarChart3 />, label: 'Analítica' },
  { icon: <MessageSquare />, label: 'Asistente IA' },
  { icon: <Share2 />, label: 'Canales' },
];

/** Ventana de la app para el hero: inicio con próximas publicaciones y vista previa de una publicación. */
export function PanelDemo() {
  return (
    <div aria-hidden className="relative mx-auto w-full max-w-5xl">
      <div className="absolute inset-x-8 -top-8 h-40 rounded-full bg-brand/25 blur-3xl" />
      <div className="surface relative overflow-hidden shadow-[var(--elev-float)]">
        <div className="flex h-10 items-center gap-2 border-b border-border px-4">
          <span className="h-2.5 w-2.5 rounded-full bg-[#ff5f57]" />
          <span className="h-2.5 w-2.5 rounded-full bg-[#febc2e]" />
          <span className="h-2.5 w-2.5 rounded-full bg-[#28c840]" />
          <span className="ml-3 text-xs text-muted-foreground">Conect.ia · Inicio</span>
        </div>

        <div className="grid md:grid-cols-[200px_1fr]">
          <div className="hidden border-r border-border bg-sidebar p-3 md:block">
            <div className="mb-3 flex items-center gap-2 px-2">
              <span className="flex h-6 w-6 items-center justify-center rounded-md bg-brand text-white">
                <Sparkles className="h-3.5 w-3.5" />
              </span>
              <span className="text-sm font-semibold text-foreground">Conect.ia</span>
            </div>
            <ul className="space-y-1">
              {NAV_DEMO.map((n) => (
                <li
                  key={n.label}
                  className={cn(
                    'flex h-9 items-center gap-2 rounded-[10px] px-2.5 text-xs font-medium [&>svg]:h-4 [&>svg]:w-4',
                    n.activo ? 'bg-brand-soft text-brand-strong' : 'text-muted-foreground'
                  )}
                >
                  {n.icon}
                  {n.label}
                </li>
              ))}
            </ul>
          </div>

          <div className="min-w-0 space-y-4 p-4 sm:p-6">
            <div className="grid grid-cols-3 gap-3">
              {[
                { t: 'Hoy', v: '3', c: 'text-brand-strong' },
                { t: 'Próximos 7 días', v: '8', c: 'text-success' },
                { t: 'Publicadas', v: '12', c: 'text-foreground' },
              ].map((s) => (
                <div key={s.t} className="min-w-0 rounded-[12px] border border-border bg-card p-3 sm:p-4">
                  <p className="truncate text-xs text-muted-foreground">{s.t}</p>
                  <p className={cn('mt-1 text-xl font-semibold tabular-nums sm:text-2xl', s.c)}>{s.v}</p>
                </div>
              ))}
            </div>

            <div className="grid min-w-0 gap-4 lg:grid-cols-[1.15fr_1fr]">
              <div className="min-w-0 rounded-[12px] border border-border bg-card">
                <div className="flex items-center gap-2 border-b border-border px-4 py-3 text-sm font-semibold text-foreground">
                  <CalendarClock className="h-4 w-4 text-brand-strong" />
                  Próximas publicaciones
                </div>
                <ul className="divide-y divide-border">
                  {PROXIMAS.map((p) => (
                    <li key={p.titulo} className="flex items-center gap-3 px-4 py-3">
                      <span className={cn('h-2 w-2 shrink-0 rounded-full', p.proxima ? 'bg-brand' : 'bg-border')} />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-foreground">{p.titulo}</p>
                        <p className="text-xs tabular-nums text-muted-foreground">{p.hora}</p>
                      </div>
                      <span className="flex shrink-0 items-center gap-1">
                        {p.redes.map((r) => (
                          <RedIcono key={r} red={r} />
                        ))}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="hidden rounded-[12px] border border-border bg-card p-4 sm:block">
                <div className="flex items-center gap-3">
                  <span className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-brand-light to-brand-deep text-sm font-semibold text-white">
                    C
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-foreground">Conect.ia</p>
                    <p className="text-xs text-muted-foreground">Mañana · 9:00 a. m.</p>
                  </div>
                  <span className="rounded-md bg-success-soft px-2 py-0.5 text-xs font-medium text-success">Programado</span>
                </div>
                <p className="mt-3 text-sm leading-relaxed text-foreground">
                  Abrimos inscripciones para la cohorte de noviembre. Cupos limitados, mentoría semanal y proyectos con casos reales.
                </p>
                <div className="mt-3 h-20 rounded-[10px] bg-gradient-to-br from-brand-soft via-brand/20 to-brand-light/30" />
                <div className="mt-3 flex items-center gap-5 border-t border-border pt-3 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1.5"><Heart className="h-3.5 w-3.5" />128</span>
                  <span className="flex items-center gap-1.5"><MessageCircle className="h-3.5 w-3.5" />32</span>
                  <span className="flex items-center gap-1.5"><Share2 className="h-3.5 w-3.5" />24</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      <div className="pointer-events-none absolute inset-x-0 -bottom-px h-28 bg-gradient-to-t from-background to-transparent" />
    </div>
  );
}

/* ------------------------------------------------------------ funciones */

const ESCENARIO = 'flex h-full flex-col justify-center gap-3 bg-gradient-to-br from-brand-soft/60 via-card to-card p-4 sm:p-6';

export function VisualAsistente() {
  return (
    <div aria-hidden className={ESCENARIO}>
      <div className="ml-auto max-w-[85%] rounded-2xl rounded-br-md bg-brand px-4 py-2.5 text-sm text-white">
        Dame 3 ideas de posts sobre nuestro bootcamp de datos
      </div>
      <div className="max-w-[92%] rounded-2xl rounded-bl-md border border-border bg-card px-4 py-3 text-sm text-foreground shadow-[var(--elev-xs)]">
        <p className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold text-brand-strong">
          <Sparkles className="h-3.5 w-3.5" />
          Asistente IA
        </p>
        <ol className="space-y-1 text-[13px] leading-snug text-muted-foreground">
          <li><span className="font-semibold text-foreground">1.</span> Antes y después de un egresado</li>
          <li><span className="font-semibold text-foreground">2.</span> Un día en el bootcamp, en 5 fotos</li>
          <li><span className="font-semibold text-foreground">3.</span> Mitos sobre aprender datos sin experiencia</li>
        </ol>
      </div>
      <div className="mt-1 flex items-center gap-2 rounded-full border border-border bg-card py-1.5 pl-4 pr-1.5 shadow-[var(--elev-xs)]">
        <span className="flex-1 truncate text-sm text-muted-foreground">Pide ideas, optimiza copy…</span>
        <span className="flex h-9 w-9 items-center justify-center rounded-full bg-brand text-white">
          <Send className="h-4 w-4" />
        </span>
      </div>
    </div>
  );
}

const DIAS_DEMO = [
  { d: 'Lun', n: 12, bloques: [{ top: 18, c: 'bg-success-soft text-success', t: 'Publicada' }] },
  { d: 'Mar', n: 13, bloques: [{ top: 46, c: 'bg-brand-soft text-brand-strong', t: 'Carrusel' }] },
  { d: 'Mié', n: 14, bloques: [{ top: 10, c: 'bg-brand-soft text-brand-strong', t: 'Cohorte' }, { top: 66, c: 'bg-warning-soft text-warning', t: 'Parcial' }] },
  { d: 'Jue', n: 15, bloques: [{ top: 38, c: 'bg-brand-soft text-brand-strong', t: 'Tip' }] },
  { d: 'Vie', n: 16, bloques: [{ top: 24, c: 'bg-brand-soft text-brand-strong', t: 'En vivo' }, { top: 74, c: 'bg-destructive-soft text-destructive', t: 'Fallida' }] },
];

export function VisualCalendario() {
  return (
    <div aria-hidden className={cn(ESCENARIO, 'justify-start')}>
      <div className="flex items-center justify-between">
        <span className="text-sm font-semibold text-foreground">12 – 18 de octubre</span>
        <span className="flex gap-1 rounded-[10px] border border-border bg-secondary p-0.5 text-xs font-medium">
          <span className="rounded-md px-2 py-1 text-muted-foreground">Mes</span>
          <span className="rounded-md bg-card px-2 py-1 text-foreground shadow-[var(--elev-xs)]">Semana</span>
          <span className="rounded-md px-2 py-1 text-muted-foreground">Lista</span>
        </span>
      </div>
      <div className="grid flex-1 grid-cols-5 gap-2">
        {DIAS_DEMO.map((dia) => (
          <div key={dia.d} className="relative flex min-h-[7.5rem] flex-col overflow-hidden rounded-[10px] border border-border bg-card">
            <div className="border-b border-border py-1.5 text-center">
              <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">{dia.d}</p>
              <p className={cn('mx-auto mt-0.5 flex h-6 w-6 items-center justify-center rounded-full text-xs font-semibold tabular-nums', dia.n === 16 ? 'bg-brand text-white' : 'text-foreground')}>{dia.n}</p>
            </div>
            <div className="relative flex-1">
              {dia.bloques.map((b) => (
                <span
                  key={b.t}
                  className={cn('absolute inset-x-1 truncate rounded-md px-1.5 py-1 text-[10px] font-semibold', b.c)}
                  style={{ top: `${b.top}%` }}
                >
                  {b.t}
                </span>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

const CANALES_DEMO: { red: Red; nombre: string; detalle: string; estado: string; tono: string }[] = [
  { red: 'linkedin', nombre: 'LinkedIn', detalle: 'Acceso vigente · vence en 41 días', estado: 'Conectado', tono: 'bg-success-soft text-success' },
  { red: 'facebook', nombre: 'Facebook', detalle: 'Reconéctalo antes de que caduque', estado: 'Vence pronto', tono: 'bg-warning-soft text-warning' },
  { red: 'instagram', nombre: 'Instagram', detalle: 'Cuenta de empresa vinculada', estado: 'Conectado', tono: 'bg-success-soft text-success' },
  { red: 'tiktok', nombre: 'TikTok', detalle: 'La red rechazó el acceso', estado: 'Caducado', tono: 'bg-destructive-soft text-destructive' },
];

export function VisualCanales() {
  return (
    <div aria-hidden className={ESCENARIO}>
      {CANALES_DEMO.map((c) => (
        <div key={c.red} className="flex items-center gap-3 rounded-[12px] border border-border bg-card px-3 py-2.5 shadow-[var(--elev-xs)]">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] bg-secondary [&>svg]:h-[18px] [&>svg]:w-[18px]">
            <RedIcono red={c.red} />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-foreground">{c.nombre}</p>
            <p className="truncate text-xs text-muted-foreground">{c.detalle}</p>
          </div>
          <span className={cn('shrink-0 rounded-md px-2 py-0.5 text-xs font-medium', c.tono)}>{c.estado}</span>
        </div>
      ))}
    </div>
  );
}

const SERIE_FB = [38, 46, 42, 58, 52, 66, 61, 74, 70, 82, 78, 90];
const SERIE_IG = [22, 28, 26, 34, 40, 36, 48, 44, 54, 50, 60, 66];

function puntos(serie: number[], ancho: number, alto: number) {
  return serie.map((v, i) => [(i / (serie.length - 1)) * ancho, alto - (v / 100) * alto] as const);
}

export function VisualAnalitica() {
  const ref = React.useRef<SVGSVGElement>(null);
  const visible = useInView(ref, { amount: 0.4 });
  const W = 320;
  const H = 110;
  const fb = puntos(SERIE_FB, W, H);
  const ig = puntos(SERIE_IG, W, H);
  const linea = (p: (readonly [number, number])[]) => p.map(([x, y], i) => `${i ? 'L' : 'M'}${x.toFixed(1)} ${y.toFixed(1)}`).join(' ');
  return (
    <div aria-hidden className={ESCENARIO}>
      <div className="grid grid-cols-3 gap-2">
        {[
          { t: 'Alcance', v: '18,9 mil' },
          { t: 'Interacciones', v: '1.136' },
          { t: 'Tasa', v: '6 %' },
        ].map((k) => (
          <div key={k.t} className="rounded-[10px] border border-border bg-card px-3 py-2">
            <p className="text-[11px] text-muted-foreground">{k.t}</p>
            <p className="text-lg font-semibold tabular-nums text-foreground">{k.v}</p>
          </div>
        ))}
      </div>
      <div className="rounded-[12px] border border-border bg-card p-3">
        <div className="mb-1 flex items-center justify-between text-xs text-muted-foreground">
          <span>Alcance por día</span>
          <span className="flex items-center gap-3">
            <span className="flex items-center gap-1"><i className="h-2 w-2 rounded-full bg-brand" />Facebook</span>
            <span className="flex items-center gap-1"><i className="h-2 w-2 rounded-full bg-warning" />Instagram</span>
          </span>
        </div>
        <svg ref={ref} viewBox={`0 0 ${W} ${H}`} className="h-auto w-full" preserveAspectRatio="none">
          <defs>
            <linearGradient id="area-fb" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor="var(--brand)" stopOpacity="0.28" />
              <stop offset="100%" stopColor="var(--brand)" stopOpacity="0" />
            </linearGradient>
          </defs>
          <path d={`${linea(fb)} L${W} ${H} L0 ${H} Z`} fill="url(#area-fb)" />
          <motion.path
            d={linea(ig)}
            fill="none"
            stroke="var(--warning)"
            strokeWidth="2"
            strokeLinejoin="round"
            strokeLinecap="round"
            vectorEffect="non-scaling-stroke"
            initial={{ pathLength: 0 }}
            animate={{ pathLength: visible ? 1 : 0 }}
            transition={{ duration: 1.4, ease: 'easeOut' }}
          />
          <motion.path
            d={linea(fb)}
            fill="none"
            stroke="var(--brand)"
            strokeWidth="2.5"
            strokeLinejoin="round"
            strokeLinecap="round"
            vectorEffect="non-scaling-stroke"
            initial={{ pathLength: 0 }}
            animate={{ pathLength: visible ? 1 : 0 }}
            transition={{ duration: 1.4, ease: 'easeOut', delay: 0.15 }}
          />
        </svg>
      </div>
    </div>
  );
}

const TAREAS_DEMO = [
  { t: 'Aprobar el copy en Make', d: 'Escenario “Revisión editorial”' },
  { t: 'Avisar al equipo por Telegram', d: 'Cuando una publicación se programa' },
  { t: 'Publicar en LinkedIn y Facebook', d: 'A la hora elegida' },
  { t: 'Registrar el resultado', d: 'Con el estado de cada red' },
];

export function VisualAutomatizacion() {
  const ref = React.useRef<HTMLDivElement>(null);
  const visible = useInView(ref, { amount: 0.4 });
  return (
    <div ref={ref} aria-hidden className={ESCENARIO}>
      {TAREAS_DEMO.map((tarea, i) => (
        <motion.div
          key={tarea.t}
          initial={{ opacity: 0, x: -12 }}
          animate={visible ? { opacity: 1, x: 0 } : { opacity: 0, x: -12 }}
          transition={{ delay: 0.12 * i, duration: 0.4 }}
          className="flex items-center gap-3 rounded-[12px] border border-border bg-card px-3 py-2.5 shadow-[var(--elev-xs)]"
        >
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] bg-brand-soft text-brand-strong">
            <CheckCircle2 className="h-[18px] w-[18px]" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-foreground">{tarea.t}</p>
            <p className="truncate text-xs text-muted-foreground">{tarea.d}</p>
          </div>
          <motion.span
            initial={{ scale: 0 }}
            animate={visible ? { scale: 1 } : { scale: 0 }}
            transition={{ delay: 0.5 + 0.35 * i, type: 'spring', stiffness: 400, damping: 18 }}
            className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-success text-white"
          >
            <Check className="h-3.5 w-3.5" strokeWidth={3} />
          </motion.span>
        </motion.div>
      ))}
    </div>
  );
}
