/**
 * Adaptado de "number-ticker" de Ruixen UI (MIT, © 2025 Ruixen UI, ver LICENSE.md).
 * Conserva el resorte (damping 60, stiffness 100) que cuenta desde el valor inicial al final cuando entra en
 * pantalla, escribiendo directo en el DOM sin re-renders.
 * Cambios: formato español (es-CO), color heredado (el original fijaba negro/blanco), el valor final se muestra
 * de inmediato con prefers-reduced-motion y si el valor cambia después (datos que llegan) vuelve a animar.
 */
import * as React from 'react';
import { useInView, useMotionValue, useReducedMotion, useSpring } from 'motion/react';
import { cn } from '../ui/utils';

export interface NumberTickerProps extends Omit<React.ComponentPropsWithoutRef<'span'>, 'children'> {
  value: number;
  startValue?: number;
  delay?: number;
  decimalPlaces?: number;
  /** Texto fijo tras el número, p. ej. "%". */
  suffix?: string;
}

export function NumberTicker({ value, startValue = 0, delay = 0, decimalPlaces = 0, suffix = '', className, ...props }: NumberTickerProps) {
  const ref = React.useRef<HTMLSpanElement>(null);
  const reducir = useReducedMotion();
  const motionValue = useMotionValue(reducir ? value : startValue);
  const spring = useSpring(motionValue, { damping: 60, stiffness: 100 });
  const visible = useInView(ref, { once: true, margin: '0px' });

  const formatear = React.useCallback(
    (n: number) =>
      new Intl.NumberFormat('es-CO', { minimumFractionDigits: decimalPlaces, maximumFractionDigits: decimalPlaces }).format(Number(n.toFixed(decimalPlaces))) +
      suffix,
    [decimalPlaces, suffix]
  );

  React.useEffect(() => {
    if (!visible) return;
    if (reducir) {
      motionValue.set(value);
      spring.jump(value);
      return;
    }
    const t = setTimeout(() => motionValue.set(value), delay * 1000);
    return () => clearTimeout(t);
  }, [visible, reducir, value, delay, motionValue, spring]);

  React.useEffect(
    () =>
      spring.on('change', (v) => {
        if (ref.current) ref.current.textContent = formatear(v);
      }),
    [spring, formatear]
  );

  return (
    <span ref={ref} className={cn('inline-block tabular-nums', className)} {...props}>
      {formatear(reducir ? value : startValue)}
    </span>
  );
}
