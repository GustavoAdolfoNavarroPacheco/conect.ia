/**
 * Adaptado de "load-ripple" de Ruixen UI (MIT, © 2025 Ruixen UI, ver LICENSE.md).
 * Anillos concéntricos que laten en cascada. Cambios: color de marca en vez de grises, contenido central
 * (el logo), anillos como elementos decorativos y animación `ruixen-ripple` en CSS (se detiene con prefers-reduced-motion).
 */
import * as React from 'react';
import { cn } from '../ui/utils';

const ANILLOS = [
  { inset: '0%', retraso: '0.8s', opacidad: 'border-brand/15' },
  { inset: '12%', retraso: '0.6s', opacidad: 'border-brand/25' },
  { inset: '24%', retraso: '0.4s', opacidad: 'border-brand/35' },
  { inset: '36%', retraso: '0.2s', opacidad: 'border-brand/50' },
];

export function RippleLoader({ children, className }: { children?: React.ReactNode; className?: string }) {
  return (
    <div className={cn('relative flex h-44 w-44 items-center justify-center', className)} aria-hidden>
      {ANILLOS.map((a) => (
        <span
          key={a.inset}
          className={cn('absolute rounded-full border bg-gradient-to-tr from-brand/10 to-brand-light/10 motion-reduce:animate-none', a.opacidad)}
          style={{ inset: a.inset, animation: `ruixen-ripple 2.2s ${a.retraso} ease-in-out infinite` }}
        />
      ))}
      <div className="relative">{children}</div>
    </div>
  );
}
