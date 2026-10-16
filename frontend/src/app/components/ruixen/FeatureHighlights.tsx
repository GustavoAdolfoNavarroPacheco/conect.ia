/**
 * Adaptado de "feature-highlights" de Ruixen UI (MIT, © 2025 Ruixen UI, ver LICENSE.md).
 * Lista numerada con indicador deslizante + escenario visual con enfoque progresivo y autoavance.
 * Cambios: semántica de pestañas (tablist/tab/tabpanel) para teclado y lector de pantalla, flechas para moverse,
 * autoavance desactivado con prefers-reduced-motion, tokens de Conect.ia y la animación `ruixen-progress`.
 */
import * as React from 'react';
import { cn } from '../ui/utils';

export interface FeatureItem {
  title: string;
  description: string;
  /** Visual del escenario (decorativo). */
  visual: React.ReactNode;
}

export interface FeatureHighlightsProps {
  features: FeatureItem[];
  /** Segundos por función durante el autoavance. 0 lo desactiva. */
  autoPlayInterval?: number;
  className?: string;
  'aria-label'?: string;
}

export function FeatureHighlights({ features, autoPlayInterval = 6, className, ...props }: FeatureHighlightsProps) {
  const id = React.useId();
  const [activo, setActivo] = React.useState(0);
  const [pausado, setPausado] = React.useState(false);
  const [indicador, setIndicador] = React.useState({ top: 0, height: 0 });
  const itemRefs = React.useRef<(HTMLButtonElement | null)[]>([]);
  const listaRef = React.useRef<HTMLDivElement>(null);
  const [sinMovimiento, setSinMovimiento] = React.useState(false);

  React.useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    setSinMovimiento(mq.matches);
    const alCambiar = () => setSinMovimiento(mq.matches);
    mq.addEventListener('change', alCambiar);
    return () => mq.removeEventListener('change', alCambiar);
  }, []);

  // El indicador sigue al elemento activo; el ResizeObserver lo estira mientras se abre la descripción.
  React.useEffect(() => {
    const el = itemRefs.current[activo];
    const lista = listaRef.current;
    if (!el || !lista) return;
    const medir = () => {
      const l = lista.getBoundingClientRect();
      const e = el.getBoundingClientRect();
      setIndicador({ top: e.top - l.top, height: e.height });
    };
    medir();
    const ro = new ResizeObserver(medir);
    ro.observe(el);
    return () => ro.disconnect();
  }, [activo]);

  const avanzar = React.useCallback(() => setActivo((a) => (a + 1) % features.length), [features.length]);
  const autoplay = autoPlayInterval > 0 && !sinMovimiento;

  const alTeclear = (e: React.KeyboardEvent, i: number) => {
    const paso = e.key === 'ArrowDown' || e.key === 'ArrowRight' ? 1 : e.key === 'ArrowUp' || e.key === 'ArrowLeft' ? -1 : 0;
    if (!paso) return;
    e.preventDefault();
    const n = (i + paso + features.length) % features.length;
    setActivo(n);
    itemRefs.current[n]?.focus();
  };

  return (
    <div
      className={cn('grid grid-cols-1 gap-6 md:grid-cols-[5fr_7fr] md:gap-10', className)}
      onMouseEnter={() => setPausado(true)}
      onMouseLeave={() => setPausado(false)}
      onFocusCapture={() => setPausado(true)}
      onBlurCapture={() => setPausado(false)}
    >
      {/* Lista */}
      <div ref={listaRef} role="tablist" aria-orientation="vertical" aria-label={props['aria-label']} className="relative order-2 self-center md:order-1">
        <div className="absolute bottom-0 left-0 top-0 w-px bg-border" aria-hidden />
        <div
          aria-hidden
          className="absolute left-0 w-0.5 rounded-full bg-brand"
          style={{
            top: indicador.top,
            height: indicador.height,
            transition: 'top 0.5s cubic-bezier(0.16, 1, 0.3, 1), height 0.4s cubic-bezier(0.16, 1, 0.3, 1)',
          }}
        />

        {features.map((f, i) => {
          const esActivo = i === activo;
          return (
            <button
              key={f.title}
              ref={(el) => {
                itemRefs.current[i] = el;
              }}
              id={`${id}-tab-${i}`}
              type="button"
              role="tab"
              aria-selected={esActivo}
              aria-controls={`${id}-panel-${i}`}
              tabIndex={esActivo ? 0 : -1}
              onClick={() => setActivo(i)}
              onKeyDown={(e) => alTeclear(e, i)}
              className="relative flex min-h-12 w-full cursor-pointer flex-col items-start py-3 pl-6 pr-2 text-left"
            >
              <span className="flex items-baseline gap-3">
                <span
                  className={cn(
                    'font-mono text-xs tabular-nums transition-colors duration-300',
                    esActivo ? 'text-brand-strong' : 'text-muted-foreground'
                  )}
                >
                  {String(i + 1).padStart(2, '0')}
                </span>
                <span
                  className={cn(
                    'text-base font-semibold transition-colors duration-300',
                    esActivo ? 'text-foreground' : 'text-muted-foreground'
                  )}
                >
                  {f.title}
                </span>
              </span>

              {/* Descripción: se abre con grid-template-rows 0fr → 1fr */}
              <span
                className="grid w-full"
                style={{
                  gridTemplateRows: esActivo ? '1fr' : '0fr',
                  transition: 'grid-template-rows 0.4s cubic-bezier(0.16, 1, 0.3, 1)',
                }}
              >
                <span className="overflow-hidden">
                  <span
                    className="block pb-1 pl-8 pt-2 text-sm leading-relaxed text-muted-foreground"
                    style={{
                      opacity: esActivo ? 1 : 0,
                      transform: esActivo ? 'translateY(0)' : 'translateY(6px)',
                      transition: esActivo
                        ? 'opacity 0.3s cubic-bezier(0.16, 1, 0.3, 1) 0.08s, transform 0.3s cubic-bezier(0.16, 1, 0.3, 1) 0.08s'
                        : 'opacity 0.15s ease, transform 0.15s ease',
                    }}
                  >
                    {f.description}
                  </span>
                </span>
              </span>

              {esActivo && autoplay && (
                <span className="absolute bottom-0 left-6 right-0 h-px bg-border" aria-hidden>
                  <span
                    key={`progreso-${activo}`}
                    className="block h-full origin-left bg-brand/60"
                    style={{
                      animation: `ruixen-progress ${autoPlayInterval}s linear forwards`,
                      animationPlayState: pausado ? 'paused' : 'running',
                    }}
                    onAnimationEnd={avanzar}
                  />
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Escenario: enfoque progresivo entre visuales */}
      <div className="surface relative order-1 aspect-[4/3] overflow-hidden sm:aspect-video md:order-2">
        {features.map((f, i) => (
          <div
            key={f.title}
            id={`${id}-panel-${i}`}
            role="tabpanel"
            aria-labelledby={`${id}-tab-${i}`}
            aria-hidden={i !== activo}
            className="absolute inset-0"
            style={{
              opacity: i === activo ? 1 : 0,
              transform: i === activo ? 'scale(1)' : 'scale(0.96)',
              filter: i === activo ? 'blur(0px)' : 'blur(6px)',
              pointerEvents: i === activo ? 'auto' : 'none',
              transition:
                'opacity 0.7s cubic-bezier(0.16, 1, 0.3, 1), transform 0.7s cubic-bezier(0.16, 1, 0.3, 1), filter 0.7s cubic-bezier(0.16, 1, 0.3, 1)',
            }}
          >
            {f.visual}
          </div>
        ))}
      </div>
    </div>
  );
}
