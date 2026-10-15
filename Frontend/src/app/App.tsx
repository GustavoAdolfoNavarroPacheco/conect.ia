import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react';
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

// Button Component
interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'success' | 'destructive' | 'outline' | 'liquid';
  size?: 'sm' | 'md' | 'lg';
  icon?: React.ReactNode;
  children: React.ReactNode;
}

const Button: React.FC<ButtonProps> = ({
  variant = 'primary',
  size = 'md',
  icon,
  children,
  className = '',
  disabled,
  onClick,
  ...props
}) => {
  const ref = useRef<HTMLButtonElement>(null);

  /** Onda de clic desde el punto pulsado. */
  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    const el = ref.current;
    if (el && !disabled) {
      const r = el.getBoundingClientRect();
      const d = Math.max(r.width, r.height);
      const onda = document.createElement('span');
      onda.className = 'ripple';
      onda.style.width = onda.style.height = `${d}px`;
      onda.style.left = `${e.clientX - r.left - d / 2}px`;
      onda.style.top = `${e.clientY - r.top - d / 2}px`;
      el.appendChild(onda);
      window.setTimeout(() => onda.remove(), 650);
    }
    onClick?.(e);
  };

  const base =
    'press relative isolate overflow-hidden inline-flex items-center justify-center gap-2 rounded-[10px] font-medium whitespace-nowrap select-none cursor-pointer transition-[background-color,box-shadow,color,border-color,transform,filter] duration-200 ease-out disabled:opacity-50 disabled:cursor-not-allowed';

  const variants = {
    primary: 'bg-brand text-white shadow-xs hover:bg-brand-deep hover:shadow-[var(--glow)]',
    liquid: 'bg-gradient-to-b from-[#0a89d1] to-brand text-white shadow-xs hover:brightness-110 hover:shadow-[var(--glow)]',
    secondary: 'border border-border bg-secondary text-secondary-foreground hover:bg-accent',
    ghost: 'bg-transparent text-muted-foreground hover:bg-accent hover:text-foreground',
    success: 'bg-success text-white shadow-xs hover:brightness-110',
    destructive: 'bg-destructive-soft text-destructive hover:bg-destructive hover:text-white',
    outline: 'border border-border bg-card text-foreground hover:border-brand/40 hover:bg-brand-soft',
  };

  const sizes = {
    sm: 'h-8 px-3 text-xs [&_svg]:h-3.5 [&_svg]:w-3.5',
    md: 'h-10 px-4 text-sm [&_svg]:h-4 [&_svg]:w-4',
    lg: 'h-11 px-5 text-sm [&_svg]:h-[18px] [&_svg]:w-[18px]',
  };

  return (
    <button
      ref={ref}
      className={`${base} ${variants[variant]} ${sizes[size]} ${className}`}
      disabled={disabled}
      onClick={handleClick}
      {...props}
    >
      {icon && <span className="flex shrink-0 items-center justify-center">{icon}</span>}
      {children}
    </button>
  );
};

// Input Component
interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  icon?: React.ReactNode;
}

const Input: React.FC<InputProps> = ({ label, error, icon, className = '', ...props }) => {
  return (
    <div className="flex flex-col gap-1.5">
      {label && <label className="text-sm font-medium text-foreground">{label}</label>}
      <div className="relative">
        {icon && (
          <div className="pointer-events-none absolute left-3 top-1/2 flex -translate-y-1/2 items-center text-muted-foreground [&>svg]:h-4 [&>svg]:w-4">
            {icon}
          </div>
        )}
        <input
          className={`field ${icon ? 'pl-9' : ''} ${error ? '!border-destructive' : ''} ${className}`}
          {...props}
        />
      </div>
      {error && <span className="text-xs text-destructive">{error}</span>}
    </div>
  );
};

// Textarea Component
interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
}

const Textarea: React.FC<TextareaProps> = ({ label, error, className = '', ...props }) => {
  return (
    <div className="flex flex-col gap-1.5">
      {label && <label className="text-sm font-medium text-foreground">{label}</label>}
      <textarea
        className={`field resize-none py-2.5 leading-relaxed ${error ? '!border-destructive' : ''} ${className}`}
        {...props}
      />
      {error && <span className="text-xs text-destructive">{error}</span>}
    </div>
  );
};

// Toggle Component
interface ToggleProps {
  label?: string;
  description?: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
}

const Toggle: React.FC<ToggleProps> = ({ label, description, checked, onChange, disabled = false }) => {
  return (
    <label className={`flex items-center justify-between gap-4 ${disabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'}`}>
      {(label || description) && (
        <span className="min-w-0">
          {label && <span className="block text-sm font-medium text-foreground">{label}</span>}
          {description && <span className="block text-xs text-muted-foreground">{description}</span>}
        </span>
      )}
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        disabled={disabled}
        onClick={() => !disabled && onChange(!checked)}
        className={`press flex h-6 w-10 shrink-0 items-center rounded-full p-0.5 transition-colors duration-300 ${
          checked ? 'justify-end bg-brand' : 'justify-start bg-switch-background'
        }`}
      >
        <motion.span
          layout
          className="h-5 w-5 rounded-full bg-white shadow-sm"
          transition={{ type: 'spring', stiffness: 600, damping: 34 }}
        />
      </button>
    </label>
  );
};

// Checkbox Component
interface CheckboxProps {
  label?: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
  icon?: React.ReactNode;
}

const Checkbox: React.FC<CheckboxProps> = ({ label, checked, onChange, disabled = false, icon }) => {
  return (
    <label className="flex cursor-pointer items-center gap-3">
      <span
        onClick={() => !disabled && onChange(!checked)}
        className={`flex h-[18px] w-[18px] items-center justify-center rounded-[5px] border transition-all duration-200
          ${checked ? 'border-brand bg-brand' : 'border-input bg-input-background'}
          ${disabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer hover:border-brand'}`}
      >
        {checked && <Check className="h-3 w-3 text-white" strokeWidth={3} />}
      </span>
      <span className="flex items-center gap-2">
        {icon && <span className="h-4 w-4 text-muted-foreground">{icon}</span>}
        {label && <span className="text-sm font-medium text-foreground">{label}</span>}
      </span>
    </label>
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
    <span className={`inline-flex h-6 items-center gap-1 rounded-md px-2 text-xs font-medium ${variants[variant]} ${className}`}>
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

// Modal Component
interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  maxWidthClass?: string;
}

const Modal: React.FC<ModalProps> = ({ isOpen, onClose, title, children, footer, maxWidthClass = 'max-w-md' }) => {
  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen, onClose]);

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="absolute inset-0 bg-black/45 backdrop-blur-[3px]"
            onClick={onClose}
          />
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label={title}
            initial={{ opacity: 0, scale: 0.96, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.97, y: 8 }}
            transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
            className={`relative flex max-h-[88vh] w-full flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-lg ${maxWidthClass}`}
          >
            <div className="flex shrink-0 items-center justify-between gap-4 border-b border-border px-6 py-4">
              <h3 className="truncate text-base font-semibold">{title}</h3>
              <button
                type="button"
                aria-label="Cerrar"
                onClick={onClose}
                className="press flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto p-6">{children}</div>
            {footer && (
              <div className="flex shrink-0 items-center justify-end gap-3 border-t border-border bg-accent/50 px-6 py-4">
                {footer}
              </div>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

// Toast Notification
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
          role="status"
          initial={{ opacity: 0, y: -16, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -12, scale: 0.97 }}
          transition={{ duration: 0.26, ease: [0.22, 1, 0.36, 1] }}
          className="fixed right-5 top-5 z-[60] flex max-w-sm items-center gap-3 rounded-xl border border-border bg-popover px-4 py-3 shadow-lg"
        >
          <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ${tints[type]}`}>{icons[type]}</span>
          <span className="text-sm font-medium text-foreground">{message}</span>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

// Loading Skeleton
const Skeleton: React.FC<{ className?: string }> = ({ className = '' }) => {
  return <div className={`skeleton rounded-lg ${className}`} />;
};

// ----------------------------------------------------------------------------
// Layout de pantallas funcionales: ocupan el alto disponible sin scroll de página
// (en escritorio); los listados largos se desplazan dentro de su panel.
// ----------------------------------------------------------------------------

const ScreenLayout: React.FC<{ children: React.ReactNode; maxWidth?: string; className?: string }> = ({
  children,
  maxWidth = 'max-w-[1440px]',
  className = '',
}) => (
  <div className="h-full w-full overflow-y-auto lg:overflow-hidden">
    <div className={`mx-auto flex w-full ${maxWidth} flex-col gap-5 p-4 sm:p-6 lg:h-full lg:min-h-0 ${className}`}>
      {children}
    </div>
  </div>
);

const PageHeader: React.FC<{ title: string; subtitle?: string; actions?: React.ReactNode }> = ({ title, subtitle, actions }) => (
  <header className="flex shrink-0 animate-enter flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
    <div className="min-w-0">
      <h1 className="text-2xl font-semibold tracking-tight text-foreground">{title}</h1>
      {subtitle && <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>}
    </div>
    {actions && <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>}
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
  scroll?: boolean;
  delay?: number;
}> = ({ title, icon, actions, footer, children, className = '', bodyClassName = '', scroll = true, delay = 0 }) => (
  <section
    className={`surface flex min-h-0 animate-enter flex-col overflow-hidden ${className}`}
    style={{ animationDelay: `${delay}ms` }}
  >
    {(title || actions) && (
      <div className="flex h-14 shrink-0 items-center justify-between gap-3 border-b border-border px-5">
        <h2 className="flex min-w-0 items-center gap-2 text-sm font-semibold text-foreground">
          {icon && <span className="flex shrink-0 text-brand-strong [&>svg]:h-4 [&>svg]:w-4">{icon}</span>}
          <span className="truncate">{title}</span>
        </h2>
        {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
      </div>
    )}
    <div className={`min-h-0 flex-1 p-5 ${scroll ? 'overflow-y-auto' : ''} ${bodyClassName}`}>{children}</div>
    {footer && <div className="shrink-0 border-t border-border bg-accent/40 px-5 py-3.5">{footer}</div>}
  </section>
);

/** Control segmentado con indicador deslizante. */
const Segmented: React.FC<{
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: React.ReactNode }[];
  className?: string;
  full?: boolean;
}> = ({ value, onChange, options, className = '', full = false }) => {
  const id = React.useId();
  return (
    <div
      role="tablist"
      className={`relative ${full ? 'grid w-full' : 'inline-flex'} rounded-[10px] border border-border bg-secondary p-1 ${className}`}
      style={full ? { gridTemplateColumns: `repeat(${options.length}, minmax(0, 1fr))` } : undefined}
    >
      {options.map((o) => {
        const activo = o.value === value;
        return (
          <button
            key={o.value}
            type="button"
            role="tab"
            aria-selected={activo}
            onClick={() => onChange(o.value)}
            className={`press relative z-10 flex h-8 items-center justify-center gap-1.5 rounded-lg px-3.5 text-sm transition-colors duration-200 ${
              activo ? 'font-medium text-foreground' : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            {activo && (
              <motion.span
                layoutId={`seg-${id}`}
                className="absolute inset-0 -z-10 rounded-lg bg-card shadow-sm"
                transition={{ type: 'spring', stiffness: 520, damping: 38 }}
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
}> = ({ tone = 'info', icon, children, className = '' }) => {
  const tones = {
    info: { box: 'bg-brand-soft border-brand/20', icon: 'text-brand-strong', def: <Info /> },
    success: { box: 'bg-success-soft border-success/20', icon: 'text-success', def: <CheckCircle2 /> },
    warning: { box: 'bg-warning-soft border-warning/25', icon: 'text-warning', def: <AlarmClock /> },
    danger: { box: 'bg-destructive-soft border-destructive/20', icon: 'text-destructive', def: <Info /> },
  }[tone];
  return (
    <div className={`flex animate-enter items-start gap-2.5 rounded-xl border px-3.5 py-2.5 text-sm text-foreground ${tones.box} ${className}`}>
      <span className={`mt-0.5 flex shrink-0 [&>svg]:h-4 [&>svg]:w-4 ${tones.icon}`}>{icon ?? tones.def}</span>
      <div className="min-w-0 leading-relaxed">{children}</div>
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
  <div className="flex h-full min-h-[220px] animate-enter flex-col items-center justify-center px-6 py-10 text-center">
    <span className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-soft text-brand-strong [&>svg]:h-6 [&>svg]:w-6">
      {icon}
    </span>
    <p className="text-sm font-semibold text-foreground">{title}</p>
    {text && <p className="mt-1 max-w-xs text-sm text-muted-foreground">{text}</p>}
    {action && <div className="mt-5">{action}</div>}
  </div>
);

/** Contenedor de icono con tinte de marca. */
const IconTile: React.FC<{ children: React.ReactNode; tone?: 'brand' | 'success' | 'warning' | 'danger' | 'neutral'; className?: string }> = ({
  children,
  tone = 'brand',
  className = '',
}) => {
  const tones = {
    brand: 'bg-brand-soft text-brand-strong',
    success: 'bg-success-soft text-success',
    warning: 'bg-warning-soft text-warning',
    danger: 'bg-destructive-soft text-destructive',
    neutral: 'bg-secondary text-muted-foreground',
  };
  return (
    <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] [&>svg]:h-[18px] [&>svg]:w-[18px] ${tones[tone]} ${className}`}>
      {children}
    </span>
  );
};

/** Número que cuenta hasta su valor al aparecer. */
const CountUp: React.FC<{ value: number; duration?: number }> = ({ value, duration = 900 }) => {
  const [n, setN] = useState(0);
  useEffect(() => {
    let raf = 0;
    const inicio = performance.now();
    const paso = (t: number) => {
      const p = Math.min(1, (t - inicio) / duration);
      const eased = 1 - Math.pow(1 - p, 3);
      setN(Math.round(value * eased));
      if (p < 1) raf = requestAnimationFrame(paso);
    };
    raf = requestAnimationFrame(paso);
    return () => cancelAnimationFrame(raf);
  }, [value, duration]);
  return <>{n}</>;
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
}> = ({ value, onChange }) => {
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
      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground transition-colors group-focus-within:text-brand-strong" />
      <input
        type="text"
        aria-label="Buscar"
        placeholder={value ? '' : displayedPlaceholder}
        className="field h-9 min-h-0 border-transparent bg-secondary pl-9"
        value={value}
        onChange={onChange}
      />
    </div>
  );
};

/** Botón de icono de la barra superior. */
const IconButton: React.FC<{
  label: string;
  onClick?: () => void;
  children: React.ReactNode;
  active?: boolean;
  className?: string;
}> = ({ label, onClick, children, active = false, className = '' }) => (
  <button
    type="button"
    aria-label={label}
    title={label}
    onClick={onClick}
    className={`press relative flex h-9 w-9 items-center justify-center rounded-[10px] transition-colors duration-200 [&_svg]:h-[18px] [&_svg]:w-[18px] ${
      active ? 'bg-accent text-foreground' : 'text-muted-foreground hover:bg-accent hover:text-foreground'
    } ${className}`}
  >
    {children}
  </button>
);

/** Menú flotante anclado (notificaciones, perfil). */
const Popover: React.FC<{ open: boolean; children: React.ReactNode; className?: string }> = ({ open, children, className = '' }) => (
  <AnimatePresence>
    {open && (
      <motion.div
        initial={{ opacity: 0, y: -6, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: -6, scale: 0.98 }}
        transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
        style={{ transformOrigin: 'top right' }}
        className={`absolute right-0 top-full z-50 mt-2 overflow-hidden rounded-xl border border-border bg-popover shadow-lg ${className}`}
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
  const [showNotif, setShowNotif] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const notifRef = useRef<HTMLDivElement>(null);
  const profileRef = useRef<HTMLDivElement>(null);
  const searchResults = useCampusSearch(searchTerm);
  const nombre = profile?.nombre || 'Usuario';
  const email = profile?.email || user?.email || '';
  const initials = (profile?.nombre || user?.email || 'U').slice(0, 2).toUpperCase();
  const unreadCount = actividad.length;

  // Cierra los menús flotantes al hacer clic fuera o pulsar Escape.
  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      if (!notifRef.current?.contains(e.target as Node)) setShowNotif(false);
      if (!profileRef.current?.contains(e.target as Node)) setShowProfile(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setShowNotif(false);
        setShowProfile(false);
        setIsMenuOpen(false);
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

  const navegacion = (grupo: 'fijo' | 'drawer') => (
    <nav className="min-h-0 flex-1 overflow-y-auto px-3 py-5">
      {menuGroups.map((g) => (
        <div key={g.titulo} className="mb-6 last:mb-0">
          <p className="px-3 pb-2 text-xs font-medium uppercase tracking-[0.12em] text-muted-foreground/75">{g.titulo}</p>
          <ul className="space-y-0.5">
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
                    className={`press group relative flex h-10 w-full items-center gap-3 rounded-[10px] px-3 text-sm transition-colors duration-200 ${
                      activo ? 'font-medium text-brand-strong' : 'text-muted-foreground hover:bg-accent hover:text-foreground'
                    }`}
                  >
                    {activo && (
                      <motion.span
                        layoutId={`nav-fondo-${grupo}`}
                        className="absolute inset-0 rounded-[10px] bg-brand-soft"
                        transition={{ type: 'spring', stiffness: 520, damping: 42 }}
                      />
                    )}
                    {activo && (
                      <motion.span
                        layoutId={`nav-luz-${grupo}`}
                        className="absolute bottom-2 left-0 top-2 w-[3px] rounded-full bg-brand shadow-[0_0_10px_var(--brand)]"
                        transition={{ type: 'spring', stiffness: 520, damping: 42 }}
                      />
                    )}
                    <span className="relative z-10 flex transition-transform duration-200 group-hover:scale-110 [&>svg]:h-[18px] [&>svg]:w-[18px]">
                      {item.icon}
                    </span>
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

  const tarjetaUsuario = (
    <div className="shrink-0 border-t border-sidebar-border p-3">
      <div className="flex items-center gap-3 rounded-xl px-2 py-2">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand text-xs font-semibold text-white">
          {initials}
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-foreground">{nombre}</p>
          <p className="truncate text-xs text-muted-foreground">{email}</p>
        </div>
        <button
          type="button"
          title="Cerrar sesión"
          aria-label="Cerrar sesión"
          onClick={onLogout}
          className="press flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-destructive-soft hover:text-destructive"
        >
          <LogOut className="h-4 w-4" />
        </button>
      </div>
    </div>
  );

  return (
    <div className="flex h-full overflow-hidden bg-background">
      {/* Barra lateral fija (escritorio) */}
      <aside className="hidden w-64 shrink-0 flex-col border-r border-sidebar-border bg-sidebar lg:flex">
        <div className="flex h-16 shrink-0 items-center border-b border-sidebar-border px-5">
          <button type="button" className="press" onClick={() => onNavigate('dashboard')}>
            <ConectiaLogo size="md" />
          </button>
        </div>
        {navegacion('fijo')}
        {tarjetaUsuario}
      </aside>

      {/* Drawer (móvil y tablet) */}
      <AnimatePresence>
        {isMenuOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-40 bg-black/40 backdrop-blur-[2px] lg:hidden"
              onClick={() => setIsMenuOpen(false)}
            />
            <motion.aside
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', damping: 32, stiffness: 320 }}
              className="fixed bottom-0 left-0 top-0 z-50 flex w-72 flex-col border-r border-sidebar-border bg-sidebar shadow-lg lg:hidden"
            >
              <div className="flex h-16 shrink-0 items-center justify-between border-b border-sidebar-border px-5">
                <ConectiaLogo size="md" />
                <IconButton label="Cerrar menú" onClick={() => setIsMenuOpen(false)}>
                  <X />
                </IconButton>
              </div>
              {navegacion('drawer')}
              {tarjetaUsuario}
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        {/* Barra superior */}
        <header className="surface-glass z-30 flex h-16 shrink-0 items-center gap-3 border-x-0 border-t-0 px-4 sm:px-6">
          <IconButton label="Abrir menú" onClick={() => setIsMenuOpen(true)} className="lg:hidden">
            <Menu />
          </IconButton>
          <div className="lg:hidden">
            <ConectiaLogo size="sm" />
          </div>

          <div className="relative hidden w-full max-w-sm md:block">
            <SearchBarAnimated value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
            <Popover open={Boolean(searchTerm.trim())} className="!left-0 !right-0 max-h-72 overflow-y-auto p-1.5">
              {searchResults.publicaciones.length === 0 && searchResults.borradores.length === 0 && (
                <p className="px-3 py-3 text-sm text-muted-foreground">Sin resultados para “{searchTerm.trim()}”</p>
              )}
              {searchResults.publicaciones.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left transition-colors hover:bg-accent"
                  onClick={() => {
                    onNavigate('calendar');
                    setSearchTerm('');
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
                  className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left transition-colors hover:bg-accent"
                  onClick={() => {
                    resumeBorradorAndNavigate(b, onNavigate);
                    setSearchTerm('');
                  }}
                >
                  <FileText className="h-4 w-4 shrink-0 text-muted-foreground" />
                  <span className="truncate text-sm font-medium">{b.titulo || 'Borrador'}</span>
                </button>
              ))}
            </Popover>
          </div>

          <div className="ml-auto flex items-center gap-1">
            <IconButton label={mode === 'dark' ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'} onClick={toggleTheme}>
              <AnimatePresence mode="wait" initial={false}>
                <motion.span
                  key={mode}
                  initial={{ rotate: -90, opacity: 0, scale: 0.6 }}
                  animate={{ rotate: 0, opacity: 1, scale: 1 }}
                  exit={{ rotate: 90, opacity: 0, scale: 0.6 }}
                  transition={{ duration: 0.22 }}
                  className="flex"
                >
                  {mode === 'dark' ? <Sun /> : <Moon />}
                </motion.span>
              </AnimatePresence>
            </IconButton>

            <div className="relative" ref={notifRef}>
              <IconButton label="Notificaciones" onClick={() => setShowNotif((v) => !v)} active={showNotif}>
                <Bell />
                {unreadCount > 0 && (
                  <span className="absolute right-2 top-2 flex h-2 w-2">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-brand-light opacity-70" />
                    <span className="relative inline-flex h-2 w-2 rounded-full bg-brand" />
                  </span>
                )}
              </IconButton>
              <Popover open={showNotif} className="w-80">
                <div className="flex items-center justify-between border-b border-border px-4 py-3">
                  <p className="text-sm font-semibold">Actividad reciente</p>
                  {unreadCount > 0 && <Badge variant="purple">{unreadCount}</Badge>}
                </div>
                <div className="max-h-80 overflow-y-auto p-1.5">
                  {actividad.length === 0 && <p className="px-3 py-6 text-center text-sm text-muted-foreground">Sin notificaciones</p>}
                  {actividad.slice(0, 8).map((a) => (
                    <div key={a.id} className="rounded-lg px-3 py-2.5 transition-colors hover:bg-accent">
                      <p className="text-sm font-medium text-foreground">{a.mensaje}</p>
                      <p className="mt-0.5 text-xs text-muted-foreground">{formatRelative(toDate(a.creadoEn))}</p>
                    </div>
                  ))}
                </div>
              </Popover>
            </div>

            <div className="relative ml-1" ref={profileRef}>
              <button
                type="button"
                aria-label="Menú de perfil"
                onClick={() => setShowProfile((v) => !v)}
                className="press flex h-9 items-center gap-2 rounded-[10px] pl-1 pr-2 transition-colors hover:bg-accent"
              >
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-brand text-xs font-semibold text-white ring-2 ring-transparent transition-shadow hover:ring-brand/30">
                  {initials}
                </span>
                <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform duration-200 ${showProfile ? 'rotate-180' : ''}`} />
              </button>
              <Popover open={showProfile} className="w-64">
                <div className="border-b border-border px-4 py-3">
                  <p className="truncate text-sm font-semibold">{nombre}</p>
                  <p className="truncate text-xs text-muted-foreground">{email}</p>
                </div>
                <div className="p-1.5">
                  {[
                    { icon: <Settings />, label: 'Ajustes', onClick: () => onNavigate('settings') },
                    { icon: mode === 'dark' ? <Sun /> : <Moon />, label: mode === 'dark' ? 'Modo claro' : 'Modo oscuro', onClick: toggleTheme },
                  ].map((op) => (
                    <button
                      key={op.label}
                      type="button"
                      onClick={() => {
                        op.onClick();
                        setShowProfile(false);
                      }}
                      className="flex h-9 w-full items-center gap-3 rounded-lg px-3 text-sm text-foreground transition-colors hover:bg-accent [&_svg]:h-4 [&_svg]:w-4 [&_svg]:text-muted-foreground"
                    >
                      {op.icon}
                      {op.label}
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={onLogout}
                    className="flex h-9 w-full items-center gap-3 rounded-lg px-3 text-sm text-destructive transition-colors hover:bg-destructive-soft"
                  >
                    <LogOut className="h-4 w-4" />
                    Cerrar sesión
                  </button>
                </div>
              </Popover>
            </div>
          </div>
        </header>

        {/* Contenido con transición entre pantallas */}
        <main className="relative min-h-0 flex-1 overflow-hidden">
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={activeScreen}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
              className="h-full"
            >
              {children}
            </motion.div>
          </AnimatePresence>
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
  return conectadas.length ? conectadas : [RED_PRINCIPAL];
}

type RedSelectorProps = {
  value: RedSocial[];
  onChange: (next: RedSocial[]) => void;
  canales?: CanalesDoc | null;
};

const RedSelector: React.FC<RedSelectorProps> = ({ value, onChange, canales }) => {
  const toggle = (red: RedSocial) => {
    onChange(value.includes(red) ? value.filter((r) => r !== red) : [...value, red]);
  };

  return (
    <div className="@container">
      <div className="grid grid-cols-2 gap-2 @md:grid-cols-3">
        {CATALOGO_REDES.map((red) => {
          const selected = value.includes(red.id);
          const conectada = redEstaConectada(red.id, canales);
          const bloqueada = !red.disponible || !conectada;
          const title = !red.disponible
            ? `${red.nombre}: ${red.descripcion}`
            : !conectada
              ? `Conecta ${red.nombre} en Canales para habilitarlo`
              : undefined;
          return (
            <button
              key={red.id}
              type="button"
              disabled={bloqueada}
              aria-pressed={selected}
              onClick={() => toggle(red.id)}
              title={title}
              className={`press flex h-10 items-center gap-2 rounded-[10px] border px-3 text-left text-sm transition-all duration-200
                ${selected ? 'border-brand bg-brand-soft text-foreground' : 'border-border bg-card hover:border-brand/40'}
                ${bloqueada ? 'cursor-not-allowed opacity-45' : 'cursor-pointer'}`}
            >
              {redIcono(red.id, 'w-4 h-4')}
              <span className="flex-1 truncate font-medium">{red.nombre}</span>
              <span
                className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-[5px] border transition-colors ${
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

const NewPostScreen: React.FC = () => {
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
      setGeneratedText([gen.contenido, tags].filter(Boolean).join('\n\n'));
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
            },
            webhook
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
      const finalImageUrl = await resolvePostImageUrl();
      if (imagenQuedoSinResolver(imagenUrl || previewImageUrl, finalImageUrl)) {
        setMakeWarning(
          'No se pudo subir la imagen: la publicación irá solo con texto. Revisa BLOB_READ_WRITE_TOKEN en Vercel para incluir imágenes.'
        );
      }
      if (platforms.includes('instagram') && !finalImageUrl) {
        setMakeWarning(
          'Instagram requiere una imagen o video: activa «Generar imagen con IA» o sube un archivo, o Instagram no podrá publicar.'
        );
      }
      if (platforms.includes('tiktok') && !finalImageUrl) {
        setMakeWarning(
          'TikTok requiere un video (mp4/mov/webm): sube un archivo de video o usa un video con IA, o TikTok no podrá publicar.'
        );
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
            },
            webhookNow
          );
          await actualizarPublicacion(postId, { estado: 'publicado' });
          setToastMsg(
            makeRes.linkedin_status
              ? `Publicado vía Make (${makeRes.linkedin_status})`
              : 'Publicado vía Make'
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
              },
              webhook
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

  const limpiar = () => {
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

      <PageHeader title="Nueva publicación" subtitle="Crea contenido con ayuda de IA y publícalo en tus redes" />

      {(errorMsg || makeWarning) && (
        <div className="shrink-0 space-y-2">
          {errorMsg && <Notice tone="danger">{errorMsg}</Notice>}
          {makeWarning && (
            <Notice tone="warning">{makeWarning} Puedes vaciar la URL de Make en Ajustes si no lo usas.</Notice>
          )}
        </div>
      )}

      <div className="grid min-h-0 flex-1 gap-5 lg:grid-cols-2">
        {/* Formulario */}
        <Panel
          title="Contenido"
          icon={<PenSquare />}
          footer={
            <div className="flex items-center gap-3">
              <Button
                variant="liquid"
                className="flex-1"
                icon={isGenerating ? <Loader2 className="animate-spin" /> : <Sparkles />}
                onClick={handleGenerate}
                disabled={!topic || isGenerating}
              >
                {isGenerating ? 'Generando…' : 'Generar con IA'}
              </Button>
              <Button variant="ghost" onClick={limpiar}>
                Limpiar
              </Button>
            </div>
          }
        >
          <div className="space-y-5">
            <div className="space-y-1.5">
              <label htmlFor="np-tema" className="text-sm font-medium text-foreground">
                Tema del post
              </label>
              <textarea
                id="np-tema"
                placeholder="Ej: Lanzamiento del nuevo bootcamp de desarrollo web en Bucaramanga"
                rows={3}
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                className="field resize-none py-2.5 leading-relaxed"
              />
            </div>

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
              <div className="space-y-1.5">
                <span className="text-sm font-medium text-foreground">Multimedia con IA</span>
                <div className="surface-muted space-y-2.5 px-3.5 py-2.5">
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

            <div className="space-y-2">
              <span className="text-sm font-medium text-foreground">Redes de publicación</span>
              <RedSelector value={selectedRedes} onChange={setSelectedRedes} canales={canales} />
            </div>

            <AnimatePresence initial={false}>
              {!generateImage && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.25 }}
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
                    className={`press flex cursor-pointer items-center gap-3 rounded-xl border border-dashed px-4 py-3 transition-all duration-200 ${
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
                    <div className="grid grid-cols-5 gap-2">
                      {manualUploads.map((f, i) => (
                        <motion.div
                          key={i}
                          initial={{ opacity: 0, scale: 0.85 }}
                          animate={{ opacity: 1, scale: 1 }}
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
                            className="absolute right-1 top-1 flex h-6 w-6 items-center justify-center rounded-full bg-black/60 opacity-0 transition-opacity group-hover:opacity-100"
                          >
                            <X className="h-3 w-3 text-white" />
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
          delay={80}
          actions={<Badge variant="purple">LinkedIn</Badge>}
          footer={
            hasContent ? (
              <div className="flex flex-wrap items-center gap-2.5">
                <Segmented
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
                      initial={{ opacity: 0, x: -6 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -6 }}
                      className="flex flex-wrap items-center gap-2"
                    >
                      <input
                        type="date"
                        aria-label="Fecha"
                        value={scheduledDate}
                        onChange={(e) => setScheduledDate(e.target.value)}
                        className="field h-9 min-h-0 w-[150px] py-0"
                      />
                      <input
                        type="time"
                        aria-label="Hora"
                        value={scheduledTime}
                        onChange={(e) => setScheduledTime(e.target.value)}
                        className="field h-9 min-h-0 w-[110px] py-0"
                      />
                      <Dropdown
                        size="sm"
                        className="w-[150px]"
                        value={timezone}
                        onChange={setTimezone}
                        options={ZONAS_HORARIAS}
                      />
                      <Dropdown
                        size="sm"
                        className="w-[130px]"
                        title="Repetir la misma publicación"
                        value={repeatMode}
                        onChange={setRepeatMode}
                        options={[
                          { value: 'none', label: 'Sin repetir' },
                          { value: 'daily', label: 'Diario' },
                          { value: 'weekly', label: 'Semanal' },
                        ]}
                      />
                    </motion.div>
                  )}
                </AnimatePresence>
                <div className="ml-auto flex items-center gap-2">
                  <Button variant="outline" icon={<Save />} onClick={handleSaveBorrador}>
                    Guardar
                  </Button>
                  <Button
                    variant="liquid"
                    icon={scheduleMode === 'now' ? <Send /> : <Calendar />}
                    onClick={handleSchedule}
                    disabled={scheduleMode === 'schedule' && (!scheduledDate || !scheduledTime)}
                  >
                    {scheduleMode === 'now' ? 'Publicar ahora' : 'Programar'}
                  </Button>
                </div>
              </div>
            ) : undefined
          }
        >
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
              <Skeleton className="h-44 w-full rounded-xl" />
            </div>
          )}

          {showPreview && (
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }} className="space-y-4">
              {videoUrl || manualUploads[0]?.type === 'video' ? (
                <div className="overflow-hidden rounded-xl border border-border bg-black/5 dark:bg-black/30">
                  <video src={videoUrl || (previewImageUrl ?? undefined)} controls playsInline className="max-h-[420px] w-full object-contain" />
                  <p className="px-3 py-2 text-center text-xs text-muted-foreground">
                    {videoUrl ? 'Video generado con IA · vertical 9:16 · listo para TikTok' : 'Video subido · listo para publicar en TikTok'}
                  </p>
                </div>
              ) : (
                <SocialPostPreview
                  network={RED_PRINCIPAL}
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
            },
            webhookNow
          );
          await actualizarPublicacion(postId, { estado: 'publicado' });
          notify(`Publicado vía Make en ${redes.join(', ')}`);
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

  const today = new Date().toISOString().split('T')[0];

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

  const vistaPrevia =
    uploadedFiles[0]?.type === 'video' && uploadedFiles[0]?.preview ? (
      <div className="overflow-hidden rounded-xl border border-border bg-black/5 dark:bg-black/30">
        <video src={uploadedFiles[0].preview} controls playsInline className="max-h-[360px] w-full object-contain" />
        <p className="px-3 py-2 text-center text-xs text-muted-foreground">Video subido · listo para publicar en TikTok</p>
      </div>
    ) : (
      <SocialPostPreview
        network={RED_PRINCIPAL}
        authorName="Influencer"
        authorInitials="CL"
        content={postText}
        imageUrl={uploadedFiles[0]?.preview ?? null}
        charLimit={3000}
      />
    );

  return (
    <ScreenLayout>
      <Toast message={toastMsg} type="success" show={showToast} />

      <PageHeader
        title="Subir publicación"
        subtitle="Crea y programa contenido manualmente, sin IA"
        actions={
          <Button variant="outline" icon={<Eye />} className="xl:hidden" onClick={() => setVistaPreviaAbierta(true)}>
            Vista previa
          </Button>
        }
      />

      <div className="grid min-h-0 flex-1 gap-5 lg:grid-cols-[minmax(0,1fr)_360px] xl:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)_340px]">
        {/* Editor y medios */}
        <Panel
          title="Contenido del post"
          icon={<PenSquare />}
          actions={
            <Badge variant={postText.length > 3000 ? 'danger' : 'default'} className="tabular-nums">
              {postText.length} / 3000
            </Badge>
          }
          bodyClassName="flex flex-col gap-4"
        >
          <textarea
            aria-label="Contenido de la publicación"
            placeholder="Escribe aquí el contenido de tu publicación…"
            value={postText}
            onChange={(e) => setPostText(e.target.value)}
            className="field min-h-[140px] flex-1 resize-none py-3 leading-relaxed"
          />
          <div className="flex flex-wrap items-center gap-1">
            {['😊', '🚀', '✅', '💡', '🎯', '🔥', '📌', '💬'].map((e) => (
              <button
                key={e}
                type="button"
                aria-label={`Insertar ${e}`}
                onClick={() => setPostText((p) => p + e)}
                className="press flex h-8 w-8 items-center justify-center rounded-lg text-base transition-colors hover:bg-accent"
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
                className={`press flex cursor-pointer items-center gap-3 rounded-xl border border-dashed px-4 py-3 transition-all duration-200 ${
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
              <div className="grid grid-cols-5 gap-2">
                <AnimatePresence>
                  {uploadedFiles.map((f, i) => (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, scale: 0.85 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.85 }}
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
                        className="absolute right-1 top-1 flex h-6 w-6 items-center justify-center rounded-full bg-black/60 opacity-0 transition-all group-hover:opacity-100 hover:bg-destructive"
                      >
                        <X className="h-3 w-3 text-white" />
                      </button>
                    </motion.div>
                  ))}
                </AnimatePresence>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="press flex aspect-square flex-col items-center justify-center gap-1 rounded-[10px] border border-dashed border-border text-muted-foreground transition-colors hover:border-brand/50 hover:bg-brand-soft hover:text-brand-strong"
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
        <Panel title="Vista previa" icon={<Eye />} delay={60} className="hidden xl:flex">
          {vistaPrevia}
        </Panel>

        {/* Publicación */}
        <Panel
          title="Publicación"
          icon={<CalendarClock />}
          delay={120}
          footer={
            <div className="grid gap-2">
              <Button
                variant="liquid"
                className="w-full"
                icon={saving ? <Loader2 className="animate-spin" /> : scheduleMode === 'now' ? <Send /> : <CalendarClock />}
                onClick={handleSchedule}
                disabled={saving || !postText.trim()}
              >
                {saving ? 'Guardando…' : scheduleMode === 'now' ? 'Publicar ahora' : 'Programar publicación'}
              </Button>
              <Button variant="outline" className="w-full" icon={<Save />} onClick={guardarBorradorManual} disabled={!postText.trim()}>
                Guardar como borrador
              </Button>
            </div>
          }
        >
          <div className="space-y-5">
            <div className="space-y-2">
              <span className="text-sm font-medium text-foreground">Redes de publicación</span>
              <RedSelector value={redesDestino} onChange={setRedesDestino} canales={canales} />
            </div>

            <div className="space-y-3 border-t border-border pt-5">
              <Segmented
                full
                value={scheduleMode}
                onChange={(v) => setScheduleMode(v as 'now' | 'schedule')}
                options={[
                  { value: 'now', label: 'Publicar ahora' },
                  { value: 'schedule', label: 'Programar' },
                ]}
              />

              <AnimatePresence mode="wait" initial={false}>
                {scheduleMode === 'now' ? (
                  <motion.div key="ahora" initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }}>
                    <Notice tone="success" icon={<Send />}>
                      <span className="font-medium">Publicación inmediata.</span> Se enviará a las redes seleccionadas al confirmar.
                    </Notice>
                  </motion.div>
                ) : (
                  <motion.div
                    key="programar"
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -4 }}
                    className="space-y-3"
                  >
                    <div className="grid grid-cols-2 gap-3">
                      <label className="space-y-1.5">
                        <span className="text-sm font-medium text-foreground">Fecha</span>
                        <input type="date" min={today} value={scheduledDate} onChange={(e) => setScheduledDate(e.target.value)} className="field" />
                      </label>
                      <label className="space-y-1.5">
                        <span className="text-sm font-medium text-foreground">Hora</span>
                        <input type="time" value={scheduledTime} onChange={(e) => setScheduledTime(e.target.value)} className="field" />
                      </label>
                    </div>
                    <Dropdown label="Zona horaria" icon={<Globe />} value={timezone} onChange={setTimezone} options={ZONAS_HORARIAS} />
                    <Dropdown
                      label="Repetir"
                      icon={<AlarmClock />}
                      value={repeatMode}
                      onChange={setRepeatMode}
                      options={[
                        { value: 'none', label: 'Sin repetición' },
                        { value: 'daily', label: 'Diario' },
                        { value: 'weekly', label: 'Semanal' },
                        { value: 'biweekly', label: 'Cada 2 semanas' },
                        { value: 'monthly', label: 'Mensual' },
                      ]}
                    />
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

            <p className="flex items-center gap-2 border-t border-border pt-4 text-xs text-muted-foreground">
              <Activity className="h-3.5 w-3.5 shrink-0" />
              Flujo: Conect.ia <ChevronRight className="h-3 w-3" /> n8n / Make <ChevronRight className="h-3 w-3" /> red social
            </p>
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
  const { data: drafts = [], isLoading, refetch } = useBorradores();
  const [filter, setFilter] = useState('todos');

  const filtered = drafts.filter((d) => {
    if (filter === 'pendientes') return d.estado === 'pendiente';
    if (filter === 'programados') return d.estado === 'programado' || d.estado === 'aprobado';
    return true;
  });

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

  return (
    <ScreenLayout>
      <PageHeader
        title="Borradores"
        subtitle="Gestiona tus publicaciones guardadas y programadas"
        actions={
          <Segmented
            value={filter}
            onChange={setFilter}
            options={(['todos', 'pendientes', 'programados'] as const).map((f) => ({
              value: f,
              label: (
                <>
                  <span className="capitalize">{f}</span>
                  <span className="rounded-md bg-background/70 px-1.5 text-xs tabular-nums text-muted-foreground">{conteo[f]}</span>
                </>
              ),
            }))}
          />
        }
      />

      <Panel scroll={false} className="flex-1" bodyClassName="!p-0 flex flex-col">
        {isLoading ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-3 py-16">
            <Loader2 className="h-6 w-6 animate-spin text-brand-strong" />
            <p className="text-sm text-muted-foreground">Cargando borradores…</p>
          </div>
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={<FileText />}
            title="No hay borradores"
            text="Aún no tienes borradores en este estado. Crea contenido y guárdalo aquí para más tarde."
            action={
              <Button variant="liquid" icon={<Plus />} onClick={() => onNavigate('new-post')}>
                Crear publicación
              </Button>
            }
          />
        ) : (
          <div className="min-h-0 flex-1 overflow-auto">
            <table className="w-full border-collapse text-left">
              <thead className="sticky top-0 z-10 bg-card">
                <tr className="border-b border-border">
                  {['Título', 'Redes', 'Estado', 'Fecha', ''].map((h, i) => (
                    <th
                      key={i}
                      className={`h-11 px-5 text-xs font-medium uppercase tracking-wider text-muted-foreground ${i === 4 ? 'text-right' : ''}`}
                    >
                      {h || <span className="sr-only">Acciones</span>}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filtered.map((draft, i) => (
                  <motion.tr
                    key={draft.id}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.25, delay: Math.min(i, 10) * 0.03 }}
                    className="group cursor-pointer transition-colors duration-150 hover:bg-accent/70"
                    onClick={() => resumeBorradorAndNavigate(draft, onNavigate)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        resumeBorradorAndNavigate(draft, onNavigate);
                      }
                    }}
                    tabIndex={0}
                    role="button"
                    aria-label={`Continuar borrador: ${draft.titulo || draft.promptOriginal.slice(0, 50)}`}
                  >
                    <td className="h-14 max-w-[420px] px-5">
                      <p className="truncate text-sm font-medium text-foreground transition-colors group-hover:text-brand-strong">
                        {draft.titulo || draft.promptOriginal.slice(0, 50)}
                      </p>
                    </td>
                    <td className="px-5">
                      <div className="flex items-center -space-x-1.5">
                        {draft.redesDestino.map((net) => (
                          <span
                            key={net}
                            className="flex h-7 w-7 items-center justify-center rounded-full border-2 border-card bg-secondary"
                          >
                            {networkIcons[net as keyof typeof networkIcons]}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="px-5">
                      <Badge variant={statusColors[draft.estado] ?? 'default'} className="capitalize">{draft.estado}</Badge>
                    </td>
                    <td className="whitespace-nowrap px-5 text-sm text-muted-foreground">{formatRelative(toDate(draft.creadoEn))}</td>
                    <td className="px-5">
                      <div className="flex items-center justify-end gap-1 opacity-60 transition-opacity group-hover:opacity-100">
                        <button
                          type="button"
                          title="Continuar editando"
                          aria-label="Continuar editando"
                          className="press flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-brand-soft hover:text-brand-strong"
                          onClick={(e) => {
                            e.stopPropagation();
                            resumeBorradorAndNavigate(draft, onNavigate);
                          }}
                        >
                          <Edit className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          title="Eliminar"
                          aria-label="Eliminar borrador"
                          className="press flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-destructive-soft hover:text-destructive"
                          onClick={async (e) => {
                            e.stopPropagation();
                            if (!user || !confirm('¿Eliminar borrador?')) return;
                            await eliminarBorrador(draft.id);
                            invalidate();
                            refetch();
                          }}
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>
    </ScreenLayout>
  );
};

// ============================================================================
// PANTALLA 5: CALENDARIO
// ============================================================================

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
  const { porDia, isLoading } = usePublicacionesProgramadas(mes, anio);

  const monthLabel = viewDate.toLocaleDateString('es-CO', { month: 'long', year: 'numeric' });
  const daysInMonth = new Date(anio, mes + 1, 0).getDate();
  const firstDayOffset = (new Date(anio, mes, 1).getDay() + 6) % 7;

  const selectedPosts = selectedDay ? porDia[selectedDay] ?? [] : [];

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

  return (
    <ScreenLayout>
      <PageHeader
        title="Calendario editorial"
        subtitle="Organiza tus publicaciones. Arrastra una publicación a otro día para reprogramarla."
        actions={
          <Button variant="liquid" icon={<Plus />} onClick={() => onNavigate('new-post')}>
            Nueva publicación
          </Button>
        }
      />

      {(overdueCount > 0 || schedulerMsg) && (
        <div className="shrink-0 space-y-2">
          {overdueCount > 0 && (
            <Notice tone="warning" icon={<Clock />}>
              <span className="font-medium">{overdueCount} publicación(es) pasaron su hora</span> y siguen programadas. Se
              publicarán en el próximo ciclo del programador, o usa <span className="font-medium">Publicar</span> en el día
              correspondiente.
            </Notice>
          )}
          {schedulerMsg && <Notice tone="success">{schedulerMsg}</Notice>}
        </div>
      )}

      <div className="grid min-h-0 flex-1 gap-5 lg:grid-cols-[minmax(0,1fr)_340px]">
        {/* Mes */}
        <Panel
          title={<span className="inline-block first-letter:uppercase">{monthLabel}</span>}
          icon={<Calendar />}
          scroll={false}
          bodyClassName="flex flex-col"
          actions={
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setViewDate(new Date(now.getFullYear(), now.getMonth(), 1));
                  setSelectedDay(now.getDate());
                }}
              >
                Hoy
              </Button>
              <button
                type="button"
                aria-label="Mes anterior"
                onClick={() => setViewDate(new Date(anio, mes - 1, 1))}
                className="press flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button
                type="button"
                aria-label="Mes siguiente"
                onClick={() => setViewDate(new Date(anio, mes + 1, 1))}
                className="press flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          }
        >
          <div className="mb-2 grid shrink-0 grid-cols-7 gap-2">
            {['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'].map((d) => (
              <div key={d} className="py-1 text-center text-xs font-medium uppercase tracking-wider text-muted-foreground">
                {d}
              </div>
            ))}
          </div>

          <div
            key={`${anio}-${mes}`}
            className="grid min-h-[320px] flex-1 animate-fade grid-cols-7 gap-2"
            style={{ gridTemplateRows: `repeat(${semanas}, minmax(0, 1fr))` }}
          >
            {Array.from({ length: firstDayOffset }).map((_, i) => (
              <div key={`vacio-${i}`} />
            ))}

            {Array.from({ length: daysInMonth }).map((_, i) => {
              const day = i + 1;
              const posts = porDia[day] || [];
              const isSelected = selectedDay === day;
              const esHoy = esMesActual && day === now.getDate();
              const destino = dropTargetDay === day && draggingPostId;

              return (
                <button
                  key={day}
                  type="button"
                  onClick={() => setSelectedDay(day)}
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
                  aria-label={`${day} de ${monthLabel}${posts.length ? `, ${posts.length} publicación(es)` : ''}`}
                  className={`press flex min-h-0 flex-col overflow-hidden rounded-[10px] border p-2 text-left transition-all duration-200
                    ${isSelected ? 'border-brand bg-brand-soft shadow-[var(--glow)]' : 'border-border hover:border-brand/40 hover:bg-accent'}
                    ${destino ? 'scale-[1.03] border-brand ring-2 ring-brand/40' : ''}`}
                >
                  <span
                    className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-medium ${
                      esHoy ? 'bg-brand text-white' : isSelected ? 'text-brand-strong' : 'text-foreground'
                    }`}
                  >
                    {day}
                  </span>
                  {posts.length > 0 && (
                    <div className="mt-auto flex w-full flex-col gap-1">
                      {posts.slice(0, 2).map((post) => (
                        <span
                          key={post.id}
                          className={`h-1.5 w-full rounded-full ${isPostOverdue(post) ? 'bg-destructive' : 'bg-brand'}`}
                        />
                      ))}
                      {posts.length > 2 && (
                        <span className="text-right text-xs leading-none text-muted-foreground">+{posts.length - 2}</span>
                      )}
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </Panel>

        {/* Día seleccionado */}
        <Panel
          title={selectedDay ? `${selectedDay} de ${monthLabel}` : 'Selecciona un día'}
          icon={<CalendarClock />}
          delay={80}
          actions={selectedPosts.length > 0 ? <Badge variant="purple">{selectedPosts.length}</Badge> : undefined}
        >
          {isLoading ? (
            <div className="flex flex-col items-center justify-center gap-3 py-12">
              <Loader2 className="h-6 w-6 animate-spin text-brand-strong" />
              <p className="text-sm text-muted-foreground">Cargando…</p>
            </div>
          ) : selectedDay && selectedPosts.length > 0 ? (
            <div className="space-y-3">
              <AnimatePresence>
                {selectedPosts.map((post, i) => {
                  const fp = toDate(post.fechaProgramada);
                  const overdue = isPostOverdue(post);
                  return (
                    <motion.div
                      key={post.id}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.96 }}
                      transition={{ duration: 0.22, delay: i * 0.04 }}
                      draggable={!moving}
                      role="button"
                      tabIndex={0}
                      onClick={() => {
                        if (!dragRef.current) setPreviewPost(post);
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          setPreviewPost(post);
                        }
                      }}
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
                      title="Clic para previsualizar · arrastra para cambiar la fecha"
                      className={`hover-lift group cursor-pointer overflow-hidden rounded-xl border bg-card p-3.5
                        ${draggingPostId === post.id ? 'scale-95 opacity-50 ring-2 ring-brand' : 'active:cursor-grabbing'}
                        ${overdue ? 'border-destructive/30' : 'border-border'}`}
                    >
                      {post.imagenUrl && (
                        <div className="mb-3 h-28 overflow-hidden rounded-lg">
                          <img
                            src={post.imagenUrl}
                            alt=""
                            className="pointer-events-none h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                          />
                        </div>
                      )}
                      <div className="flex items-start justify-between gap-3">
                        <p className="line-clamp-1 text-sm font-medium transition-colors group-hover:text-brand-strong">{post.titulo}</p>
                        <span className="flex shrink-0 items-center gap-1 text-xs text-muted-foreground">
                          <Clock className="h-3.5 w-3.5" />
                          {fp ? fp.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' }) : ''}
                        </span>
                      </div>
                      <p className="mt-1.5 line-clamp-2 text-xs leading-relaxed text-muted-foreground">{post.contenido}</p>

                      <div className="mt-3 flex items-center gap-1.5 border-t border-border pt-3">
                        {overdue && (
                          <Button
                            variant="success"
                            size="sm"
                            disabled={publishingId === post.id}
                            icon={publishingId === post.id ? <Loader2 className="animate-spin" /> : <Send />}
                            onClick={(e) => {
                              e.stopPropagation();
                              void publicarProgramadoAhora(post);
                            }}
                          >
                            Publicar
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="sm"
                          icon={<Eye />}
                          onClick={(e) => {
                            e.stopPropagation();
                            setPreviewPost(post);
                          }}
                        >
                          Ver
                        </Button>
                        <button
                          type="button"
                          aria-label="Eliminar publicación"
                          className="press ml-auto flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-destructive-soft hover:text-destructive"
                          onClick={async (e) => {
                            e.stopPropagation();
                            if (!user || !confirm('¿Eliminar publicación?')) return;
                            await eliminarPublicacion(post.id);
                            if (previewPost?.id === post.id) setPreviewPost(null);
                            invalidate();
                          }}
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </div>
          ) : selectedDay ? (
            <EmptyState icon={<Calendar />} title="Día libre" text="No hay publicaciones programadas para este día." />
          ) : null}
        </Panel>
      </div>

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
                <Badge>
                  <Clock className="h-3.5 w-3.5" />
                  {formatDateTime(toDate(previewPost.fechaProgramada))}
                </Badge>
              )}
              <Badge variant={previewPost.estado === 'publicado' ? 'success' : 'default'} className="capitalize">{previewPost.estado}</Badge>
              {previewPost.redesDestino.map((net) => (
                <Badge key={net} variant="purple">
                  {net}
                </Badge>
              ))}
            </div>
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

  const handleSend = async () => {
    if (!input.trim() || !user || sending) return;
    const text = input.trim();
    setInput('');
    setSending(true);
    setError('');
    setLastUserPrompt(text);
    const userMsg: AgentChatMessage = { role: 'user', text };
    setMessages((prev) => [...prev, userMsg]);
    try {
      const historial = messages.slice(-10).map((m) => ({
        role: (m.role === 'user' ? 'user' : 'model') as 'user' | 'model',
        content: m.text,
      }));
      const res = await chatWithAgent(text, historial);
      const botMsg: AgentChatMessage = {
        role: 'bot',
        text: res.respuesta,
        accionSugerida: res.accionSugerida,
        temaSugerido: res.temaSugerido,
        tonoSugerido: res.tonoSugerido,
      };
      setMessages((prev) => [...prev, botMsg]);
      setError('');
      setBackendOk(true);
      invalidate();
    } catch (e) {
      const msg = mensajeCallable(e);
      setError(msg);
      setBackendOk(false);
      setMessages((prev) => [...prev, { role: 'bot', text: msg }]);
    } finally {
      setSending(false);
    }
  };

  const finChatRef = useRef<HTMLDivElement>(null);

  // Desplazamiento suave hasta el último mensaje.
  useEffect(() => {
    finChatRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [messages.length, sending]);

  const sinConexion = backendOk === false || Boolean(error);

  return (
    <ScreenLayout>
      <PageHeader
        title="Asistente IA"
        subtitle="Ideas, edición y copy para tus redes, con Gemini"
        actions={
          <span
            className={`inline-flex h-8 items-center gap-2 rounded-full border px-3 text-xs font-medium ${
              sinConexion ? 'border-destructive/25 bg-destructive-soft text-destructive' : 'border-brand/20 bg-brand-soft text-brand-strong'
            }`}
          >
            <span className="relative flex h-2 w-2">
              <span className={`absolute inline-flex h-full w-full animate-ping rounded-full opacity-70 ${sinConexion ? 'bg-destructive' : 'bg-brand-light'}`} />
              <span className={`relative inline-flex h-2 w-2 rounded-full ${sinConexion ? 'bg-destructive' : 'bg-brand'}`} />
            </span>
            {sinConexion ? `Sin conexión IA${aiHint ? ` · ${aiHint}` : ''}` : aiHint || 'IA activa'}
          </span>
        }
      />

      <div className="grid min-h-0 flex-1 gap-5 lg:grid-cols-[minmax(0,1fr)_300px]">
        {/* Chat */}
        <section className="surface flex min-h-[420px] animate-enter flex-col overflow-hidden lg:min-h-0">
          <div className="min-h-0 flex-1 space-y-5 overflow-y-auto p-5">
            <AnimatePresence initial={false}>
              {messages.map((msg, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 10, scale: 0.98 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  transition={{ duration: 0.26, ease: [0.22, 1, 0.36, 1] }}
                  className={`flex flex-col gap-2 ${msg.role === 'user' ? 'items-end' : 'items-start'}`}
                >
                  <div className="flex max-w-[85%] items-end gap-2.5">
                    {msg.role === 'bot' && (
                      <span className="mb-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand text-white">
                        <Sparkles className="h-4 w-4" />
                      </span>
                    )}
                    <div
                      className={`whitespace-pre-wrap rounded-2xl px-4 py-3 ${
                        msg.role === 'user'
                          ? 'rounded-br-md bg-brand text-white'
                          : 'rounded-bl-md border border-border bg-accent text-foreground'
                      }`}
                    >
                      {msg.role === 'bot' ? (
                        <div className="prose prose-sm max-w-none dark:prose-invert prose-p:leading-relaxed prose-a:text-brand-strong">
                          <ChatMessageBody text={msg.text} />
                        </div>
                      ) : (
                        <p className="text-sm leading-relaxed">{msg.text}</p>
                      )}
                    </div>
                  </div>

                  {msg.role === 'bot' && (msg.accionSugerida === 'generar_publicacion' || msg.accionSugerida === 'ver_calendario') && (
                    <div className="ml-11 flex gap-2">
                      {msg.accionSugerida === 'generar_publicacion' && (
                        <Button
                          variant="liquid"
                          size="sm"
                          icon={<PenSquare />}
                          onClick={() => irAGenerarPublicacion(msg.temaSugerido || lastUserPrompt, msg.tonoSugerido || 'profesional')}
                        >
                          Generar publicación
                        </Button>
                      )}
                      {msg.accionSugerida === 'ver_calendario' && (
                        <Button variant="outline" size="sm" icon={<Calendar />} onClick={() => onNavigate('calendar')}>
                          Ver calendario
                        </Button>
                      )}
                    </div>
                  )}
                </motion.div>
              ))}
            </AnimatePresence>
            {sending && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex items-end gap-2.5">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand text-white">
                  <Sparkles className="h-4 w-4" />
                </span>
                <div className="flex items-center gap-1.5 rounded-2xl rounded-bl-md border border-border bg-accent px-4 py-3.5">
                  {[0, 150, 300].map((d) => (
                    <span key={d} className="h-2 w-2 animate-bounce rounded-full bg-brand" style={{ animationDelay: `${d}ms` }} />
                  ))}
                </div>
              </motion.div>
            )}
            <div ref={finChatRef} />
          </div>

          <div className="shrink-0 border-t border-border p-4">
            <div className="flex items-end gap-2.5">
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSend();
                  }
                }}
                aria-label="Mensaje para el asistente"
                placeholder="Pide ideas, optimiza copy o genera contenido…"
                className="field max-h-[120px] min-h-11 resize-none py-2.5"
                rows={1}
              />
              <button
                type="button"
                aria-label="Enviar mensaje"
                onClick={handleSend}
                disabled={!input.trim() || sending}
                className="press flex h-11 w-11 shrink-0 items-center justify-center rounded-[10px] bg-brand text-white transition-all hover:bg-brand-deep hover:shadow-[var(--glow)] disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Send className="h-4 w-4" />
              </button>
            </div>
            <p className="mt-2 text-center text-xs text-muted-foreground">Enter para enviar · Shift + Enter para nueva línea</p>
          </div>
        </section>

        {/* Acciones rápidas */}
        <Panel title="Acciones rápidas" icon={<Zap />} delay={80}>
          <Button
            variant="liquid"
            className="w-full"
            icon={<Sparkles />}
            onClick={() => irAGenerarPublicacion(lastUserPrompt || input || 'Publicación Conect.ia')}
          >
            Generar publicación
          </Button>
          <p className="mt-2.5 text-xs leading-relaxed text-muted-foreground">
            Abre Nueva publicación con el tema del chat y genera el borrador automáticamente.
          </p>

          <div className="mt-5 space-y-2">
            {quickActions.map((action, i) => (
              <button
                key={i}
                type="button"
                onClick={() => setInput(action)}
                className="press group flex w-full items-center justify-between gap-3 rounded-[10px] border border-border px-3.5 py-2.5 text-left text-sm transition-all duration-200 hover:border-brand/40 hover:bg-brand-soft"
              >
                <span className="text-foreground">{action}</span>
                <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-brand-strong" />
              </button>
            ))}
          </div>

          <div className="mt-6 border-t border-border pt-5">
            <p className="mb-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">Sugerencias</p>
            <ul className="space-y-2.5">
              {['Pide ideas de contenido específicas', 'Solicita optimización de copy', 'Genera hashtags relevantes', 'Analiza borradores guardados'].map(
                (sug) => (
                  <li key={sug} className="flex items-start gap-2 text-sm text-muted-foreground">
                    <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-brand" />
                    {sug}
                  </li>
                )
              )}
            </ul>
          </div>
        </Panel>
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
  const { data: canales, isLoading } = useCanales();
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
    await guardarCanal(user.uid, red, { conectado, cuentaNombre: conectado ? 'Manual' : null });
    invalidate();
  };

  const renderCanalCard = (red: (typeof CATALOGO_REDES)[number], indice: number) => {
    const config = redConfig(red.id);
    if (!config) return null;
    const canal = canales?.[red.id];
    const conectado = Boolean(canal?.conectado);
    const cuenta = canal?.cuentaNombre;

    return (
      <div
        key={red.id}
        className={`surface hover-lift flex animate-enter flex-col gap-4 p-5 ${conectado ? 'border-success/35' : ''}`}
        style={{ animationDelay: `${Math.min(indice, 8) * 45}ms` }}
      >
        <div className="flex items-start gap-3.5">
          <span
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border bg-card"
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
            <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-muted-foreground">
              {conectado
                ? config.tipo === 'manual'
                  ? 'Canal manual activo.'
                  : `Cuenta: ${cuenta ?? 'conectada'}`
                : config.descripcion}
            </p>
          </div>
        </div>
        <div className="mt-auto flex flex-wrap gap-2">
          {config.tipo === 'proximamente' ? (
            <Button variant="secondary" size="sm" disabled>
              Disponible pronto
            </Button>
          ) : config.tipo === 'manual' ? (
            fiverrActivo ? (
              <Button variant="destructive" size="sm" onClick={() => void toggleCanal(red.id, false)}>
                Desactivar
              </Button>
            ) : (
              <Button variant="primary" size="sm" onClick={() => void toggleCanal(red.id, true)}>
                Activar canal manual
              </Button>
            )
          ) : conectado ? (
            <>
              <Button variant="outline" size="sm" onClick={() => setConnectModalRed(red.id)}>
                Reconfigurar
              </Button>
              <Button variant="destructive" size="sm" onClick={() => void toggleCanal(red.id, false)}>
                Desconectar
              </Button>
            </>
          ) : (
            <Button variant="primary" size="sm" onClick={() => setConnectModalRed(red.id)}>
              Conectar {config.nombre}
            </Button>
          )}
        </div>
      </div>
    );
  };

  const indicadores = [
    { label: 'Canales OAuth conectados', value: `${conectadas}/${totalOauth}`, icon: <Share2 />, tone: 'brand' as const },
    { label: 'Publicaciones publicadas', value: String(stats.publicados), icon: <CheckCircle2 />, tone: 'success' as const },
    { label: 'Publicaciones programadas', value: String(stats.programados), icon: <CalendarClock />, tone: 'warning' as const },
  ];

  return (
    <ScreenLayout>
      <PageHeader
        title="Canales"
        subtitle="Conecta tus redes con OAuth oficial y elige dónde publicar en cada publicación"
      />

      <div className="grid shrink-0 gap-4 sm:grid-cols-3">
        {indicadores.map((m, i) => (
          <div key={m.label} className="surface flex animate-enter items-center gap-3.5 px-5 py-4" style={{ animationDelay: `${i * 50}ms` }}>
            <IconTile tone={m.tone}>{m.icon}</IconTile>
            <div className="min-w-0">
              <p className="text-lg font-semibold tabular-nums leading-tight text-foreground">{m.value}</p>
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

      <div className="-mx-1 min-h-0 flex-1 overflow-y-auto px-1 pb-1">
        {isLoading ? (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <Skeleton key={i} className="h-36 w-full rounded-2xl" />
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
  const { data: config, isLoading } = useConfiguracion();
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

  return (
    <ScreenLayout maxWidth="max-w-[1100px]">
      <PageHeader
        title="Ajustes"
        subtitle="Integraciones y preferencias de la plataforma"
        actions={
          <Button
            variant="liquid"
            icon={saving ? <Loader2 className="animate-spin" /> : <CheckCircle2 />}
            disabled={saving || !user || isLoading}
            onClick={() => void guardar()}
            className="min-w-[160px]"
          >
            {saved ? '¡Guardado!' : 'Guardar cambios'}
          </Button>
        }
      />

      {saveError && <Notice tone="danger" className="shrink-0">{saveError}</Notice>}

      <div className="grid min-h-0 flex-1 content-start gap-5 lg:grid-cols-2">
        <Panel title="Automatización Make / n8n" icon={<Network />} className="lg:h-full">
          <div className="space-y-4">
            <Input
              label="URL del webhook"
              icon={<Network />}
              value={automationWebhook}
              onChange={(e) => setAutomationWebhook(e.target.value)}
              placeholder="https://hook.us2.make.com/xxxxxxxx"
            />
            <div className="surface-muted space-y-2.5 p-4 text-sm leading-relaxed text-muted-foreground">
              <p>
                El secreto va en las variables de entorno de Vercel: {codigo('MAKE_WEBHOOK_SECRET')} (API key del Custom webhook en
                Make). Se envía en las cabeceras {codigo('x-make-apikey')} y {codigo('X-Campus-Secret')}.
              </p>
              <p>
                Guía: {codigo('Flujo_Automatizacion/POSTMAN_MAKE.md')} · n8n local: {codigo('docker compose up -d')}
              </p>
            </div>
          </div>
        </Panel>

        <div className="flex min-h-0 flex-col gap-5">
          <Panel title="Preferencias" icon={<Settings />} scroll={false} delay={60}>
            <div className="space-y-5">
              <Dropdown label="Zona horaria" icon={<Globe />} value={timezone} onChange={setTimezone} options={ZONAS_HORARIAS} />
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-sm font-medium text-foreground">Tema</p>
                  <p className="text-xs text-muted-foreground">Se aplica con un fundido suave</p>
                </div>
                <Segmented
                  value={mode}
                  onChange={(v) => setTheme(v as 'light' | 'dark')}
                  options={[
                    { value: 'light', label: <><Sun className="h-3.5 w-3.5" />Claro</> },
                    { value: 'dark', label: <><Moon className="h-3.5 w-3.5" />Oscuro</> },
                  ]}
                />
              </div>
              <div className="border-t border-border pt-5">
                <Toggle
                  label="Notificaciones"
                  description="Recibir alertas en el navegador"
                  checked={notifications}
                  onChange={setNotifications}
                />
              </div>
            </div>
          </Panel>

          <Panel title="Secretos del servidor" icon={<Sparkles />} scroll={false} delay={120}>
            <p className="text-sm leading-relaxed text-muted-foreground">
              Las claves de Gemini, de las redes sociales y de los webhooks se configuran como variables de entorno en Vercel.
              Nunca se guardan en el navegador.
            </p>
          </Panel>
        </div>
      </div>
    </ScreenLayout>
  );
};

const DashboardHome: React.FC<{ onNavigate: (screen: string) => void }> = ({ onNavigate }) => {
  const { profile } = useAuth();
  const { stats, isLoading } = useDashboardStats();
  const { data: actividad = [], isLoading: loadingAct } = useActividad();
  const primerNombre = (profile?.nombre || '').split(' ')[0];

  const statCards = [
    { label: 'Publicadas', value: stats.publicados, icon: <BarChart3 />, tone: 'brand' as const },
    { label: 'Programadas', value: stats.programados, icon: <Calendar />, tone: 'success' as const },
    { label: 'Borradores', value: stats.borradores, icon: <FileText />, tone: 'warning' as const },
  ];

  const accesos = [
    { id: 'new-post', icon: <Sparkles />, label: 'Nueva publicación', desc: 'Genera contenido con IA' },
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
          <Button variant="liquid" icon={<Plus />} onClick={() => onNavigate('new-post')}>
            Nueva publicación
          </Button>
        }
      />

      <div className="grid shrink-0 gap-4 sm:grid-cols-3">
        {statCards.map((card, i) => (
          <div
            key={card.label}
            className="surface hover-lift group flex animate-enter items-center justify-between gap-4 p-5"
            style={{ animationDelay: `${i * 60}ms` }}
          >
            <div>
              <p className="text-sm text-muted-foreground">{card.label}</p>
              <div className="mt-1 text-2xl font-semibold tabular-nums text-foreground">
                {isLoading ? <Skeleton className="mt-1 h-7 w-10" /> : <CountUp value={card.value} />}
              </div>
            </div>
            <IconTile tone={card.tone} className="!h-11 !w-11 transition-transform duration-300 group-hover:scale-110">
              {card.icon}
            </IconTile>
          </div>
        ))}
      </div>

      <div className="grid min-h-0 flex-1 gap-5 lg:grid-cols-[minmax(0,1fr)_340px]">
        <Panel title="Actividad reciente" icon={<Activity />} delay={120}>
          {loadingAct ? (
            <div className="space-y-3">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="flex items-center gap-3">
                  <Skeleton className="h-9 w-9 rounded-[10px]" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-3.5 w-2/3" />
                    <Skeleton className="h-3 w-24" />
                  </div>
                </div>
              ))}
            </div>
          ) : actividad.length === 0 ? (
            <EmptyState icon={<Sparkles />} title="Sin actividad aún" text="Crea tu primera publicación y verás aquí su historial." />
          ) : (
            <ul className="stagger -mx-2 space-y-0.5">
              {actividad.map((a) => (
                <li key={a.id} className="flex items-center gap-3 rounded-[10px] px-2 py-2.5 transition-colors duration-150 hover:bg-accent">
                  <IconTile tone={tonoActividad(a.tipo)}>
                    {a.tipo === 'programado' ? <Calendar /> : a.tipo === 'borrador' ? <FileText /> : a.tipo === 'error' ? <X /> : <CheckCircle2 />}
                  </IconTile>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-foreground">{a.mensaje}</p>
                    <p className="text-xs text-muted-foreground">{formatRelative(toDate(a.creadoEn))}</p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Panel>

        <Panel title="Accesos rápidos" icon={<Zap />} delay={180}>
          <div className="space-y-2">
            {accesos.map((a) => (
              <button
                key={a.id}
                type="button"
                onClick={() => onNavigate(a.id)}
                className="press group flex w-full items-center gap-3 rounded-xl border border-border p-3 text-left transition-all duration-200 hover:border-brand/40 hover:bg-brand-soft"
              >
                <IconTile>{a.icon}</IconTile>
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-medium text-foreground">{a.label}</span>
                  <span className="block truncate text-xs text-muted-foreground">{a.desc}</span>
                </span>
                <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-brand-strong" />
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
        return <NewPostScreen />;
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
