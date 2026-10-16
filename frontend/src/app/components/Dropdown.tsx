import React, { useEffect, useId, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'motion/react';
import { Check, ChevronDown } from 'lucide-react';

export type DropdownOption = {
  value: string;
  label: string;
  description?: string;
  icon?: React.ReactNode;
};

type Props = {
  value: string;
  onChange: (value: string) => void;
  options: DropdownOption[];
  label?: string;
  icon?: React.ReactNode;
  placeholder?: string;
  size?: 'sm' | 'md';
  className?: string;
  /** md: 44px (formularios) · sm: 40px (barras). Ningún control baja de 40px. */
  /** Ancho del menú: igual al disparador (por defecto) o automático. */
  menuWidth?: 'trigger' | 'auto';
  align?: 'start' | 'end';
  disabled?: boolean;
  title?: string;
};

/**
 * Desplegable estilizado (reemplaza a <select>). Accesible: rol listbox,
 * teclado (flechas, Inicio/Fin, Enter, Escape, búsqueda por letra) y cierre al hacer clic fuera.
 * El menú se pinta en un portal (no lo recorta un Panel con overflow-hidden) y se abre
 * hacia arriba si no cabe debajo.
 */
const ALTO_MAX = 256;
const SEPARACION = 6;

type Posicion = { left: number; width: number; top?: number; bottom?: number; arriba: boolean };
export function Dropdown({
  value,
  onChange,
  options,
  label,
  icon,
  placeholder = 'Selecciona…',
  size = 'md',
  className = '',
  menuWidth = 'trigger',
  align = 'start',
  disabled = false,
  title,
}: Props) {
  const [open, setOpen] = useState(false);
  const [activo, setActivo] = useState(0);
  const raiz = useRef<HTMLDivElement>(null);
  const disparador = useRef<HTMLButtonElement>(null);
  const lista = useRef<HTMLUListElement>(null);
  const [pos, setPos] = useState<Posicion | null>(null);
  const id = useId();

  const indiceActual = useMemo(() => options.findIndex((o) => o.value === value), [options, value]);
  const seleccion = indiceActual >= 0 ? options[indiceActual] : undefined;

  useEffect(() => {
    if (!open) return;
    setActivo(indiceActual >= 0 ? indiceActual : 0);
    const cerrar = (e: MouseEvent) => {
      const t = e.target as Node;
      if (!raiz.current?.contains(t) && !lista.current?.contains(t)) setOpen(false);
    };
    document.addEventListener('mousedown', cerrar);
    return () => document.removeEventListener('mousedown', cerrar);
  }, [open, indiceActual]);

  useEffect(() => {
    if (open) lista.current?.querySelector<HTMLElement>(`[data-index="${activo}"]`)?.scrollIntoView({ block: 'nearest' });
  }, [activo, open]);

  // Posición fija junto al disparador; se recalcula al desplazar o redimensionar.
  useLayoutEffect(() => {
    if (!open) return;
    const calcular = () => {
      const r = disparador.current?.getBoundingClientRect();
      if (!r) return;
      const alto = Math.min(ALTO_MAX, options.length * 44 + 8);
      const abajo = window.innerHeight - r.bottom;
      const arriba = abajo < alto + SEPARACION + 8 && r.top > abajo;
      const ancho = menuWidth === 'trigger' ? r.width : Math.max(192, r.width);
      const left = menuWidth === 'auto' && align === 'end' ? r.right - ancho : r.left;
      setPos({
        left: Math.max(8, Math.min(left, window.innerWidth - ancho - 8)),
        width: ancho,
        arriba,
        ...(arriba ? { bottom: window.innerHeight - r.top + SEPARACION } : { top: r.bottom + SEPARACION }),
      });
    };
    calcular();
    window.addEventListener('resize', calcular);
    window.addEventListener('scroll', calcular, true);
    return () => {
      window.removeEventListener('resize', calcular);
      window.removeEventListener('scroll', calcular, true);
    };
  }, [open, options.length, menuWidth, align]);

  const elegir = (i: number) => {
    const opt = options[i];
    if (!opt) return;
    onChange(opt.value);
    setOpen(false);
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (disabled) return;
    if (!open && (e.key === 'ArrowDown' || e.key === 'ArrowUp' || e.key === 'Enter' || e.key === ' ')) {
      e.preventDefault();
      setOpen(true);
      return;
    }
    if (!open) return;
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setActivo((i) => Math.min(options.length - 1, i + 1));
        break;
      case 'ArrowUp':
        e.preventDefault();
        setActivo((i) => Math.max(0, i - 1));
        break;
      case 'Home':
        e.preventDefault();
        setActivo(0);
        break;
      case 'End':
        e.preventDefault();
        setActivo(options.length - 1);
        break;
      case 'Enter':
      case ' ':
        e.preventDefault();
        elegir(activo);
        break;
      case 'Escape':
        // Cierra solo la lista: no debe propagarse a un Modal que la contenga.
        e.stopPropagation();
        setOpen(false);
        break;
      case 'Tab':
        setOpen(false);
        break;
      default:
        if (e.key.length === 1) {
          const letra = e.key.toLowerCase();
          const i = options.findIndex((o) => o.label.toLowerCase().startsWith(letra));
          if (i >= 0) setActivo(i);
        }
    }
  };

  const alto = size === 'sm' ? '!min-h-10 h-10 text-sm' : 'h-11 text-sm';

  return (
    <div className={`flex flex-col gap-2 ${className}`} ref={raiz}>
      {label && (
        <span id={`${id}-label`} className="text-sm font-medium text-foreground">
          {label}
        </span>
      )}
      <div className="relative">
        <button
          ref={disparador}
          type="button"
          title={title}
          disabled={disabled}
          aria-haspopup="listbox"
          aria-expanded={open}
          aria-controls={open ? `${id}-lista` : undefined}
          aria-labelledby={label ? `${id}-label` : undefined}
          onClick={() => setOpen((o) => !o)}
          onKeyDown={onKeyDown}
          className={`field press flex items-center gap-2 text-left cursor-pointer ${alto} ${
            open ? '!border-brand shadow-[0_0_0_3px_color-mix(in_srgb,var(--brand)_18%,transparent)]' : ''
          }`}
        >
          {(seleccion?.icon || icon) && (
            <span className="flex shrink-0 items-center text-muted-foreground [&>svg]:h-4 [&>svg]:w-4">
              {seleccion?.icon ?? icon}
            </span>
          )}
          <span className={`flex-1 truncate ${seleccion ? 'text-foreground' : 'text-muted-foreground'}`}>
            {seleccion?.label ?? placeholder}
          </span>
          <ChevronDown
            className={`h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-200 ${open ? 'rotate-180 text-brand-strong' : ''}`}
          />
        </button>

        {typeof document !== 'undefined' &&
          createPortal(
            <AnimatePresence>
              {open && pos && (
                <motion.ul
                  ref={lista}
                  id={`${id}-lista`}
                  role="listbox"
                  aria-labelledby={label ? `${id}-label` : undefined}
                  aria-activedescendant={`${id}-opt-${activo}`}
                  initial={{ opacity: 0, y: pos.arriba ? 6 : -6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: pos.arriba ? 6 : -6 }}
                  transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
                  data-lenis-prevent
                  className="fixed z-[70] overflow-y-auto rounded-xl border border-border bg-popover p-1 shadow-float"
                  style={{ left: pos.left, width: pos.width, top: pos.top, bottom: pos.bottom, maxHeight: ALTO_MAX }}
                >
                  {options.length === 0 && <li className="px-3 py-2.5 text-sm text-muted-foreground">Sin opciones</li>}
                  {options.map((opt, i) => {
                    const elegido = opt.value === value;
                    return (
                      <li
                        key={opt.value}
                        id={`${id}-opt-${i}`}
                        data-index={i}
                        role="option"
                        aria-selected={elegido}
                        onMouseEnter={() => setActivo(i)}
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={() => elegir(i)}
                        className={`flex min-h-10 cursor-pointer items-center gap-2 rounded-lg px-3 py-2 text-sm transition-colors duration-150 ${
                          i === activo ? 'bg-accent text-foreground' : 'text-foreground'
                        }`}
                      >
                        {opt.icon && <span className="flex shrink-0 items-center text-muted-foreground [&>svg]:h-4 [&>svg]:w-4">{opt.icon}</span>}
                        <span className="min-w-0 flex-1">
                          <span className={`block truncate ${elegido ? 'font-medium text-brand-strong' : ''}`}>{opt.label}</span>
                          {opt.description && <span className="block truncate text-xs text-muted-foreground">{opt.description}</span>}
                        </span>
                        {elegido && <Check className="h-4 w-4 shrink-0 text-brand-strong" />}
                      </li>
                    );
                  })}
                </motion.ul>
              )}
            </AnimatePresence>,
            document.body
          )}
      </div>
    </div>
  );
}
