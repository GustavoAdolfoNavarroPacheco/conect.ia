/**
 * Panel de marca de la pantalla de acceso (solo desde 1024 px). Fondo con degradado de marca y rejilla de puntos;
 * las notificaciones apiladas siguen la idea de "animated-list" de Ruixen UI (código propio).
 */
import * as React from 'react';
import { motion } from 'motion/react';
import { CalendarClock, CheckCircle2, ShieldCheck, Sparkles } from 'lucide-react';

const PUNTOS = [
  { icon: <Sparkles />, titulo: 'Un asistente que escribe contigo', texto: 'Borradores listos para cada red; tú decides qué sale.' },
  { icon: <CalendarClock />, titulo: 'Programa con calendario', texto: 'Mes, semana por horas o lista, con reintentos por red.' },
  { icon: <ShieldCheck />, titulo: 'Conexiones oficiales', texto: 'OAuth de cada plataforma; tus accesos no pasan por el navegador.' },
];

const AVISOS = [
  { icon: <CheckCircle2 />, titulo: 'Publicado en LinkedIn y Facebook', cuando: 'hace 2 min' },
  { icon: <CalendarClock />, titulo: 'Programado para mañana · 9:00 a. m.', cuando: 'hace 1 h' },
  { icon: <Sparkles />, titulo: 'Borrador listo: cohorte de noviembre', cuando: 'hace 3 h' },
];

export function AuthShowcase() {
  return (
    <aside className="relative isolate hidden overflow-hidden bg-gradient-to-br from-brand-deep via-brand to-[#0a89d1] p-12 text-white lg:flex lg:flex-col lg:justify-between xl:p-16">
      <div className="ruixen-dots absolute inset-0 -z-10 opacity-50" aria-hidden />
      <div className="absolute -left-24 -top-24 -z-10 h-80 w-80 rounded-full bg-white/10 blur-3xl" aria-hidden />
      <div className="absolute -bottom-32 right-0 -z-10 h-96 w-96 rounded-full bg-brand-light/25 blur-3xl" aria-hidden />

      <div className="flex items-center gap-2.5 select-none">
        <span
          role="img"
          aria-label="Campuslands"
          className="block h-9 w-11 bg-white"
          style={{ WebkitMask: 'url(/campuslands-icon.svg) center / contain no-repeat', mask: 'url(/campuslands-icon.svg) center / contain no-repeat' }}
        />
        <span className="text-lg font-semibold tracking-tight">
          Conect<span className="text-brand-light">.ia</span>
        </span>
      </div>

      <div className="max-w-lg space-y-8">
        <div className="space-y-4">
          <h2 className="text-balance text-3xl font-semibold leading-tight tracking-tight xl:text-4xl">
            Tu contenido, en todas tus redes, desde un solo panel.
          </h2>
          <p className="text-base leading-relaxed text-white/80">
            Genera con IA, programa a la hora exacta y sigue el resultado de cada publicación.
          </p>
        </div>
        <ul className="space-y-4">
          {PUNTOS.map((p) => (
            <li key={p.titulo} className="flex gap-4">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[10px] bg-white/15 ring-1 ring-white/20 [&>svg]:h-5 [&>svg]:w-5">
                {p.icon}
              </span>
              <div>
                <p className="text-sm font-semibold">{p.titulo}</p>
                <p className="text-sm text-white/75">{p.texto}</p>
              </div>
            </li>
          ))}
        </ul>
      </div>

      <div aria-hidden className="space-y-2.5">
        {AVISOS.map((a, i) => (
          <motion.div
            key={a.titulo}
            initial={{ opacity: 0, y: 18, filter: 'blur(6px)' }}
            animate={{ opacity: 1 - i * 0.18, y: 0, filter: 'blur(0px)' }}
            transition={{ delay: 0.5 + i * 0.28, duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
            className="flex items-center gap-3 rounded-[14px] border border-white/20 bg-white/10 px-4 py-3 backdrop-blur-md"
            style={{ marginLeft: i * 20 }}
          >
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] bg-white/15 [&>svg]:h-[18px] [&>svg]:w-[18px]">{a.icon}</span>
            <span className="min-w-0 flex-1 truncate text-sm font-medium">{a.titulo}</span>
            <span className="shrink-0 text-xs text-white/70">{a.cuando}</span>
          </motion.div>
        ))}
      </div>
    </aside>
  );
}
