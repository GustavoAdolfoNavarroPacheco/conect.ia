/**
 * Adaptado de "wizard-stepper" de Ruixen UI (MIT, © 2025 Ruixen UI, ver LICENSE.md).
 * Pasos con estados completado / activo / pendiente, anillo del paso activo y conector que se llena.
 * Cambios: icono propio por paso, recorrido automático al entrar en pantalla (se detiene con la interacción
 * o con prefers-reduced-motion), horizontal desde 768 px y vertical por debajo, tokens de Conect.ia.
 */
import * as React from 'react';
import { motion, useInView } from 'motion/react';
import { Check } from 'lucide-react';
import { cn } from '../ui/utils';

export interface StepData {
  title: string;
  description: string;
  icon: React.ReactNode;
}

type EstadoPaso = 'completado' | 'activo' | 'pendiente';

export function StepsStepper({ steps, className, intervalo = 2600 }: { steps: StepData[]; className?: string; intervalo?: number }) {
  const ref = React.useRef<HTMLOListElement>(null);
  const visible = useInView(ref, { once: true, amount: 0.4 });
  const [actual, setActual] = React.useState(0);
  const [manual, setManual] = React.useState(false);

  // Recorrido automático: una vez que entra en pantalla y mientras nadie lo toque.
  React.useEffect(() => {
    if (!visible || manual) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setActual(steps.length - 1);
      return;
    }
    if (actual >= steps.length - 1) return;
    const t = window.setTimeout(() => setActual((a) => a + 1), intervalo);
    return () => window.clearTimeout(t);
  }, [visible, manual, actual, steps.length, intervalo]);

  const elegir = (i: number) => {
    setManual(true);
    setActual(i);
  };

  return (
    <ol ref={ref} className={cn('flex flex-col md:flex-row md:items-start', className)}>
      {steps.map((paso, i) => {
        const estado: EstadoPaso = i < actual ? 'completado' : i === actual ? 'activo' : 'pendiente';
        const ultimo = i === steps.length - 1;
        return (
          <React.Fragment key={paso.title}>
            <li className="md:flex-1">
              <button
                type="button"
                onClick={() => elegir(i)}
                aria-current={estado === 'activo' ? 'step' : undefined}
                className="group flex min-h-11 w-full gap-4 rounded-[12px] p-2 text-left md:flex-col md:items-center md:gap-3 md:text-center"
              >
                <span className="flex flex-col items-center md:flex-row">
                  <Circulo estado={estado} icono={paso.icon} numero={i + 1} />
                </span>
                <span className="min-w-0 pb-4 md:pb-0">
                  <span
                    className={cn(
                      'block text-base font-semibold transition-colors duration-200',
                      estado === 'pendiente' ? 'text-muted-foreground' : 'text-foreground'
                    )}
                  >
                    {paso.title}
                  </span>
                  <span className="mx-auto mt-1 block max-w-[16rem] text-sm text-muted-foreground">{paso.description}</span>
                </span>
              </button>
            </li>
            {!ultimo && <Conector estado={estado} />}
          </React.Fragment>
        );
      })}
    </ol>
  );
}

function Circulo({ estado, icono, numero }: { estado: EstadoPaso; icono: React.ReactNode; numero: number }) {
  return (
    <span className="relative flex">
      {estado === 'activo' && (
        <motion.span
          aria-hidden
          className="absolute -inset-1.5 rounded-full border-2 border-brand/30"
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 400, damping: 25 }}
        />
      )}
      <motion.span
        whileTap={{ scale: 0.92 }}
        transition={{ type: 'spring', stiffness: 500, damping: 30 }}
        className={cn(
          'relative flex h-12 w-12 items-center justify-center rounded-full border text-sm font-semibold transition-colors duration-300 [&>svg]:h-5 [&>svg]:w-5',
          estado === 'completado' && 'border-brand bg-brand text-white',
          estado === 'activo' && 'border-brand bg-brand-soft text-brand-strong shadow-[var(--glow)]',
          estado === 'pendiente' && 'border-border bg-card text-muted-foreground'
        )}
      >
        {estado === 'completado' ? <Check strokeWidth={3} /> : icono}
        <span className="sr-only">Paso {numero}</span>
      </motion.span>
    </span>
  );
}

/** Conector: vertical en móvil, horizontal desde 768 px; se llena al completarse el paso anterior. */
function Conector({ estado }: { estado: EstadoPaso }) {
  const lleno = estado === 'completado';
  return (
    <li aria-hidden className="relative ml-[1.55rem] h-6 w-px shrink-0 overflow-hidden bg-border md:ml-0 md:mt-[1.65rem] md:h-px md:w-12 md:flex-1">
      <motion.span
        className="absolute inset-0 origin-top bg-brand md:hidden"
        initial={false}
        animate={{ scaleY: lleno ? 1 : 0 }}
        transition={{ type: 'spring', stiffness: 260, damping: 30 }}
      />
      <motion.span
        className="absolute inset-0 hidden origin-left bg-brand md:block"
        initial={false}
        animate={{ scaleX: lleno ? 1 : 0 }}
        transition={{ type: 'spring', stiffness: 260, damping: 30 }}
      />
    </li>
  );
}
