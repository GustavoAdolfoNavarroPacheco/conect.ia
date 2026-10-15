import React, { useEffect, useId, useMemo, useRef, useState } from 'react';
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
  /** Ancho del menú: igual al disparador (por defecto) o automático. */
  menuWidth?: 'trigger' | 'auto';
  align?: 'start' | 'end';
  disabled?: boolean;
  title?: string;
};

/**
 * Desplegable estilizado (reemplaza a <select>). Accesible: rol listbox,
 * teclado (flechas, Inicio/Fin, Enter, Escape, búsqueda por letra) y cierre al hacer clic fuera.
 */
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
  const id = useId();

  const indiceActual = useMemo(() => options.findIndex((o) => o.value === value), [options, value]);
  const seleccion = indiceActual >= 0 ? options[indiceActual] : undefined;

  useEffect(() => {
    if (!open) return;
    setActivo(indiceActual >= 0 ? indiceActual : 0);
    const cerrar = (e: MouseEvent) => {
      if (!raiz.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', cerrar);
    return () => document.removeEventListener('mousedown', cerrar);
  }, [open, indiceActual]);

  useEffect(() => {
    if (open) raiz.current?.querySelector<HTMLElement>(`[role="listbox"] [data-index="${activo}"]`)?.scrollIntoView({ block: 'nearest' });
  }, [activo, open]);

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

  const alto = size === 'sm' ? 'h-9 text-sm' : 'h-10 text-sm';

  return (
    <div className={`flex flex-col gap-1.5 ${className}`} ref={raiz}>
      {label && (
        <span id={`${id}-label`} className="text-sm font-medium text-foreground">
          {label}
        </span>
      )}
      <div className="relative">
        <button
          type="button"
          title={title}
          disabled={disabled}
          aria-haspopup="listbox"
          aria-expanded={open}
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

        <AnimatePresence>
          {open && (
            <motion.ul
              role="listbox"
              aria-activedescendant={`${id}-opt-${activo}`}
              initial={{ opacity: 0, y: -6, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -6, scale: 0.98 }}
              transition={{ duration: 0.16, ease: [0.22, 1, 0.36, 1] }}
              className={`absolute z-50 mt-1.5 max-h-64 overflow-y-auto rounded-xl border border-border bg-popover p-1 shadow-lg ${
                menuWidth === 'trigger' ? 'left-0 right-0' : `min-w-[12rem] ${align === 'end' ? 'right-0' : 'left-0'}`
              }`}
              style={{ transformOrigin: 'top' }}
            >
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
                    className={`flex cursor-pointer items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition-colors duration-150 ${
                      i === activo ? 'bg-brand-soft text-foreground' : 'text-foreground'
                    }`}
                  >
                    {opt.icon && <span className="flex shrink-0 items-center text-muted-foreground [&>svg]:h-4 [&>svg]:w-4">{opt.icon}</span>}
                    <span className="flex-1 min-w-0">
                      <span className={`block truncate ${elegido ? 'font-medium text-brand-strong' : ''}`}>{opt.label}</span>
                      {opt.description && <span className="block truncate text-xs text-muted-foreground">{opt.description}</span>}
                    </span>
                    {elegido && <Check className="h-4 w-4 shrink-0 text-brand-strong" />}
                  </li>
                );
              })}
            </motion.ul>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
