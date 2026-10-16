/**
 * Adaptado de "navbar-floating" de Ruixen UI (MIT, © 2025 Ruixen UI, ver LICENSE.md).
 * Cambios: sin next/link, tokens de Conect.ia, resalte de la sección visible (scroll-spy),
 * pastilla activa animada y menú desplegable en móvil.
 */
import * as React from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Menu, X } from 'lucide-react';
import { cn } from '../ui/utils';

export interface FloatingNavLink {
  label: string;
  /** Ancla de la misma página, p. ej. "#funciones". */
  href: string;
}

export interface FloatingNavbarProps {
  logo: React.ReactNode;
  links: FloatingNavLink[];
  /** Botones de la derecha (tema, iniciar sesión…). Siempre visibles. */
  actions?: React.ReactNode;
  className?: string;
}

export function FloatingNavbar({ logo, links, actions, className }: FloatingNavbarProps) {
  const [activo, setActivo] = React.useState<string | null>(null);
  const [abierto, setAbierto] = React.useState(false);

  // Resalta el enlace de la sección que cruza la franja central de la ventana.
  React.useEffect(() => {
    const elementos = links
      .map((l) => document.getElementById(l.href.replace('#', '')))
      .filter((el): el is HTMLElement => Boolean(el));
    if (!elementos.length) return;
    const observador = new IntersectionObserver(
      (entradas) => {
        for (const e of entradas) if (e.isIntersecting) setActivo(`#${e.target.id}`);
      },
      { rootMargin: '-40% 0px -55% 0px' }
    );
    elementos.forEach((el) => observador.observe(el));
    return () => observador.disconnect();
  }, [links]);

  // Escape cierra el menú móvil.
  React.useEffect(() => {
    if (!abierto) return;
    const alPulsar = (e: KeyboardEvent) => e.key === 'Escape' && setAbierto(false);
    window.addEventListener('keydown', alPulsar);
    return () => window.removeEventListener('keydown', alPulsar);
  }, [abierto]);

  return (
    <div className={cn('sticky top-0 z-50 px-4 pt-4', className)}>
      <div className="relative mx-auto max-w-5xl">
        <header className="surface-glass flex h-14 items-center justify-between gap-2 rounded-full pl-4 pr-2 sm:gap-3 sm:pl-5 shadow-[var(--elev-md)]">
          <a href="#inicio" className="press flex items-center" aria-label="Ir al inicio">
            {logo}
          </a>

          <nav aria-label="Secciones" className="hidden items-center gap-1 md:flex">
            {links.map((link) => {
              const esActivo = activo === link.href;
              return (
                <a
                  key={link.href}
                  href={link.href}
                  aria-current={esActivo ? 'true' : undefined}
                  className={cn(
                    'relative flex h-10 items-center rounded-full px-4 text-sm font-medium transition-colors duration-150',
                    esActivo ? 'text-foreground' : 'text-muted-foreground hover:text-foreground'
                  )}
                >
                  {esActivo && (
                    <motion.span
                      layoutId="navbar-activo"
                      className="absolute inset-0 rounded-full bg-accent"
                      transition={{ type: 'spring', stiffness: 380, damping: 32 }}
                    />
                  )}
                  <span className="relative">{link.label}</span>
                </a>
              );
            })}
          </nav>

          <div className="flex items-center gap-1 sm:gap-2">
            {actions}
            <button
              type="button"
              aria-label={abierto ? 'Cerrar menú' : 'Abrir menú'}
              aria-expanded={abierto}
              onClick={() => setAbierto((v) => !v)}
              className="press flex h-10 w-10 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-accent hover:text-foreground md:hidden"
            >
              {abierto ? <X className="h-[18px] w-[18px]" /> : <Menu className="h-[18px] w-[18px]" />}
            </button>
          </div>
        </header>

        <AnimatePresence>
          {abierto && (
            <motion.nav
              aria-label="Secciones"
              initial={{ opacity: 0, y: -8, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -8, scale: 0.98 }}
              transition={{ duration: 0.18 }}
              className="surface absolute left-0 right-0 top-full mt-2 flex flex-col gap-1 p-2 shadow-[var(--elev-float)] md:hidden"
            >
              {links.map((link) => (
                <a
                  key={link.href}
                  href={link.href}
                  onClick={() => setAbierto(false)}
                  className="flex h-11 items-center rounded-[10px] px-4 text-sm font-medium text-foreground transition-colors hover:bg-accent"
                >
                  {link.label}
                </a>
              ))}
            </motion.nav>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
