/**
 * Adaptado de "auto-scrolling-client-carousel" de Ruixen UI (MIT, © 2025 Ruixen UI, ver LICENSE.md).
 * Cinta continua de logos: en reposo en escala de grises, a color al pasar el ratón.
 * Cambios: una sola cinta, pausa al pasar el ratón o enfocar, `ruixen-ribbon` (CSS, sin JS por fotograma),
 * se detiene con prefers-reduced-motion, la lista duplicada se oculta a lectores de pantalla.
 */
import * as React from 'react';
import { cn } from '../ui/utils';

export interface RibbonItem {
  name: string;
  logo: React.ReactNode;
}

export interface ClientRibbonProps {
  items: RibbonItem[];
  /** Segundos por ciclo completo (menos = más rápido). */
  speed?: number;
  className?: string;
}

export function ClientRibbon({ items, speed = 38, className }: ClientRibbonProps) {
  // Tres copias: en cualquier desplazamiento al menos dos cubren el ancho visible (el bucle no deja huecos).
  const triple = [...items, ...items, ...items];

  return (
    <div className={cn('ruixen-mask-x group overflow-hidden py-3', className)}>
      <ul
        className="ruixen-ribbon-track flex w-max items-center group-hover:[animation-play-state:paused]"
        style={{ ['--ruixen-ribbon-duration' as string]: `${speed}s` }}
      >
        {triple.map((item, i) => (
          <li
            key={i}
            aria-hidden={i >= items.length}
            className="flex shrink-0 items-center gap-2.5 pl-12 text-muted-foreground opacity-70 grayscale transition-[filter,opacity,transform] duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)] hover:-translate-y-0.5 hover:opacity-100 hover:grayscale-0 sm:pl-16"
          >
            {item.logo}
            <span className="select-none whitespace-nowrap text-base font-semibold tracking-tight text-foreground">{item.name}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
