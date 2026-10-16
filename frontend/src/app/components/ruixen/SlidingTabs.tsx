/**
 * Pestañas con pastilla deslizante. Componente propio, inspirado en las vistas previas de "sliding-tabs" y
 * "pill-morph-tabs" de Ruixen UI (cuyo código fuente no es público). Semántica de radiogrupo con flechas.
 */
import * as React from 'react';
import { motion } from 'motion/react';
import { cn } from '../ui/utils';

export interface SlidingTabOption<T extends string> {
  value: T;
  label: React.ReactNode;
}

export interface SlidingTabsProps<T extends string> {
  value: T;
  onChange: (value: T) => void;
  options: SlidingTabOption<T>[];
  ariaLabel: string;
  className?: string;
}

export function SlidingTabs<T extends string>({ value, onChange, options, ariaLabel, className }: SlidingTabsProps<T>) {
  const id = React.useId();
  const refs = React.useRef<(HTMLButtonElement | null)[]>([]);

  const alTeclear = (e: React.KeyboardEvent, i: number) => {
    const paso = e.key === 'ArrowRight' || e.key === 'ArrowDown' ? 1 : e.key === 'ArrowLeft' || e.key === 'ArrowUp' ? -1 : 0;
    if (!paso) return;
    e.preventDefault();
    const n = (i + paso + options.length) % options.length;
    onChange(options[n].value);
    refs.current[n]?.focus();
  };

  return (
    <div
      role="radiogroup"
      aria-label={ariaLabel}
      className={cn('grid rounded-[12px] border border-border bg-secondary p-1', className)}
      style={{ gridTemplateColumns: `repeat(${options.length}, minmax(0, 1fr))` }}
    >
      {options.map((o, i) => {
        const activo = o.value === value;
        return (
          <button
            key={o.value}
            ref={(el) => {
              refs.current[i] = el;
            }}
            type="button"
            role="radio"
            aria-checked={activo}
            tabIndex={activo ? 0 : -1}
            onClick={() => onChange(o.value)}
            onKeyDown={(e) => alTeclear(e, i)}
            className={cn(
              'relative flex h-10 items-center justify-center rounded-[9px] text-sm transition-colors duration-150',
              activo ? 'font-semibold text-foreground' : 'font-medium text-muted-foreground hover:text-foreground'
            )}
          >
            {activo && (
              <motion.span
                layoutId={`pastilla-${id}`}
                className="absolute inset-0 rounded-[9px] bg-card shadow-[var(--elev-sm)] ring-1 ring-border"
                transition={{ type: 'spring', stiffness: 420, damping: 34 }}
              />
            )}
            <span className="relative">{o.label}</span>
          </button>
        );
      })}
    </div>
  );
}
