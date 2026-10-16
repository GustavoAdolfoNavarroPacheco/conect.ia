/**
 * Selector de fecha y hora. Componente propio, inspirado en las vistas previas de "calendar-scheduler" y
 * "calendar-planner" de Ruixen UI (rejilla de días + botones de hora; el código público de "calendar-scheduler"
 * es otro diseño, por segmentos). En español, con los tokens de Conect.ia y sin depender del campo nativo,
 * que se ve distinto en cada navegador.
 * Valor: fecha "AAAA-MM-DD" y hora "HH:mm" (el mismo formato que usan hoy las pantallas).
 */
import * as React from 'react';
import { motion } from 'motion/react';
import { CalendarClock, ChevronDown, ChevronLeft, ChevronRight } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover';
import { cn } from '../ui/utils';

const DIAS = ['L', 'M', 'X', 'J', 'V', 'S', 'D'];
const pad = (n: number) => String(n).padStart(2, '0');
const clave = (y: number, m: number, d: number) => `${y}-${pad(m + 1)}-${pad(d)}`;

/** Horarios cada 30 min, de 6:00 a 23:30. */
const HORAS = Array.from({ length: 36 }, (_, i) => {
  const total = 6 * 60 + i * 30;
  return `${pad(Math.floor(total / 60))}:${pad(total % 60)}`;
});

const primeraMayuscula = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

function etiquetaHora(h: string): string {
  const [hh, mm] = h.split(':').map(Number);
  return new Date(2000, 0, 1, hh, mm).toLocaleTimeString('es-CO', { hour: 'numeric', minute: '2-digit', hour12: true });
}

export interface DateTimePickerProps {
  fecha: string;
  hora: string;
  onChange: (fecha: string, hora: string) => void;
  /** Primera fecha elegible, "AAAA-MM-DD". Por defecto, hoy. */
  min?: string;
  label?: string;
  className?: string;
}

export function DateTimePicker({ fecha, hora, onChange, min, label = 'Fecha y hora', className }: DateTimePickerProps) {
  const hoy = React.useMemo(() => new Date(), []);
  const minimo = min ?? clave(hoy.getFullYear(), hoy.getMonth(), hoy.getDate());
  const inicial = fecha ? new Date(`${fecha}T00:00`) : hoy;

  const [abierto, setAbierto] = React.useState(false);
  const [mes, setMes] = React.useState(() => new Date(inicial.getFullYear(), inicial.getMonth(), 1));

  React.useEffect(() => {
    if (abierto && fecha) {
      const f = new Date(`${fecha}T00:00`);
      setMes(new Date(f.getFullYear(), f.getMonth(), 1));
    }
  }, [abierto, fecha]);

  const y = mes.getFullYear();
  const m = mes.getMonth();
  const primero = (new Date(y, m, 1).getDay() + 6) % 7;
  const total = new Date(y, m + 1, 0).getDate();
  const esHoy = (d: number) => clave(y, m, d) === clave(hoy.getFullYear(), hoy.getMonth(), hoy.getDate());
  const antesDelMinimo = (d: number) => clave(y, m, d) < minimo;
  /** Se puede retroceder solo si el mes anterior aún tiene algún día elegible. */
  const ultimoMesAnterior = new Date(y, m, 0);
  const puedeIrAtras = clave(ultimoMesAnterior.getFullYear(), ultimoMesAnterior.getMonth(), ultimoMesAnterior.getDate()) >= minimo;

  /** Un horario ya pasado no se puede elegir si la fecha es hoy. */
  const horaPasada = (h: string) => {
    if (fecha !== clave(hoy.getFullYear(), hoy.getMonth(), hoy.getDate())) return false;
    return new Date(`${fecha}T${h}`).getTime() <= Date.now();
  };

  /** Al abrir, deja a la vista el horario ya elegido (la lista se desplaza dentro de su caja, no la página). */
  const horasRef = React.useRef<HTMLDivElement>(null);
  React.useEffect(() => {
    if (!abierto) return;
    const id = requestAnimationFrame(() => {
      const caja = horasRef.current;
      const elegido = caja?.querySelector<HTMLElement>('[aria-pressed="true"]');
      if (!caja || !elegido) return;
      caja.scrollTop = elegido.offsetTop - caja.offsetTop - (caja.clientHeight - elegido.offsetHeight) / 2;
      caja.scrollLeft = elegido.offsetLeft - caja.offsetLeft - (caja.clientWidth - elegido.offsetWidth) / 2;
    });
    return () => cancelAnimationFrame(id);
    // Solo al abrir: elegir otra hora con el selector abierto no debe mover la lista.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [abierto]);

  const elegirDia = (d: number) => {
    const nueva = clave(y, m, d);
    // Si el horario elegido ya pasó para el nuevo día, se limpia para obligar a elegir otro.
    const horaValida = hora && !(nueva === clave(hoy.getFullYear(), hoy.getMonth(), hoy.getDate()) && new Date(`${nueva}T${hora}`).getTime() <= Date.now());
    onChange(nueva, horaValida ? hora : '');
  };

  const resumen =
    fecha && hora
      ? new Date(`${fecha}T${hora}`).toLocaleString('es-CO', { weekday: 'short', day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit', hour12: true })
      : null;

  return (
    <div className={cn('flex flex-col gap-2', className)}>
      <span className="text-sm font-medium text-foreground">{label}</span>
      <Popover open={abierto} onOpenChange={setAbierto}>
        <PopoverTrigger asChild>
          <button
            type="button"
            aria-label={resumen ? `${label}: ${resumen}. Cambiar` : `${label}: elegir`}
            className="field flex items-center gap-3 text-left"
          >
            <CalendarClock className="h-[18px] w-[18px] shrink-0 text-brand-strong" />
            <span className={cn('flex-1 truncate tabular-nums', resumen ? 'text-foreground' : 'text-muted-foreground')}>
              {resumen ? primeraMayuscula(resumen) : 'Elige fecha y hora'}
            </span>
            <ChevronDown className={cn('h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-200', abierto && 'rotate-180')} />
          </button>
        </PopoverTrigger>

        <PopoverContent align="start" sideOffset={8} collisionPadding={12} className="flex max-h-[var(--radix-popover-content-available-height)] w-[min(22rem,calc(100vw-2rem))] flex-col overflow-hidden rounded-[16px] p-0 sm:w-[35rem] shadow-[var(--elev-float)]">
          <div className="flex min-h-0 flex-1 flex-col overflow-y-auto sm:flex-row sm:overflow-visible">
          <div className="shrink-0 p-3 sm:w-[19rem] sm:p-4">
            <div className="mb-3 flex items-center justify-between">
              <button
                type="button"
                aria-label="Mes anterior"
                disabled={!puedeIrAtras}
                onClick={() => setMes(new Date(y, m - 1, 1))}
                className="press flex h-10 w-10 items-center justify-center rounded-[10px] text-muted-foreground transition-colors hover:bg-accent hover:text-foreground disabled:pointer-events-none disabled:opacity-30"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <p className="text-sm font-semibold text-foreground" aria-live="polite">
                {primeraMayuscula(mes.toLocaleDateString('es-CO', { month: 'long', year: 'numeric' }))}
              </p>
              <button
                type="button"
                aria-label="Mes siguiente"
                onClick={() => setMes(new Date(y, m + 1, 1))}
                className="press flex h-10 w-10 items-center justify-center rounded-[10px] text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>

            <div className="grid grid-cols-7 gap-1 text-center" role="grid" aria-label="Días del mes">
              {DIAS.map((d) => (
                <span key={d} className="py-1 text-xs font-medium text-muted-foreground" aria-hidden>
                  {d}
                </span>
              ))}
              {Array.from({ length: primero }).map((_, i) => (
                <span key={`v${i}`} aria-hidden />
              ))}
              {Array.from({ length: total }).map((_, i) => {
                const d = i + 1;
                const elegido = fecha === clave(y, m, d);
                const bloqueado = antesDelMinimo(d);
                return (
                  <button
                    key={d}
                    type="button"
                    disabled={bloqueado}
                    aria-pressed={elegido}
                    aria-current={esHoy(d) ? 'date' : undefined}
                    onClick={() => elegirDia(d)}
                    className={cn(
                      'press relative flex h-9 items-center justify-center rounded-[10px] text-sm tabular-nums transition-colors duration-150',
                      bloqueado && 'pointer-events-none text-muted-foreground/40',
                      !bloqueado && !elegido && 'text-foreground hover:bg-accent',
                      esHoy(d) && !elegido && 'font-semibold text-brand-strong ring-1 ring-brand/40',
                      elegido && 'font-semibold text-white'
                    )}
                  >
                    {elegido && <motion.span layoutId="selector-dia" className="absolute inset-0 rounded-[10px] bg-brand shadow-[var(--glow)]" transition={{ type: 'spring', stiffness: 420, damping: 34 }} />}
                    <span className="relative">{d}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="flex shrink-0 flex-col border-t border-border p-3 sm:min-h-0 sm:p-4 sm:flex-1 sm:shrink sm:border-l sm:border-t-0">
            <p className="mb-2 text-xs font-semibold text-muted-foreground">Hora</p>
            <div className="flex gap-1.5 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden sm:grid sm:min-h-0 sm:flex-1 sm:grid-cols-2 sm:content-start sm:overflow-y-auto sm:overflow-x-visible sm:pb-0 sm:pr-1" role="group" aria-label="Horarios" ref={horasRef}>
              {HORAS.map((h) => {
                const elegida = hora === h;
                const pasada = horaPasada(h);
                return (
                  <button
                    key={h}
                    type="button"
                    disabled={pasada || !fecha}
                    aria-pressed={elegida}
                    onClick={() => onChange(fecha, h)}
                    className={cn(
                      'press h-10 w-[5.75rem] shrink-0 rounded-[10px] border text-xs sm:h-9 sm:w-auto font-medium tabular-nums transition-colors duration-150',
                      elegida ? 'border-brand bg-brand-soft text-brand-strong' : 'border-border text-foreground hover:bg-accent',
                      (pasada || !fecha) && 'pointer-events-none opacity-40'
                    )}
                  >
                    {etiquetaHora(h)}
                  </button>
                );
              })}
            </div>
            {!fecha && <p className="mt-2 text-xs text-muted-foreground">Primero elige un día.</p>}
          </div>
          </div>

          <div className="flex shrink-0 items-center justify-between gap-3 border-t border-border bg-secondary px-4 py-3">
            <span className="min-w-0 truncate text-xs text-muted-foreground">{resumen ? primeraMayuscula(resumen) : 'Sin elegir'}</span>
            <button
              type="button"
              disabled={!fecha || !hora}
              onClick={() => setAbierto(false)}
              className="press h-10 shrink-0 rounded-[10px] bg-brand px-5 text-sm font-semibold text-white transition-colors hover:bg-brand-strong disabled:pointer-events-none disabled:opacity-50"
            >
              Listo
            </button>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}
