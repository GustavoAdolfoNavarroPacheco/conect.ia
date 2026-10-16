import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import {
  Sparkles, Calendar, FileText, Settings,
  Home, PenSquare, MessageSquare, Share2,
  Search, Bell, ChevronDown, X, Check,
  Linkedin, Facebook, Instagram, Music2, Briefcase, Store,
  Clock, Trash2, Edit, Send, Plus,
  Zap, Network, BarChart3, CheckCircle2,
  ArrowRight, Play, Eye, Save, Loader2,
  Filter, Copy, Download, Mail, LogOut, Moon, Sun,
  User, ChevronLeft,
  Upload, Image, Video, FileUp, CalendarClock,
  AlarmClock, Globe, ChevronRight, Info, Menu, Activity
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useAuth } from '../context/AuthContext';
import { ejecutarFlujoPublicacion, getAutomationWebhookUrl } from '../services/make';
import {
  chatWithAgent,
  cuotaIAHoy,
  type CuotaIAHoy,
  estadoProgramador,
  reintentarRedes,
  type EstadoProgramador,
  generateContent as generateContentFn,
  generateVideo as generateVideoFn,
  schedulePost as schedulePostFn,
  publishPostNow as publishPostNowFn,
  processDueScheduledPosts,
} from '../services/cloudFunctions';
import {
  crearPublicacion,
  crearBorrador,
  eliminarBorrador,
  actualizarBorrador,
  eliminarPublicacion,
  actualizarPublicacion,
  registrarActividad,
  guardarCanal,
} from '../lib/db';
import { guardarConfiguracion } from '../lib/db/configuracion';
import type { RedSocial, Borrador, Publicacion } from '../lib/db/types';
import { ConectiaLogo } from './components/ConectiaLogo';
import {
  useBorradores,
  useActividad,
  useCanales,
  useConfiguracion,
  useDashboardStats,
  usePublicacionesProgramadas,
  useInvalidateCampus,
  useChatMensajes,
  useCampusSearch,
} from '../hooks/useCampusData';
import { useTheme } from '../context/ThemeContext';
import { subirArchivoPublicacion, resolverUrlPublicacion, imagenQuedoSinResolver } from '../lib/storage';
import { mensajeCallable } from '../lib/callableError';
import { ChatMessageBody } from './components/ChatMessageBody';
import { SocialPostPreview } from './components/SocialPostPreview';
import { ConnectChannelModal } from './components/ConnectChannelModal';
import { Dropdown } from './components/Dropdown';
import { healthCheck } from '../services/cloudFunctions';
import { toDate, formatRelative, formatDateTime } from '../lib/format';
import { consumePostDraftFromAgent, savePostDraftFromAgent } from '../lib/postDraftBridge';
import { consumeBorradorResume, resumeBorradorAndNavigate } from '../lib/borradorResumeBridge';
import { RED_PRINCIPAL, CATALOGO_REDES, redConfig } from '../lib/redesConfig';
import type { CanalesDoc } from '../lib/db/types';

// ============================================================================
// DESIGN SYSTEM - COMPONENTES REUTILIZABLES
// ============================================================================

// Curva y duraciones únicas del sistema (docs/maquetacion-conectia.md §2.6)
const EASE_OUT = [0.22, 1, 0.36, 1] as const;
const DUR = 0.24;
const TRANSICION = { duration: DUR, ease: EASE_OUT };

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

/**
 * Atrapa el foco dentro de `ref` mientras `activo`: lleva el foco al primer control
 * (o a `inicial`), cicla con Tab y lo devuelve al disparador al cerrar.
 */
function useFocusTrap(ref: React.RefObject<HTMLElement | null>, activo: boolean, inicial?: React.RefObject<HTMLElement | null>) {
  useEffect(() => {
    if (!activo) return;
    const previo = document.activeElement as HTMLElement | null;
    const t = window.setTimeout(() => {
      const el = inicial?.current ?? ref.current?.querySelector<HTMLElement>(FOCUSABLE) ?? ref.current;
      el?.focus({ preventScroll: true });
    }, 0);
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Tab' || !ref.current) return;
      const items = [...ref.current.querySelectorAll<HTMLElement>(FOCUSABLE)].filter((n) => n.offsetParent !== null);
      if (items.length === 0) return;
      const primero = items[0];
      const ultimo = items[items.length - 1];
      if (e.shiftKey && document.activeElement === primero) {
        e.preventDefault();
        ultimo.focus();
      } else if (!e.shiftKey && document.activeElement === ultimo) {
        e.preventDefault();
        primero.focus();
      }
    };
    document.addEventListener('keydown', onKey);
    return () => {
      window.clearTimeout(t);
      document.removeEventListener('keydown', onKey);
      // Un tick después: el disparador puede seguir `inert` mientras se cierran otros efectos.
      window.setTimeout(() => previo?.focus?.({ preventScroll: true }), 0);
    };
  }, [activo, ref, inicial]);
}

/** Bloquea el scroll del documento mientras `activo`. */
function useScrollLock(activo: boolean) {
  useEffect(() => {
    if (!activo) return;
    const html = document.documentElement;
    const previo = html.style.overflow;
    html.style.overflow = 'hidden';
    return () => {
      html.style.overflow = previo;
    };
  }, [activo]);
}

// Button Component
interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'success' | 'destructive' | 'outline' | 'liquid';
  /** md 40px · lg 44px. `sm` se conserva por compatibilidad y mide también 40px (ningún control baja de 40). */
  size?: 'sm' | 'md' | 'lg';
  icon?: React.ReactNode;
  children: React.ReactNode;
}

const Button: React.FC<ButtonProps> = ({ variant = 'primary', size = 'md', icon, children, className = '', ...props }) => {
  const base =
    'press inline-flex items-center justify-center gap-2 rounded-[10px] font-medium whitespace-nowrap select-none cursor-pointer transition-[background-color,color,border-color] duration-150 ease-out disabled:opacity-50 disabled:cursor-not-allowed';

  const primario = 'bg-brand text-white hover:bg-brand-strong';
  const variants = {
    primary: primario,
    liquid: primario,
    secondary: 'border border-border bg-secondary text-secondary-foreground hover:bg-accent',
    ghost: 'bg-transparent text-muted-foreground hover:bg-accent hover:text-foreground',
    success: 'bg-success text-white hover:brightness-110',
    destructive: 'bg-destructive-soft text-destructive hover:bg-destructive hover:text-white',
    outline: 'border border-border bg-card text-foreground hover:bg-accent',
  };

  const sizes = {
    sm: 'h-10 px-3 text-sm [&_svg]:h-4 [&_svg]:w-4',
    md: 'h-10 px-4 text-sm [&_svg]:h-4 [&_svg]:w-4',
    lg: 'h-11 px-5 text-sm [&_svg]:h-[18px] [&_svg]:w-[18px]',
  };

  return (
    <button className={`${base} ${variants[variant]} ${sizes[size]} ${className}`} {...props}>
      {icon && <span className="flex shrink-0 items-center justify-center">{icon}</span>}
      {children}
    </button>
  );
};

/** Botón cuadrado de icono (40×40) con nombre accesible obligatorio. */
const IconButton = React.forwardRef<
  HTMLButtonElement,
  React.ButtonHTMLAttributes<HTMLButtonElement> & { label: string; tone?: 'default' | 'danger'; active?: boolean }
>(({ label, tone = 'default', active = false, className = '', children, ...props }, ref) => (
  <button
    ref={ref}
    type="button"
    aria-label={label}
    title={label}
    className={`press relative flex h-10 w-10 shrink-0 items-center justify-center rounded-[10px] transition-colors duration-150 disabled:cursor-not-allowed disabled:opacity-50 [&_svg]:h-[18px] [&_svg]:w-[18px] ${
      active
        ? 'bg-accent text-foreground'
        : tone === 'danger'
          ? 'text-muted-foreground hover:bg-destructive-soft hover:text-destructive'
          : 'text-muted-foreground hover:bg-accent hover:text-foreground'
    } ${className}`}
    {...props}
  >
    {children}
  </button>
));
IconButton.displayName = 'IconButton';

// Input Component
interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
  icon?: React.ReactNode;
}

const Input: React.FC<InputProps> = ({ label, error, hint, icon, className = '', id, ...props }) => {
  const autoId = React.useId();
  const campoId = id ?? autoId;
  return (
    <div className="flex flex-col gap-2">
      {label && (
        <label htmlFor={campoId} className="text-sm font-medium text-foreground">
          {label}
        </label>
      )}
      <div className="relative">
        {icon && (
          <div className="pointer-events-none absolute left-4 top-1/2 flex -translate-y-1/2 items-center text-muted-foreground [&>svg]:h-4 [&>svg]:w-4">
            {icon}
          </div>
        )}
        <input
          id={campoId}
          aria-invalid={error ? true : undefined}
          className={`field ${icon ? 'pl-10' : ''} ${error ? '!border-destructive' : ''} ${className}`}
          {...props}
        />
      </div>
      {error ? (
        <span className="-mt-1 text-xs text-destructive">{error}</span>
      ) : (
        hint && <span className="-mt-1 text-xs text-muted-foreground">{hint}</span>
      )}
    </div>
  );
};

// Textarea Component
interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
}

const Textarea: React.FC<TextareaProps> = ({ label, error, className = '', id, ...props }) => {
  const autoId = React.useId();
  const campoId = id ?? autoId;
  return (
    <div className="flex flex-col gap-2">
      {label && (
        <label htmlFor={campoId} className="text-sm font-medium text-foreground">
          {label}
        </label>
      )}
      <textarea
        id={campoId}
        className={`field min-h-11 resize-none py-3 leading-5 ${error ? '!border-destructive' : ''} ${className}`}
        {...props}
      />
      {error && <span className="-mt-1 text-xs text-destructive">{error}</span>}
    </div>
  );
};

// Toggle Component: la zona de activación es toda la fila (mín. 40px)
interface ToggleProps {
  label?: string;
  description?: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
}

const Toggle: React.FC<ToggleProps> = ({ label, description, checked, onChange, disabled = false }) => {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={`flex min-h-10 w-full items-center justify-between gap-4 rounded-[10px] text-left disabled:cursor-not-allowed disabled:opacity-50 ${
        disabled ? '' : 'cursor-pointer'
      }`}
    >
      {(label || description) && (
        <span className="min-w-0">
          {label && <span className="block text-sm font-medium text-foreground">{label}</span>}
          {description && <span className="block text-xs text-muted-foreground">{description}</span>}
        </span>
      )}
      <span
        className={`flex h-6 w-10 shrink-0 items-center rounded-full p-0.5 transition-colors duration-[240ms] ${
          checked ? 'justify-end bg-brand' : 'justify-start bg-switch-background'
        }`}
      >
        <motion.span layout className="h-5 w-5 rounded-full bg-white shadow-sm" transition={TRANSICION} />
      </span>
    </button>
  );
};

// Checkbox Component: la zona de activación es la fila completa (mín. 40px)
interface CheckboxProps {
  label?: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
  icon?: React.ReactNode;
}

const Checkbox: React.FC<CheckboxProps> = ({ label, checked, onChange, disabled = false, icon }) => {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className="group flex min-h-10 items-center gap-3 rounded-[10px] text-left disabled:cursor-not-allowed disabled:opacity-50"
    >
      <span
        className={`flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-[6px] border transition-colors duration-150 ${
          checked ? 'border-brand bg-brand' : 'border-input bg-input-background group-hover:border-brand'
        }`}
      >
        {checked && <Check className="h-3 w-3 text-white" strokeWidth={3} />}
      </span>
      <span className="flex items-center gap-2">
        {icon && <span className="h-4 w-4 text-muted-foreground">{icon}</span>}
        {label && <span className="text-sm font-medium text-foreground">{label}</span>}
      </span>
    </button>
  );
};

// Badge Component
interface BadgeProps {
  children: React.ReactNode;
  variant?: 'default' | 'success' | 'warning' | 'danger' | 'purple';
  className?: string;
}

const Badge: React.FC<BadgeProps> = ({ children, variant = 'default', className = '' }) => {
  const variants = {
    default: 'bg-secondary text-muted-foreground',
    success: 'bg-success-soft text-success',
    warning: 'bg-warning-soft text-warning',
    danger: 'bg-destructive-soft text-destructive',
    purple: 'bg-brand-soft text-brand-strong',
  };

  return (
    <span className={`inline-flex h-6 shrink-0 items-center gap-1 rounded-[6px] px-2 text-xs font-medium ${variants[variant]} ${className}`}>
      {children}
    </span>
  );
};

// Card Component
interface CardProps {
  children: React.ReactNode;
  className?: string;
  hover?: boolean;
}

const Card: React.FC<CardProps> = ({ children, className = '', hover = false }) => {
  return <div className={`surface p-6 ${hover ? 'hover-lift' : ''} ${className}`}>{children}</div>;
};

// Modal Component: centrado desde 640px; hoja inferior en móvil
interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  maxWidthClass?: string;
}

const Modal: React.FC<ModalProps> = ({ isOpen, onClose, title, children, footer, maxWidthClass = 'sm:max-w-md' }) => {
  const panel = useRef<HTMLDivElement>(null);
  useFocusTrap(panel, isOpen);
  useScrollLock(isOpen);

  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen, onClose]);

  // Compatibilidad: los usos antiguos pasan "max-w-xl" sin prefijo.
  const ancho = maxWidthClass.startsWith('max-w') ? `sm:${maxWidthClass}` : maxWidthClass;

  // En portal: la rueda sobre el fondo no debe mover el contenido de detrás (p. ej. en móvil).
  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={TRANSICION}
            className="absolute inset-0 bg-black/45"
            onClick={onClose}
          />
          <motion.div
            ref={panel}
            role="dialog"
            aria-modal="true"
            aria-label={title}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 12 }}
            transition={TRANSICION}
            className={`relative flex max-h-[88dvh] w-full flex-col overflow-hidden rounded-t-2xl border border-border bg-card shadow-float sm:rounded-2xl ${ancho}`}
          >
            <div className="flex shrink-0 items-center justify-between gap-4 border-b border-border py-3 pl-6 pr-4">
              <h3 className="truncate text-base font-semibold">{title}</h3>
              <IconButton label="Cerrar" onClick={onClose}>
                <X />
              </IconButton>
            </div>
            <div className={`min-h-0 flex-1 overflow-y-auto p-6 ${footer ? '' : 'pb-[max(24px,env(safe-area-inset-bottom))]'}`}>
              {children}
            </div>
            {footer && (
              <div className="flex shrink-0 flex-wrap items-center justify-end gap-3 border-t border-border bg-accent/50 px-6 pb-[max(16px,env(safe-area-inset-bottom))] pt-4">
                {footer}
              </div>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body
  );
};

/**
 * Confirmación de acciones destructivas con Modal (sustituye a window.confirm).
 * Uso: const [confirmar, dialogo] = useConfirm(); … if (await confirmar({...})) …; render {dialogo}
 */
type OpcionesConfirmacion = {
  titulo: string;
  mensaje: string;
  accion: string;
  destructiva?: boolean;
  /** Resumen en filas (p. ej. redes, medio, aviso de IA, cuándo) para revisar antes de confirmar. */
  detalles?: { etiqueta: string; valor: string }[];
};
function useConfirm(): [(o: OpcionesConfirmacion) => Promise<boolean>, React.ReactNode] {
  const [estado, setEstado] = useState<(OpcionesConfirmacion & { resolver: (v: boolean) => void }) | null>(null);
  const confirmar = useCallback(
    (o: OpcionesConfirmacion) => new Promise<boolean>((resolver) => setEstado({ ...o, resolver })),
    []
  );
  const cerrar = (v: boolean) => {
    estado?.resolver(v);
    setEstado(null);
  };
  const dialogo = (
    <Modal
      isOpen={estado !== null}
      onClose={() => cerrar(false)}
      title={estado?.titulo ?? ''}
      footer={
        <>
          <Button variant="outline" onClick={() => cerrar(false)}>
            Cancelar
          </Button>
          <Button
            variant="primary"
            className={estado?.destructiva !== false ? '!bg-destructive hover:!brightness-110' : ''}
            onClick={() => cerrar(true)}
          >
            {estado?.accion}
          </Button>
        </>
      }
    >
      <p className="text-sm text-muted-foreground">{estado?.mensaje}</p>
      {estado?.detalles && (
        <dl className="mt-4 divide-y divide-border rounded-xl border border-border text-sm">
          {estado.detalles.map((d) => (
            <div key={d.etiqueta} className="flex justify-between gap-4 px-3 py-2">
              <dt className="text-muted-foreground">{d.etiqueta}</dt>
              <dd className="text-right font-medium text-foreground [overflow-wrap:anywhere]">{d.valor}</dd>
            </div>
          ))}
        </dl>
      )}
    </Modal>
  );
  return [confirmar, dialogo];
}

// Toast Notification: abajo (no tapa la topbar)
interface ToastProps {
  message: string;
  type?: 'success' | 'error' | 'info';
  show: boolean;
}

const Toast: React.FC<ToastProps> = ({ message, type = 'success', show }) => {
  const icons = {
    success: <CheckCircle2 className="h-4 w-4 text-success" />,
    error: <X className="h-4 w-4 text-destructive" />,
    info: <Info className="h-4 w-4 text-brand-strong" />,
  };
  const tints = {
    success: 'bg-success-soft',
    error: 'bg-destructive-soft',
    info: 'bg-brand-soft',
  };

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          role={type === 'error' ? 'alert' : 'status'}
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 12 }}
          transition={TRANSICION}
          className="fixed inset-x-4 bottom-[max(16px,env(safe-area-inset-bottom))] z-[60] flex items-center gap-3 rounded-xl border border-border bg-popover px-4 py-3 shadow-float sm:inset-x-auto sm:bottom-5 sm:right-5 sm:max-w-sm"
        >
          <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-[6px] ${tints[type]}`}>{icons[type]}</span>
          <span className="text-sm font-medium text-foreground">{message}</span>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

// Loading Skeleton (radio 6 en líneas de texto; pasar rounded-[10px]/rounded-2xl para controles/superficies)
const Skeleton: React.FC<{ className?: string }> = ({ className = '' }) => {
  return <div aria-hidden className={`skeleton rounded-[6px] ${className}`} />;
};

// ----------------------------------------------------------------------------
// Layout de pantallas funcionales (§3.5)
// - < 1024: este contenedor es el único scroll; los Paneles crecen con su contenido.
// - ≥ 1024: la pantalla ocupa el alto disponible y cada pantalla tiene un único scroll
//   interno. Si una altura muy corta no cabe, el contenedor desplaza en vez de recortar.
// ----------------------------------------------------------------------------

const ScreenLayout: React.FC<{ children: React.ReactNode; maxWidth?: string; className?: string }> = ({
  children,
  maxWidth = 'max-w-[1440px]',
  className = '',
}) => (
  <div className="h-full w-full overflow-y-auto">
    <div className={`mx-auto flex w-full ${maxWidth} flex-col gap-6 p-4 sm:p-6 lg:h-full lg:p-8 ${className}`}>
      {children}
    </div>
  </div>
);

const PageHeader: React.FC<{ title: string; subtitle?: string; actions?: React.ReactNode }> = ({ title, subtitle, actions }) => (
  <header className="flex shrink-0 flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
    <div className="min-w-0">
      <h1 className="truncate text-2xl font-semibold tracking-tight text-foreground" title={title}>
        {title}
      </h1>
      {subtitle && <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>}
    </div>
    {actions && (
      <div className="flex shrink-0 flex-wrap items-center gap-2 [&>*]:flex-1 sm:[&>*]:flex-none">{actions}</div>
    )}
  </header>
);

const Panel: React.FC<{
  title?: React.ReactNode;
  icon?: React.ReactNode;
  actions?: React.ReactNode;
  footer?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  bodyClassName?: string;
  /** Scroll interno del cuerpo; solo desde 1024 (por debajo, el Panel crece). */
  scroll?: boolean;
  /** Obsoleto: sin escalonado dentro de las pantallas. */
  delay?: number;
}> = ({ title, icon, actions, footer, children, className = '', bodyClassName = '', scroll = true }) => (
  <section className={`surface-flat flex min-h-0 flex-col overflow-hidden ${className}`}>
    {(title || actions) && (
      <div className="flex h-14 shrink-0 items-center justify-between gap-3 border-b border-border px-5 lg:px-6">
        <h2 className="flex min-w-0 items-center gap-2 text-sm font-semibold text-foreground">
          {icon && <span className="flex shrink-0 text-brand-strong [&>svg]:h-4 [&>svg]:w-4">{icon}</span>}
          <span className="truncate">{title}</span>
        </h2>
        {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
      </div>
    )}
    <div className={`min-h-0 flex-1 p-5 lg:p-6 ${scroll ? 'lg:overflow-y-auto' : ''} ${bodyClassName}`}>{children}</div>
    {footer && <div className="shrink-0 border-t border-border bg-accent/40 px-5 py-3 lg:px-6">{footer}</div>}
  </section>
);

/** Control segmentado (radiogroup): ítems de 40px, flechas para cambiar. */
const Segmented: React.FC<{
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: React.ReactNode }[];
  className?: string;
  full?: boolean;
  ariaLabel?: string;
}> = ({ value, onChange, options, className = '', full = false, ariaLabel }) => {
  const id = React.useId();
  const refs = useRef<(HTMLButtonElement | null)[]>([]);
  const mover = (e: React.KeyboardEvent, i: number) => {
    const delta = e.key === 'ArrowRight' || e.key === 'ArrowDown' ? 1 : e.key === 'ArrowLeft' || e.key === 'ArrowUp' ? -1 : 0;
    if (!delta) return;
    e.preventDefault();
    const n = (i + delta + options.length) % options.length;
    onChange(options[n].value);
    refs.current[n]?.focus();
  };
  return (
    <div
      role="radiogroup"
      aria-label={ariaLabel}
      className={`relative ${full ? 'grid w-full' : 'inline-flex'} rounded-[10px] border border-border bg-secondary p-1 ${className}`}
      style={full ? { gridTemplateColumns: `repeat(${options.length}, minmax(0, 1fr))` } : undefined}
    >
      {options.map((o, i) => {
        const activo = o.value === value;
        return (
          <button
            key={o.value}
            ref={(el) => {
              refs.current[i] = el;
            }}
            type="button"
            role="radio"
            aria-checked={activo}
            tabIndex={activo ? 0 : -1}
            onClick={() => onChange(o.value)}
            onKeyDown={(e) => mover(e, i)}
            className={`relative z-10 flex h-10 items-center justify-center gap-1.5 whitespace-nowrap rounded-[6px] px-3 text-sm transition-colors duration-150 ${
              activo ? 'font-medium text-foreground' : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            {activo && (
              <motion.span
                layoutId={`seg-${id}`}
                className="absolute inset-0 -z-10 rounded-[6px] bg-card shadow-sm"
                transition={TRANSICION}
              />
            )}
            {o.label}
          </button>
        );
      })}
    </div>
  );
};

/** Aviso contextual (info, éxito, advertencia, error). */
const Notice: React.FC<{
  tone?: 'info' | 'success' | 'warning' | 'danger';
  icon?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  action?: React.ReactNode;
}> = ({ tone = 'info', icon, children, className = '', action }) => {
  const tones = {
    info: { box: 'bg-brand-soft border-brand/20', icon: 'text-brand-strong', def: <Info /> },
    success: { box: 'bg-success-soft border-success/20', icon: 'text-success', def: <CheckCircle2 /> },
    warning: { box: 'bg-warning-soft border-warning/25', icon: 'text-warning', def: <AlarmClock /> },
    danger: { box: 'bg-destructive-soft border-destructive/20', icon: 'text-destructive', def: <Info /> },
  }[tone];
  return (
    <div
      role={tone === 'danger' ? 'alert' : 'status'}
      className={`flex items-start gap-3 rounded-xl border px-4 py-3 text-sm text-foreground ${tones.box} ${className}`}
    >
      <span className={`mt-0.5 flex shrink-0 [&>svg]:h-4 [&>svg]:w-4 ${tones.icon}`}>{icon ?? tones.def}</span>
      <div className="min-w-0 flex-1">{children}</div>
      {action && <div className="-my-1.5 shrink-0">{action}</div>}
    </div>
  );
};

/** Estado vacío estándar. */
const EmptyState: React.FC<{ icon: React.ReactNode; title: string; text?: string; action?: React.ReactNode }> = ({
  icon,
  title,
  text,
  action,
}) => (
  <div className="flex h-full min-h-[220px] flex-col items-center justify-center px-6 py-10 text-center">
    <span className="mb-4 flex h-12 w-12 items-center justify-center rounded-[10px] bg-brand-soft text-brand-strong [&>svg]:h-6 [&>svg]:w-6">
      {icon}
    </span>
    <p className="text-sm font-semibold text-foreground">{title}</p>
    {text && <p className="mt-1 max-w-xs text-sm text-muted-foreground">{text}</p>}
    {action && <div className="mt-5">{action}</div>}
  </div>
);

/** Contenedor de icono con tinte de marca (36px; variante `lg` de 44px con icono de 20). */
const IconTile: React.FC<{
  children: React.ReactNode;
  tone?: 'brand' | 'success' | 'warning' | 'danger' | 'neutral';
  size?: 'md' | 'lg';
  className?: string;
}> = ({ children, tone = 'brand', size = 'md', className = '' }) => {
  const tones = {
    brand: 'bg-brand-soft text-brand-strong',
    success: 'bg-success-soft text-success',
    warning: 'bg-warning-soft text-warning',
    danger: 'bg-destructive-soft text-destructive',
    neutral: 'bg-secondary text-muted-foreground',
  };
  const tam = size === 'lg' ? 'h-11 w-11 [&>svg]:h-5 [&>svg]:w-5' : 'h-9 w-9 [&>svg]:h-[18px] [&>svg]:w-[18px]';
  return (
    <span className={`flex shrink-0 items-center justify-center rounded-[10px] ${tam} ${tones[tone]} ${className}`}>
      {children}
    </span>
  );
};

const ZONAS_HORARIAS = [
  { value: 'America/Bogota', label: 'Colombia (UTC-5)' },
  { value: 'America/Mexico_City', label: 'México (UTC-6)' },
  { value: 'America/Lima', label: 'Perú (UTC-5)' },
  { value: 'America/Argentina/Buenos_Aires', label: 'Argentina (UTC-3)' },
  { value: 'Europe/Madrid', label: 'España (UTC+1)' },
  { value: 'UTC', label: 'UTC' },
];

// ============================================================================
// PANTALLA 1: LANDING PAGE
// ============================================================================

const LandingPage: React.FC<{ onNavigate: (screen: string) => void }> = ({ onNavigate }) => {
  const { mode, toggleTheme } = useTheme();

  const funciones = [
    {
      title: 'Asistente IA con Gemini',
      icon: <Sparkles />,
      desc: 'Genera copy profesional en segundos. El asistente entiende tu tono y adapta cada publicación a la red de destino.',
      features: ['Copy persuasivo y relevante', 'Imágenes y video con IA', 'Hashtags sugeridos'],
    },
    {
      title: 'Automatización Make / n8n',
      icon: <Network />,
      desc: 'Conecta tus flujos de trabajo para aprobar, notificar y publicar sin pasos manuales.',
      features: ['Webhooks configurables', 'Notificaciones automáticas', 'Flujos a tu medida'],
    },
    {
      title: 'Publicación oficial',
      icon: <Share2 />,
      desc: 'Publica en LinkedIn, Facebook, Instagram y TikTok con conexiones OAuth oficiales de cada plataforma.',
      features: ['APIs oficiales', 'Programación por fecha y hora', 'Calendario editorial'],
    },
  ];

  const pasos = [
    { icon: <PenSquare />, title: 'Escribe el tema', desc: 'Describe en una línea lo que quieres comunicar.' },
    { icon: <Sparkles />, title: 'La IA redacta', desc: 'Obtén un borrador listo para tu red.' },
    { icon: <Eye />, title: 'Revisa y ajusta', desc: 'Edita el texto con vista previa en vivo.' },
    { icon: <CalendarClock />, title: 'Programa', desc: 'Elige fecha y hora, o publica al instante.' },
  ];

  return (
    <div className="ambient-light relative min-h-full bg-background">
      {/* Luces de fondo (sutiles) */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
        <div className="absolute -left-40 -top-40 h-[28rem] w-[28rem] animate-pulse-slow rounded-full bg-brand/15 blur-[120px]" />
        <div className="absolute -right-32 top-[28rem] h-[24rem] w-[24rem] animate-pulse-slow rounded-full bg-brand-light/10 blur-[120px] [animation-delay:2s]" />
      </div>

      {/* Header */}
      <header className="surface-glass sticky top-0 z-40 border-x-0 border-t-0">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-6 px-6">
          <a href="#inicio" className="press">
            <ConectiaLogo size="md" />
          </a>
          <nav className="hidden items-center gap-8 text-sm text-muted-foreground md:flex">
            <a href="#funciones" className="link-underline transition-colors hover:text-foreground">Funciones</a>
            <a href="#como-funciona" className="link-underline transition-colors hover:text-foreground">Cómo funciona</a>
          </nav>
          <div className="flex items-center gap-2">
            <button
              type="button"
              aria-label={mode === 'dark' ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
              onClick={toggleTheme}
              className="press flex h-9 w-9 items-center justify-center rounded-[10px] text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
            >
              {mode === 'dark' ? <Sun className="h-[18px] w-[18px]" /> : <Moon className="h-[18px] w-[18px]" />}
            </button>
            <Button variant="liquid" onClick={() => onNavigate('login')}>
              Iniciar sesión
            </Button>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section id="inicio" className="relative z-10 mx-auto max-w-6xl scroll-mt-20 px-6 pb-20 pt-16 lg:pt-24">
        <div className="grid items-center gap-14 lg:grid-cols-[1.05fr_1fr]">
          <div className="stagger space-y-7">
            <span className="inline-flex h-8 items-center gap-2 rounded-full border border-brand/20 bg-brand-soft px-3.5 text-xs font-medium text-brand-strong">
              <Sparkles className="h-3.5 w-3.5" />
              Potenciado por Gemini IA · Campuslands
            </span>
            <h1 className="text-4xl font-semibold leading-tight tracking-tight text-foreground sm:text-5xl lg:text-6xl">
              Automatiza tus redes con <span className="text-gradient-brand">Inteligencia Artificial</span>
            </h1>
            <p className="max-w-xl text-base leading-relaxed text-muted-foreground">
              Conect.ia genera, programa y publica contenido para LinkedIn, Facebook, Instagram y TikTok desde un solo
              panel, con conexiones oficiales y un asistente que escribe contigo.
            </p>
            <div className="flex flex-wrap items-center gap-3">
              <Button variant="liquid" size="lg" icon={<PenSquare />} onClick={() => onNavigate('new-post')}>
                Crear publicación
              </Button>
              <Button variant="outline" size="lg" icon={<ArrowRight />} onClick={() => onNavigate('login')}>
                Ingresar al panel
              </Button>
            </div>
            <ul className="flex flex-wrap items-center gap-x-6 gap-y-2 pt-1 text-sm text-muted-foreground">
              {['Configuración en minutos', 'Vista previa en vivo', 'Programación automática'].map((t) => (
                <li key={t} className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-success" />
                  {t}
                </li>
              ))}
            </ul>
          </div>

          {/* Ilustración */}
          <div className="relative" data-reveal="scale">
            <div className="absolute inset-8 rounded-3xl bg-brand/20 blur-3xl" aria-hidden />
            <div className="surface relative overflow-hidden shadow-lg">
              <div className="flex h-10 items-center gap-2 border-b border-border px-4">
                <span className="h-2.5 w-2.5 rounded-full bg-[#ff5f57]" />
                <span className="h-2.5 w-2.5 rounded-full bg-[#febc2e]" />
                <span className="h-2.5 w-2.5 rounded-full bg-[#28c840]" />
                <span className="ml-3 text-xs text-muted-foreground">Nueva publicación</span>
              </div>
              <div className="space-y-5 p-6 sm:p-8">
                <div className="flex items-center justify-center gap-5">
                  <div className="flex h-16 w-16 animate-float items-center justify-center rounded-2xl bg-brand text-white shadow-[var(--glow)]">
                    <Sparkles className="h-7 w-7" />
                  </div>
                  <div className="flex items-center gap-1.5 text-muted-foreground">
                    <span className="h-1.5 w-1.5 rounded-full bg-current opacity-40" />
                    <span className="h-1.5 w-1.5 rounded-full bg-current opacity-60" />
                    <ArrowRight className="h-5 w-5 text-brand-strong" />
                  </div>
                  <div className="flex h-16 w-16 animate-float items-center justify-center rounded-2xl bg-[#0a66c2] text-white shadow-md [animation-delay:1.5s]">
                    <Linkedin className="h-7 w-7" />
                  </div>
                </div>
                <div className="surface-muted space-y-3 p-5">
                  <div className="flex items-center gap-3">
                    <div className="h-9 w-9 rounded-full bg-brand-soft" />
                    <div className="space-y-1.5">
                      <div className="h-2.5 w-24 rounded-full bg-muted-foreground/25" />
                      <div className="h-2 w-16 rounded-full bg-muted-foreground/15" />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className="skeleton h-2.5 w-full rounded-full" />
                    <div className="skeleton h-2.5 w-[86%] rounded-full" />
                    <div className="skeleton h-2.5 w-[62%] rounded-full" />
                  </div>
                </div>
                <div className="flex items-center justify-between rounded-xl border border-border px-4 py-3">
                  <span className="flex items-center gap-2 text-sm text-muted-foreground">
                    <CalendarClock className="h-4 w-4 text-brand-strong" />
                    Mañana · 9:00 a. m.
                  </span>
                  <Badge variant="success">Programado</Badge>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Capacidades */}
      <section className="relative z-10 border-y border-border bg-card/60">
        <div className="mx-auto grid max-w-6xl grid-cols-2 gap-6 px-6 py-8 md:grid-cols-4">
          {[
            { icon: <Share2 />, t: '4 redes', d: 'LinkedIn, Meta y TikTok' },
            { icon: <Sparkles />, t: 'IA generativa', d: 'Texto, imagen y video' },
            { icon: <CheckCircle2 />, t: 'OAuth oficial', d: 'Sin atajos ni riesgos' },
            { icon: <CalendarClock />, t: 'Programación', d: 'Fecha y hora exactas' },
          ].map((c, i) => (
            <div key={c.t} className="flex items-center gap-3" data-reveal style={{ '--reveal-delay': `${i * 70}ms` } as React.CSSProperties}>
              <IconTile>{c.icon}</IconTile>
              <div>
                <p className="text-sm font-semibold text-foreground">{c.t}</p>
                <p className="text-xs text-muted-foreground">{c.d}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Funciones */}
      <section id="funciones" className="relative z-10 mx-auto max-w-6xl scroll-mt-20 px-6 py-24">
        <div className="mx-auto mb-14 max-w-2xl text-center" data-reveal>
          <p className="mb-3 text-xs font-semibold uppercase tracking-[0.18em] text-brand-strong">Funciones</p>
          <h2 className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">Todo lo que necesitas en una plataforma</h2>
          <p className="mt-3 text-base text-muted-foreground">Crea, automatiza y publica con una sola herramienta.</p>
        </div>
        <div className="grid gap-6 md:grid-cols-3">
          {funciones.map((f, i) => (
            <div
              key={f.title}
              className="surface hover-lift flex flex-col p-7"
              data-reveal
              style={{ '--reveal-delay': `${i * 90}ms` } as React.CSSProperties}
            >
              <IconTile className="!h-11 !w-11 [&>svg]:!h-5 [&>svg]:!w-5">{f.icon}</IconTile>
              <h3 className="mt-5 text-base font-semibold text-foreground">{f.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{f.desc}</p>
              <ul className="mt-5 space-y-2.5 border-t border-border pt-5">
                {f.features.map((item) => (
                  <li key={item} className="flex items-center gap-2.5 text-sm text-foreground">
                    <Check className="h-4 w-4 shrink-0 text-brand-strong" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>

      {/* Cómo funciona */}
      <section id="como-funciona" className="relative z-10 mx-auto max-w-6xl scroll-mt-20 px-6 pb-24">
        <div className="surface relative overflow-hidden px-6 py-14 sm:px-12" data-reveal>
          <div className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-brand/10 blur-3xl" aria-hidden />
          <div className="mx-auto mb-12 max-w-xl text-center">
            <p className="mb-3 text-xs font-semibold uppercase tracking-[0.18em] text-brand-strong">Cómo funciona</p>
            <h2 className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">De la idea a la publicación en 4 pasos</h2>
          </div>
          <ol className="relative grid gap-10 md:grid-cols-4 md:gap-6">
            <div className="absolute left-[12.5%] right-[12.5%] top-6 hidden h-px bg-gradient-to-r from-transparent via-border to-transparent md:block" aria-hidden />
            {pasos.map((p, i) => (
              <li
                key={p.title}
                className="group relative text-center"
                data-reveal
                style={{ '--reveal-delay': `${i * 110}ms` } as React.CSSProperties}
              >
                <div className="relative mx-auto mb-5 flex h-12 w-12 items-center justify-center rounded-2xl border border-border bg-card text-brand-strong shadow-sm transition-all duration-300 group-hover:-translate-y-1 group-hover:border-brand/40 group-hover:shadow-[var(--glow)] [&>svg]:h-5 [&>svg]:w-5">
                  {p.icon}
                  <span className="absolute -right-2 -top-2 flex h-5 w-5 items-center justify-center rounded-full bg-brand text-xs font-semibold text-white">
                    {i + 1}
                  </span>
                </div>
                <h3 className="text-sm font-semibold text-foreground">{p.title}</h3>
                <p className="mx-auto mt-1.5 max-w-[14rem] text-sm text-muted-foreground">{p.desc}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* Llamado a la acción */}
      <section className="relative z-10 mx-auto max-w-6xl px-6 pb-24">
        <div
          className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-brand-deep via-brand to-[#0a89d1] px-8 py-14 text-center text-white shadow-[var(--glow)] sm:px-14"
          data-reveal="scale"
        >
          <div className="pointer-events-none absolute -left-16 -top-16 h-56 w-56 rounded-full bg-white/10 blur-2xl" aria-hidden />
          <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">Empieza a publicar con Conect.ia</h2>
          <p className="mx-auto mt-3 max-w-lg text-sm text-white/80">
            Crea tu cuenta, conecta tus redes y programa tu primera publicación en minutos.
          </p>
          <button
            type="button"
            onClick={() => onNavigate('login')}
            className="press mt-8 inline-flex h-11 items-center gap-2 rounded-[10px] bg-white px-6 text-sm font-semibold text-brand-deep shadow-md transition-transform hover:-translate-y-0.5"
          >
            Comenzar ahora
            <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative z-10 border-t border-border">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-6 py-8 md:flex-row">
          <ConectiaLogo size="sm" />
          <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm text-muted-foreground">
            <a href="/privacidad" className="link-underline transition-colors hover:text-foreground">Política de privacidad</a>
            <a href="/terminos" className="link-underline transition-colors hover:text-foreground">Términos y condiciones</a>
            <span>© 2026 Conect.ia</span>
          </div>
        </div>
      </footer>
    </div>
  );
};

// ============================================================================
// PANTALLA 2: LOGIN + DASHBOARD SHELL (Sidebar + Topbar)
// ============================================================================

// Barra de búsqueda con placeholder animado (efecto de escritura)
const SEARCH_PLACEHOLDERS = [
  'Buscar publicaciones…',
  'Buscar borradores…',
  'Buscar en el calendario…',
];

const SearchBarAnimated: React.FC<{
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  autoFocus?: boolean;
}> = ({ value, onChange, autoFocus }) => {
  const [placeholderIndex, setPlaceholderIndex] = useState(0);
  const [displayedPlaceholder, setDisplayedPlaceholder] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    if (value) return;
    const fullText = SEARCH_PLACEHOLDERS[placeholderIndex];
    let timeout: ReturnType<typeof setTimeout>;

    if (!isDeleting) {
      if (displayedPlaceholder.length < fullText.length) {
        timeout = setTimeout(() => setDisplayedPlaceholder(fullText.slice(0, displayedPlaceholder.length + 1)), 60);
      } else {
        timeout = setTimeout(() => setIsDeleting(true), 2000);
      }
    } else if (displayedPlaceholder.length > 0) {
      timeout = setTimeout(() => setDisplayedPlaceholder(displayedPlaceholder.slice(0, -1)), 35);
    } else {
      setIsDeleting(false);
      setPlaceholderIndex((i) => (i + 1) % SEARCH_PLACEHOLDERS.length);
    }
    return () => clearTimeout(timeout);
  }, [displayedPlaceholder, isDeleting, placeholderIndex, value]);

  return (
    <div className="group relative">
      <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground transition-colors group-focus-within:text-brand-strong" />
      <input
        type="text"
        aria-label="Buscar"
        placeholder={value ? '' : displayedPlaceholder}
        className="field h-10 min-h-0 border-transparent bg-secondary pl-10"
        autoFocus={autoFocus}
        value={value}
        onChange={onChange}
      />
    </div>
  );
};

/** Menú flotante anclado (notificaciones, perfil, resultados de búsqueda). */
const Popover: React.FC<{ open: boolean; children: React.ReactNode; className?: string; id?: string }> = ({
  open,
  children,
  className = 'absolute right-0 top-full mt-2',
  id,
}) => (
  <AnimatePresence>
    {open && (
      <motion.div
        id={id}
        initial={{ opacity: 0, y: -6 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -6 }}
        transition={TRANSICION}
        className={`z-50 overflow-hidden rounded-xl border border-border bg-popover shadow-float ${className}`}
      >
        {children}
      </motion.div>
    )}
  </AnimatePresence>
);

const DashboardShell: React.FC<{
  children: React.ReactNode;
  activeScreen: string;
  onNavigate: (screen: string) => void;
  onLogout?: () => void;
}> = ({ children, activeScreen, onNavigate, onLogout }) => {
  const { profile, user } = useAuth();
  const { mode, toggleTheme } = useTheme();
  const { data: actividad = [] } = useActividad();
  const [searchTerm, setSearchTerm] = useState('');
  const [searchOpen, setSearchOpen] = useState(false);
  const [showNotif, setShowNotif] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const notifRef = useRef<HTMLDivElement>(null);
  const profileRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLDivElement>(null);
  const drawerRef = useRef<HTMLElement>(null);
  const cerrarDrawerRef = useRef<HTMLButtonElement>(null);
  const contenidoRef = useRef<HTMLDivElement>(null);
  const searchResults = useCampusSearch(searchTerm);
  const nombre = profile?.nombre || 'Usuario';
  const email = profile?.email || user?.email || '';
  const initials = (profile?.nombre || user?.email || 'U').slice(0, 2).toUpperCase();
  const unreadCount = actividad.length;

  useFocusTrap(drawerRef, isMenuOpen, cerrarDrawerRef);

  // La primera pantalla aparece sin animación; las siguientes, con la entrada de 240ms.
  const primeraPantalla = useRef(true);
  useEffect(() => {
    primeraPantalla.current = false;
  }, []);

  // Con el drawer abierto, la topbar y el contenido quedan inertes (ni foco ni lector de pantalla).
  useEffect(() => {
    const el = contenidoRef.current;
    if (!el) return;
    if (isMenuOpen) el.setAttribute('inert', '');
    else el.removeAttribute('inert');
  }, [isMenuOpen]);

  // Cierra los menús flotantes al hacer clic fuera o pulsar Escape.
  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      if (!notifRef.current?.contains(e.target as Node)) setShowNotif(false);
      if (!profileRef.current?.contains(e.target as Node)) setShowProfile(false);
      if (!searchRef.current?.contains(e.target as Node)) setSearchOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setShowNotif(false);
        setShowProfile(false);
        setIsMenuOpen(false);
        setSearchOpen(false);
      }
    };
    document.addEventListener('mousedown', onDown);
    window.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      window.removeEventListener('keydown', onKey);
    };
  }, []);

  const menuGroups = [
    { titulo: 'General', items: [{ id: 'dashboard', icon: <Home />, label: 'Inicio' }] },
    {
      titulo: 'Contenido',
      items: [
        { id: 'new-post', icon: <PenSquare />, label: 'Nueva publicación' },
        { id: 'manual-post', icon: <Upload />, label: 'Subir publicación' },
        { id: 'drafts', icon: <FileText />, label: 'Borradores' },
        { id: 'calendar', icon: <Calendar />, label: 'Calendario' },
      ],
    },
    {
      titulo: 'Herramientas',
      items: [
        { id: 'agent', icon: <MessageSquare />, label: 'Asistente IA' },
        { id: 'channels', icon: <Share2 />, label: 'Canales' },
        { id: 'settings', icon: <Settings />, label: 'Ajustes' },
      ],
    },
  ];

  // Navegación: contenedor px-2 + ítem px-3 → texto e iconos en x=20, igual que el logo.
  const navegacion = (grupo: 'fijo' | 'drawer') => (
    <nav aria-label="Principal" className="min-h-0 flex-1 overflow-y-auto px-2 py-5">
      {menuGroups.map((g) => (
        <div key={g.titulo} className="mb-6 last:mb-0">
          <p className="px-3 pb-2 text-xs font-semibold text-muted-foreground">{g.titulo}</p>
          <ul className="space-y-1">
            {g.items.map((item) => {
              const activo = activeScreen === item.id;
              return (
                <li key={item.id}>
                  <button
                    type="button"
                    aria-current={activo ? 'page' : undefined}
                    onClick={() => {
                      onNavigate(item.id);
                      setIsMenuOpen(false);
                    }}
                    className={`relative flex h-10 w-full items-center gap-2 rounded-[10px] px-3 text-sm font-medium transition-colors duration-150 ${
                      activo ? 'text-brand-strong' : 'text-muted-foreground hover:bg-accent hover:text-foreground'
                    }`}
                  >
                    {activo && (
                      <motion.span
                        layoutId={`nav-fondo-${grupo}`}
                        className="absolute inset-0 rounded-[10px] bg-brand-soft"
                        transition={TRANSICION}
                      />
                    )}
                    {activo && (
                      <motion.span
                        layoutId={`nav-barra-${grupo}`}
                        className="absolute bottom-2 left-0 top-2 w-[3px] rounded-full bg-brand"
                        transition={TRANSICION}
                      />
                    )}
                    <span className="relative z-10 flex [&>svg]:h-[18px] [&>svg]:w-[18px]">{item.icon}</span>
                    <span className="relative z-10 truncate">{item.label}</span>
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </nav>
  );

  // Pie del sidebar: identidad. Cerrar sesión vive solo en el menú de perfil.
  const tarjetaUsuario = (
    <div className="flex shrink-0 items-center gap-3 border-t border-sidebar-border px-5 py-3">
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand text-xs font-semibold text-white">
        {initials}
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-foreground" title={nombre}>
          {nombre}
        </p>
        <p className="truncate text-xs text-muted-foreground" title={email}>
          {email}
        </p>
      </div>
    </div>
  );

  const resultadosBusqueda = (
    <Popover
      open={Boolean(searchTerm.trim())}
      className="absolute left-0 right-0 top-full mt-2 max-h-72 overflow-y-auto p-1.5"
    >
      {searchResults.publicaciones.length === 0 && searchResults.borradores.length === 0 && (
        <p className="px-3 py-3 text-sm text-muted-foreground">Sin resultados para “{searchTerm.trim()}”</p>
      )}
      {searchResults.publicaciones.map((p) => (
        <button
          key={p.id}
          type="button"
          className="flex min-h-10 w-full items-center gap-3 rounded-lg px-3 py-2 text-left transition-colors duration-150 hover:bg-accent"
          onClick={() => {
            onNavigate('calendar');
            setSearchTerm('');
            setSearchOpen(false);
          }}
        >
          <Calendar className="h-4 w-4 shrink-0 text-muted-foreground" />
          <span className="min-w-0 flex-1">
            <span className="block truncate text-sm font-medium">{p.titulo}</span>
            <span className="block text-xs capitalize text-muted-foreground">{p.estado}</span>
          </span>
        </button>
      ))}
      {searchResults.borradores.map((b) => (
        <button
          key={b.id}
          type="button"
          className="flex min-h-10 w-full items-center gap-3 rounded-lg px-3 py-2 text-left transition-colors duration-150 hover:bg-accent"
          onClick={() => {
            resumeBorradorAndNavigate(b, onNavigate);
            setSearchTerm('');
            setSearchOpen(false);
          }}
        >
          <FileText className="h-4 w-4 shrink-0 text-muted-foreground" />
          <span className="truncate text-sm font-medium">{b.titulo || 'Borrador'}</span>
        </button>
      ))}
    </Popover>
  );

  return (
    <div className="flex h-full overflow-hidden bg-background">
      {/* Barra lateral fija (≥1024) */}
      <aside className="hidden w-64 shrink-0 flex-col border-r border-sidebar-border bg-sidebar lg:flex">
        <div className="flex h-16 shrink-0 items-center border-b border-sidebar-border px-5">
          <button type="button" aria-label="Ir al inicio" className="flex h-10 items-center rounded-[10px]" onClick={() => onNavigate('dashboard')}>
            <ConectiaLogo size="md" />
          </button>
        </div>
        {navegacion('fijo')}
        {tarjetaUsuario}
      </aside>

      {/* Drawer (< 1024): diálogo modal con foco atrapado */}
      <AnimatePresence>
        {isMenuOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={TRANSICION}
              className="fixed inset-0 z-40 bg-black/40 lg:hidden"
              onClick={() => setIsMenuOpen(false)}
            />
            <motion.aside
              ref={drawerRef}
              role="dialog"
              aria-modal="true"
              aria-label="Menú principal"
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={TRANSICION}
              className="fixed bottom-0 left-0 top-0 z-50 flex w-72 flex-col border-r border-sidebar-border bg-sidebar pt-[env(safe-area-inset-top)] shadow-float lg:hidden"
            >
              <div className="flex h-16 shrink-0 items-center justify-between border-b border-sidebar-border pl-5 pr-3">
                <ConectiaLogo size="md" />
                <IconButton ref={cerrarDrawerRef} label="Cerrar menú" onClick={() => setIsMenuOpen(false)}>
                  <X />
                </IconButton>
              </div>
              {navegacion('drawer')}
              {tarjetaUsuario}
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      <div ref={contenidoRef} className="flex min-w-0 flex-1 flex-col overflow-hidden">
        {/* Barra superior: 64px; padding igual al margen del contenido (16 / 24 / 32) */}
        <header className="topbar-surface relative z-30 flex h-16 shrink-0 items-center gap-2 px-4 pt-[env(safe-area-inset-top)] sm:px-6 lg:px-8">
          <IconButton label="Abrir menú" aria-expanded={isMenuOpen} onClick={() => setIsMenuOpen(true)} className="-ml-2 lg:hidden">
            <Menu />
          </IconButton>
          <button type="button" aria-label="Ir al inicio" className="flex h-10 items-center rounded-[10px] lg:hidden" onClick={() => onNavigate('dashboard')}>
            <ConectiaLogo size="md" showText={false} />
          </button>

          {/* Búsqueda: campo desde 768; lupa que abre el campo a ancho completo por debajo */}
          <div ref={searchRef} className="hidden min-w-48 max-w-sm flex-1 md:block md:ml-2 lg:ml-0">
            <div className="relative">
              <SearchBarAnimated value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
              {resultadosBusqueda}
            </div>
          </div>

          <div className="ml-auto flex items-center gap-2">
            <IconButton label="Buscar" className="md:hidden" aria-expanded={searchOpen} onClick={() => setSearchOpen(true)}>
              <Search />
            </IconButton>

            <IconButton label={mode === 'dark' ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'} onClick={toggleTheme}>
              {mode === 'dark' ? <Sun /> : <Moon />}
            </IconButton>

            <div className="sm:relative" ref={notifRef}>
              <IconButton
                label={unreadCount > 0 ? `Notificaciones (${unreadCount})` : 'Notificaciones'}
                aria-expanded={showNotif}
                onClick={() => setShowNotif((v) => !v)}
                active={showNotif}
              >
                <Bell />
                {unreadCount > 0 && <span className="absolute right-2.5 top-2.5 h-2 w-2 rounded-full bg-brand" aria-hidden />}
              </IconButton>
              <Popover
                open={showNotif}
                className="fixed inset-x-4 top-[calc(4rem+env(safe-area-inset-top))] mt-0 sm:absolute sm:inset-x-auto sm:right-0 sm:top-full sm:mt-2 sm:w-[min(20rem,calc(100vw-2rem))]"
              >
                <div className="flex items-center justify-between border-b border-border px-4 py-3">
                  <p className="text-sm font-semibold">Actividad reciente</p>
                  {unreadCount > 0 && <Badge variant="purple">{unreadCount}</Badge>}
                </div>
                <div className="max-h-[min(448px,60dvh)] overflow-y-auto p-1.5">
                  {actividad.length === 0 && <p className="px-3 py-6 text-center text-sm text-muted-foreground">Sin notificaciones</p>}
                  {actividad.slice(0, 8).map((a) => (
                    <div key={a.id} className="rounded-lg px-3 py-2.5">
                      <p className="text-sm font-medium text-foreground">{a.mensaje}</p>
                      <p className="mt-0.5 text-xs tabular-nums text-muted-foreground">{formatRelative(toDate(a.creadoEn))}</p>
                    </div>
                  ))}
                </div>
              </Popover>
            </div>

            <div className="relative" ref={profileRef}>
              <button
                type="button"
                aria-label="Menú de perfil"
                aria-expanded={showProfile}
                onClick={() => setShowProfile((v) => !v)}
                className={`flex h-10 w-10 items-center justify-center rounded-[10px] transition-colors duration-150 ${
                  showProfile ? 'bg-accent' : 'hover:bg-accent'
                }`}
              >
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-brand text-xs font-semibold text-white">
                  {initials}
                </span>
              </button>
              <Popover open={showProfile} className="absolute right-0 top-full mt-2 w-64">
                <div className="border-b border-border px-4 py-3">
                  <p className="truncate text-sm font-semibold" title={nombre}>
                    {nombre}
                  </p>
                  <p className="truncate text-xs text-muted-foreground" title={email}>
                    {email}
                  </p>
                </div>
                <div className="p-1.5">
                  <button
                    type="button"
                    onClick={() => {
                      onNavigate('settings');
                      setShowProfile(false);
                    }}
                    className="flex h-10 w-full items-center gap-3 rounded-lg px-3 text-sm text-foreground transition-colors duration-150 hover:bg-accent [&_svg]:h-4 [&_svg]:w-4 [&_svg]:text-muted-foreground"
                  >
                    <Settings />
                    Ajustes
                  </button>
                  <button
                    type="button"
                    onClick={onLogout}
                    className="flex h-10 w-full items-center gap-3 rounded-lg px-3 text-sm text-destructive transition-colors duration-150 hover:bg-destructive-soft"
                  >
                    <LogOut className="h-4 w-4" />
                    Cerrar sesión
                  </button>
                </div>
              </Popover>
            </div>
          </div>

          {/* Búsqueda abierta en móvil: ocupa toda la topbar */}
          {searchOpen && (
            <div
              ref={searchRef}
              className="absolute inset-0 z-10 flex items-center gap-2 bg-card px-4 pt-[env(safe-area-inset-top)] sm:px-6 md:hidden"
            >
              <div className="relative min-w-0 flex-1">
                <SearchBarAnimated autoFocus value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
                {resultadosBusqueda}
              </div>
              <IconButton
                label="Cerrar búsqueda"
                onClick={() => {
                  setSearchOpen(false);
                  setSearchTerm('');
                }}
              >
                <X />
              </IconButton>
            </div>
          )}
        </header>

        {/* Contenido: la pantalla nueva entra (240ms) sin esperar a que salga la anterior,
            que se desmonta al instante. La primera carga no anima. */}
        <main className="relative min-h-0 flex-1 overflow-hidden">
          <motion.div
            key={activeScreen}
            initial={primeraPantalla.current ? false : { opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={TRANSICION}
            className="h-full w-full"
          >
            {children}
          </motion.div>
        </main>
      </div>
    </div>
  );
};

// ============================================================================
// PANTALLA 3: NUEVA PUBLICACIÓN (Core Screen)
// ============================================================================

type UploadedMedia = { name: string; type: string; preview?: string; file: File };

// ============================================================================
// CANALES UNIVERSALES — helpers y selector de redes
// ============================================================================

function redEstaConectada(red: RedSocial, canales: CanalesDoc | null | undefined): boolean {
  return Boolean(canales?.[red]?.conectado);
}

function redIcono(red: RedSocial, size = 'w-4 h-4'): React.ReactNode {
  switch (red) {
    case 'linkedin':
      return <Linkedin className={`${size} text-[#0a66c2]`} />;
    case 'facebook':
      return <Facebook className={`${size} text-[#1877f2]`} />;
    case 'instagram':
      return <Instagram className={`${size} text-[#e1306c]`} />;
    case 'tiktok':
      return <Music2 className={`${size} text-black dark:text-white`} />;
    case 'freelancer':
      return <Briefcase className={`${size} text-[#29b2fe]`} />;
    case 'fiverr':
      return <Store className={`${size} text-[#1dbf73]`} />;
    case 'twitter':
      return <Share2 className={`${size} text-[#1da1f2]`} />;
    default:
      return <Share2 className={`${size} text-muted-foreground`} />;
  }
}

/** Inicializa la selección con los canales conectados (o LinkedIn por defecto). */
function redesIniciales(canales: CanalesDoc | null | undefined): RedSocial[] {
  const conectadas = CATALOGO_REDES.filter(
    (r) => r.disponible && redEstaConectada(r.id, canales)
  ).map((r) => r.id);
  // Sin redes conectadas no se preselecciona ninguna: elegir una sin conexión falla más tarde.
  return conectadas;
}

type RedSelectorProps = {
  value: RedSocial[];
  onChange: (next: RedSocial[]) => void;
  canales?: CanalesDoc | null;
  /** El medio adjunto es un video: se bloquean las redes que no lo admiten. */
  medioVideo?: boolean;
};

const RedSelector: React.FC<RedSelectorProps> = ({ value, onChange, canales, medioVideo = false }) => {
  const toggle = (red: RedSocial) => {
    onChange(value.includes(red) ? value.filter((r) => r !== red) : [...value, red]);
  };

  return (
    <div className="@container">
      <div className="grid grid-cols-2 gap-2 @md:grid-cols-3">
        {CATALOGO_REDES.map((red) => {
          const selected = value.includes(red.id);
          const conectada = redEstaConectada(red.id, canales);
          const sinVideo = medioVideo && !red.admiteVideo;
          const bloqueada = !red.disponible || !conectada || sinVideo;
          // Q2: el motivo de cada red bloqueada se ve en el botón, no solo en el tooltip.
          const motivo = !red.disponible
            ? 'Próximamente'
            : !conectada
              ? 'Conecta en Canales'
              : sinVideo
                ? 'No admite video'
                : null;
          const title = motivo ? `${red.nombre}: ${motivo}` : undefined;
          return (
            <button
              key={red.id}
              type="button"
              disabled={bloqueada}
              aria-pressed={selected}
              onClick={() => toggle(red.id)}
              title={title}
              className={`flex h-10 items-center gap-2 rounded-[10px] border px-3 text-left text-sm transition-colors duration-150
                ${selected ? 'border-brand bg-brand-soft text-foreground' : 'border-border bg-card hover:border-brand/40'}
                ${bloqueada ? 'cursor-not-allowed opacity-45' : 'cursor-pointer'}`}
            >
              {redIcono(red.id, 'w-4 h-4')}
              <span className="min-w-0 flex-1">
                <span className="block truncate font-medium">{red.nombre}</span>
                {motivo && <span className="block text-[11px] leading-tight text-muted-foreground">{motivo}</span>}
              </span>
              <span
                className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-[6px] border transition-colors duration-150 ${
                  selected ? 'border-brand bg-brand' : 'border-muted-foreground/40'
                }`}
              >
                {selected && <Check className="h-3 w-3 text-white" strokeWidth={3} />}
              </span>
            </button>
          );
        })}
      </div>
      <p className="mt-2 flex items-start gap-1.5 text-xs text-muted-foreground">
        <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />
        <span>
          Solo se activan los canales conectados en <span className="font-medium text-foreground">Canales</span>.
        </span>
      </p>
    </div>
  );
};

const NewPostScreen: React.FC<{ onNavigate?: (screen: string) => void }> = ({ onNavigate }) => {
  const { user, profile } = useAuth();
  const { data: config } = useConfiguracion();
  const { data: canales } = useCanales();
  const invalidate = useInvalidateCampus();
  const initials = (profile?.nombre || user?.email || 'U').slice(0, 2).toUpperCase();
  const agentDraftApplied = useRef(false);
  const [editingBorradorId, setEditingBorradorId] = useState<string | null>(null);
  const [topic, setTopic] = useState('');
  const [tone, setTone] = useState('profesional');
  const [generateImage, setGenerateImage] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [hasContent, setHasContent] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const [toastMsg, setToastMsg] = useState('');
  const [scheduledDate, setScheduledDate] = useState('');
  const [scheduledTime, setScheduledTime] = useState('');
  const [timezone, setTimezone] = useState('America/Bogota');
  const [repeatMode, setRepeatMode] = useState('none');
  const [scheduleMode, setScheduleMode] = useState<'now' | 'schedule'>('schedule');
  const [generatedText, setGeneratedText] = useState('');
  // Variaciones del texto que devuelve la IA (M19) y el texto original con sus hashtags.
  const [variaciones, setVariaciones] = useState<string[]>([]);
  const [variacionIdx, setVariacionIdx] = useState(-1);
  const [textoOriginal, setTextoOriginal] = useState('');
  const [hashtagsTexto, setHashtagsTexto] = useState('');
  // Q21: el texto lo generó la IA y se declara a las redes que lo exigen.
  const [generadoPorIa, setGeneradoPorIa] = useState(false);
  const [aiDisclosure, setAiDisclosure] = useState(false);
  // Aviso tras "Publicar ahora": cada red confirma por separado.
  const [ultimoEnvio, setUltimoEnvio] = useState<string | null>(null);
  const [imagenNota, setImagenNota] = useState('');
  const [imagenUrl, setImagenUrl] = useState('');
  const [generarVideo, setGenerarVideo] = useState(false);
  const [videoUrl, setVideoUrl] = useState('');
  const [manualUploads, setManualUploads] = useState<UploadedMedia[]>([]);
  const [isDraggingMedia, setIsDraggingMedia] = useState(false);
  const newPostFileRef = useRef<HTMLInputElement>(null);
  const [errorMsg, setErrorMsg] = useState('');
  const [makeWarning, setMakeWarning] = useState('');
  const [selectedRedes, setSelectedRedes] = useState<RedSocial[]>([]);
  const redesInitDone = useRef(false);

  useEffect(() => {
    if (redesInitDone.current || !canales) return;
    redesInitDone.current = true;
    setSelectedRedes(redesIniciales(canales));
  }, [canales]);

  const platformsSelected = (): RedSocial[] =>
    selectedRedes.length ? selectedRedes : [RED_PRINCIPAL];

  const addManualFiles = (files: File[]) => {
    const mapped = files.map((f) => ({
      name: f.name,
      type: f.type.startsWith('video') ? 'video' : 'image',
      preview: URL.createObjectURL(f),
      file: f,
    }));
    setManualUploads((prev) => [...prev, ...mapped].slice(0, 4));
  };

  const removeManualFile = (idx: number) => {
    setManualUploads((prev) => prev.filter((_, i) => i !== idx));
  };

  const resolvePostImageUrl = async (): Promise<string | null> => {
    if (!user) return null;
    let url: string | null = null;
    if (videoUrl) url = videoUrl;
    else if (generateImage && imagenUrl) url = imagenUrl;
    else if (!generateImage && manualUploads[0]?.file) {
      url = await subirArchivoPublicacion(user.uid, manualUploads[0].file);
    } else {
      url = imagenUrl || null;
    }
    return resolverUrlPublicacion(user.uid, url);
  };

  const previewImageUrl =
    generateImage ? imagenUrl || null : manualUploads[0]?.preview ?? imagenUrl ?? null;

  const showPreview = (hasContent || Boolean(previewImageUrl)) && !isGenerating;

  const persistBorradorSnapshot = useCallback(
    async (
      snapshot: {
        text: string;
        imageUrl?: string | null;
        topicText?: string;
        toneText?: string;
        withIaImage?: boolean;
      },
      opts?: { silent?: boolean }
    ) => {
      if (!user) return;
      const text = snapshot.text.trim();
      const topicText = (snapshot.topicText ?? topic).trim() || 'Sin tema';
      if (!text && !snapshot.imageUrl) return;

      let savedImage = snapshot.imageUrl ?? null;
      if (!savedImage && manualUploads[0]?.file) {
        savedImage = await subirArchivoPublicacion(user.uid, manualUploads[0].file);
        if (savedImage) setImagenUrl(savedImage);
      }

      const payload = {
        promptOriginal: topicText,
        tono: snapshot.toneText ?? tone,
        redesDestino: platformsSelected().length ? platformsSelected() : (['linkedin'] as RedSocial[]),
        contenidoGenerado: text,
        titulo: topicText.slice(0, 80) || 'Borrador',
        imagenUrl: savedImage,
        imagenConIa: snapshot.withIaImage ?? generateImage,
      };

      if (editingBorradorId) {
        await actualizarBorrador(editingBorradorId, payload);
      } else {
        const id = await crearBorrador(user.uid, payload);
        setEditingBorradorId(id);
      }

      if (!opts?.silent) {
        invalidate();
        setToastMsg('Borrador guardado');
        setShowToast(true);
        setTimeout(() => setShowToast(false), 3000);
      } else {
        invalidate();
      }
    },
    [user, topic, tone, generateImage, editingBorradorId, manualUploads, invalidate, platformsSelected]
  );

  const runGenerate = useCallback(
    async (topicText: string, toneText: string) => {
      if (!topicText.trim() || !user) return;
      setIsGenerating(true);
      setErrorMsg('');
      try {
        const platforms: RedSocial[] = platformsSelected().length
          ? platformsSelected()
          : [RED_PRINCIPAL];

        const gen = await generateContentFn(
          topicText.trim(),
          platforms[0],
          toneText,
          generateImage
        );
      const tags = gen.hashtags.map((h) => (h.startsWith('#') ? h : `#${h}`)).join(' ');
      const textoCompleto = [gen.contenido, tags].filter(Boolean).join('\n\n');
      setGeneratedText(textoCompleto);
      setTextoOriginal(textoCompleto);
      setHashtagsTexto(tags);
      setVariaciones((gen.variaciones ?? []).filter((v) => v.trim().length > 0));
      setVariacionIdx(-1);
      setGeneradoPorIa(true);
      setAiDisclosure(true);
      setImagenUrl(gen.imagenUrl ?? '');
      setImagenNota(gen.imagenNota ?? '');
      setHasContent(true);

      let generatedVideoUrl = '';
      if (generarVideo) {
        setToastMsg('Generando video con IA… puede tardar ~1 minuto');
        setShowToast(true);
        try {
          const vid = await generateVideoFn(topicText.trim(), gen.imagenUrl ?? null);
          generatedVideoUrl = vid.videoUrl;
          setVideoUrl(vid.videoUrl);
          if (vid.nota) setImagenNota(vid.nota);
          setToastMsg(`Video generado con ${vid.model ?? 'IA'}. Revisa la vista previa.`);
        } catch (e) {
          setVideoUrl('');
          setErrorMsg(
            `No se pudo generar el video: ${e instanceof Error ? e.message : 'error desconocido'}`
          );
        }
        setShowToast(true);
        setTimeout(() => setShowToast(false), 3500);
      }
      const extra = gen.imagenGenerada
        ? ' · con imagen IA'
        : gen.imagenNota
          ? ' · imagen: manual/Make'
          : '';
      setToastMsg(
        (gen.provider ? `Generado con ${gen.provider}` : 'Contenido generado') + extra
      );
      setShowToast(true);
      setTimeout(() => setShowToast(false), 3000);

      const fullText = [gen.contenido, tags].filter(Boolean).join('\n\n');
      try {
        await persistBorradorSnapshot(
          {
            text: fullText,
            imageUrl: generatedVideoUrl || (gen.imagenUrl ?? null),
            topicText: topicText.trim(),
            toneText: toneText,
            withIaImage: generateImage && Boolean(gen.imagenUrl),
          },
          { silent: true }
        );
      } catch {
        /* guardado automático opcional */
      }

      const webhook = getAutomationWebhookUrl(config);
      if (webhook) {
        try {
          await ejecutarFlujoPublicacion(
            {
              topic: topicText.trim(),
              tone: toneText,
              include_image: generateImage,
              telegram_notify: false,
              schedule_now: false,
              platforms,
              body: [gen.contenido, tags].filter(Boolean).join('\n\n'),
              image_url: generatedVideoUrl || (gen.imagenUrl ?? null),
            }
          );
        } catch {
          // n8n opcional; la IA ya generó el texto en Conect.ia
        }
      }
    } catch (e) {
      setErrorMsg(mensajeCallable(e));
    } finally {
      setIsGenerating(false);
    }
  },
    [user, tone, generateImage, config, platformsSelected, persistBorradorSnapshot]
  );

  const handleGenerate = () => void runGenerate(topic, tone);
  const [confirmar, dialogoConfirmacion] = useConfirm();
  const [opcionesProgramacion, setOpcionesProgramacion] = useState(false);
  /** La vista previa muestra la primera red seleccionada (no una fija). */
  const redVista: RedSocial = selectedRedes[0] ?? RED_PRINCIPAL;

  const generarConConfirmacion = async () => {
    if (
      generatedText.trim() &&
      !(await confirmar({
        titulo: '¿Sustituir el texto actual?',
        mensaje: 'La IA generará un texto nuevo y reemplazará el que ya tienes.',
        accion: 'Generar de nuevo',
        destructiva: false,
      }))
    )
      return;
    handleGenerate();
  };

  useEffect(() => {
    if (agentDraftApplied.current || !user) return;

    const borrador = consumeBorradorResume();
    if (borrador) {
      agentDraftApplied.current = true;
      setEditingBorradorId(borrador.borradorId);
      setTopic(borrador.topic);
      setTone(borrador.tone);
      if (borrador.generatedText) {
        setGeneratedText(borrador.generatedText);
        setHasContent(true);
      }
      if (borrador.imagenUrl) {
        setImagenUrl(borrador.imagenUrl);
        setGenerateImage(borrador.imagenConIa !== false);
        setManualUploads([]);
        setHasContent(true);
      }
      setToastMsg(
        borrador.generatedText || borrador.imagenUrl
          ? 'Borrador cargado — continúa editando o publica'
          : 'Borrador cargado — genera el contenido o escribe manualmente'
      );
      setShowToast(true);
      setTimeout(() => setShowToast(false), 3500);
      return;
    }

    const draft = consumePostDraftFromAgent();
    if (!draft) return;
    agentDraftApplied.current = true;
    setTopic(draft.topic);
    setTone(draft.tone);
    if (draft.contenido) {
      // Texto de una respuesta del asistente: se usa tal cual, sin generar otro.
      setGeneratedText(draft.contenido);
      setHasContent(true);
      return;
    }
    if (draft.autoGenerate) {
      setToastMsg('Creando publicación desde el Asistente IA…');
      setShowToast(true);
      void runGenerate(draft.topic, draft.tone);
    }
  }, [user, runGenerate]);

  const handleSaveBorrador = async () => {
    if (!user || !generatedText.trim()) return;
    setErrorMsg('');
    try {
      await persistBorradorSnapshot({
        text: generatedText,
        imageUrl: imagenUrl || null,
        topicText: topic.trim(),
        toneText: tone,
        withIaImage: generateImage,
      });
      await registrarActividad(user.uid, {
        tipo: 'borrador',
        mensaje: `Borrador guardado: ${topic.slice(0, 40) || 'sin título'}`,
        red: 'linkedin',
      });
    } catch (e) {
      setErrorMsg(e instanceof Error ? e.message : 'Error al guardar');
    }
  };

  const handleSchedule = async () => {
    if (!user) return;
    if (scheduleMode === 'schedule' && (!scheduledDate || !scheduledTime)) return;
    if (scheduleMode === 'now') {
      const webhookNow = getAutomationWebhookUrl(config);
      const hayDestinoActivo = platformsSelected().some((r) => redEstaConectada(r, canales));
      if (!webhookNow && !hayDestinoActivo) {
        setErrorMsg('Conecta al menos una red en Canales o configura la URL de Make en Ajustes.');
        return;
      }
    }
    setIsGenerating(true);
    setErrorMsg('');
    setMakeWarning('');
    try {
      const platforms: RedSocial[] = platformsSelected().length
        ? platformsSelected()
        : [RED_PRINCIPAL];
      // Sin Make, solo se envía a redes conectadas: el motivo se muestra antes de intentarlo.
      const desconectadas = platforms.filter((r) => !redEstaConectada(r, canales));
      if (desconectadas.length && !getAutomationWebhookUrl(config)) {
        setErrorMsg(
          `${desconectadas.map((r) => redConfig(r)?.nombre ?? r).join(', ')} no está conectada. Conéctala en Canales o quítala de la selección.`
        );
        return;
      }
      // Límite de caracteres por red (M2): no se envía un texto que la red rechazará.
      const textoActual = generatedText || topic;
      const sobreLimite = platforms.filter((r) => {
        const limite = redConfig(r)?.limiteCaracteres;
        return limite != null && textoActual.length > limite;
      });
      if (sobreLimite.length) {
        setErrorMsg(
          `${sobreLimite.map((r) => redConfig(r)?.nombre ?? r).join(' y ')} supera el límite de caracteres. Acorta el texto o quita la red.`
        );
        return;
      }
      if (scheduleMode === 'now') {
        // Publicar ahora no tiene vuelta atrás: se revisa el resumen antes de enviar.
        const redesAhora = platforms.map((r) => redConfig(r)?.nombre ?? r).join(', ');
        const medioTexto = videoUrl || manualUploads[0]?.type === 'video' ? 'Video' : imagenUrl || previewImageUrl ? 'Imagen' : 'Sin medio';
        const resumenTexto = textoActual.trim();
        if (
          !(await confirmar({
            titulo: 'Revisa antes de publicar',
            mensaje: 'Se enviará ahora. Cada red confirma por separado: si una falla, las demás no se cancelan.',
            accion: 'Publicar',
            destructiva: false,
            detalles: [
              { etiqueta: 'Redes', valor: redesAhora },
              { etiqueta: 'Medio', valor: medioTexto },
              { etiqueta: 'Aviso de IA', valor: generadoPorIa && aiDisclosure ? 'Sí · se declara en TikTok' : 'No' },
              { etiqueta: 'Cuándo', valor: 'Ahora' },
              { etiqueta: 'Texto', valor: resumenTexto.length > 120 ? `${resumenTexto.slice(0, 120)}…` : resumenTexto },
            ],
          }))
        )
          return;
      }
      const finalImageUrl = await resolvePostImageUrl();
      if (imagenQuedoSinResolver(imagenUrl || previewImageUrl, finalImageUrl)) {
        setMakeWarning(
          'No se pudo subir la imagen: la publicación irá solo con texto. Revisa BLOB_READ_WRITE_TOKEN en Vercel para incluir imágenes.'
        );
      }
      // Las redes que necesitan medio se bloquean aquí, no después de fallar en la red.
      const sinMedio = platforms.filter((r) => redConfig(r)?.requiereMedia && !finalImageUrl);
      if (sinMedio.length) {
        setErrorMsg(
          `${sinMedio.map((r) => redConfig(r)?.nombre ?? r).join(' y ')} requiere una imagen o video. Añade uno o quita la red.`
        );
        return;
      }
      if (videoUrl && platforms.some((r) => r !== 'tiktok')) {
        setMakeWarning(
          'El video generado con IA se publica solo en TikTok (vertical 9:16). Las demás redes seleccionadas quedarán sin medio o con error.'
        );
      }
      const postTitle = topic.slice(0, 80) || 'Publicación';
      const postBody = generatedText || topic;
      const postId = await crearPublicacion(user.uid, {
        titulo: postTitle,
        contenido: postBody,
        redesDestino: platforms,
        estado: scheduleMode === 'now' ? 'pendiente' : 'borrador',
        imagenUrl: finalImageUrl,
        generadoIa: generadoPorIa && aiDisclosure,
      });

      if (scheduleMode === 'now') {
        const webhookNow = getAutomationWebhookUrl(config);
        if (webhookNow) {
          const makeRes = await ejecutarFlujoPublicacion(
            {
              topic: topic.trim(),
              tone,
              title: postTitle,
              include_image: Boolean(finalImageUrl),
              telegram_notify: false,
              schedule_now: true,
              campus_published: false,
              action: 'publish',
              provider: 'make',
              platforms,
              body: postBody,
              image_url: finalImageUrl,
              post_id: postId,
            }
          );
          // El estado lo fija el servidor según la respuesta de Make (publicado, enviado o fallido).
          setToastMsg(
            makeRes.linkedin_status
              ? `Enviado vía Make (${makeRes.linkedin_status})`
              : 'Enviado vía Make'
          );
        } else {
          await publishPostNowFn(postId);
          setToastMsg(`Publicación enviada a ${platforms.join(', ')}`);
        }
        await registrarActividad(user.uid, {
          tipo: 'publicado',
          mensaje: `Publicación enviada a ${platforms.join(', ')}`,
          red: platforms[0],
        });
      } else {
        const iso = new Date(`${scheduledDate}T${scheduledTime}`).toISOString();
        await schedulePostFn(postId, iso, platforms);
        const webhook = getAutomationWebhookUrl(config);
        if (webhook) {
          try {
            await ejecutarFlujoPublicacion(
              {
                topic: topic.trim(),
                tone,
                title: postTitle,
                include_image: Boolean(finalImageUrl),
                telegram_notify: false,
                schedule_now: false,
                campus_published: false,
                action: 'notify_scheduled',
                platforms,
                body: postBody,
                image_url: finalImageUrl,
                post_id: postId,
                scheduled_at: iso,
              }
            );
          } catch (makeErr) {
            setMakeWarning(
              `Make no respondió (${mensajeCallable(makeErr)}). Tu publicación ya está en el calendario.`
            );
          }
        }
        setToastMsg('Publicación programada en el calendario');
        const repeticiones = repeatMode === 'none' ? 1 : repeatMode === 'daily' ? 7 : 4;
        for (let i = 1; i < repeticiones; i++) {
          const next = new Date(iso);
          if (repeatMode === 'daily') next.setDate(next.getDate() + i);
          if (repeatMode === 'weekly') next.setDate(next.getDate() + i * 7);
          const repId = await crearPublicacion(user.uid, {
            titulo: `${topic.slice(0, 60) || 'Publicación'} (${i + 1})`,
            contenido: generatedText || topic,
            redesDestino: platforms,
            estado: 'borrador',
          });
          await schedulePostFn(repId, next.toISOString(), platforms);
        }
        await registrarActividad(user.uid, {
          tipo: 'programado',
          mensaje: `Programado para ${formatDateTime(new Date(iso))}${repeatMode !== 'none' ? ` · repetición ${repeatMode}` : ''}`,
          red: platforms[0],
        });
      }
      if (scheduleMode === 'now') {
        setUltimoEnvio(platforms.map((r) => redConfig(r)?.nombre ?? r).join(', '));
        // Ya salió: se limpia el formulario para que un clic más no la envíe otra vez.
        setTopic('');
        setGeneratedText('');
        setImagenUrl('');
        setManualUploads([]);
        setHasContent(false);
        setEditingBorradorId(null);
      }
      invalidate();
      setShowToast(true);
      setTimeout(() => setShowToast(false), 3000);
    } catch (e) {
      setErrorMsg(mensajeCallable(e));
    } finally {
      setIsGenerating(false);
    }
  };

  const displayName = profile?.nombre || 'Influencer';

  const hayContenido = Boolean(topic.trim() || generatedText.trim() || manualUploads.length || imagenUrl);

  const limpiar = async () => {
    if (
      !(await confirmar({
        titulo: '¿Limpiar la publicación?',
        mensaje: 'Se borrarán el tema, el texto generado y los archivos añadidos.',
        accion: 'Limpiar',
      }))
    )
      return;
    setTopic('');
    setGeneratedText('');
    setImagenUrl('');
    setManualUploads([]);
    setHasContent(false);
    setEditingBorradorId(null);
  };

  return (
    <ScreenLayout>
      <Toast message={toastMsg || '¡Publicación programada!'} type="success" show={showToast} />
      {dialogoConfirmacion}

      <PageHeader title="Nueva publicación" subtitle="Crea contenido con ayuda de IA y publícalo en tus redes" />

      {(errorMsg || makeWarning) && (
        <div className="shrink-0 space-y-3">
          {errorMsg && <Notice tone="danger">{errorMsg}</Notice>}
          {makeWarning && (
            <Notice tone="warning">{makeWarning} Puedes vaciar la URL de Make en Ajustes si no lo usas.</Notice>
          )}
        </div>
      )}

      <div className="grid min-h-0 flex-1 gap-6 lg:grid-cols-2 lg:grid-rows-[minmax(0,1fr)]">
        {/* Formulario */}
        <Panel
          title="Contenido"
          icon={<PenSquare />}
          footer={
            <div className="flex items-center gap-3">
              <Button
                size="lg"
                className="flex-1"
                icon={isGenerating ? <Loader2 className="animate-spin" /> : <Sparkles />}
                onClick={() => void generarConConfirmacion()}
                disabled={!topic || isGenerating}
              >
                {isGenerating ? 'Generando…' : 'Generar con IA'}
              </Button>
              <Button size="lg" variant="ghost" onClick={() => void limpiar()} disabled={!hayContenido || isGenerating}>
                Limpiar
              </Button>
            </div>
          }
        >
          <div className="space-y-6">
            <div className="space-y-2">
              <span className="text-sm font-medium text-foreground">Redes de publicación</span>
              <RedSelector
                value={selectedRedes}
                onChange={setSelectedRedes}
                canales={canales}
                medioVideo={Boolean(videoUrl) || manualUploads[0]?.type === 'video'}
              />
              {selectedRedes.length === 0 && (
                <Notice tone="warning">Elige al menos una red para poder publicar.</Notice>
              )}
            </div>

            <Textarea
              id="np-tema"
              label="Tema del post"
              placeholder="Ej: Lanzamiento del nuevo bootcamp de desarrollo web en Bucaramanga"
              rows={3}
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
            />

            <div className="grid gap-4 sm:grid-cols-2">
              <Dropdown
                label="Tono de voz"
                value={tone}
                onChange={setTone}
                icon={<MessageSquare />}
                options={[
                  { value: 'profesional', label: 'Profesional' },
                  { value: 'educativo', label: 'Educativo' },
                  { value: 'promocional', label: 'Promocional' },
                ]}
              />
              <div className="space-y-2">
                <span className="text-sm font-medium text-foreground">Multimedia con IA</span>
                <div className="surface-muted px-4 py-1">
                  <Toggle
                    label="Imagen"
                    checked={generateImage}
                    onChange={(v) => {
                      setGenerateImage(v);
                      if (v) {
                        setManualUploads([]);
                        setGenerarVideo(false);
                      }
                    }}
                  />
                  <Toggle
                    label="Video (TikTok)"
                    checked={generarVideo}
                    onChange={(v) => {
                      setGenerarVideo(v);
                      if (v) {
                        setGenerateImage(false);
                        setManualUploads([]);
                        setVideoUrl('');
                        setSelectedRedes(['tiktok']);
                        setToastMsg('Con video IA se publica solo en TikTok (vertical 9:16).');
                        setShowToast(true);
                        setTimeout(() => setShowToast(false), 3500);
                      } else {
                        setVideoUrl('');
                      }
                    }}
                  />
                </div>
              </div>
            </div>

            {generarVideo && (
              <Notice tone="info">
                Se genera un video vertical (9:16) al crear la publicación. Requiere POLLINATIONS_API_KEY en las
                variables de entorno de Vercel.
              </Notice>
            )}

            <AnimatePresence initial={false}>
              {!generateImage && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={TRANSICION}
                  className="space-y-2 overflow-hidden"
                >
                  <span className="text-sm font-medium text-foreground">Foto o archivo</span>
                  <div
                    onDragOver={(e) => {
                      e.preventDefault();
                      setIsDraggingMedia(true);
                    }}
                    onDragLeave={() => setIsDraggingMedia(false)}
                    onDrop={(e) => {
                      e.preventDefault();
                      setIsDraggingMedia(false);
                      if (e.dataTransfer.files?.length) addManualFiles(Array.from(e.dataTransfer.files));
                    }}
                    onClick={() => newPostFileRef.current?.click()}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && newPostFileRef.current?.click()}
                    className={`flex min-h-14 cursor-pointer items-center gap-3 rounded-xl border border-dashed px-4 py-3 transition-colors duration-150 ${
                      isDraggingMedia ? 'border-brand bg-brand-soft' : 'border-border hover:border-brand/50 hover:bg-brand-soft'
                    }`}
                  >
                    <IconTile tone={isDraggingMedia ? 'brand' : 'neutral'}>
                      <FileUp />
                    </IconTile>
                    <span className="text-sm text-muted-foreground">
                      <span className="font-medium text-foreground">Arrastra o haz clic</span> · PNG, JPG, GIF o MP4
                    </span>
                    <input
                      ref={newPostFileRef}
                      type="file"
                      accept="image/*,video/*"
                      multiple
                      className="hidden"
                      onChange={(e) => e.target.files && addManualFiles(Array.from(e.target.files))}
                    />
                  </div>
                  {manualUploads.length > 0 && (
                    <div className="grid grid-cols-[repeat(auto-fill,minmax(72px,1fr))] gap-2">
                      {manualUploads.map((f, i) => (
                        <motion.div
                          key={i}
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          transition={TRANSICION}
                          className="group relative aspect-square overflow-hidden rounded-[10px] border border-border bg-accent"
                        >
                          {f.preview ? (
                            f.type === 'video' ? (
                              <video src={f.preview} muted playsInline className="h-full w-full object-cover" />
                            ) : (
                              <img src={f.preview} alt={f.name} className="h-full w-full object-cover" />
                            )
                          ) : (
                            <div className="flex h-full w-full items-center justify-center">
                              <Video className="h-5 w-5 text-muted-foreground" />
                            </div>
                          )}
                          <button
                            type="button"
                            aria-label={`Quitar ${f.name}`}
                            onClick={(e) => {
                              e.stopPropagation();
                              removeManualFile(i);
                            }}
                            className="absolute right-1 top-1 flex h-8 w-8 items-center justify-center rounded-full bg-black/60 transition-colors hover:bg-black/80"
                          >
                            <X className="h-4 w-4 text-white" />
                          </button>
                        </motion.div>
                      ))}
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </Panel>

        {/* Vista previa + publicación */}
        <Panel
          title="Vista previa"
          icon={<Eye />}
          actions={<Badge variant="purple">{redConfig(redVista)?.nombre ?? 'Vista previa'}</Badge>}
          footer={
            hasContent ? (
              <div className="space-y-3 py-1">
                <Segmented
                  full
                  ariaLabel="Momento de publicación"
                  value={scheduleMode}
                  onChange={(v) => setScheduleMode(v as 'now' | 'schedule')}
                  options={[
                    { value: 'now', label: 'Ahora' },
                    { value: 'schedule', label: 'Programar' },
                  ]}
                />
                <AnimatePresence initial={false}>
                  {scheduleMode === 'schedule' && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      transition={TRANSICION}
                      className="space-y-3 overflow-hidden"
                    >
                      <div className="grid gap-3 min-[400px]:grid-cols-[minmax(0,1fr)_120px]">
                        <input
                          type="date"
                          aria-label="Fecha"
                          value={scheduledDate}
                          onChange={(e) => setScheduledDate(e.target.value)}
                          className="field tabular-nums"
                        />
                        <input
                          type="time"
                          aria-label="Hora"
                          value={scheduledTime}
                          onChange={(e) => setScheduledTime(e.target.value)}
                          className="field tabular-nums"
                        />
                      </div>
                      <button
                        type="button"
                        aria-expanded={opcionesProgramacion}
                        onClick={() => setOpcionesProgramacion((v) => !v)}
                        className="flex h-10 w-full items-center justify-between rounded-[10px] px-1 text-sm font-medium text-muted-foreground transition-colors duration-150 hover:text-foreground"
                      >
                        Opciones de programación
                        <ChevronDown
                          className={`h-4 w-4 transition-transform duration-[240ms] ${opcionesProgramacion ? 'rotate-180' : ''}`}
                        />
                      </button>
                      {opcionesProgramacion && (
                        <div className="grid gap-3 sm:grid-cols-2">
                          <Dropdown label="Zona horaria" value={timezone} onChange={setTimezone} options={ZONAS_HORARIAS} />
                        </div>
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>
                <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
                  <Button size="lg" variant="outline" icon={<Save />} onClick={handleSaveBorrador}>
                    Guardar borrador
                  </Button>
                  <Button
                    size="lg"
                    icon={scheduleMode === 'now' ? <Send /> : <Calendar />}
                    onClick={handleSchedule}
                    disabled={selectedRedes.length === 0 || (scheduleMode === 'schedule' && (!scheduledDate || !scheduledTime))}
                    title={selectedRedes.length === 0 ? 'Elige al menos una red' : undefined}
                  >
                    {scheduleMode === 'now' ? 'Publicar ahora' : 'Programar'}
                  </Button>
                </div>
              </div>
            ) : undefined
          }
        >
          {ultimoEnvio && !showPreview && (
            <div className="mb-4 space-y-2">
              <Notice tone="success">
                Enviado a {ultimoEnvio}. Cada red confirma por separado.
              </Notice>
              {onNavigate && (
                <Button variant="outline" icon={<Calendar />} onClick={() => onNavigate('calendar')}>
                  Ver en calendario
                </Button>
              )}
            </div>
          )}
          {!showPreview && !isGenerating && (
            <EmptyState
              icon={<Eye />}
              title="Aún no hay contenido"
              text="Escribe un tema y pulsa Generar con IA para ver aquí la vista previa."
            />
          )}

          {isGenerating && (
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <Skeleton className="h-11 w-11 rounded-full" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-3.5 w-32" />
                  <Skeleton className="h-3 w-24" />
                </div>
              </div>
              <div className="space-y-2">
                <Skeleton className="h-3.5 w-full" />
                <Skeleton className="h-3.5 w-full" />
                <Skeleton className="h-3.5 w-3/4" />
              </div>
              <Skeleton className="h-44 w-full !rounded-xl" />
            </div>
          )}

          {showPreview && !videoUrl && manualUploads[0]?.type !== 'video' && (
            <div className="mb-4 space-y-3">
              <div className="flex flex-wrap gap-2" role="group" aria-label="Variaciones del texto">
                <button
                  type="button"
                  aria-pressed={variacionIdx === -1}
                  onClick={() => {
                    setVariacionIdx(-1);
                    setGeneratedText(textoOriginal);
                  }}
                  className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                    variacionIdx === -1 ? 'border-brand bg-brand-soft text-brand-strong' : 'border-border text-muted-foreground hover:text-foreground'
                  }`}
                >
                  Original
                </button>
                {variaciones.map((v, i) => (
                  <button
                    key={i}
                    type="button"
                    aria-pressed={variacionIdx === i}
                    onClick={() => {
                      setVariacionIdx(i);
                      setGeneratedText([v, hashtagsTexto].filter(Boolean).join('\n\n'));
                    }}
                    className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                      variacionIdx === i ? 'border-brand bg-brand-soft text-brand-strong' : 'border-border text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    Variante {i + 1}
                  </button>
                ))}
              </div>
              <Textarea label="Contenido" rows={6} value={generatedText} onChange={(e) => setGeneratedText(e.target.value)} />
              <ul className="grid gap-1 text-xs" aria-label="Caracteres por red">
                {selectedRedes.length === 0 && <li className="text-muted-foreground">Elige una red para ver su límite.</li>}
                {selectedRedes.map((r) => {
                  const cfg = redConfig(r);
                  const limite = cfg?.limiteCaracteres ?? null;
                  const sobre = limite != null && generatedText.length > limite;
                  return (
                    <li key={r} className={`flex justify-between ${sobre ? 'font-medium text-destructive' : 'text-muted-foreground'}`}>
                      <span>{cfg?.nombre ?? r}</span>
                      <span className="tabular-nums">
                        {generatedText.length}
                        {limite != null ? ` / ${limite.toLocaleString('es-CO')}` : ''}
                      </span>
                    </li>
                  );
                })}
              </ul>
              {generadoPorIa && (
                <Checkbox label="Contenido generado con IA" checked={aiDisclosure} onChange={setAiDisclosure} />
              )}
            </div>
          )}
          {showPreview && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={TRANSICION} className="space-y-4">
              {videoUrl || manualUploads[0]?.type === 'video' ? (
                <div className="overflow-hidden rounded-xl border border-border bg-black/5 dark:bg-black/30">
                  <video src={videoUrl || (previewImageUrl ?? undefined)} controls playsInline className="max-h-[420px] w-full object-contain" />
                  <p className="px-3 py-2 text-center text-xs text-muted-foreground">
                    {videoUrl ? 'Video generado con IA · vertical 9:16 · listo para TikTok' : 'Video subido · listo para publicar en TikTok'}
                  </p>
                </div>
              ) : (
                <SocialPostPreview
                  network={redVista}
                  authorName={displayName}
                  authorInitials={initials}
                  content={generatedText || topic}
                  imageUrl={previewImageUrl}
                  charLimit={3000}
                />
              )}
              {generateImage && imagenNota && <Notice tone="warning">{imagenNota}</Notice>}
            </motion.div>
          )}
        </Panel>
      </div>
    </ScreenLayout>
  );
};

// ============================================================================
// PANTALLA: SUBIR PUBLICACIÓN MANUAL
// ============================================================================

const ManualPostScreen: React.FC = () => {
  const { user, profile } = useAuth();
  const { data: config } = useConfiguracion();
  const { data: canales } = useCanales();
  const invalidate = useInvalidateCampus();
  const [postText, setPostText] = useState('');
  const [saving, setSaving] = useState(false);
  const [scheduleMode, setScheduleMode] = useState<'now' | 'schedule'>('schedule');
  const [scheduledDate, setScheduledDate] = useState('');
  const [scheduledTime, setScheduledTime] = useState('');
  const [timezone, setTimezone] = useState('America/Bogota');
  const [uploadedFiles, setUploadedFiles] = useState<{ name: string; type: string; preview?: string; file: File }[]>([]);
  const [confirmar, dialogoConfirmacion] = useConfirm();
  const [isDragging, setIsDragging] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const [toastMsg, setToastMsg] = useState('');
  const [repeatMode, setRepeatMode] = useState('none');
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const [redesDestino, setRedesDestino] = useState<RedSocial[]>([]);
  const redesInitDone = useRef(false);

  useEffect(() => {
    if (redesInitDone.current || !canales) return;
    redesInitDone.current = true;
    setRedesDestino(redesIniciales(canales));
  }, [canales]);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const files = Array.from(e.dataTransfer.files);
    handleFiles(files);
  };

  const handleFiles = (files: File[]) => {
    const mapped = files.map(f => ({
      name: f.name,
      type: f.type.startsWith('video') ? 'video' : 'image',
      preview: URL.createObjectURL(f),
      file: f,
    }));
    setUploadedFiles(prev => [...prev, ...mapped]);
  };

  const removeFile = (idx: number) => setUploadedFiles(prev => prev.filter((_, i) => i !== idx));

  const notify = (msg: string) => {
    setToastMsg(msg);
    setShowToast(true);
    setTimeout(() => setShowToast(false), 3500);
  };

  const handleSchedule = async () => {
    if (!user) return;
    if (scheduleMode === 'schedule' && (!scheduledDate || !scheduledTime)) {
      notify('Selecciona fecha y hora para programar.');
      return;
    }
    if (!postText.trim()) {
      notify('El contenido no puede estar vacío.');
      return;
    }
    if (scheduleMode === 'now') {
      const webhookNow = getAutomationWebhookUrl(config);
      const hayDestinoActivo = redesDestino.some((r) => redEstaConectada(r, canales));
      if (!webhookNow && !hayDestinoActivo) {
        notify('Conecta al menos una red en Canales o configura la URL de Make en Ajustes.');
        return;
      }
      // Publicar ahora no tiene vuelta atrás: se confirma antes de enviar.
      const redesAhora = redesDestino.map((r) => redConfig(r)?.nombre ?? r).join(', ') || RED_PRINCIPAL;
      if (
        !(await confirmar({
          titulo: '¿Publicar ahora?',
          mensaje: `Se enviará a ${redesAhora} en este momento.`,
          accion: 'Publicar',
        }))
      )
        return;
    }
    // Límite de caracteres por red (M2): no se envía un texto que la red rechazará.
    const redesLimite = redesDestino.length ? redesDestino : [RED_PRINCIPAL];
    const sobreLimite = redesLimite.filter((r) => {
      const limite = redConfig(r)?.limiteCaracteres;
      return limite != null && postText.length > limite;
    });
    if (sobreLimite.length) {
      notify(`${sobreLimite.map((r) => redConfig(r)?.nombre ?? r).join(' y ')} supera el límite de caracteres. Acorta el texto o quita la red.`);
      return;
    }
    // Las redes que necesitan medio se bloquean aquí, no después de fallar en la red.
    const redesConMedio = redesDestino.length ? redesDestino : [RED_PRINCIPAL];
    const sinMedio = redesConMedio.filter((r) => redConfig(r)?.requiereMedia && uploadedFiles.length === 0);
    if (sinMedio.length) {
      notify(`${sinMedio.map((r) => redConfig(r)?.nombre ?? r).join(' y ')} requiere una imagen o video. Añade uno o quita la red.`);
      return;
    }
    setSaving(true);
    try {
      const redes = redesDestino.length ? redesDestino : [RED_PRINCIPAL];
      let imagenUrl: string | null = null;
      if (uploadedFiles[0]?.file) {
        try {
          imagenUrl = await subirArchivoPublicacion(user.uid, uploadedFiles[0].file);
        } catch {
          notify(
            'No se pudo subir la imagen. Publicando solo texto. Revisa BLOB_READ_WRITE_TOKEN en Vercel.'
          );
        }
      }
      const postId = await crearPublicacion(user.uid, {
        titulo: postText.slice(0, 80),
        contenido: postText,
        redesDestino: redes,
        estado: scheduleMode === 'now' ? 'pendiente' : 'borrador',
        imagenUrl,
      });
      if (scheduleMode === 'now') {
        const webhookNow = getAutomationWebhookUrl(config);
        if (webhookNow) {
          await ejecutarFlujoPublicacion(
            {
              topic: postText.slice(0, 80),
              tone: 'profesional',
              title: postText.slice(0, 80),
              include_image: Boolean(imagenUrl),
              telegram_notify: false,
              schedule_now: true,
              campus_published: false,
              action: 'publish',
              provider: 'make',
              platforms: redes,
              body: postText,
              image_url: imagenUrl,
              post_id: postId,
            }
          );
          // El estado lo fija el servidor según la respuesta de Make.
          notify(`Enviado vía Make en ${redes.join(', ')}`);
        } else {
          await publishPostNowFn(postId);
          notify(`Publicación enviada a ${redes.join(', ')}`);
        }
        await registrarActividad(user.uid, {
          tipo: 'publicado',
          mensaje: `Publicación manual enviada a ${redes.join(', ')}`,
          red: redes[0],
        });
        notify('Publicación enviada');
      } else {
        const iso = new Date(`${scheduledDate}T${scheduledTime}`).toISOString();
        await schedulePostFn(postId, iso, redes);
        await registrarActividad(user.uid, {
          tipo: 'programado',
          mensaje: `Manual programado: ${formatDateTime(new Date(iso))}`,
          red: redes[0],
        });
        notify(`Programado para ${scheduledDate} ${scheduledTime}`);
      }
      invalidate();
      setPostText('');
      setUploadedFiles([]);
    } catch (e) {
      notify(e instanceof Error ? e.message : 'Error al publicar');
    } finally {
      setSaving(false);
    }
  };

  // Fecha de hoy en la hora local de la persona usuaria (toISOString usa UTC y bloquea el día actual de noche).
  const today = new Date(Date.now() - new Date().getTimezoneOffset() * 60_000).toISOString().split('T')[0];

  const [vistaPreviaAbierta, setVistaPreviaAbierta] = useState(false);

  const guardarBorradorManual = async () => {
    if (!user || !postText.trim()) return;
    await crearBorrador(user.uid, {
      promptOriginal: 'Publicación manual',
      tono: 'profesional',
      redesDestino: redesDestino,
      contenidoGenerado: postText,
      titulo: postText.slice(0, 80),
    });
    invalidate();
    notify('Borrador guardado');
  };

  const LIMITE = 3000;
  const excedido = postText.length > LIMITE;
  const redVista: RedSocial = redesDestino[0] ?? RED_PRINCIPAL;
  const autor = profile?.nombre || user?.email || 'Tu perfil';
  const iniciales = autor.slice(0, 2).toUpperCase();
  const motivoBloqueo = !postText.trim()
    ? 'Escribe el contenido para continuar.'
    : excedido
      ? `El texto supera ${LIMITE} caracteres.`
      : redesDestino.length === 0
        ? 'Elige al menos una red.'
        : scheduleMode === 'schedule' && (!scheduledDate || !scheduledTime)
          ? 'Indica fecha y hora.'
          : '';

  const vistaPrevia =
    uploadedFiles[0]?.type === 'video' && uploadedFiles[0]?.preview ? (
      <div className="overflow-hidden rounded-xl border border-border bg-black/5 dark:bg-black/30">
        <video src={uploadedFiles[0].preview} controls playsInline className="max-h-[360px] w-full object-contain" />
        <p className="px-3 py-2 text-center text-xs text-muted-foreground">Video subido · listo para publicar en TikTok</p>
      </div>
    ) : (
      <SocialPostPreview
        network={redVista}
        authorName={autor}
        authorInitials={iniciales}
        content={postText}
        imageUrl={uploadedFiles[0]?.preview ?? null}
        charLimit={LIMITE}
      />
    );

  return (
    <ScreenLayout>
      <Toast message={toastMsg} type="success" show={showToast} />
      {dialogoConfirmacion}

      <PageHeader title="Subir publicación" subtitle="Crea y programa contenido manualmente, sin IA" />

      <div className="grid min-h-0 flex-1 gap-6 lg:grid-cols-[minmax(0,1fr)_360px] lg:grid-rows-[minmax(0,1fr)] xl:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)_340px]">
        {/* Editor y medios */}
        <Panel
          title="Contenido del post"
          icon={<PenSquare />}
          actions={
            <Button variant="outline" icon={<Eye />} className="xl:hidden" onClick={() => setVistaPreviaAbierta(true)}>
              Vista previa
            </Button>
          }
          bodyClassName="flex flex-col gap-4"
        >
          <div className="flex flex-1 flex-col gap-1">
            <textarea
              aria-label="Contenido de la publicación"
              aria-describedby="mp-contador"
              placeholder="Escribe aquí el contenido de tu publicación…"
              value={postText}
              onChange={(e) => setPostText(e.target.value)}
              className={`field min-h-40 flex-1 resize-none py-3 leading-5 ${excedido ? '!border-destructive' : ''}`}
            />
            <p id="mp-contador" className={`text-right text-xs tabular-nums ${excedido ? 'text-destructive' : 'text-muted-foreground'}`}>
              {postText.length} / {LIMITE}
              {excedido && ' · supera el límite'}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-1">
            {['😊', '🚀', '✅', '💡', '🎯', '🔥', '📌', '💬'].map((e) => (
              <button
                key={e}
                type="button"
                aria-label={`Insertar ${e}`}
                onClick={() => setPostText((p) => p + e)}
                className="press flex h-10 w-10 items-center justify-center rounded-[10px] text-base transition-colors duration-150 hover:bg-accent"
              >
                {e}
              </button>
            ))}
            <span className="ml-1 text-xs text-muted-foreground">Emojis rápidos</span>
          </div>

          <div className="space-y-2 border-t border-border pt-4">
            <span className="flex items-center gap-2 text-sm font-medium text-foreground">
              <Image className="h-4 w-4 text-brand-strong" />
              Medios adjuntos
            </span>
            {uploadedFiles.length === 0 ? (
              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  setIsDragging(true);
                }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && fileInputRef.current?.click()}
                className={`flex min-h-14 cursor-pointer items-center gap-3 rounded-xl border border-dashed px-4 py-3 transition-colors duration-150 ${
                  isDragging ? 'border-brand bg-brand-soft' : 'border-border hover:border-brand/50 hover:bg-brand-soft'
                }`}
              >
                <IconTile tone={isDragging ? 'brand' : 'neutral'}>
                  <FileUp />
                </IconTile>
                <span className="text-sm text-muted-foreground">
                  <span className="font-medium text-foreground">Arrastra archivos o haz clic</span> · PNG, JPG, GIF, MP4 (máx. 10 MB)
                </span>
              </div>
            ) : (
              <div className="grid grid-cols-[repeat(auto-fill,minmax(72px,1fr))] gap-2">
                <AnimatePresence>
                  {uploadedFiles.map((f, i) => (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      transition={TRANSICION}
                      className="group relative aspect-square overflow-hidden rounded-[10px] border border-border bg-accent"
                    >
                      {f.preview ? (
                        f.type === 'video' ? (
                          <video src={f.preview} muted playsInline className="h-full w-full object-cover" />
                        ) : (
                          <img src={f.preview} alt={f.name} className="h-full w-full object-cover" />
                        )
                      ) : (
                        <div className="flex h-full w-full items-center justify-center">
                          <Video className="h-5 w-5 text-muted-foreground" />
                        </div>
                      )}
                      <button
                        type="button"
                        aria-label={`Quitar ${f.name}`}
                        onClick={() => removeFile(i)}
                        className="absolute right-1 top-1 flex h-8 w-8 items-center justify-center rounded-full bg-black/60 transition-colors duration-150 hover:bg-destructive"
                      >
                        <X className="h-4 w-4 text-white" />
                      </button>
                    </motion.div>
                  ))}
                </AnimatePresence>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="flex aspect-square flex-col items-center justify-center gap-1 rounded-[10px] border border-dashed border-border text-muted-foreground transition-colors duration-150 hover:border-brand/50 hover:bg-brand-soft hover:text-brand-strong"
                >
                  <Plus className="h-4 w-4" />
                  <span className="text-xs">Añadir</span>
                </button>
              </div>
            )}
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept="image/*,video/*"
              className="hidden"
              onChange={(e) => e.target.files && handleFiles(Array.from(e.target.files))}
            />
          </div>
        </Panel>

        {/* Vista previa (pantallas anchas) */}
        <Panel title="Vista previa" icon={<Eye />} className="hidden xl:flex">
          {vistaPrevia}
        </Panel>

        {/* Publicación */}
        <Panel
          title="Publicación"
          icon={<CalendarClock />}
          footer={
            <div className="grid gap-2 py-1">
              <Button
                size="lg"
                className="w-full"
                icon={saving ? <Loader2 className="animate-spin" /> : scheduleMode === 'now' ? <Send /> : <CalendarClock />}
                onClick={handleSchedule}
                disabled={saving || Boolean(motivoBloqueo)}
                aria-describedby={motivoBloqueo ? 'mp-motivo' : undefined}
              >
                {saving ? 'Guardando…' : scheduleMode === 'now' ? 'Publicar ahora' : 'Programar publicación'}
              </Button>
              {motivoBloqueo && (
                <p id="mp-motivo" className="text-center text-xs text-muted-foreground">
                  {motivoBloqueo}
                </p>
              )}
              <Button size="lg" variant="outline" className="w-full" icon={<Save />} onClick={guardarBorradorManual} disabled={!postText.trim()}>
                Guardar como borrador
              </Button>
            </div>
          }
        >
          <div className="space-y-6">
            <div className="space-y-2">
              <span className="text-sm font-medium text-foreground">Redes de publicación</span>
              <RedSelector
                value={redesDestino}
                onChange={setRedesDestino}
                canales={canales}
                medioVideo={uploadedFiles.some((f) => f.type.startsWith('video'))}
              />
              <ul className="mt-3 grid gap-1 text-xs" aria-label="Caracteres por red">
                {(redesDestino.length ? redesDestino : [RED_PRINCIPAL]).map((r) => {
                  const cfg = redConfig(r);
                  const limite = cfg?.limiteCaracteres ?? null;
                  const sobre = limite != null && postText.length > limite;
                  return (
                    <li key={r} className={`flex justify-between ${sobre ? 'font-medium text-destructive' : 'text-muted-foreground'}`}>
                      <span>{cfg?.nombre ?? r}</span>
                      <span className="tabular-nums">
                        {postText.length}
                        {limite != null ? ` / ${limite.toLocaleString('es-CO')}` : ''}
                      </span>
                    </li>
                  );
                })}
              </ul>
            </div>

            <div className="space-y-3 border-t border-border pt-5">
              <Segmented
                full
                ariaLabel="Momento de publicación"
                value={scheduleMode}
                onChange={(v) => setScheduleMode(v as 'now' | 'schedule')}
                options={[
                  { value: 'now', label: 'Publicar ahora' },
                  { value: 'schedule', label: 'Programar' },
                ]}
              />

              <AnimatePresence mode="wait" initial={false}>
                {scheduleMode === 'now' ? (
                  <motion.div key="ahora" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={TRANSICION}>
                    <Notice tone="success" icon={<Send />}>
                      <span className="font-medium">Publicación inmediata.</span> Se enviará a las redes seleccionadas al confirmar.
                    </Notice>
                  </motion.div>
                ) : (
                  <motion.div
                    key="programar"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={TRANSICION}
                    className="space-y-3"
                  >
                    <div className="grid gap-3 min-[400px]:grid-cols-[minmax(0,1fr)_120px]">
                      <label className="flex flex-col gap-2">
                        <span className="text-sm font-medium text-foreground">Fecha</span>
                        <input type="date" min={today} value={scheduledDate} onChange={(e) => setScheduledDate(e.target.value)} className="field tabular-nums" />
                      </label>
                      <label className="flex flex-col gap-2">
                        <span className="text-sm font-medium text-foreground">Hora</span>
                        <input type="time" value={scheduledTime} onChange={(e) => setScheduledTime(e.target.value)} className="field tabular-nums" />
                      </label>
                    </div>
                    <Dropdown label="Zona horaria" icon={<Globe />} value={timezone} onChange={setTimezone} options={ZONAS_HORARIAS} />
                    {scheduledDate && scheduledTime && (
                      <Notice tone="info" icon={<CalendarClock />}>
                        <span className="block font-medium">
                          {new Date(`${scheduledDate}T${scheduledTime}`).toLocaleString('es-CO', {
                            weekday: 'long',
                            day: 'numeric',
                            month: 'long',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                        <span className="text-xs text-muted-foreground">{timezone.replace('_', ' ')}</span>
                      </Notice>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

          </div>
        </Panel>
      </div>

      <Modal isOpen={vistaPreviaAbierta} onClose={() => setVistaPreviaAbierta(false)} title="Vista previa" maxWidthClass="max-w-xl">
        {vistaPrevia}
      </Modal>
    </ScreenLayout>
  );
};

// ============================================================================
// PANTALLA 4: BORRADORES
// ============================================================================

const DraftsScreen: React.FC<{ onNavigate: (screen: string) => void }> = ({ onNavigate }) => {
  const { user } = useAuth();
  const invalidate = useInvalidateCampus();
  const { data: drafts = [], isLoading, error, refetch } = useBorradores();
  const [filter, setFilter] = useState('todos');
  const [pagina, setPagina] = useState(0);
  const [confirmar, dialogoConfirmacion] = useConfirm();
  const POR_PAGINA = 20;

  const filtered = drafts.filter((d) => {
    if (filter === 'pendientes') return d.estado === 'pendiente';
    if (filter === 'programados') return d.estado === 'programado' || d.estado === 'aprobado';
    return true;
  });
  const paginas = Math.max(1, Math.ceil(filtered.length / POR_PAGINA));
  const paginaActual = Math.min(pagina, paginas - 1);
  const visibles = filtered.slice(paginaActual * POR_PAGINA, (paginaActual + 1) * POR_PAGINA);

  const statusColors: Record<string, 'warning' | 'success' | 'purple' | 'default'> = {
    pendiente: 'warning',
    aprobado: 'success',
    programado: 'purple',
    rechazado: 'default',
  };

  const networkIcons: Partial<Record<RedSocial, React.ReactNode>> = {
    linkedin: <Linkedin className="w-4 h-4 text-[#0a66c2]" />,
    facebook: <Facebook className="w-4 h-4 text-[#1877f2]" />,
    instagram: <Instagram className="w-4 h-4 text-[#e1306c]" />,
    tiktok: <Music2 className="w-4 h-4" />,
    freelancer: <Briefcase className="w-4 h-4 text-[#29b2fe]" />,
    fiverr: <Store className="w-4 h-4 text-[#1dbf73]" />,
  } as const;

  const conteo = {
    todos: drafts.length,
    pendientes: drafts.filter((d) => d.estado === 'pendiente').length,
    programados: drafts.filter((d) => d.estado === 'programado' || d.estado === 'aprobado').length,
  };
  const etiquetas = { todos: 'Todos', pendientes: 'Pendientes', programados: 'Programados' } as const;

  const cambiarFiltro = (f: string) => {
    setFilter(f);
    setPagina(0);
  };

  const titulo = (d: Borrador) => d.titulo || d.promptOriginal.slice(0, 50) || 'Borrador sin título';

  const eliminar = async (d: Borrador) => {
    if (
      !user ||
      !(await confirmar({
        titulo: '¿Eliminar borrador?',
        mensaje: `“${titulo(d)}” se eliminará de forma permanente.`,
        accion: 'Eliminar',
      }))
    )
      return;
    await eliminarBorrador(d.id);
    invalidate();
    refetch();
  };

  const redes = (d: Borrador) =>
    d.redesDestino.length === 0 ? (
      <span className="text-xs text-muted-foreground">Sin redes</span>
    ) : (
      <div className="flex items-center -space-x-1.5">
        {d.redesDestino.map((net) => (
          <span
            key={net}
            title={redConfig(net as RedSocial)?.nombre ?? net}
            className="flex h-7 w-7 items-center justify-center rounded-full border-2 border-card bg-secondary"
          >
            {networkIcons[net as keyof typeof networkIcons]}
          </span>
        ))}
      </div>
    );

  const acciones = (d: Borrador) => (
    <div className="flex items-center justify-end gap-4">
      <IconButton label={`Continuar editando: ${titulo(d)}`} onClick={() => resumeBorradorAndNavigate(d, onNavigate)}>
        <Edit />
      </IconButton>
      <IconButton label={`Eliminar borrador: ${titulo(d)}`} tone="danger" onClick={() => void eliminar(d)}>
        <Trash2 />
      </IconButton>
    </div>
  );

  const vacioPorFiltro = drafts.length > 0 && filtered.length === 0;

  return (
    <ScreenLayout>
      {dialogoConfirmacion}
      <PageHeader title="Borradores" subtitle="Gestiona tus publicaciones guardadas y programadas" />

      <div className="flex shrink-0 flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="hidden sm:block">
          <Segmented
            ariaLabel="Filtrar borradores"
            value={filter}
            onChange={cambiarFiltro}
            options={(['todos', 'pendientes', 'programados'] as const).map((f) => ({
              value: f,
              label: (
                <>
                  {etiquetas[f]}
                  <span className="text-xs tabular-nums text-muted-foreground">{conteo[f]}</span>
                </>
              ),
            }))}
          />
        </div>
        <Dropdown
          className="sm:hidden"
          value={filter}
          onChange={cambiarFiltro}
          options={(['todos', 'pendientes', 'programados'] as const).map((f) => ({
            value: f,
            label: `${etiquetas[f]} (${conteo[f]})`,
          }))}
        />
        <p className="text-sm tabular-nums text-muted-foreground">
          {filtered.length} {filtered.length === 1 ? 'borrador' : 'borradores'}
        </p>
      </div>

      {error && (
        <Notice tone="danger" className="shrink-0" action={<Button variant="ghost" onClick={refetch}>Reintentar</Button>}>
          No se pudieron cargar los borradores.
        </Notice>
      )}

      <Panel
        scroll={false}
        className="flex-1"
        bodyClassName="!p-0 flex flex-col"
        footer={
          paginas > 1 ? (
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm tabular-nums text-muted-foreground">
                Página {paginaActual + 1} de {paginas}
              </p>
              <div className="flex gap-2">
                <IconButton label="Página anterior" disabled={paginaActual === 0} onClick={() => setPagina(paginaActual - 1)}>
                  <ChevronLeft />
                </IconButton>
                <IconButton label="Página siguiente" disabled={paginaActual >= paginas - 1} onClick={() => setPagina(paginaActual + 1)}>
                  <ChevronRight />
                </IconButton>
              </div>
            </div>
          ) : undefined
        }
      >
        {isLoading ? (
          <div aria-busy="true" aria-label="Cargando borradores">
            <div className="hidden md:block">
              <div className="h-11 border-b border-border" />
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="flex h-14 items-center gap-6 border-b border-border px-6 last:border-0">
                  <Skeleton className="h-3.5 flex-1" />
                  <Skeleton className="h-7 w-16 !rounded-full" />
                  <Skeleton className="h-6 w-20" />
                  <Skeleton className="h-3.5 w-24" />
                  <Skeleton className="h-10 w-24 !rounded-[10px]" />
                </div>
              ))}
            </div>
            <div className="space-y-3 p-4 md:hidden">
              {[1, 2, 3, 4].map((i) => (
                <Skeleton key={i} className="h-32 w-full !rounded-xl" />
              ))}
            </div>
          </div>
        ) : filtered.length === 0 ? (
          vacioPorFiltro ? (
            <EmptyState
              icon={<Filter />}
              title="No hay borradores en este estado"
              text="Prueba con otro filtro para ver el resto de tus borradores."
              action={
                <Button variant="outline" onClick={() => cambiarFiltro('todos')}>
                  Ver todos
                </Button>
              }
            />
          ) : (
            <EmptyState
              icon={<FileText />}
              title="Todavía no hay borradores"
              text="Crea contenido y guárdalo como borrador para retomarlo más tarde."
              action={
                <Button icon={<Plus />} onClick={() => onNavigate('new-post')}>
                  Nueva publicación
                </Button>
              }
            />
          )
        ) : (
          <>
            {/* Tabla (≥ 768) */}
            <div className="hidden min-h-0 flex-1 md:block lg:overflow-auto">
              <table className="w-full border-collapse text-left">
                <thead className="sticky top-0 z-10 bg-card">
                  <tr className="border-b border-border">
                    {['Título', 'Redes', 'Estado', 'Fecha'].map((h) => (
                      <th key={h} scope="col" className="h-11 px-6 text-xs font-semibold text-muted-foreground">
                        {h}
                      </th>
                    ))}
                    <th scope="col" className="h-11 px-6 text-right text-xs font-semibold text-muted-foreground">
                      <span className="sr-only">Acciones</span>
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {visibles.map((draft) => (
                    <tr key={draft.id} className="transition-colors duration-150 hover:bg-accent/60">
                      <td className="h-14 min-w-48 max-w-[420px] px-6 py-2">
                        <button
                          type="button"
                          onClick={() => resumeBorradorAndNavigate(draft, onNavigate)}
                          className="block max-w-full truncate rounded-[6px] text-left text-sm font-medium text-foreground hover:text-brand-strong"
                          title={titulo(draft)}
                        >
                          {titulo(draft)}
                        </button>
                      </td>
                      <td className="px-6">{redes(draft)}</td>
                      <td className="px-6">
                        <Badge variant={statusColors[draft.estado] ?? 'default'} className="capitalize">
                          {draft.estado}
                        </Badge>
                      </td>
                      <td className="whitespace-nowrap px-6 text-sm tabular-nums text-muted-foreground">
                        {draft.creadoEn ? formatRelative(toDate(draft.creadoEn)) : 'Sin fecha'}
                      </td>
                      <td className="px-6">{acciones(draft)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Tarjetas (< 768) */}
            <ul className="divide-y divide-border md:hidden">
              {visibles.map((draft) => (
                <li key={draft.id} className="space-y-3 px-5 py-4">
                  <button
                    type="button"
                    onClick={() => resumeBorradorAndNavigate(draft, onNavigate)}
                    className="line-clamp-2 text-left text-sm font-medium text-foreground"
                  >
                    {titulo(draft)}
                  </button>
                  <div className="flex items-center gap-3">
                    <Badge variant={statusColors[draft.estado] ?? 'default'} className="capitalize">
                      {draft.estado}
                    </Badge>
                    <span className="text-xs tabular-nums text-muted-foreground">
                      {draft.creadoEn ? formatRelative(toDate(draft.creadoEn)) : 'Sin fecha'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    {redes(draft)}
                    {acciones(draft)}
                  </div>
                </li>
              ))}
            </ul>
          </>
        )}
      </Panel>
    </ScreenLayout>
  );
};

// ============================================================================
// PANTALLA 5: CALENDARIO
// ============================================================================

/** Nombre legible de cada estado de publicación (Q13: el estado se lee sin depender del color). */
function etiquetaEstado(estado: string): string {
  const etiquetas: Record<string, string> = {
    borrador: 'Borrador',
    pendiente: 'Pendiente',
    programado: 'Programada',
    en_proceso: 'Enviando',
    enviado: 'Enviada sin confirmar',
    parcial: 'Parcial',
    publicado: 'Publicada',
    fallido: 'Fallida',
  };
  return etiquetas[estado] ?? estado;
}

const ETAPAS_ENVIO = ['Programada', 'Enviando', 'Parcial', 'Publicada'] as const;

/** Etapa actual del envío: solo figura como publicada cuando todas las redes confirman (U6). */
function etapaDeEnvio(estado: string): number {
  if (estado === 'publicado') return 3;
  if (estado === 'parcial') return 2;
  if (estado === 'en_proceso' || estado === 'enviado') return 1;
  return 0;
}

/** Detalle de envío de una publicación: etapas, resultado por red, intentos y reintento de fallidas. */
const DetalleEnvio: React.FC<{
  post: Publicacion;
  reintentando: boolean;
  onReintentar: () => void;
  onIrCanales: () => void;
}> = ({ post, reintentando, onReintentar, onIrCanales }) => {
  const resultados = post.resultados ?? {};
  const fallidas = post.redesDestino.filter((r) => resultados[r]?.success !== true);
  const puedeReintentar = (post.estado === 'parcial' || post.estado === 'fallido') && fallidas.length > 0;
  const conToken = fallidas.some((r) => /token|401|190|caduc|conect/i.test(resultados[r]?.error ?? ''));
  const fechaPrevista = post.fechaProgramada ? toDate(post.fechaProgramada) : null;
  const vencida = post.estado === 'programado' && !!fechaPrevista && fechaPrevista.getTime() < Date.now();
  const actual = etapaDeEnvio(post.estado);

  return (
    <div className="space-y-4 rounded-xl border border-border p-4">
      <ol className="grid grid-cols-2 gap-2 text-xs sm:grid-cols-4" aria-label="Etapas del envío">
        {ETAPAS_ENVIO.map((nombre, i) => (
          <li
            key={nombre}
            aria-current={i === actual ? 'step' : undefined}
            className={`rounded-lg px-2 py-1.5 text-center font-medium ${
              i === actual ? 'bg-brand-soft text-brand-strong' : i < actual ? 'bg-accent text-foreground' : 'text-muted-foreground'
            }`}
          >
            {nombre}
          </li>
        ))}
      </ol>

      {vencida && (
        <Notice tone="warning">
          La hora prevista ya pasó y sigue sin enviarse. Si esto se repite, revisa el último ciclo del programador.
        </Notice>
      )}

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs text-muted-foreground">
              <th scope="col" className="py-1 font-medium">Red</th>
              <th scope="col" className="py-1 font-medium">Estado</th>
              <th scope="col" className="py-1 font-medium">Detalle</th>
            </tr>
          </thead>
          <tbody>
            {post.redesDestino.map((red) => {
              const r = resultados[red];
              const estadoRed = r?.success ? 'Publicado' : r?.error ? 'Fallido' : 'Pendiente';
              return (
                <tr key={red} className="border-t border-border align-top">
                  <th scope="row" className="py-2 pr-2 text-left font-medium text-foreground">
                    {redConfig(red as RedSocial)?.nombre ?? red}
                  </th>
                  <td className="py-2 pr-2">{estadoRed}</td>
                  <td className="py-2 text-muted-foreground [overflow-wrap:anywhere]">
                    {r?.success ? (r.postId ? `ID ${r.postId}` : 'Confirmado') : (r?.error ?? 'Sin envío todavía')}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {(post.intentos ?? 0) > 0 && (
        <p className="text-xs text-muted-foreground">
          Intento {post.intentos} de 5
          {post.ultimoError ? ` · Último error: ${post.ultimoError}` : ''}
        </p>
      )}

      <div className="flex flex-wrap gap-2">
        {puedeReintentar && (
          <Button
            icon={reintentando ? <Loader2 className="animate-spin" /> : <Send />}
            disabled={reintentando}
            onClick={onReintentar}
          >
            {fallidas.length === 1 ? 'Reintentar la red fallida' : 'Reintentar las redes fallidas'}
          </Button>
        )}
        {conToken && (
          <Button variant="outline" onClick={onIrCanales}>
            Ir a Canales
          </Button>
        )}
      </div>
      {puedeReintentar && (
        <p className="text-xs text-muted-foreground">
          Solo se reintenta lo que falló: las redes que ya publicaron no se vuelven a enviar.
        </p>
      )}
    </div>
  );
};

/** Último ciclo del programador. Avisa si lleva tiempo sin ejecutarse (U2). */
const ProgramadorEstado: React.FC<{ ciclo: EstadoProgramador['ultimoCiclo'] | undefined }> = ({ ciclo }) => {
  if (ciclo === undefined) return null;
  if (!ciclo?.ejecutadoEn) {
    return (
      <Notice tone="warning">
        El programador aún no tiene ejecuciones registradas. Configura el disparador externo cada 5 minutos (ver docs/deploy-vercel.md).
      </Notice>
    );
  }
  const minutos = Math.round((Date.now() - new Date(ciclo.ejecutadoEn).getTime()) / 60_000);
  const atrasado = minutos > 15;
  const texto = minutos < 1 ? 'hace menos de 1 min' : `hace ${minutos} min`;
  return (
    <p role="status" className={`text-xs ${atrasado ? 'text-destructive' : 'text-muted-foreground'}`}>
      {atrasado
        ? `El programador no se ejecuta desde ${texto}. Las publicaciones programadas no salen a su hora.`
        : `Último ciclo del programador: ${texto}${ciclo.fallidas ? ` · ${ciclo.fallidas} con error` : ''}.`}
    </p>
  );
};

/** Categoría de una publicación en el calendario. Cada una tiene nombre además de color (Q13). */
type CategoriaCal = 'programada' | 'vencida' | 'parcial' | 'enviando' | 'publicada' | 'fallida';

const CATEGORIAS_CAL: { clave: CategoriaCal; nombre: string; punto: string }[] = [
  { clave: 'programada', nombre: 'Programada', punto: 'bg-brand' },
  { clave: 'vencida', nombre: 'Vencida', punto: 'bg-warning' },
  { clave: 'parcial', nombre: 'Parcial', punto: 'bg-warning' },
  { clave: 'enviando', nombre: 'Enviando', punto: 'bg-brand' },
  { clave: 'publicada', nombre: 'Publicada', punto: 'bg-success' },
  { clave: 'fallida', nombre: 'Fallida', punto: 'bg-destructive' },
];

function categoriaDeCal(post: Publicacion, vencida: boolean): CategoriaCal {
  if (post.estado === 'publicado') return 'publicada';
  if (post.estado === 'fallido') return 'fallida';
  if (post.estado === 'parcial') return 'parcial';
  if (post.estado === 'en_proceso' || post.estado === 'enviado') return 'enviando';
  return vencida ? 'vencida' : 'programada';
}

const CalendarScreen: React.FC<{ onNavigate: (screen: string) => void }> = ({ onNavigate }) => {
  const { user, profile } = useAuth();
  const invalidate = useInvalidateCampus();
  const now = new Date();
  const [viewDate, setViewDate] = useState(new Date(now.getFullYear(), now.getMonth(), 1));
  const [selectedDay, setSelectedDay] = useState<number | null>(now.getDate());
  const [draggingPostId, setDraggingPostId] = useState<string | null>(null);
  const [dropTargetDay, setDropTargetDay] = useState<number | null>(null);
  const [moving, setMoving] = useState(false);
  const [previewPost, setPreviewPost] = useState<Publicacion | null>(null);
  const [schedulerMsg, setSchedulerMsg] = useState('');
  const [publishingId, setPublishingId] = useState<string | null>(null);
  const dragRef = useRef(false);
  const displayName = profile?.nombre || 'Influencer';
  const initials = (profile?.nombre || user?.email || 'U').slice(0, 2).toUpperCase();
  const mes = viewDate.getMonth();
  const anio = viewDate.getFullYear();
  const { porDia, isLoading, error: errorCal, refetch: recargarCal } = usePublicacionesProgramadas(mes, anio);
  const [confirmar, dialogoConfirmacion] = useConfirm();
  const [reprogramando, setReprogramando] = useState<Publicacion | null>(null);
  const [repFecha, setRepFecha] = useState('');
  const [repHora, setRepHora] = useState('');
  const diaRef = useRef<HTMLDivElement>(null);
  const celdasRef = useRef<(HTMLButtonElement | null)[]>([]);

  const monthLabel = viewDate.toLocaleDateString('es-CO', { month: 'long', year: 'numeric' });
  const daysInMonth = new Date(anio, mes + 1, 0).getDate();
  const firstDayOffset = (new Date(anio, mes, 1).getDay() + 6) % 7;

  // M4: vistas mes, semana y lista, con filtros por red y por estado que se combinan.
  const [vista, setVista] = useState<'mes' | 'semana' | 'lista'>('mes');
  const [filtroRedes, setFiltroRedes] = useState<Set<RedSocial>>(() => new Set(CATALOGO_REDES.map((r) => r.id)));
  const [filtroEstados, setFiltroEstados] = useState<Set<CategoriaCal>>(() => new Set(CATEGORIAS_CAL.map((c) => c.clave)));

  const postVisible = (post: Publicacion) =>
    (post.redesDestino ?? [RED_PRINCIPAL]).some((r) => filtroRedes.has(r)) &&
    filtroEstados.has(categoriaDeCal(post, isPostOverdue(post)));

  const porDiaVisible: Record<number, Publicacion[]> = {};
  for (const [dia, lista] of Object.entries(porDia)) {
    const visibles = lista.filter(postVisible);
    if (visibles.length > 0) porDiaVisible[Number(dia)] = visibles;
  }

  const selectedPosts = selectedDay ? porDiaVisible[selectedDay] ?? [] : [];

  const alternarFiltro = <T extends string>(setter: React.Dispatch<React.SetStateAction<Set<T>>>, clave: T) =>
    setter((prev) => {
      const next = new Set(prev);
      if (next.has(clave)) next.delete(clave);
      else next.add(clave);
      return next;
    });

  /** Anterior y siguiente: un mes en la vista de mes, una semana en la vista de semana. */
  const desplazar = (sentido: -1 | 1) => {
    if (vista === 'semana') {
      const base = new Date(anio, mes, selectedDay ?? 1);
      const nueva = new Date(base.getFullYear(), base.getMonth(), base.getDate() + sentido * 7);
      setViewDate(new Date(nueva.getFullYear(), nueva.getMonth(), 1));
      setSelectedDay(nueva.getDate());
      return;
    }
    setViewDate(new Date(anio, mes + sentido, 1));
  };

  const filtrosCal = (
    <div className="mb-3 space-y-2" aria-label="Filtros del calendario">
      <div className="flex flex-wrap gap-1.5" role="group" aria-label="Filtrar por red">
        {CATALOGO_REDES.map((r) => {
          const activa = filtroRedes.has(r.id);
          return (
            <button
              key={r.id}
              type="button"
              aria-pressed={activa}
              onClick={() => alternarFiltro(setFiltroRedes, r.id)}
              className={`rounded-full border px-2.5 py-1 text-xs font-medium transition-colors ${
                activa ? 'border-brand bg-brand-soft text-brand-strong' : 'border-border text-muted-foreground hover:text-foreground'
              }`}
            >
              {r.nombre}
            </button>
          );
        })}
      </div>
      <div className="flex flex-wrap gap-1.5" role="group" aria-label="Filtrar por estado">
        {CATEGORIAS_CAL.map((c) => {
          const activa = filtroEstados.has(c.clave);
          return (
            <button
              key={c.clave}
              type="button"
              aria-pressed={activa}
              onClick={() => alternarFiltro(setFiltroEstados, c.clave)}
              className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium transition-colors ${
                activa ? 'border-brand bg-brand-soft text-brand-strong' : 'border-border text-muted-foreground hover:text-foreground'
              }`}
            >
              <span className={`inline-block h-2 w-2 rounded-full ${c.punto}`} aria-hidden />
              {c.nombre}
            </button>
          );
        })}
      </div>
    </div>
  );

  /** Vista de semana (los 7 días de la semana del día seleccionado) o de lista (todo el mes, por fecha). */
  const renderSemanaOLista = () => {
    if (vista === 'lista') {
      const lista = allPostsInMonth
        .filter(postVisible)
        .sort((a, b) => (toDate(a.fechaProgramada)?.getTime() ?? 0) - (toDate(b.fechaProgramada)?.getTime() ?? 0));
      if (lista.length === 0) {
        return <p className="py-6 text-center text-sm text-muted-foreground">Ninguna publicación con estos filtros este mes.</p>;
      }
      return (
        <ul className="divide-y divide-border" aria-label="Publicaciones del mes">
          {lista.map((post) => {
            const fecha = toDate(post.fechaProgramada);
            const cat = categoriaDeCal(post, isPostOverdue(post));
            const nombre = CATEGORIAS_CAL.find((c) => c.clave === cat)?.nombre ?? cat;
            return (
              <li key={post.id}>
                <button
                  type="button"
                  onClick={() => setPreviewPost(post)}
                  className="flex w-full items-center gap-3 rounded-lg px-2 py-3 text-left transition-colors hover:bg-accent"
                >
                  <time className="w-20 shrink-0 text-xs tabular-nums text-muted-foreground">
                    {fecha ? fecha.toLocaleDateString('es-CO', { day: 'numeric', month: 'short' }) : 'Sin fecha'}
                    <br />
                    {fecha ? fecha.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' }) : ''}
                  </time>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium text-foreground">{post.titulo || 'Publicación sin título'}</span>
                    <span className="block truncate text-xs text-muted-foreground">
                      {(post.redesDestino ?? []).map((r) => redConfig(r as RedSocial)?.nombre ?? r).join(', ')}
                    </span>
                  </span>
                  <Badge variant={cat === 'publicada' ? 'success' : cat === 'fallida' ? 'danger' : 'default'}>{nombre}</Badge>
                </button>
              </li>
            );
          })}
        </ul>
      );
    }

    const base = new Date(anio, mes, selectedDay ?? 1);
    const lunes = new Date(base.getFullYear(), base.getMonth(), base.getDate() - ((base.getDay() + 6) % 7));
    const dias = Array.from({ length: 7 }, (_, i) => new Date(lunes.getFullYear(), lunes.getMonth(), lunes.getDate() + i));
    return (
      <div className="grid gap-2 sm:grid-cols-7" role="list" aria-label="Semana">
        {dias.map((d) => {
          const enMes = d.getMonth() === mes && d.getFullYear() === anio;
          const lista = enMes ? porDiaVisible[d.getDate()] ?? [] : [];
          const seleccionado = enMes && selectedDay === d.getDate();
          return (
            <div
              key={d.toISOString()}
              role="listitem"
              className={`min-w-0 rounded-xl border p-2 ${seleccionado ? 'border-brand/40 bg-brand-soft' : 'border-border'}`}
            >
              <button
                type="button"
                disabled={!enMes}
                onClick={() => enMes && elegirDia(d.getDate())}
                className="mb-2 w-full text-left text-xs font-medium capitalize text-muted-foreground disabled:opacity-60"
              >
                {d.toLocaleDateString('es-CO', { weekday: 'short', day: 'numeric' })}
              </button>
              <ul className="space-y-1">
                {lista.map((post) => (
                  <li key={post.id}>
                    <button
                      type="button"
                      onClick={() => setPreviewPost(post)}
                      className="w-full truncate rounded-md px-1.5 py-1 text-left text-xs hover:bg-accent"
                    >
                      <span className="tabular-nums text-muted-foreground">
                        {toDate(post.fechaProgramada)?.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })}
                      </span>{' '}
                      {post.titulo || 'Sin título'}
                    </button>
                  </li>
                ))}
                {enMes && lista.length === 0 && <li className="text-xs text-muted-foreground">Sin publicaciones</li>}
              </ul>
            </div>
          );
        })}
      </div>
    );
  };

  const allPostsInMonth = useMemo(
    () => Object.values(porDia).flat(),
    [porDia]
  );

  const isPostOverdue = (post: Publicacion) => {
    if (post.estado !== 'programado' || !post.fechaProgramada) return false;
    const d = toDate(post.fechaProgramada);
    return d ? d.getTime() <= Date.now() : false;
  };

  const overdueCount = useMemo(
    () => allPostsInMonth.filter(isPostOverdue).length,
    [allPostsInMonth]
  );

  useEffect(() => {
    if (!user) return;

    const tick = async () => {
      try {
        const res = await processDueScheduledPosts();
        if (res.processed > 0) {
          const ok = res.results.filter((r) => r.success).length;
          const fail = res.results.filter((r) => !r.success);
          if (ok > 0) {
            setSchedulerMsg(`${ok} publicación(es) enviada(s) a LinkedIn.`);
            invalidate();
          }
          if (fail.length > 0) {
            setSchedulerMsg(fail[0]?.error ?? 'No se pudo publicar una programación.');
          }
        }
      } catch {
        /* backend apagado */
      }
    };

    void tick();
    const id = window.setInterval(() => void tick(), 60_000);
    return () => window.clearInterval(id);
  }, [user?.uid, invalidate]);

  const publicarProgramadoAhora = async (post: Publicacion) => {
    if (!user) return;
    setPublishingId(post.id);
    setSchedulerMsg('');
    try {
      await publishPostNowFn(post.id);
      setSchedulerMsg(
        `Publicación enviada a ${(post.redesDestino ?? [RED_PRINCIPAL]).join(', ')}`
      );
      invalidate();
    } catch (e) {
      setSchedulerMsg(mensajeCallable(e));
    } finally {
      setPublishingId(null);
    }
  };

  // Último ciclo del programador (U2): se carga al entrar y tras cada acción sobre publicaciones.
  const [ciclo, setCiclo] = useState<EstadoProgramador['ultimoCiclo'] | undefined>(undefined);
  useEffect(() => {
    estadoProgramador()
      .then((r) => setCiclo(r.ultimoCiclo))
      .catch(() => setCiclo(null));
  }, []);

  /** Reintenta solo las redes que fallaron de una publicación (U6 / Q15). */
  const reintentarFallidas = async (post: Publicacion) => {
    setPublishingId(post.id);
    setSchedulerMsg('');
    try {
      await reintentarRedes(post.id);
      setSchedulerMsg('Reintento terminado. Las redes que ya habían publicado no se volvieron a enviar.');
      setPreviewPost(null);
      invalidate();
    } catch (e) {
      setSchedulerMsg(mensajeCallable(e));
    } finally {
      setPublishingId(null);
    }
  };

  /** Publicar una vencida o reintentar una fallida se confirma con un resumen, porque sale a las redes. */
  const confirmarPublicarPost = async (post: Publicacion) => {
    const redes = (post.redesDestino ?? [RED_PRINCIPAL]).map((r) => redConfig(r)?.nombre ?? r).join(', ');
    const hora = toDate(post.fechaProgramada)?.toLocaleString('es-CO', { dateStyle: 'medium', timeStyle: 'short' }) ?? 'sin hora';
    const texto = post.contenido ?? '';
    const extracto = texto.length > 120 ? `${texto.slice(0, 120)}…` : texto;
    if (
      !(await confirmar({
        titulo: post.estado === 'fallido' ? '¿Reintentar la publicación?' : '¿Publicar ahora?',
        mensaje: `Redes: ${redes}. Programada para ${hora}. ${post.imagenUrl ? 'Con imagen.' : 'Sin imagen.'} Texto: “${extracto}”`,
        accion: post.estado === 'fallido' ? 'Reintentar' : 'Publicar',
      }))
    )
      return;
    await publicarProgramadoAhora(post);
  };

  const reprogramarEnDia = async (postId: string, targetDay: number) => {
    const post = allPostsInMonth.find((p) => p.id === postId);
    if (!post?.fechaProgramada) return;
    const prev = post.fechaProgramada ? toDate(post.fechaProgramada) : null;
    const nueva = new Date(anio, mes, targetDay, prev?.getHours() ?? 0, prev?.getMinutes() ?? 0, 0, 0);
    setMoving(true);
    try {
      await actualizarPublicacion(postId, { fechaProgramada: nueva });
      await registrarActividad(user!.uid, {
        tipo: 'programado',
        mensaje: `Reprogramado al ${nueva.toLocaleDateString('es-CO')}`,
        red: post.redesDestino[0],
      });
      invalidate();
      setSelectedDay(targetDay);
    } finally {
      setMoving(false);
      setDraggingPostId(null);
      setDropTargetDay(null);
    }
  };

  const semanas = Math.ceil((firstDayOffset + daysInMonth) / 7);
  const esMesActual = anio === now.getFullYear() && mes === now.getMonth();
  const diaFoco = selectedDay && selectedDay <= daysInMonth ? selectedDay : 1;

  /** Elige un día; en < 1024 lleva el foco y el scroll al panel del día. */
  const elegirDia = (day: number, desdeTeclado = false) => {
    setSelectedDay(day);
    if (!desdeTeclado && window.matchMedia('(max-width: 1023px)').matches) {
      window.setTimeout(() => {
        diaRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        diaRef.current?.focus({ preventScroll: true });
      }, 0);
    }
  };

  // Roving tabindex: flechas ±1 día / ±1 semana, Inicio/Fin del mes.
  const moverFoco = (e: React.KeyboardEvent, day: number) => {
    const saltos: Record<string, number> = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -7, ArrowDown: 7 };
    let destino: number | null = null;
    if (e.key in saltos) destino = day + saltos[e.key];
    else if (e.key === 'Home') destino = 1;
    else if (e.key === 'End') destino = daysInMonth;
    if (destino === null) return;
    e.preventDefault();
    destino = Math.min(daysInMonth, Math.max(1, destino));
    elegirDia(destino, true);
    celdasRef.current[destino]?.focus();
  };

  const describirDia = (posts: Publicacion[]) => {
    if (!posts.length) return '';
    const cuenta = (estado: string) => posts.filter((p) => p.estado === estado).length;
    const partes = [
      cuenta('programado') && `${cuenta('programado')} programada${cuenta('programado') > 1 ? 's' : ''}`,
      cuenta('publicado') && `${cuenta('publicado')} publicada${cuenta('publicado') > 1 ? 's' : ''}`,
      cuenta('fallido') && `${cuenta('fallido')} fallida${cuenta('fallido') > 1 ? 's' : ''}`,
    ].filter(Boolean);
    return `, ${posts.length} publicación${posts.length > 1 ? 'es' : ''}${partes.length ? `: ${partes.join(', ')}` : ''}`;
  };

  const abrirReprogramar = (post: Publicacion) => {
    const fp = toDate(post.fechaProgramada) ?? new Date();
    const pad = (n: number) => String(n).padStart(2, '0');
    setRepFecha(`${fp.getFullYear()}-${pad(fp.getMonth() + 1)}-${pad(fp.getDate())}`);
    setRepHora(`${pad(fp.getHours())}:${pad(fp.getMinutes())}`);
    setReprogramando(post);
  };

  const guardarReprogramacion = async () => {
    if (!user || !reprogramando || !repFecha || !repHora) return;
    const nueva = new Date(`${repFecha}T${repHora}`);
    setMoving(true);
    try {
      await actualizarPublicacion(reprogramando.id, { fechaProgramada: nueva });
      await registrarActividad(user.uid, {
        tipo: 'programado',
        mensaje: `Reprogramado al ${nueva.toLocaleDateString('es-CO')}`,
        red: reprogramando.redesDestino[0],
      });
      invalidate();
      setViewDate(new Date(nueva.getFullYear(), nueva.getMonth(), 1));
      setSelectedDay(nueva.getDate());
      setReprogramando(null);
    } finally {
      setMoving(false);
    }
  };

  const eliminarPost = async (post: Publicacion) => {
    if (
      !user ||
      !(await confirmar({
        titulo: '¿Eliminar publicación?',
        mensaje: `“${post.titulo || 'Publicación'}” se eliminará del calendario de forma permanente.`,
        accion: 'Eliminar',
      }))
    )
      return;
    await eliminarPublicacion(post.id);
    if (previewPost?.id === post.id) setPreviewPost(null);
    invalidate();
  };

  return (
    <ScreenLayout>
      {dialogoConfirmacion}
      <PageHeader
        title="Calendario editorial"
        subtitle="Organiza y reprograma tus publicaciones por día."
        actions={
          <Button icon={<Plus />} onClick={() => onNavigate('new-post')}>
            Nueva publicación
          </Button>
        }
      />

      {(overdueCount > 0 || schedulerMsg || errorCal) && (
        <div className="shrink-0 space-y-3">
          {errorCal && (
            <Notice tone="danger" action={<Button variant="ghost" onClick={recargarCal}>Reintentar</Button>}>
              No se pudieron cargar las publicaciones del mes.
            </Notice>
          )}
          {overdueCount > 0 && (
            <Notice tone="warning" icon={<Clock />}>
              <span className="font-medium">{overdueCount} publicación(es) pasaron su hora</span> y siguen programadas. Se
              publicarán en el próximo ciclo del programador, o usa <span className="font-medium">Publicar</span> en el día
              correspondiente.
            </Notice>
          )}
          <ProgramadorEstado ciclo={ciclo} />
          {schedulerMsg && <Notice tone="success">{schedulerMsg}</Notice>}
        </div>
      )}

      <div className="grid min-h-0 flex-1 gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        {/* Mes */}
        <Panel
          title={<span className="inline-block first-letter:uppercase">{monthLabel}</span>}
          icon={<Calendar />}
          scroll={false}
          className="max-[359px]:[&>div:nth-child(2)]:!p-2"
          bodyClassName="flex flex-col"
          actions={
            <div className="flex flex-wrap items-center gap-1">
              <div className="mr-1 flex items-center rounded-full border border-border p-0.5" role="group" aria-label="Vista del calendario">
                {(['mes', 'semana', 'lista'] as const).map((v) => (
                  <button
                    key={v}
                    type="button"
                    aria-pressed={vista === v}
                    onClick={() => setVista(v)}
                    className={`rounded-full px-2.5 py-1 text-xs font-medium capitalize transition-colors ${
                      vista === v ? 'bg-brand-soft text-brand-strong' : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    {v}
                  </button>
                ))}
              </div>
              <Button
                variant="ghost"
                onClick={() => {
                  setViewDate(new Date(now.getFullYear(), now.getMonth(), 1));
                  setSelectedDay(now.getDate());
                }}
              >
                Hoy
              </Button>
              <IconButton label={vista === 'semana' ? 'Semana anterior' : 'Mes anterior'} onClick={() => desplazar(-1)}>
                <ChevronLeft />
              </IconButton>
              <IconButton label={vista === 'semana' ? 'Semana siguiente' : 'Mes siguiente'} onClick={() => desplazar(1)}>
                <ChevronRight />
              </IconButton>
            </div>
          }
        >
          {filtrosCal}
          <div className={`mb-2 grid shrink-0 grid-cols-7 gap-1 sm:gap-2 ${vista === 'lista' ? 'hidden' : ''}`} aria-hidden>
            {['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'].map((d) => (
              <div key={d} className="py-1 text-center text-xs text-muted-foreground">
                {d}
              </div>
            ))}
          </div>

          {vista !== 'mes' ? renderSemanaOLista() : isLoading ? (
            <div
              aria-busy="true"
              aria-label="Cargando calendario"
              className="grid flex-1 grid-cols-7 gap-1 [--celda:44px] sm:gap-2 lg:[--celda:56px] lg:[@media(max-height:719px)]:[--celda:48px]"
              style={{ gridTemplateRows: `repeat(6, minmax(var(--celda), 1fr))` }}
            >
              {Array.from({ length: 42 }).map((_, i) => (
                <Skeleton key={i} className="!rounded-[10px]" />
              ))}
            </div>
          ) : (
            <div
              key={`${anio}-${mes}`}
              role="grid"
              aria-label={monthLabel}
              className="grid flex-1 animate-fade grid-cols-7 gap-1 [--celda:44px] sm:gap-2 lg:[--celda:56px] lg:[@media(max-height:719px)]:[--celda:48px]"
              style={{ gridTemplateRows: `repeat(${semanas}, minmax(var(--celda), 1fr))` }}
            >
              {Array.from({ length: firstDayOffset }).map((_, i) => (
                <div key={`vacio-${i}`} aria-hidden />
              ))}

              {Array.from({ length: daysInMonth }).map((_, i) => {
                const day = i + 1;
                const posts = porDiaVisible[day] || [];
                const isSelected = selectedDay === day;
                const esHoy = esMesActual && day === now.getDate();
                const destino = dropTargetDay === day && draggingPostId;

                return (
                  <button
                    key={day}
                    ref={(el) => {
                      celdasRef.current[day] = el;
                    }}
                    type="button"
                    tabIndex={day === diaFoco ? 0 : -1}
                    onClick={() => elegirDia(day)}
                    onKeyDown={(e) => moverFoco(e, day)}
                    onDragOver={(e) => {
                      e.preventDefault();
                      setDropTargetDay(day);
                    }}
                    onDragLeave={() => setDropTargetDay((d) => (d === day ? null : d))}
                    onDrop={(e) => {
                      e.preventDefault();
                      if (draggingPostId && user) void reprogramarEnDia(draggingPostId, day);
                    }}
                    aria-pressed={isSelected}
                    aria-current={esHoy ? 'date' : undefined}
                    aria-label={`${day} de ${monthLabel}${describirDia(posts)}`}
                    className={`flex min-h-0 min-w-0 flex-col items-center overflow-hidden rounded-[10px] border p-1 text-left transition-colors duration-150 sm:items-start sm:p-2
                      ${isSelected ? 'border-brand/40 bg-brand-soft' : 'border-border hover:bg-accent'}
                      ${destino ? 'border-brand ring-2 ring-brand/40' : ''}`}
                  >
                    <span
                      className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-sm tabular-nums ${
                        esHoy ? 'ring-2 ring-brand font-semibold text-brand-strong' : isSelected ? 'font-semibold text-brand-strong' : 'text-foreground'
                      }`}
                    >
                      {day}
                    </span>
                    {posts.length > 0 && (
                      <span className="mt-auto flex items-center gap-1 pb-0.5" aria-hidden>
                        {posts.slice(0, 3).map((post) => (
                          <span
                            key={post.id}
                            className={`h-1.5 w-1.5 rounded-full ${
                              isPostOverdue(post) || post.estado === 'fallido'
                                ? 'bg-destructive'
                                : post.estado === 'publicado'
                                  ? 'bg-success'
                                  : 'bg-brand'
                            }`}
                          />
                        ))}
                        {posts.length > 3 && <span className="text-xs leading-none text-muted-foreground">+{posts.length - 3}</span>}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </Panel>

        {/* Día seleccionado: único scroll de la pantalla desde 1024 */}
        <div ref={diaRef} tabIndex={-1} className="flex min-h-0 scroll-mt-4 flex-col rounded-2xl outline-none">
          <Panel
            className="flex-1"
            title={selectedDay ? `${selectedDay} de ${monthLabel}` : 'Selecciona un día'}
            icon={<CalendarClock />}
            actions={selectedPosts.length > 0 ? <Badge variant="purple">{selectedPosts.length}</Badge> : undefined}
          >
            {isLoading ? (
              <div className="space-y-3" aria-busy="true" aria-label="Cargando publicaciones del día">
                {[1, 2].map((i) => (
                  <Skeleton key={i} className="h-44 w-full !rounded-xl" />
                ))}
              </div>
            ) : selectedDay && selectedPosts.length > 0 ? (
              <div className="space-y-3">
                {selectedPosts.map((post) => {
                  const fp = toDate(post.fechaProgramada);
                  const overdue = isPostOverdue(post);
                  return (
                    <article
                      key={post.id}
                      draggable={!moving && post.estado === 'programado'}
                      onDragStart={() => {
                        dragRef.current = true;
                        setDraggingPostId(post.id);
                      }}
                      onDragEnd={() => {
                        setDraggingPostId(null);
                        setDropTargetDay(null);
                        setTimeout(() => {
                          dragRef.current = false;
                        }, 0);
                      }}
                      title={post.estado === 'programado' ? 'Arrastra a otro día para reprogramar' : undefined}
                      className={`overflow-hidden rounded-xl border bg-card p-4 transition-opacity duration-150
                        ${draggingPostId === post.id ? 'opacity-50' : ''}
                        ${overdue ? 'border-destructive/30' : 'border-border'}`}
                    >
                      {post.imagenUrl && (
                        <div className="mb-3 h-28 overflow-hidden rounded-[10px]">
                          <img src={post.imagenUrl} alt="" className="pointer-events-none h-full w-full object-cover" />
                        </div>
                      )}
                      <div className="flex items-start justify-between gap-3">
                        <p className="line-clamp-1 text-sm font-medium" title={post.titulo}>
                          {post.titulo || 'Publicación sin título'}
                        </p>
                        <span className="flex shrink-0 items-center gap-1 text-xs tabular-nums text-muted-foreground">
                          <Clock className="h-3.5 w-3.5" />
                          {fp ? fp.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' }) : 'Sin hora'}
                        </span>
                      </div>
                      <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{post.contenido}</p>
                      <div className="mt-2">
                        <Badge
                          variant={post.estado === 'publicado' ? 'success' : post.estado === 'fallido' || overdue ? 'danger' : 'purple'}
                          className="capitalize"
                        >
                          {overdue ? 'Vencida' : etiquetaEstado(post.estado)}
                        </Badge>
                      </div>
                      {post.estado === 'fallido' && (
                        <ul className="mt-2 space-y-1 text-xs text-destructive">
                          {Object.entries(post.resultados ?? {}).map(([red, r]) =>
                            r && !r.success && r.error ? <li key={red}>{(redConfig(red as RedSocial)?.nombre ?? red)}: {r.error}</li> : null
                          )}
                        </ul>
                      )}

                      <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-border pt-3">
                        {overdue && (
                          <Button
                            variant="success"
                            disabled={publishingId === post.id}
                            icon={publishingId === post.id ? <Loader2 className="animate-spin" /> : <Send />}
                            onClick={() => void confirmarPublicarPost(post)}
                          >
                            Publicar
                          </Button>
                        )}
                        {post.estado === 'fallido' && (
                          <Button
                            variant="outline"
                            disabled={publishingId === post.id}
                            icon={publishingId === post.id ? <Loader2 className="animate-spin" /> : <Send />}
                            onClick={() => void confirmarPublicarPost(post)}
                          >
                            Reintentar
                          </Button>
                        )}
                        <Button variant="ghost" icon={<Eye />} onClick={() => setPreviewPost(post)}>
                          Ver
                        </Button>
                        {post.estado === 'programado' && (
                          <Button variant="ghost" icon={<CalendarClock />} onClick={() => abrirReprogramar(post)}>
                            Reprogramar
                          </Button>
                        )}
                        <IconButton
                          label={`Eliminar publicación: ${post.titulo || 'sin título'}`}
                          tone="danger"
                          className="ml-auto"
                          onClick={() => void eliminarPost(post)}
                        >
                          <Trash2 />
                        </IconButton>
                      </div>
                    </article>
                  );
                })}
              </div>
            ) : selectedDay ? (
              <EmptyState icon={<Calendar />} title="Día libre" text="No hay publicaciones programadas para este día." />
            ) : null}
          </Panel>
        </div>
      </div>

      <Modal
        isOpen={!!reprogramando}
        onClose={() => setReprogramando(null)}
        title="Reprogramar publicación"
        footer={
          <>
            <Button variant="outline" onClick={() => setReprogramando(null)}>
              Cancelar
            </Button>
            <Button
              icon={moving ? <Loader2 className="animate-spin" /> : <CalendarClock />}
              disabled={moving || !repFecha || !repHora}
              onClick={() => void guardarReprogramacion()}
            >
              Guardar fecha
            </Button>
          </>
        }
      >
        <div className="grid gap-3 min-[400px]:grid-cols-[minmax(0,1fr)_120px]">
          <label className="flex flex-col gap-2">
            <span className="text-sm font-medium text-foreground">Fecha</span>
            <input type="date" value={repFecha} onChange={(e) => setRepFecha(e.target.value)} className="field tabular-nums" />
          </label>
          <label className="flex flex-col gap-2">
            <span className="text-sm font-medium text-foreground">Hora</span>
            <input type="time" value={repHora} onChange={(e) => setRepHora(e.target.value)} className="field tabular-nums" />
          </label>
        </div>
      </Modal>

      <Modal
        isOpen={!!previewPost}
        onClose={() => setPreviewPost(null)}
        title={previewPost?.titulo || 'Vista previa'}
        maxWidthClass="max-w-xl"
        footer={
          <Button variant="outline" onClick={() => setPreviewPost(null)}>
            Cerrar
          </Button>
        }
      >
        {previewPost && (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              {previewPost.fechaProgramada && (
                <Badge className="tabular-nums">
                  <Clock className="h-3.5 w-3.5" />
                  {formatDateTime(toDate(previewPost.fechaProgramada))}
                </Badge>
              )}
              <Badge
                variant={previewPost.estado === 'publicado' ? 'success' : previewPost.estado === 'fallido' ? 'danger' : 'default'}
              >
                {etiquetaEstado(previewPost.estado)}
              </Badge>
              {previewPost.redesDestino.map((net) => (
                <Badge key={net} variant="purple">
                  {redConfig(net as RedSocial)?.nombre ?? net}
                </Badge>
              ))}
            </div>
            <DetalleEnvio
              post={previewPost}
              reintentando={publishingId === previewPost.id}
              onReintentar={() => void reintentarFallidas(previewPost)}
              onIrCanales={() => {
                setPreviewPost(null);
                onNavigate('channels');
              }}
            />
            <SocialPostPreview
              network={previewPost.redesDestino[0] || RED_PRINCIPAL}
              authorName={displayName}
              authorInitials={initials}
              content={previewPost.contenido}
              imageUrl={previewPost.imagenUrl}
              charLimit={3000}
            />
          </div>
        )}
      </Modal>
    </ScreenLayout>
  );
};

// ============================================================================
// PANTALLA 6: AGENTE IA (Chat Gemini)
// ============================================================================

type AgentChatMessage = {
  role: 'user' | 'bot';
  text: string;
  accionSugerida?: string;
  temaSugerido?: string;
  tonoSugerido?: string;
  /** Respuesta fallida: se muestra como aviso con "Reintentar". */
  fallo?: boolean;
  reintento?: string;
};

const AgentScreen: React.FC<{ onNavigate: (screen: string) => void }> = ({ onNavigate }) => {
  const { user } = useAuth();
  const invalidate = useInvalidateCampus();
  const { data: storedData, isLoading } = useChatMensajes();
  // Referencia estable: un [] nuevo en cada render dispararía el efecto de abajo en bucle.
  const stored = useMemo(() => storedData ?? [], [storedData]);
  const [messages, setMessages] = useState<AgentChatMessage[]>([]);
  const [lastUserPrompt, setLastUserPrompt] = useState('');
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const [backendOk, setBackendOk] = useState<boolean | null>(null);
  const [aiHint, setAiHint] = useState('');

  const irAGenerarPublicacion = (tema: string, tono = 'profesional') => {
    const topic = tema.trim() || lastUserPrompt.trim();
    if (!topic) {
      setError('Escribe un tema en el chat o pide ideas de publicación primero.');
      return;
    }
    savePostDraftFromAgent({ topic, tone: tono, autoGenerate: true });
    onNavigate('new-post');
  };

  useEffect(() => {
    healthCheck()
      .then((h) => {
        setBackendOk(h.ok);
        setAiHint(h.ai ? `IA: ${h.provider}` : h.aiError || h.hint || '');
        if (!h.ai) setError(h.aiError || 'API de IA no configurada en el backend');
      })
      .catch((e) => {
        setBackendOk(false);
        const msg = mensajeCallable(e);
        setAiHint(msg);
        setError(msg);
      });
  }, []);

  useEffect(() => {
    if (stored.length) {
      setMessages(
        stored.map((m) => ({
          role: m.role === 'user' ? 'user' : 'bot',
          text: m.content,
          accionSugerida: m.accionSugerida ?? undefined,
          temaSugerido: m.temaSugerido ?? undefined,
          tonoSugerido: m.tonoSugerido ?? undefined,
        }))
      );
    } else if (!isLoading) {
      setMessages([
        {
          role: 'bot',
          text: '¡Hola! Soy el asistente de Conect.ia. Puedo ayudarte con ideas y copy. Cuando tengas un tema listo, usa Generar publicación para abrir Nueva publicación y crear el borrador automáticamente.',
        },
      ]);
    }
  }, [stored, isLoading]);

  const quickActions = [
    'Post LinkedIn bootcamp',
    'Hashtags educación tech',
    'Resumir borrador',
    'Ideas contenido semanal'
  ];

  const peticion = useRef(0);
  const composerRef = useRef<HTMLTextAreaElement>(null);

  const enviar = async (text: string, historialBase: AgentChatMessage[]) => {
    if (!user) return;
    const id = ++peticion.current;
    setSending(true);
    setError('');
    setLastUserPrompt(text);
    try {
      const historial = historialBase
        .filter((m) => !m.fallo)
        .slice(-10)
        .map((m) => ({
          role: (m.role === 'user' ? 'user' : 'model') as 'user' | 'model',
          content: m.text,
        }));
      const res = await chatWithAgent(text, historial);
      if (id !== peticion.current) return; // detenida por la persona usuaria
      const botMsg: AgentChatMessage = {
        role: 'bot',
        text: res.respuesta,
        accionSugerida: res.accionSugerida,
        temaSugerido: res.temaSugerido,
        tonoSugerido: res.tonoSugerido,
      };
      setMessages((prev) => [...prev, botMsg]);
      setBackendOk(true);
      refrescarCuota();
      invalidate();
    } catch (e) {
      if (id !== peticion.current) return;
      const msg = mensajeCallable(e);
      setError(msg);
      setBackendOk(false);
      setMessages((prev) => [...prev, { role: 'bot', text: msg, fallo: true, reintento: text }]);
    } finally {
      if (id === peticion.current) setSending(false);
    }
  };

  const handleSend = async () => {
    if (!input.trim() || !user || sending) return;
    const text = input.trim();
    setInput('');
    if (composerRef.current) composerRef.current.style.height = '';
    const base = messages;
    setMessages((prev) => [...prev, { role: 'user', text }]);
    await enviar(text, base);
  };

  const reintentar = (text: string) => {
    setMessages((prev) => prev.filter((m) => !(m.fallo && m.reintento === text)));
    void enviar(text, messages.filter((m) => !m.fallo));
  };

  const detener = () => {
    peticion.current++;
    setSending(false);
  };

  // Cuota de hoy del panel lateral (U10). Se recarga al cargar y tras cada respuesta.
  const [cuota, setCuota] = useState<CuotaIAHoy | null>(null);
  const [copiadoIndice, setCopiadoIndice] = useState<number | null>(null);
  const refrescarCuota = () => {
    cuotaIAHoy().then(setCuota).catch(() => setCuota(null));
  };
  // Solo al montar: después se refresca desde enviar().
  useEffect(() => {
    refrescarCuota();
  }, []);

  const copiarRespuesta = async (texto: string, indice: number) => {
    try {
      await navigator.clipboard.writeText(texto);
      setCopiadoIndice(indice);
      setTimeout(() => setCopiadoIndice((actual) => (actual === indice ? null : actual)), 2000);
    } catch {
      setError('No se pudo copiar. Selecciona el texto y cópialo manualmente.');
    }
  };

  /** Lleva el texto de una respuesta al compositor, sin generar otro. */
  const usarComoPublicacion = (texto: string) => {
    const tema = lastUserPrompt.trim() || texto.slice(0, 80);
    savePostDraftFromAgent({ topic: tema, tone: 'profesional', contenido: texto });
    onNavigate('new-post');
  };

  const finChatRef = useRef<HTMLDivElement>(null);

  // Desplazamiento suave hasta el último mensaje.
  useEffect(() => {
    finChatRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [messages.length, sending]);

  const sinConexion = backendOk === false || Boolean(error);
  const ultimoBot = [...messages].reverse().find((m) => m.role === 'bot' && !m.fallo);

  const atajos = (
    <div className="flex flex-wrap gap-2">
      {quickActions.map((action) => (
        <button
          key={action}
          type="button"
          onClick={() => {
            setInput(action);
            composerRef.current?.focus();
          }}
          className="flex h-10 items-center rounded-[10px] border border-border bg-card px-3 text-sm text-foreground transition-colors duration-150 hover:bg-accent"
        >
          {action}
        </button>
      ))}
    </div>
  );

  return (
    <ScreenLayout>
      <PageHeader
        title="Asistente IA"
        subtitle="Ideas, edición y copy para tus redes, con Gemini"
        actions={
          <span
            role="status"
            className={`inline-flex h-8 max-w-full items-center gap-2 truncate rounded-full border px-3 text-xs font-medium ${
              sinConexion ? 'border-destructive/25 bg-destructive-soft text-destructive' : 'border-brand/20 bg-brand-soft text-brand-strong'
            }`}
          >
            <span className={`h-2 w-2 shrink-0 rounded-full ${sinConexion ? 'bg-destructive' : 'bg-success'}`} aria-hidden />
            <span className="truncate">{sinConexion ? 'Sin conexión con la IA' : aiHint || 'IA activa'}</span>
          </span>
        }
      />

      <div className="grid min-h-0 flex-1 gap-6 lg:grid-cols-[minmax(0,1fr)_300px]">
        {/* Chat: altura definida por debajo de 1024 para que el composer quede siempre abajo */}
        <section
          aria-label="Conversación con el asistente"
          className="surface-flat flex h-[max(420px,calc(100dvh-96px))] flex-col overflow-hidden sm:h-[max(420px,calc(100dvh-112px))] lg:h-auto lg:min-h-0"
        >
          <div className="shrink-0 border-b border-border p-4 lg:hidden">{atajos}</div>

          <div className="min-h-0 flex-1 space-y-5 overflow-y-auto p-5 lg:p-6">
            {messages.length <= 1 && !isLoading && (
              <p className="text-sm text-muted-foreground">
                Prueba con «Dame 3 ideas de posts sobre nuestro bootcamp» o «Mejora este copy para LinkedIn».
              </p>
            )}
            {messages.map((msg, i) =>
              msg.fallo ? (
                <Notice
                  key={i}
                  tone="danger"
                  action={
                    msg.reintento ? (
                      <Button variant="ghost" onClick={() => reintentar(msg.reintento!)}>
                        Reintentar
                      </Button>
                    ) : undefined
                  }
                >
                  {msg.text}
                </Notice>
              ) : (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={TRANSICION}
                  className={`flex flex-col gap-2 ${msg.role === 'user' ? 'items-end' : 'items-start'}`}
                >
                  <div className="flex max-w-[85%] items-end gap-2">
                    {msg.role === 'bot' && (
                      <span className="mb-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand text-white" aria-hidden>
                        <Sparkles className="h-4 w-4" />
                      </span>
                    )}
                    <div
                      className={`min-w-0 whitespace-pre-wrap rounded-2xl px-4 py-3 [overflow-wrap:anywhere] ${
                        msg.role === 'user'
                          ? 'rounded-br-[6px] bg-brand text-white'
                          : 'rounded-bl-[6px] border border-border bg-accent text-foreground'
                      }`}
                    >
                      {msg.role === 'bot' ? (
                        <div className="prose prose-sm max-w-none dark:prose-invert prose-a:text-brand-strong prose-pre:overflow-x-auto">
                          <ChatMessageBody text={msg.text} />
                        </div>
                      ) : (
                        <p className="text-sm">{msg.text}</p>
                      )}
                    </div>
                  </div>

                  {msg.role === 'bot' && i > 0 && (
                    <div className="ml-10 flex flex-wrap gap-2">
                      <Button variant="outline" icon={<Copy />} onClick={() => void copiarRespuesta(msg.text, i)}>
                        {copiadoIndice === i ? 'Copiado' : 'Copiar'}
                      </Button>
                      <Button variant="outline" icon={<PenSquare />} onClick={() => usarComoPublicacion(msg.text)}>
                        Usar como publicación
                      </Button>
                    </div>
                  )}

                  {msg.role === 'bot' && (msg.accionSugerida === 'generar_publicacion' || msg.accionSugerida === 'ver_calendario') && (
                    <div className="ml-10 flex flex-wrap gap-2">
                      {msg.accionSugerida === 'generar_publicacion' && (
                        <Button
                          icon={<PenSquare />}
                          onClick={() => irAGenerarPublicacion(msg.temaSugerido || lastUserPrompt, msg.tonoSugerido || 'profesional')}
                        >
                          Generar publicación
                        </Button>
                      )}
                      {msg.accionSugerida === 'ver_calendario' && (
                        <Button variant="outline" icon={<Calendar />} onClick={() => onNavigate('calendar')}>
                          Ver calendario
                        </Button>
                      )}
                    </div>
                  )}
                </motion.div>
              )
            )}
            {sending && (
              <div className="flex items-end gap-2">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand text-white" aria-hidden>
                  <Sparkles className="h-4 w-4" />
                </span>
                <div className="rounded-2xl rounded-bl-[6px] border border-border bg-accent px-4 py-3">
                  <p className="text-xs text-muted-foreground">Escribiendo…</p>
                </div>
              </div>
            )}
            <div ref={finChatRef} />
          </div>

          {/* Anuncia solo la respuesta completa, no cada fragmento */}
          <div className="sr-only" aria-live="polite">
            {!sending && ultimoBot ? ultimoBot.text : ''}
          </div>

          <div className="shrink-0 border-t border-border p-4 pb-[max(16px,env(safe-area-inset-bottom))]">
            <div className="flex items-end gap-2">
              <textarea
                ref={composerRef}
                value={input}
                onChange={(e) => {
                  setInput(e.target.value);
                  const el = e.target;
                  el.style.height = '';
                  el.style.height = `${Math.min(el.scrollHeight + 2, 120)}px`;
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    void handleSend();
                  }
                }}
                aria-label="Mensaje para el asistente"
                aria-describedby="chat-ayuda"
                placeholder="Pide ideas, optimiza copy o genera contenido…"
                className="field max-h-[120px] min-h-11 resize-none py-3 leading-5"
                rows={1}
              />
              {sending ? (
                <button
                  type="button"
                  onClick={detener}
                  className="flex h-11 shrink-0 items-center justify-center gap-2 rounded-[10px] border border-border bg-card px-4 text-sm font-medium text-foreground transition-colors duration-150 hover:bg-accent"
                >
                  <X className="h-4 w-4" />
                  Detener
                </button>
              ) : (
                <button
                  type="button"
                  aria-label="Enviar mensaje"
                  onClick={() => void handleSend()}
                  disabled={!input.trim()}
                  className="press flex h-11 w-11 shrink-0 items-center justify-center rounded-[10px] bg-brand text-white transition-colors duration-150 hover:bg-brand-strong disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <Send className="h-4 w-4" />
                </button>
              )}
            </div>
            <p id="chat-ayuda" className="mt-2 hidden text-center text-xs text-muted-foreground sm:block">
              Enter para enviar · Shift + Enter para nueva línea
            </p>
          </div>
        </section>

        {/* Columna lateral (≥ 1024): cuota de hoy, acciones rápidas y horas de referencia */}
        <aside className="hidden min-h-0 flex-col gap-6 lg:flex">
        <Panel title="Cuota de hoy">
          <div className="space-y-4">
            {([
              { clave: 'texto', nombre: 'Textos' },
              { clave: 'imagen', nombre: 'Imágenes' },
            ] as const).map(({ clave, nombre }) => {
              const fila = cuota?.tipos[clave];
              const porcentaje = fila && fila.limite > 0 ? Math.min(100, (fila.usado / fila.limite) * 100) : 0;
              return (
                <div key={clave}>
                  <div className="flex items-baseline justify-between text-sm">
                    <span className="text-foreground">{nombre}</span>
                    <span className="tabular-nums text-muted-foreground">{fila ? `${fila.usado} de ${fila.limite}` : '—'}</span>
                  </div>
                  <div className="mt-2 h-2 overflow-hidden rounded-full bg-accent" aria-hidden>
                    <div className="h-full rounded-full bg-brand transition-[width] duration-300" style={{ width: `${porcentaje}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
          <p className="mt-4 text-xs text-muted-foreground">Límite diario por cuenta. Se reinicia a medianoche UTC.</p>
        </Panel>

        <Panel title="Acciones rápidas" icon={<Zap />}>
          <Button
            size="lg"
            className="w-full"
            icon={<Sparkles />}
            onClick={() => irAGenerarPublicacion(lastUserPrompt || input || 'Publicación Conect.ia')}
          >
            Generar publicación
          </Button>
          <p className="mt-2 text-xs text-muted-foreground">
            Abre Nueva publicación con el tema del chat y genera el borrador automáticamente.
          </p>

          <div className="mt-6 space-y-2">
            {quickActions.map((action) => (
              <button
                key={action}
                type="button"
                onClick={() => {
                  setInput(action);
                  composerRef.current?.focus();
                }}
                className="group flex h-10 w-full items-center justify-between gap-3 rounded-[10px] border border-border px-3 text-left text-sm transition-colors duration-150 hover:bg-accent"
              >
                <span className="truncate text-foreground">{action}</span>
                <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
              </button>
            ))}
          </div>

          <div className="mt-6 border-t border-border pt-6">
            <p className="mb-3 text-xs font-semibold text-muted-foreground">Sugerencias</p>
            <ul className="space-y-2">
              {['Pide ideas de contenido específicas', 'Solicita optimización de copy', 'Genera hashtags relevantes', 'Analiza borradores guardados'].map(
                (sug) => (
                  <li key={sug} className="flex items-start gap-2 text-sm text-muted-foreground">
                    <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-brand" aria-hidden />
                    {sug}
                  </li>
                )
              )}
            </ul>
          </div>
        </Panel>

        <Panel title="Horas de referencia">
          <div className="flex flex-wrap gap-2">
            {['Mar 09:00', 'Jue 12:30', 'Vie 17:00'].map((hora) => (
              <span key={hora} className="rounded-full bg-brand-soft px-3 py-1 text-xs font-medium text-brand-strong">
                {hora}
              </span>
            ))}
          </div>
          <p className="mt-4 text-xs text-muted-foreground">
            Referencia pública y orientativa, no datos de tu cuenta. Se sustituirá por tus métricas cuando existan.
          </p>
        </Panel>
        </aside>
      </div>
    </ScreenLayout>
  );
};

// ============================================================================
// PANTALLA 7: CANALES CONECTADOS
// ============================================================================

const ChannelsScreen: React.FC = () => {
  const { user } = useAuth();
  const invalidate = useInvalidateCampus();
  const { data: canales, isLoading, error: errorCanales, refetch: recargarCanales } = useCanales();
  const [confirmar, dialogoConfirmacion] = useConfirm();
  const { stats } = useDashboardStats();
  const [connectModalRed, setConnectModalRed] = useState<RedSocial | null>(null);
  const [oauthNotice, setOauthNotice] = useState<string | null>(null);

  React.useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const paramsTxt = params.toString();
    if (!paramsTxt) return;

    const linkedin = params.get('linkedin');
    const meta = params.get('meta');
    const tiktok = params.get('tiktok');
    if (linkedin === 'success') {
      setOauthNotice('LinkedIn conectado correctamente.');
      invalidate();
    } else if (linkedin) {
      const detail = params.get('linkedin_error');
      setOauthNotice(
        detail
          ? `No se pudo conectar LinkedIn: ${detail}`
          : 'No se pudo completar la conexión con LinkedIn.'
      );
    } else if (meta === 'success') {
      setOauthNotice('Facebook/Instagram conectados correctamente.');
      invalidate();
    } else if (meta) {
      const detail = params.get('meta_error');
      setOauthNotice(
        detail
          ? `No se pudo conectar Facebook/Instagram: ${detail}`
          : 'No se pudo completar la conexión con Facebook/Instagram.'
      );
    } else if (tiktok === 'success') {
      setOauthNotice('TikTok conectado correctamente.');
      invalidate();
    } else if (tiktok) {
      const detail = params.get('tiktok_error');
      setOauthNotice(
        detail
          ? `No se pudo conectar TikTok: ${detail}`
          : 'No se pudo completar la conexión con TikTok.'
      );
    }
    window.history.replaceState({}, '', window.location.pathname);
  }, [invalidate]);

  const conectadas = CATALOGO_REDES.filter(
    (r) => r.tipo === 'oauth' && redEstaConectada(r.id, canales)
  ).length;
  const totalOauth = CATALOGO_REDES.filter((r) => r.tipo === 'oauth').length;
  const fiverrActivo = Boolean(canales?.fiverr?.conectado);

  const toggleCanal = async (red: RedSocial, conectado: boolean) => {
    if (!user) return;
    if (
      !conectado &&
      !(await confirmar({
        titulo: `¿Desconectar ${redConfig(red)?.nombre ?? red}?`,
        mensaje: 'Dejarás de poder publicar en esta red hasta que la vuelvas a conectar. Las publicaciones ya hechas no se borran.',
        accion: 'Desconectar',
      }))
    )
      return;
    await guardarCanal(user.uid, red, { conectado, cuentaNombre: conectado ? 'Manual' : null });
    invalidate();
  };

  const renderCanalCard = (red: (typeof CATALOGO_REDES)[number]) => {
    const config = redConfig(red.id);
    if (!config) return null;
    const canal = canales?.[red.id];
    const conectado = Boolean(canal?.conectado);
    const cuenta = canal?.cuentaNombre;

    return (
      <article key={red.id} className="surface flex flex-col gap-4 p-6">
        <div className="flex items-start gap-3">
          <span
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[10px] border bg-card"
            style={{ borderColor: `${config.color}33` }}
          >
            {redIcono(red.id, 'w-5 h-5')}
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex items-center justify-between gap-2">
              <h3 className="truncate text-sm font-semibold text-foreground">{config.nombre}</h3>
              {config.tipo === 'proximamente' ? (
                <Badge>Próximamente</Badge>
              ) : conectado ? (
                <Badge variant="success">
                  <CheckCircle2 className="h-3 w-3" />
                  Conectado
                </Badge>
              ) : (
                <Badge>Sin conectar</Badge>
              )}
            </div>
            <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
              {conectado
                ? config.tipo === 'manual'
                  ? 'Canal manual activo.'
                  : `Cuenta: ${cuenta ?? 'conectada'}`
                : config.descripcion}
            </p>
          </div>
        </div>
        <div className="mt-auto flex flex-wrap gap-2 pt-1">
          {config.tipo === 'proximamente' ? (
            <Button variant="secondary" disabled>
              Disponible pronto
            </Button>
          ) : config.tipo === 'manual' ? (
            fiverrActivo ? (
              <Button variant="destructive" onClick={() => void toggleCanal(red.id, false)}>
                Desactivar
              </Button>
            ) : (
              <Button variant="primary" onClick={() => void toggleCanal(red.id, true)}>
                Activar canal manual
              </Button>
            )
          ) : conectado ? (
            <>
              <Button variant="outline" onClick={() => setConnectModalRed(red.id)}>
                Reconfigurar
              </Button>
              <Button variant="destructive" onClick={() => void toggleCanal(red.id, false)}>
                Desconectar
              </Button>
            </>
          ) : (
            <Button variant="primary" onClick={() => setConnectModalRed(red.id)}>
              Conectar {config.nombre}
            </Button>
          )}
        </div>
      </article>
    );
  };

  const indicadores = [
    { label: 'Canales OAuth conectados', value: `${conectadas}/${totalOauth}`, icon: <Share2 />, tone: 'brand' as const },
    { label: 'Publicaciones publicadas', value: String(stats.publicados), icon: <CheckCircle2 />, tone: 'success' as const },
    { label: 'Publicaciones programadas', value: String(stats.programados), icon: <CalendarClock />, tone: 'warning' as const },
  ];

  return (
    <ScreenLayout>
      {dialogoConfirmacion}
      <PageHeader
        title="Canales"
        subtitle="Conecta tus redes con OAuth oficial y elige dónde publicar en cada publicación"
      />

      <div className="grid shrink-0 gap-4 sm:grid-cols-3">
        {indicadores.map((m) => (
          <div key={m.label} className="surface flex items-center gap-3 p-5">
            <IconTile tone={m.tone}>{m.icon}</IconTile>
            <div className="min-w-0">
              <p className="text-lg font-semibold tabular-nums text-foreground">{m.value}</p>
              <p className="truncate text-xs text-muted-foreground">{m.label}</p>
            </div>
          </div>
        ))}
      </div>

      {oauthNotice && (
        <Notice tone={/correctamente/.test(oauthNotice) ? 'success' : 'danger'} className="shrink-0">
          {oauthNotice}
        </Notice>
      )}

      {errorCanales && (
        <Notice tone="danger" className="shrink-0" action={<Button variant="ghost" onClick={() => void recargarCanales()}>Reintentar</Button>}>
          No se pudo cargar el estado de tus canales.
        </Notice>
      )}

      {/* Desde 1024, el grid es el único scroll de la pantalla */}
      <div className="lg:-mx-1 lg:min-h-0 lg:flex-1 lg:overflow-y-auto lg:px-1 lg:pb-1">
        {isLoading ? (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3" aria-busy="true" aria-label="Cargando canales">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <Skeleton key={i} className="h-44 w-full !rounded-2xl" />
            ))}
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">{CATALOGO_REDES.map(renderCanalCard)}</div>
        )}
      </div>

      <ConnectChannelModal
        key={connectModalRed ?? 'cerrado'}
        isOpen={connectModalRed !== null}
        red={connectModalRed ?? 'linkedin'}
        onClose={() => setConnectModalRed(null)}
        onSuccess={async (data) => {
          if (!user) return;
          await registrarActividad(user.uid, {
            tipo: 'publicado',
            mensaje: `${redConfig(connectModalRed ?? 'linkedin')?.nombre} vinculado: ${data.cuentaNombre}`,
            red: connectModalRed ?? 'linkedin',
          });
          invalidate();
        }}
      />
    </ScreenLayout>
  );
};

// ============================================================================
// PANTALLA 8: AJUSTES
// ============================================================================

const SettingsScreen: React.FC = () => {
  const { user } = useAuth();
  const invalidate = useInvalidateCampus();
  const { data: config, isLoading, error: errorConfig, refetch: recargarConfig } = useConfiguracion();
  const [automationWebhook, setAutomationWebhook] = useState('');
  const [notifications, setNotifications] = useState(true);
  const [timezone, setTimezone] = useState('America/Bogota');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [saveError, setSaveError] = useState('');

  useEffect(() => {
    if (config) {
      setAutomationWebhook(getAutomationWebhookUrl(config));
      setNotifications(config.notifications ?? true);
      setTimezone(config.timezone ?? 'America/Bogota');
    }
  }, [config]);

  const { mode, setTheme } = useTheme();

  // Cambios pendientes respecto a lo guardado (el tema se aplica al instante y no cuenta).
  const original = {
    webhook: config ? getAutomationWebhookUrl(config) : '',
    notifications: config?.notifications ?? true,
    timezone: config?.timezone ?? 'America/Bogota',
  };
  const hayCambios =
    Boolean(config) &&
    (automationWebhook.trim() !== original.webhook.trim() ||
      notifications !== original.notifications ||
      timezone !== original.timezone);

  useEffect(() => {
    if (!hayCambios) return;
    const aviso = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener('beforeunload', aviso);
    return () => window.removeEventListener('beforeunload', aviso);
  }, [hayCambios]);

  const webhookInvalido = automationWebhook.trim() !== '' && !/^https?:\/\/\S+$/i.test(automationWebhook.trim());

  const guardar = async () => {
    if (!user) return;
    setSaving(true);
    setSaveError('');
    try {
      if (notifications && typeof Notification !== 'undefined' && Notification.permission === 'default') {
        await Notification.requestPermission();
      }
      await guardarConfiguracion(user.uid, {
        n8nWebhookUrl: automationWebhook.trim(),
        makeWebhookUrl: automationWebhook.trim(),
        notifications,
        timezone,
      });
      invalidate();
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (e) {
      setSaveError(e instanceof Error ? e.message : 'No se pudo guardar. Inténtalo de nuevo.');
    } finally {
      setSaving(false);
    }
  };

  const codigo = (t: string) => (
    <code className="rounded-md border border-border bg-background px-1.5 py-0.5 font-mono text-xs text-foreground">{t}</code>
  );

  const bloqueado = saving || !user || isLoading || !hayCambios || webhookInvalido;
  const botonGuardar = (
    <Button
      size="lg"
      icon={saving ? <Loader2 className="animate-spin" /> : <CheckCircle2 />}
      disabled={bloqueado}
      onClick={() => void guardar()}
      className="min-w-[160px]"
    >
      {saving ? 'Guardando…' : saved ? 'Guardado' : 'Guardar cambios'}
    </Button>
  );

  return (
    <ScreenLayout maxWidth="max-w-[1100px]">
      <PageHeader
        title="Ajustes"
        subtitle="Integraciones y preferencias de la plataforma"
        actions={
          <div className="flex items-center gap-3">
            {!hayCambios && !saving && !isLoading && (
              <span className="hidden text-xs text-muted-foreground lg:inline">{saved ? 'Cambios guardados' : 'Sin cambios pendientes'}</span>
            )}
            {botonGuardar}
          </div>
        }
      />

      {saveError && <Notice tone="danger" className="shrink-0">{saveError}</Notice>}
      {errorConfig && (
        <Notice tone="danger" className="shrink-0" action={<Button variant="ghost" onClick={() => void recargarConfig()}>Reintentar</Button>}>
          No se pudo cargar tu configuración. Los campos quedan desactivados hasta que se cargue.
        </Notice>
      )}

      <div className="grid min-h-0 flex-1 content-start gap-6 lg:grid-cols-2">
        <Panel title="Automatización Make / n8n" icon={<Network />} className="lg:self-start">
          <div className="space-y-4">
            {isLoading ? (
              <div className="flex flex-col gap-2" aria-busy="true">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-11 w-full !rounded-[10px]" />
              </div>
            ) : (
              <Input
                label="URL del webhook"
                type="url"
                icon={<Network />}
                value={automationWebhook}
                disabled={Boolean(errorConfig)}
                onChange={(e) => setAutomationWebhook(e.target.value)}
                placeholder="https://hook.us2.make.com/xxxxxxxx"
                error={webhookInvalido ? 'Escribe una URL completa que empiece por https://' : undefined}
                hint="Déjalo vacío si no usas Make ni n8n."
              />
            )}
            <div className="surface-muted space-y-3 p-4 text-sm text-muted-foreground">
              <p>
                El secreto va en las variables de entorno de Vercel: {codigo('MAKE_WEBHOOK_SECRET')} (API key del Custom webhook en
                Make). Solo viaja a la URL configurada en Vercel, en las cabeceras {codigo('x-make-apikey')} y {codigo('X-Campus-Secret')}.
                La URL que pegas aquí no recibe el secreto y debe empezar por https://.
              </p>
              <p>
                Guía: {codigo('flujo-automatizacion/postman-make.md')} · n8n local: {codigo('docker compose up -d')}
              </p>
            </div>
          </div>
        </Panel>

        <div className="flex min-h-0 flex-col gap-6">
          <Panel title="Preferencias" icon={<Settings />} scroll={false}>
            <div className="space-y-5">
              {isLoading ? (
                <div className="flex flex-col gap-2" aria-busy="true">
                  <Skeleton className="h-4 w-28" />
                  <Skeleton className="h-11 w-full !rounded-[10px]" />
                </div>
              ) : (
                <Dropdown
                  label="Zona horaria"
                  icon={<Globe />}
                  value={timezone}
                  onChange={setTimezone}
                  options={ZONAS_HORARIAS}
                  disabled={Boolean(errorConfig)}
                />
              )}
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <p className="text-sm font-medium text-foreground">Tema</p>
                  <p className="text-xs text-muted-foreground">Se aplica al momento</p>
                </div>
                <Segmented
                  ariaLabel="Tema"
                  value={mode}
                  onChange={(v) => setTheme(v as 'light' | 'dark')}
                  options={[
                    { value: 'light', label: <><Sun className="h-3.5 w-3.5" />Claro</> },
                    { value: 'dark', label: <><Moon className="h-3.5 w-3.5" />Oscuro</> },
                  ]}
                />
              </div>
              <div className="border-t border-border pt-4">
                <Toggle
                  disabled={isLoading || Boolean(errorConfig)}
                  label="Notificaciones"
                  description="Recibir alertas en el navegador"
                  checked={notifications}
                  onChange={setNotifications}
                />
              </div>
            </div>
          </Panel>

          <Panel title="Secretos del servidor" icon={<Sparkles />} scroll={false}>
            <p className="text-sm text-muted-foreground">
              Las claves de Gemini, de las redes sociales y de los webhooks se configuran como variables de entorno en Vercel.
              Nunca se guardan en el navegador.
            </p>
          </Panel>
        </div>
      </div>

      {/* < 1024: el botón de la cabecera se pierde al desplazar; barra fija mientras haya cambios */}
      <AnimatePresence>
        {hayCambios && (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 16 }}
            transition={TRANSICION}
            className="sticky bottom-0 -mx-4 mt-auto flex items-center justify-between gap-3 border-t border-border bg-card px-4 pb-[max(12px,env(safe-area-inset-bottom))] pt-3 sm:-mx-6 sm:px-6 lg:hidden"
          >
            <span className="text-sm text-muted-foreground">Tienes cambios sin guardar</span>
            {botonGuardar}
          </motion.div>
        )}
      </AnimatePresence>
    </ScreenLayout>
  );
};

const DashboardHome: React.FC<{ onNavigate: (screen: string) => void }> = ({ onNavigate }) => {
  const { profile } = useAuth();
  const { stats, isLoading, error: errorStats, refetch: recargarStats } = useDashboardStats();
  const { data: actividad = [], isLoading: loadingAct, error: errorAct, refetch: recargarAct } = useActividad();
  const primerNombre = (profile?.nombre || '').split(' ')[0];

  const statCards = [
    { label: 'Publicadas', value: stats.publicados, icon: <BarChart3 />, tone: 'brand' as const },
    { label: 'Programadas', value: stats.programados, icon: <Calendar />, tone: 'success' as const },
    { label: 'Borradores', value: stats.borradores, icon: <FileText />, tone: 'warning' as const },
  ];

  // "Nueva publicación" vive solo en la cabecera (sin acciones repetidas).
  const accesos = [
    { id: 'manual-post', icon: <Upload />, label: 'Subir publicación', desc: 'Escribe y programa sin IA' },
    { id: 'calendar', icon: <Calendar />, label: 'Calendario', desc: 'Revisa lo programado' },
    { id: 'agent', icon: <MessageSquare />, label: 'Asistente IA', desc: 'Ideas y copy al instante' },
  ];

  const tonoActividad = (tipo: string) =>
    tipo === 'publicado' ? 'success' : tipo === 'borrador' ? 'warning' : tipo === 'error' ? 'danger' : 'brand';

  return (
    <ScreenLayout>
      <PageHeader
        title={primerNombre ? `Hola, ${primerNombre}` : 'Panel principal'}
        subtitle="Resumen de tu actividad en Conect.ia"
        actions={
          <Button size="lg" icon={<Plus />} onClick={() => onNavigate('new-post')}>
            Nueva publicación
          </Button>
        }
      />

      {errorStats && (
        <Notice tone="danger" className="shrink-0" action={<Button variant="ghost" onClick={recargarStats}>Reintentar</Button>}>
          No se pudieron cargar las estadísticas.
        </Notice>
      )}

      <div className="grid shrink-0 gap-4 sm:grid-cols-3">
        {statCards.map((card) => (
          <div key={card.label} className="surface flex items-center justify-between gap-4 p-5">
            <div className="min-w-0">
              <p className="truncate text-sm text-muted-foreground">{card.label}</p>
              <div className="mt-1 text-2xl font-semibold tabular-nums text-foreground">
                {isLoading ? <Skeleton className="my-1 h-6 w-10" /> : card.value}
              </div>
            </div>
            <IconTile tone={card.tone} size="lg">
              {card.icon}
            </IconTile>
          </div>
        ))}
      </div>

      <div className="grid min-h-0 flex-1 gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <Panel title="Actividad reciente" icon={<Activity />}>
          {errorAct ? (
            <Notice tone="danger" action={<Button variant="ghost" onClick={recargarAct}>Reintentar</Button>}>
              No se pudo cargar la actividad.
            </Notice>
          ) : loadingAct ? (
            <div className="space-y-2">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="flex min-h-14 items-center gap-3">
                  <Skeleton className="h-9 w-9 !rounded-[10px]" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-3.5 w-2/3" />
                    <Skeleton className="h-3 w-24" />
                  </div>
                </div>
              ))}
            </div>
          ) : actividad.length === 0 ? (
            <EmptyState
              icon={<Sparkles />}
              title="Todavía no hay actividad"
              text="Cuando publiques o programes contenido, verás aquí su historial."
              action={
                <Button variant="outline" icon={<Upload />} onClick={() => onNavigate('manual-post')}>
                  Subir publicación
                </Button>
              }
            />
          ) : (
            <ul className="-mx-2 space-y-1">
              {actividad.map((a) => (
                <li key={a.id} className="flex min-h-14 items-center gap-3 rounded-[10px] px-2 py-2">
                  <IconTile tone={tonoActividad(a.tipo)}>
                    {a.tipo === 'programado' ? <Calendar /> : a.tipo === 'borrador' ? <FileText /> : a.tipo === 'error' ? <X /> : <CheckCircle2 />}
                  </IconTile>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-foreground" title={a.mensaje}>
                      {a.mensaje}
                    </p>
                    <p className="text-xs tabular-nums text-muted-foreground">{formatRelative(toDate(a.creadoEn))}</p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Panel>

        <Panel title="Accesos rápidos" icon={<Zap />} scroll={false} className="self-start">
          <div className="-mx-2 space-y-1">
            {accesos.map((a) => (
              <button
                key={a.id}
                type="button"
                onClick={() => onNavigate(a.id)}
                className="group flex min-h-14 w-full items-center gap-3 rounded-[10px] px-2 py-2 text-left transition-colors duration-150 hover:bg-accent"
              >
                <IconTile>{a.icon}</IconTile>
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-medium text-foreground">{a.label}</span>
                  <span className="block truncate text-xs text-muted-foreground">{a.desc}</span>
                </span>
                <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground group-hover:text-foreground" />
              </button>
            ))}
          </div>
        </Panel>
      </div>
    </ScreenLayout>
  );
};

// ============================================================================
// MAIN APP - SCREEN ROUTER
// ============================================================================

/** Landing pública antes del login */
export function PublicLanding({ onLogin }: { onLogin: () => void }) {
  return (
    <LandingPage
      onNavigate={(screen) => {
        onLogin();
      }}
    />
  );
}

export default function App({ productionMode = false }: { productionMode?: boolean }) {
  const { logout } = useAuth();
  const [currentScreen, setCurrentScreen] = useState<string>(productionMode ? 'dashboard' : 'landing');
  const [viewportWidth, setViewportWidth] = useState(1440);

  React.useEffect(() => {
    if (!productionMode) return;
    const params = new URLSearchParams(window.location.search);
    if (params.get('linkedin') === 'success') {
      setCurrentScreen('channels');
    }
  }, [productionMode]);

  const pantallaActiva = currentScreen === 'login' ? 'dashboard' : currentScreen;

  const contenido = () => {
    switch (pantallaActiva) {
      case 'new-post':
        return <NewPostScreen onNavigate={setCurrentScreen} />;
      case 'manual-post':
        return <ManualPostScreen />;
      case 'drafts':
        return <DraftsScreen onNavigate={setCurrentScreen} />;
      case 'calendar':
        return <CalendarScreen onNavigate={setCurrentScreen} />;
      case 'agent':
        return <AgentScreen onNavigate={setCurrentScreen} />;
      case 'channels':
        return <ChannelsScreen />;
      case 'settings':
        return <SettingsScreen />;
      case 'dashboard':
      default:
        return <DashboardHome onNavigate={setCurrentScreen} />;
    }
  };

  const renderScreen = () =>
    currentScreen === 'landing' ? (
      <LandingPage onNavigate={setCurrentScreen} />
    ) : (
      // Un solo shell persistente: el menú anima su indicador y las pantallas hacen transición.
      <DashboardShell activeScreen={pantallaActiva} onNavigate={setCurrentScreen} onLogout={() => logout()}>
        {contenido()}
      </DashboardShell>
    );

  if (productionMode) {
    return <div className="h-full w-full bg-background">{renderScreen()}</div>;
  }

  // Modo diseño: vista de todas las pantallas en un marco de tamaño fijo.
  return (
    <div className="h-full w-full overflow-auto bg-muted/50">
      <div className="surface-glass sticky top-0 z-50 border-x-0 border-t-0">
        <div className="mx-auto flex max-w-[1600px] flex-wrap items-center justify-between gap-4 px-6 py-3">
          <div className="flex items-center gap-3">
            <ConectiaLogo size="sm" />
            <Badge variant="purple">Modo diseño</Badge>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Dropdown
              size="sm"
              className="w-60"
              value={currentScreen}
              onChange={setCurrentScreen}
              options={[
                { value: 'landing', label: 'Landing' },
                { value: 'dashboard', label: 'Inicio' },
                { value: 'new-post', label: 'Nueva publicación' },
                { value: 'manual-post', label: 'Subir publicación' },
                { value: 'drafts', label: 'Borradores' },
                { value: 'calendar', label: 'Calendario' },
                { value: 'agent', label: 'Asistente IA' },
                { value: 'channels', label: 'Canales' },
                { value: 'settings', label: 'Ajustes' },
              ]}
            />
            <Segmented
              value={String(viewportWidth)}
              onChange={(v) => setViewportWidth(Number(v))}
              options={[
                { value: '1440', label: 'Escritorio' },
                { value: '1024', label: 'Laptop' },
                { value: '768', label: 'Tablet' },
              ]}
            />
          </div>
        </div>
      </div>

      <div className="flex min-h-[calc(100%-4rem)] items-start justify-center p-6">
        <div
          className="overflow-auto rounded-2xl border border-border bg-background shadow-lg transition-[width] duration-300"
          style={{ width: `${viewportWidth}px`, height: '860px' }}
        >
          {renderScreen()}
        </div>
      </div>
    </div>
  );
}
