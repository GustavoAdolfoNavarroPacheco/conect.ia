/**
 * Adaptado de "notification-inbox-popover" de Ruixen UI (MIT, © 2025 Ruixen UI, ver LICENSE.md).
 * Conserva lo esencial del original: filas que se elevan según la cercanía del cursor (cálculo por fotograma
 * escribiendo directo en el DOM, sin re-renders), punto de no leído que se apaga con un resorte, borde
 * desvanecido y lista con barra oculta.
 * Cambios: sin sonido; colores con tokens de Conect.ia (los del original tenían un contraste menor al exigido);
 * pestañas Todas / Sin leer; icono por tipo de aviso; el elevado se desactiva con prefers-reduced-motion.
 */
import * as React from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { cn } from '../ui/utils';

export interface InboxItem {
  id: string;
  title: string;
  time: string;
  read: boolean;
  icon: React.ReactNode;
  tone: 'brand' | 'success' | 'warning' | 'danger';
}

export interface NotificationInboxProps {
  items: InboxItem[];
  onMarkAllRead: () => void;
  /** Mensaje cuando no hay avisos. */
  emptyText?: string;
  footer?: React.ReactNode;
}

const TONOS = {
  brand: 'bg-brand-soft text-brand-strong',
  success: 'bg-success-soft text-success',
  warning: 'bg-warning-soft text-warning',
  danger: 'bg-destructive-soft text-destructive',
};

/* Elevado por proximidad: coseno con radio de 80 px */
const RADIO = 80;
const ELEVACION = 2.5;
const ESCALA = 0.008;

function coseno(cursor: number, centro: number): number {
  const d = Math.abs(cursor - centro);
  return d > RADIO ? 0 : (1 + Math.cos((d / RADIO) * Math.PI)) / 2;
}

type Filtro = 'todas' | 'sin-leer';

export function NotificationInbox({ items, onMarkAllRead, emptyText = 'Todo al día', footer }: NotificationInboxProps) {
  const [filtro, setFiltro] = React.useState<Filtro>('todas');
  const sinLeer = items.filter((n) => !n.read).length;
  const visibles = filtro === 'sin-leer' ? items.filter((n) => !n.read) : items;

  const listaRef = React.useRef<HTMLDivElement>(null);
  const filas = React.useRef<Map<string, HTMLDivElement>>(new Map());
  const raf = React.useRef(0);
  const cursorY = React.useRef<number | null>(null);
  const activo = React.useRef(false);

  const pintar = React.useCallback(() => {
    const lista = listaRef.current;
    if (!lista) return;
    const lr = lista.getBoundingClientRect();
    const cursor = cursorY.current;
    filas.current.forEach((el) => {
      const r = el.getBoundingClientRect();
      const p = cursor !== null ? coseno(cursor, r.top - lr.top + r.height / 2) : 0;
      el.style.transform = p > 0.01 ? `translateY(${-ELEVACION * p}px) scale(${1 + ESCALA * p})` : '';
      el.style.boxShadow = p > 0.06 ? `0 ${(p * 5).toFixed(1)}px ${(p * 14).toFixed(0)}px rgba(0,0,0,${(p * 0.07).toFixed(3)})` : 'none';
    });
    if (activo.current) raf.current = requestAnimationFrame(pintar);
  }, []);

  const alMover = (e: React.MouseEvent) => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const lr = listaRef.current?.getBoundingClientRect();
    if (!lr) return;
    cursorY.current = e.clientY - lr.top;
    if (!activo.current) {
      activo.current = true;
      raf.current = requestAnimationFrame(pintar);
    }
  };

  const alSalir = () => {
    activo.current = false;
    cursorY.current = null;
    cancelAnimationFrame(raf.current);
    filas.current.forEach((el) => {
      el.style.transform = '';
      el.style.boxShadow = 'none';
    });
  };

  React.useEffect(() => () => cancelAnimationFrame(raf.current), []);

  return (
    <div>
      <div className="flex items-center justify-between gap-3 px-4 pb-2 pt-3">
        <div className="flex items-center gap-2">
          <h2 className="text-sm font-semibold text-foreground">Notificaciones</h2>
          <AnimatePresence>
            {sinLeer > 0 && (
              <motion.span
                initial={{ scale: 0.6, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.6, opacity: 0 }}
                transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                className="rounded-full bg-brand-soft px-2 py-0.5 text-xs font-semibold tabular-nums text-brand-strong"
              >
                {sinLeer}
              </motion.span>
            )}
          </AnimatePresence>
        </div>
        <AnimatePresence>
          {sinLeer > 0 && (
            <motion.button
              type="button"
              initial={{ opacity: 0, x: 6 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 6 }}
              transition={{ type: 'spring', stiffness: 400, damping: 28 }}
              onClick={onMarkAllRead}
              className="flex h-10 shrink-0 items-center whitespace-nowrap rounded-[10px] px-2 text-xs font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
            >
              Marcar todas como leídas
            </motion.button>
          )}
        </AnimatePresence>
      </div>

      <div role="tablist" aria-label="Filtrar avisos" className="mx-4 mb-2 flex gap-1 rounded-[10px] bg-secondary p-1">
        {(
          [
            ['todas', 'Todas'],
            ['sin-leer', `Sin leer${sinLeer ? ` (${sinLeer})` : ''}`],
          ] as const
        ).map(([valor, texto]) => (
          <button
            key={valor}
            type="button"
            role="tab"
            aria-selected={filtro === valor}
            onClick={() => setFiltro(valor)}
            className={cn(
              'relative h-8 flex-1 rounded-[7px] text-xs transition-colors duration-150',
              filtro === valor ? 'font-semibold text-foreground' : 'font-medium text-muted-foreground hover:text-foreground'
            )}
          >
            {filtro === valor && (
              <motion.span
                layoutId="bandeja-filtro"
                className="absolute inset-0 rounded-[7px] bg-card shadow-[var(--elev-xs)]"
                transition={{ type: 'spring', stiffness: 420, damping: 34 }}
              />
            )}
            <span className="relative">{texto}</span>
          </button>
        ))}
      </div>

      <div
        ref={listaRef}
        onMouseMove={alMover}
        onMouseLeave={alSalir}
        className="max-h-[min(24rem,55dvh)] overflow-y-auto px-1 pb-1 pt-0.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        style={{
          maskImage: 'linear-gradient(to bottom, transparent, #000 8px, #000 calc(100% - 8px), transparent)',
          WebkitMaskImage: 'linear-gradient(to bottom, transparent, #000 8px, #000 calc(100% - 8px), transparent)',
        }}
      >
        {visibles.length === 0 ? (
          <p className="px-4 py-10 text-center text-sm text-muted-foreground">{filtro === 'sin-leer' ? 'No tienes avisos sin leer' : emptyText}</p>
        ) : (
          <AnimatePresence initial={false}>
            {visibles.map((item) => (
              <motion.div
                key={item.id}
                layout
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ type: 'spring', stiffness: 400, damping: 32 }}
              >
                <div
                  ref={(el) => {
                    if (el) filas.current.set(item.id, el);
                    else filas.current.delete(item.id);
                  }}
                  className="mx-1 flex items-start gap-3 rounded-[10px] px-3 py-2.5 will-change-transform transition-[transform,box-shadow] duration-100"
                >
                  <span className={cn('flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] [&>svg]:h-[18px] [&>svg]:w-[18px]', TONOS[item.tone])}>
                    {item.icon}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className={cn('text-sm leading-snug', item.read ? 'text-muted-foreground' : 'font-medium text-foreground')}>
                      {!item.read && <span className="sr-only">Sin leer: </span>}
                      {item.title}
                    </p>
                    <p className="mt-0.5 text-xs tabular-nums text-muted-foreground">{item.time}</p>
                  </div>
                  <span className="relative mt-2 h-2 w-2 shrink-0" aria-hidden>
                    <AnimatePresence>
                      {!item.read && (
                        <motion.span
                          initial={{ scale: 1, opacity: 1 }}
                          exit={{ scale: 0, opacity: 0 }}
                          transition={{ type: 'spring', stiffness: 500, damping: 28 }}
                          className="absolute inset-0 rounded-full bg-brand"
                        />
                      )}
                    </AnimatePresence>
                  </span>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        )}
      </div>

      {footer && <div className="border-t border-border p-1.5">{footer}</div>}
    </div>
  );
}
