/**
 * Adaptado de "animated-theme-toggler" de Ruixen UI (MIT, © 2025 Ruixen UI, ver LICENSE.md).
 * El sol se convierte en luna: los rayos se encogen y giran, y una máscara talla la media luna (todo con resortes).
 * Cambios: el estado del tema viene de fuera (ThemeContext, que ya guarda la preferencia y anima el cambio),
 * sin sonido, botón de 40 px con etiqueta accesible, sin animación en el primer pintado.
 */
import * as React from 'react';
import { motion } from 'motion/react';
import { cn } from '../ui/utils';

export interface ThemeToggleProps {
  isDark: boolean;
  onToggle: () => void;
  className?: string;
}

export function ThemeToggle({ isDark, onToggle, className }: ThemeToggleProps) {
  const maskId = `tt${React.useId().replace(/:/g, '')}`;
  const [listo, setListo] = React.useState(false);

  // El primer pintado ya sale en su estado final, sin animar.
  React.useEffect(() => {
    const id = requestAnimationFrame(() => setListo(true));
    return () => cancelAnimationFrame(id);
  }, []);

  const resorte = listo ? { type: 'spring' as const, stiffness: 380, damping: 30 } : { duration: 0 };

  return (
    <motion.button
      type="button"
      onClick={onToggle}
      whileHover={{ scale: 1.08 }}
      whileTap={{ scale: 0.88 }}
      transition={{ type: 'spring', stiffness: 400, damping: 25 }}
      aria-label={isDark ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
      title={isDark ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
      className={cn(
        'relative flex h-10 w-10 shrink-0 items-center justify-center rounded-[10px] text-muted-foreground transition-colors duration-150 hover:bg-accent hover:text-foreground',
        className
      )}
    >
      <motion.svg
        width="20"
        height="20"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        aria-hidden
        initial={false}
        animate={{ rotate: isDark ? 270 : 0 }}
        transition={resorte}
        style={{ overflow: 'visible' }}
      >
        {/* La máscara talla la media luna a partir del círculo central */}
        <mask id={maskId}>
          <rect x="0" y="0" width="100%" height="100%" fill="white" />
          <motion.circle initial={false} animate={{ cx: isDark ? 17 : 33, cy: isDark ? 8 : 0 }} transition={resorte} r="9" fill="black" />
        </mask>

        {/* Cuerpo central: sol pequeño o luna grande */}
        <motion.circle cx="12" cy="12" fill="currentColor" stroke="none" mask={`url(#${maskId})`} initial={false} animate={{ r: isDark ? 9 : 5 }} transition={resorte} />

        {/* Rayos: se encogen y giran al pasar a oscuro */}
        <motion.g
          initial={false}
          animate={{ opacity: isDark ? 0 : 1, scale: isDark ? 0 : 1, rotate: isDark ? -30 : 0 }}
          transition={resorte}
          style={{ transformOrigin: '12px 12px' }}
        >
          <line x1="12" y1="1" x2="12" y2="3" />
          <line x1="12" y1="21" x2="12" y2="23" />
          <line x1="1" y1="12" x2="3" y2="12" />
          <line x1="21" y1="12" x2="23" y2="12" />
          <line x1="5.64" y1="5.64" x2="4.22" y2="4.22" />
          <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
          <line x1="5.64" y1="18.36" x2="4.22" y2="19.78" />
          <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
        </motion.g>
      </motion.svg>
    </motion.button>
  );
}
