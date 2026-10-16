/**
 * Anillo de progreso. Adaptado de "animated-circular-progress-bar" de Ruixen UI (MIT, © 2025 Ruixen UI, ver LICENSE.md).
 * Conserva el trazo redondeado con arco principal sobre un arco de fondo y el llenado animado de ~1 s.
 * Cambios: el llenado se anima con `pathLength` de motion (sin variables CSS calculadas), colores por tokens
 * de Conect.ia, número central con NumberTicker, rol `progressbar` con valor accesible y sin animación con
 * prefers-reduced-motion.
 */
import * as React from 'react';
import { motion, useReducedMotion } from 'motion/react';
import { cn } from '../ui/utils';
import { NumberTicker } from './NumberTicker';

export interface ProgressRingProps {
  /** 0–100 */
  value: number;
  /** Lado en px. */
  size?: number;
  /** Grosor del trazo en unidades del viewBox (100). */
  stroke?: number;
  /** Clase de color del arco principal (usa `text-*`). */
  tone?: 'brand' | 'success' | 'warning' | 'danger';
  label: string;
  /** Contenido central; por defecto, el número con "%". */
  children?: React.ReactNode;
  className?: string;
}

const TONOS = {
  brand: 'text-brand',
  success: 'text-success',
  warning: 'text-warning',
  danger: 'text-destructive',
};

export function ProgressRing({ value, size = 96, stroke = 9, tone = 'brand', label, children, className }: ProgressRingProps) {
  const reducir = useReducedMotion();
  const pct = Math.max(0, Math.min(100, Math.round(value)));
  const r = 50 - stroke / 2 - 1;

  return (
    <div
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={pct}
      className={cn('relative shrink-0', className)}
      style={{ width: size, height: size }}
    >
      <svg viewBox="0 0 100 100" className="h-full w-full -rotate-90" fill="none" aria-hidden>
        <circle cx="50" cy="50" r={r} strokeWidth={stroke} className="stroke-secondary" />
        <motion.circle
          cx="50"
          cy="50"
          r={r}
          strokeWidth={stroke}
          strokeLinecap="round"
          className={cn('stroke-current', TONOS[tone])}
          initial={{ pathLength: reducir ? pct / 100 : 0 }}
          animate={{ pathLength: pct / 100 }}
          transition={{ duration: reducir ? 0 : 1, ease: [0.22, 1, 0.36, 1] }}
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center text-center font-semibold text-foreground">
        {children ?? <NumberTicker value={pct} suffix="%" className="text-lg" />}
      </div>
    </div>
  );
}
