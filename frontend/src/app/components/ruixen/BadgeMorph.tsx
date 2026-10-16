/**
 * Adaptado de "badge-morph" de Ruixen UI (MIT, © 2025 Ruixen UI, ver LICENSE.md).
 * Conserva la idea de la píldora que se transforma al cambiar de estado: el icono se dibuja (trazo del
 * check / de la X), la etiqueta entra con desenfoque y el ancho se anima con un resorte (stiffness 400, damping 30).
 * Cambios: colores suaves por tono con los tokens de Conect.ia (el original era una píldora negra/blanca con brillo),
 * estados propios de los canales (conectado, vence pronto, caducado, sin conectar), sin brillo exterior y sin
 * animación con prefers-reduced-motion.
 */
import * as React from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { cn } from '../ui/utils';

export type BadgeTone = 'success' | 'warning' | 'danger' | 'neutral';

const TONOS: Record<BadgeTone, string> = {
  success: 'bg-success-soft text-success ring-success/25',
  warning: 'bg-warning-soft text-warning ring-warning/30',
  danger: 'bg-destructive-soft text-destructive ring-destructive/25',
  neutral: 'bg-secondary text-muted-foreground ring-border',
};

const RESORTE_PILDORA = { type: 'spring' as const, stiffness: 400, damping: 30 };
const RESORTE_CONTENIDO = { type: 'spring' as const, stiffness: 420, damping: 25 };
const RESORTE_TRAZO = { type: 'spring' as const, stiffness: 300, damping: 15 };

function Icono({ tone }: { tone: BadgeTone }) {
  const comun = { width: 14, height: 14, viewBox: '0 0 16 16', fill: 'none', 'aria-hidden': true } as const;
  const trazo = {
    stroke: 'currentColor',
    strokeWidth: 1.7,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    initial: { pathLength: 0, opacity: 0 },
    animate: { pathLength: 1, opacity: 1 },
    transition: RESORTE_TRAZO,
  };
  if (tone === 'success') {
    return (
      <svg {...comun}>
        <motion.path d="M4 8.5L6.8 11.3L12 5.2" {...trazo} />
      </svg>
    );
  }
  if (tone === 'danger') {
    return (
      <svg {...comun}>
        <motion.path d="M5 5L11 11M11 5L5 11" {...trazo} />
      </svg>
    );
  }
  if (tone === 'warning') {
    return (
      <svg {...comun}>
        <motion.path d="M8 4.5V8.6M8 11.3V11.4" {...trazo} />
      </svg>
    );
  }
  return (
    <span className="flex h-3.5 w-3.5 items-center justify-center" aria-hidden>
      <span className="h-1.5 w-1.5 rounded-full bg-current opacity-60" />
    </span>
  );
}

export interface BadgeMorphProps {
  tone: BadgeTone;
  label: string;
  className?: string;
}

export function BadgeMorph({ tone, label, className }: BadgeMorphProps) {
  const reducir = useReducedMotion();
  return (
    <motion.span
      layout={!reducir}
      transition={{ layout: RESORTE_PILDORA }}
      className={cn('inline-flex h-6 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 text-xs font-medium ring-1 ring-inset', TONOS[tone], className)}
    >
      <AnimatePresence mode="wait" initial={false}>
        <motion.span
          key={tone}
          className="flex items-center justify-center"
          initial={reducir ? false : { scale: 0.5, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.5, opacity: 0, transition: { duration: 0.08 } }}
          transition={RESORTE_CONTENIDO}
        >
          <Icono tone={tone} />
        </motion.span>
      </AnimatePresence>
      <AnimatePresence mode="wait" initial={false}>
        <motion.span
          key={label}
          className="leading-none"
          initial={reducir ? false : { opacity: 0, y: 4, filter: 'blur(4px)' }}
          animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
          exit={{ opacity: 0, y: -4, transition: { duration: 0.08 } }}
          transition={{ ...RESORTE_CONTENIDO, delay: 0.025, filter: { duration: 0.3 } }}
        >
          {label}
        </motion.span>
      </AnimatePresence>
    </motion.span>
  );
}
