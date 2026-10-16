/**
 * Adaptado de "banner-announcement" de Ruixen UI (MIT, © 2025 Ruixen UI, ver LICENSE.md).
 * Cambios: colores con color-mix sobre los tokens de Conect.ia (los originales usaban hsl(var(--x)) de shadcn),
 * barrido de brillo con la animación `ruixen-shimmer`, sin `next/link`.
 */
import * as React from 'react';
import { ArrowRight, X } from 'lucide-react';
import { cn } from '../ui/utils';

export interface AnnouncementBannerProps {
  children: React.ReactNode;
  badge?: string;
  action?: { label: string; href: string };
  dismissible?: boolean;
  className?: string;
}

export function AnnouncementBanner({ children, badge, action, dismissible = true, className }: AnnouncementBannerProps) {
  const [montado, setMontado] = React.useState(false);
  const [cerrado, setCerrado] = React.useState(false);

  // Dos fotogramas antes de abrir, para que la apertura (grid-template-rows) se anime.
  React.useEffect(() => {
    const id = requestAnimationFrame(() => requestAnimationFrame(() => setMontado(true)));
    return () => cancelAnimationFrame(id);
  }, []);

  return (
    <div
      className={cn(
        'grid transition-[grid-template-rows] ease-[cubic-bezier(0.16,1,0.3,1)]',
        montado && !cerrado ? '[grid-template-rows:1fr] duration-500' : '[grid-template-rows:0fr] duration-300'
      )}
    >
      <div className="overflow-hidden">
        <div
          className={cn(
            'relative flex min-h-10 flex-wrap items-center justify-center gap-x-3 gap-y-1 border-b border-border bg-brand-soft px-12 py-2 text-sm',
            'transition-[opacity,transform] duration-150',
            cerrado && '-translate-y-1 opacity-0',
            className
          )}
        >
          {/* Barrido de brillo, una sola vez al aparecer */}
          <span
            aria-hidden
            className="pointer-events-none absolute inset-0 [animation:ruixen-shimmer_1.8s_ease-out_0.3s_1_both] bg-[length:250%_100%] bg-no-repeat motion-reduce:hidden"
            style={{
              backgroundImage:
                'linear-gradient(110deg, transparent 30%, color-mix(in srgb, var(--foreground) 5%, transparent) 44%, color-mix(in srgb, var(--foreground) 10%, transparent) 50%, color-mix(in srgb, var(--foreground) 5%, transparent) 56%, transparent 70%)',
            }}
          />
          {badge && (
            <span className="relative shrink-0 rounded-full bg-brand px-2.5 py-0.5 text-xs font-semibold text-white">{badge}</span>
          )}
          <p className="relative text-center font-medium text-foreground">{children}</p>
          {action && (
            <a
              href={action.href}
              className="group relative inline-flex shrink-0 items-center gap-1 font-semibold text-brand-strong transition-colors hover:text-foreground"
            >
              {action.label}
              <ArrowRight className="h-3.5 w-3.5 transition-transform duration-200 group-hover:translate-x-0.5" />
            </a>
          )}
          {dismissible && (
            <button
              type="button"
              aria-label="Cerrar anuncio"
              onClick={() => setCerrado(true)}
              className="press absolute right-1 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
