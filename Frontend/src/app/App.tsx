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
  ...props 
}) => {
  const baseStyles = 'inline-flex items-center justify-center gap-2 rounded-2xl font-medium transition-all duration-200 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed';
  
  const variants = {
    primary: 'bg-[#0f172a] dark:bg-[#f8fafc] text-white dark:text-[#0f172a] hover:bg-[#1e293b] dark:hover:bg-[#e2e8f0]',
    liquid: 'relative overflow-hidden bg-gradient-to-r from-[#1e3a8a] to-[#06b6d4] text-white shadow-[inset_0_1px_1px_rgba(255,255,255,0.2),0_4px_15px_rgba(6,182,212,0.2)] hover:shadow-[inset_0_1px_1px_rgba(255,255,255,0.3),0_6px_20px_rgba(6,182,212,0.3)] hover:-translate-y-[1px] border-0 outline-none ring-0',
    secondary: 'bg-secondary text-secondary-foreground hover:bg-secondary/80',
    ghost: 'bg-transparent text-muted-foreground hover:bg-accent hover:text-accent-foreground',
    success: 'bg-[#10b981] text-white hover:bg-[#059669] hover:shadow-lg hover:shadow-emerald-500/30',
    destructive: 'bg-destructive text-destructive-foreground hover:bg-destructive/90',
    outline: 'border-2 border-border bg-transparent hover:bg-accent'
  };
  
  const sizes = {
    sm: 'px-3 py-1.5 text-xs',
    md: 'px-4 py-2.5 text-sm',
    lg: 'px-6 py-3 text-base'
  };
  
  return (
    <button 
      className={`${baseStyles} ${variants[variant]} ${sizes[size]} ${className}`}
      disabled={disabled}
      {...props}
    >
      {icon && <span className="flex items-center justify-center shrink-0 [&>svg]:w-5 [&>svg]:h-5">{icon}</span>}
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
          <div className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground flex items-center justify-center [&>svg]:w-4 [&>svg]:h-4">
            {icon}
          </div>
        )}
        <input 
          className={`w-full px-4 py-2.5 bg-input-background border border-input rounded-xl text-sm transition-all
            focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent
            disabled:opacity-50 disabled:cursor-not-allowed
            ${icon ? 'pl-10' : ''}
            ${error ? 'border-destructive' : ''}
            ${className}`}
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
        className={`w-full px-4 py-2.5 bg-input-background border border-input rounded-xl text-sm transition-all
          focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent
          disabled:opacity-50 disabled:cursor-not-allowed resize-none
          ${error ? 'border-destructive' : ''}
          ${className}`}
        {...props}
      />
      {error && <span className="text-xs text-destructive">{error}</span>}
    </div>
  );
};

// Select Component
interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  options: { value: string; label: string }[];
}

const Select: React.FC<SelectProps> = ({ label, options, className = '', ...props }) => {
  return (
    <div className="flex flex-col gap-1.5">
      {label && <label className="text-sm font-medium text-foreground">{label}</label>}
      <select 
        className={`w-full px-4 py-2.5 bg-input-background border border-input rounded-xl text-sm transition-all
          focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent
          disabled:opacity-50 disabled:cursor-not-allowed appearance-none cursor-pointer
          ${className}`}
        {...props}
      >
        {options.map(opt => (
          <option key={opt.value} value={opt.value}>{opt.label}</option>
        ))}
      </select>
    </div>
  );
};

// Toggle Component
interface ToggleProps {
  label?: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
}

const Toggle: React.FC<ToggleProps> = ({ label, checked, onChange, disabled = false }) => {
  return (
    <label className="flex items-center justify-between cursor-pointer gap-2">
      {label && <span className="text-sm font-medium text-foreground">{label}</span>}
      <div 
        onClick={() => !disabled && onChange(!checked)}
        className={`w-11 h-6 rounded-full transition-colors duration-300 flex items-center p-0.5 ${
          checked ? 'bg-gradient-to-r from-[#1e3a8a] to-[#06b6d4] justify-end' : 'bg-switch-background justify-start'
        } ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
      >
        <motion.div 
          layout
          className="w-5 h-5 bg-white rounded-full shadow-sm"
          transition={{ type: 'spring', stiffness: 500, damping: 30 }}
        />
      </div>
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
    <label className="flex items-center gap-3 cursor-pointer">
      <div 
        onClick={() => !disabled && onChange(!checked)}
        className={`w-5 h-5 rounded-lg border-2 transition-all duration-200 flex items-center justify-center
          ${checked ? 'bg-gradient-to-r from-[#1e3a8a] to-[#06b6d4] border-transparent' : 'border-input bg-input-background'}
          ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:border-ring'}`}
      >
        {checked && <Check className="w-3 h-3 text-white" strokeWidth={3} />}
      </div>
      <div className="flex items-center gap-2">
        {icon && <span className="w-4 h-4 text-muted-foreground">{icon}</span>}
        {label && <span className="text-sm font-medium text-foreground">{label}</span>}
      </div>
    </label>
  );
};

// Badge Component
interface BadgeProps {
  children: React.ReactNode;
  variant?: 'default' | 'success' | 'warning' | 'danger' | 'purple';
}

const Badge: React.FC<BadgeProps> = ({ children, variant = 'default' }) => {
  const variants = {
    default: 'bg-secondary text-secondary-foreground',
    success: 'bg-emerald-100 text-emerald-700',
    warning: 'bg-amber-100 text-amber-700',
    danger: 'bg-red-100 text-red-700',
    purple: 'bg-purple-100 text-purple-700'
  };
  
  return (
    <span className={`inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-medium ${variants[variant]}`}>
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
  return (
    <div className={`bg-white dark:bg-card border border-slate-100 dark:border-border rounded-3xl p-6 transition-all duration-200 
      ${hover ? 'hover:shadow-2xl hover:shadow-[#06b6d4]/10 hover:border-[#06b6d4]/20 hover:-translate-y-1' : 'shadow-[0_8px_30px_rgb(0,0,0,0.04)]'}
      ${className}`}>
      {children}
    </div>
  );
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
  if (!isOpen) return null;
  
  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 bg-black/40 backdrop-blur-sm"
          onClick={onClose}
        />
        <motion.div 
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          className={`relative bg-card border border-border rounded-2xl shadow-2xl ${maxWidthClass} w-full max-h-[90vh] overflow-hidden`}
        >
          <div className="flex items-center justify-between p-6 border-b border-border">
            <h3 className="text-lg font-semibold">{title}</h3>
            <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>
          <div className="p-6 overflow-y-auto max-h-[60vh]">
            {children}
          </div>
          {footer && (
            <div className="flex items-center justify-end gap-3 p-6 border-t border-border bg-accent/30">
              {footer}
            </div>
          )}
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

// Toast Notification (simple implementation)
interface ToastProps {
  message: string;
  type?: 'success' | 'error' | 'info';
  show: boolean;
}

const Toast: React.FC<ToastProps> = ({ message, type = 'success', show }) => {
  if (!show) return null;
  
  const icons = {
    success: <CheckCircle2 className="w-5 h-5 text-emerald-600" />,
    error: <X className="w-5 h-5 text-red-600" />,
    info: <Sparkles className="w-5 h-5 text-blue-600" />
  };
  
  const colors = {
    success: 'bg-emerald-50 border-emerald-200 text-emerald-900',
    error: 'bg-red-50 border-red-200 text-red-900',
    info: 'bg-blue-50 border-blue-200 text-blue-900'
  };
  
  return (
    <motion.div 
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className={`fixed top-6 right-6 z-50 flex items-center gap-3 px-4 py-3 rounded-xl border shadow-lg ${colors[type]}`}
    >
      {icons[type]}
      <span className="text-sm font-medium">{message}</span>
    </motion.div>
  );
};

// Loading Skeleton
const Skeleton: React.FC<{ className?: string }> = ({ className = '' }) => {
  return (
    <div className={`animate-pulse bg-muted rounded-lg ${className}`} />
  );
};

// ============================================================================
// PANTALLA 1: LANDING PAGE
// ============================================================================

const LandingPage: React.FC<{ onNavigate: (screen: string) => void }> = ({ onNavigate }) => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-[#f8fafc] via-[#eff6ff] to-[#f0fdfa] dark:from-background dark:via-background dark:to-background/90 overflow-hidden relative">
      {/* Background Orbs */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden z-0 pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-gradient-to-br from-[#06b6d4]/20 to-[#1e3a8a]/20 blur-[120px] animate-pulse-slow" />
        <div className="absolute top-[40%] right-[-10%] w-[30%] h-[50%] rounded-full bg-gradient-to-br from-[#2BBDE8]/20 to-[#0B1F4B]/20 blur-[100px]" style={{ animation: 'pulse 8s infinite alternate' }} />
      </div>

      {/* Header */}
      <motion.header 
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.5 }}
        className="border-b border-white/40 dark:border-border/50 bg-white/60 dark:bg-card/80 backdrop-blur-xl sticky top-0 z-40 shadow-sm"
      >
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ConectiaLogo size="lg" className="!gap-2" />
          </div>
          <div className="flex items-center gap-3">
            <Button variant="liquid" size="md" onClick={() => onNavigate('login')} className="shadow-md shadow-[#06b6d4]/20 font-semibold px-6">
              Iniciar sesión
            </Button>
          </div>
        </div>
      </motion.header>

      {/* Hero Section */}
      <section className="max-w-7xl mx-auto px-6 py-24 relative z-10">
        <div className="grid lg:grid-cols-2 gap-16 items-center">
          <motion.div 
            initial={{ opacity: 0, x: -30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6 }}
            className="space-y-8"
          >
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/60 dark:bg-accent/40 backdrop-blur-md border border-white/60 dark:border-border shadow-sm">
              <Sparkles className="w-4 h-4 text-[#06b6d4]" />
              <span className="text-sm font-semibold bg-gradient-to-r from-[#1e3a8a] to-[#06b6d4] dark:from-[#60a5fa] dark:to-[#22d3ee] bg-clip-text text-transparent">Potenciado por Gemini IA</span>
            </div>
            <h1 className="text-5xl lg:text-6xl font-bold leading-tight tracking-tight text-foreground">
              Automatiza{' '}
              <span className="bg-gradient-to-r from-[#0B1F4B] to-[#2BBDE8] dark:from-[#60a5fa] dark:to-[#22d3ee] bg-clip-text text-transparent relative">
                LinkedIn
                <span className="absolute bottom-1 left-0 w-full h-2 bg-[#06b6d4]/20 rounded-full -z-10 blur-[2px]" />
              </span>{' '}
              con Inteligencia Artificial
            </h1>
            <p className="text-lg text-muted-foreground/90 leading-relaxed max-w-xl">
              Conect.ia automatiza publicaciones para tus redes en{' '}
              <strong className="text-foreground">LinkedIn</strong>: genera copy con IA, programa posts y publica de forma oficial vía Postiz y n8n.
            </p>
            <div className="flex flex-wrap items-center gap-4">
              <Button 
                variant="liquid" 
                size="lg" 
                icon={<PenSquare className="w-5 h-5" />}
                onClick={() => onNavigate('new-post')}
                className="shadow-lg shadow-[#06b6d4]/30 hover:shadow-[#06b6d4]/40"
              >
                Crear publicación
              </Button>
              <Button 
                variant="outline" 
                size="lg" 
                icon={<ArrowRight className="w-5 h-5" />} 
                onClick={() => onNavigate('login')}
                className="bg-white/50 backdrop-blur-md border-white/60 hover:bg-white/80 dark:bg-accent/50"
              >
                Ingresar al panel
              </Button>
            </div>
            <div className="flex items-center gap-6 pt-4">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-full bg-emerald-100 flex items-center justify-center">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                </div>
                <span className="text-sm font-medium text-foreground">Setup en 2 minutos</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-full bg-[#06b6d4]/10 flex items-center justify-center">
                  <CheckCircle2 className="w-4 h-4 text-[#06b6d4]" />
                </div>
                <span className="text-sm font-medium text-foreground">Aprobación inteligente</span>
              </div>
            </div>
          </motion.div>
          
          {/* Illustration */}
          <motion.div 
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="relative"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-[#06b6d4]/20 to-[#1e3a8a]/20 rounded-3xl blur-3xl transform rotate-3" />
            <div className="relative bg-white/60 dark:bg-card backdrop-blur-2xl border border-white/60 dark:border-border/50 rounded-3xl overflow-hidden shadow-[0_20px_60px_rgb(0,0,0,0.08)]">
              <div className="h-10 bg-white/40 dark:bg-accent/20 border-b border-white/40 flex items-center px-4 gap-2 backdrop-blur-md">
                <div className="w-3 h-3 rounded-full bg-red-400" />
                <div className="w-3 h-3 rounded-full bg-amber-400" />
                <div className="w-3 h-3 rounded-full bg-emerald-400" />
              </div>
              <div className="p-8 sm:p-12 space-y-8">
                <div className="flex items-center justify-center gap-4 sm:gap-8 relative z-10">
                  <motion.div animate={{ y: [0, -8, 0] }} transition={{ repeat: Infinity, duration: 4, ease: "easeInOut" }} className="w-20 h-20 bg-gradient-to-br from-[#1e3a8a] to-[#06b6d4] rounded-3xl flex items-center justify-center shadow-lg shadow-[#06b6d4]/30 rotate-3">
                    <Sparkles className="w-10 h-10 text-white" />
                  </motion.div>
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-muted-foreground/30" />
                    <div className="w-2 h-2 rounded-full bg-muted-foreground/50" />
                    <ArrowRight className="w-6 h-6 text-[#06b6d4]" />
                  </div>
                  <motion.div animate={{ y: [0, 8, 0] }} transition={{ repeat: Infinity, duration: 5, ease: "easeInOut" }} className="w-20 h-20 bg-[#0a66c2] rounded-3xl flex items-center justify-center shadow-lg shadow-[#0a66c2]/30 -rotate-3">
                    <Linkedin className="w-10 h-10 text-white" />
                  </motion.div>
                </div>
                <div className="bg-white/50 dark:bg-accent/30 p-6 rounded-2xl space-y-4 border border-white/50 shadow-inner backdrop-blur-sm">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#06b6d4]/20 to-[#1e3a8a]/20" />
                    <div className="space-y-2">
                      <div className="h-3 w-24 bg-muted/60 rounded-full" />
                      <div className="h-2 w-16 bg-muted/40 rounded-full" />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className="h-3 w-full bg-[#06b6d4]/10 rounded-full" />
                    <div className="h-3 w-[85%] bg-[#06b6d4]/10 rounded-full" />
                    <div className="h-3 w-[60%] bg-[#06b6d4]/10 rounded-full" />
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Features Section */}
      <section className="max-w-7xl mx-auto px-6 py-24 relative z-10">
        <div className="text-center mb-16">
          <h2 className="text-3xl lg:text-4xl font-bold mb-4 text-foreground">Todo lo que necesitas en una plataforma</h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">Potencia tu estrategia de contenido con tecnología de última generación</p>
        </div>
        <div className="grid md:grid-cols-3 gap-8">
          {[
            {
              title: 'Agente IA Gemini',
              icon: <Sparkles className="w-6 h-6 text-[#06b6d4]" />,
              desc: 'Genera contenido atractivo y profesional en segundos. Nuestro agente entiende tu marca y crea posts optimizados para cada red social.',
              features: ['Copy persuasivo y relevante', 'Imágenes generadas con IA', 'Hashtags inteligentes']
            },
            {
              title: 'Automatización n8n',
              icon: <Network className="w-6 h-6 text-[#1e3a8a]" />,
              desc: 'Conecta tu flujo con Docker local (gratis). Automatiza aprobaciones, notificaciones y publicación con tu JSON de workflow.',
              features: ['Workflows personalizables', 'Notificaciones Telegram', 'Integraciones ilimitadas']
            },
            {
              title: 'Publicación Oficial',
              icon: <Linkedin className="w-6 h-6 text-[#0a66c2]" />,
              desc: 'Publica directamente en LinkedIn con integración oficial vía Postiz. Sin límites, sin riesgos, 100% compatible con las APIs.',
              features: ['API oficial LinkedIn', 'Programación avanzada', 'Análisis de rendimiento']
            }
          ].map((feature, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: i * 0.1 }}
            >
              <div className="bg-white/60 dark:bg-card backdrop-blur-xl border border-white/60 dark:border-border rounded-3xl p-8 shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-2xl hover:shadow-[#06b6d4]/10 hover:-translate-y-2 transition-all duration-300 h-full">
                <div className="w-14 h-14 bg-white dark:bg-accent/50 rounded-2xl flex items-center justify-center mb-6 shadow-sm border border-white/50 dark:border-border">
                  {feature.icon}
                </div>
                <h3 className="text-xl font-bold mb-4">{feature.title}</h3>
                <p className="text-muted-foreground mb-6 leading-relaxed">
                  {feature.desc}
                </p>
                <ul className="space-y-3">
                  {feature.features.map((item, j) => (
                    <li key={j} className="flex items-center gap-3 text-sm font-medium text-foreground">
                      <div className="w-5 h-5 rounded-full bg-[#06b6d4]/10 flex items-center justify-center shrink-0">
                        <Check className="w-3 h-3 text-[#06b6d4]" />
                      </div>
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section className="max-w-7xl mx-auto px-6 py-12 relative z-10">
        <div className="bg-white/40 dark:bg-card/40 backdrop-blur-2xl border border-white/60 dark:border-border/50 rounded-[3rem] p-12 md:p-16 shadow-[0_8px_30px_rgb(0,0,0,0.04)] relative">
          <div className="text-center mb-16">
            <h2 className="text-3xl lg:text-4xl font-bold mb-4">Cómo funciona</h2>
            <p className="text-lg text-muted-foreground">De la idea a la publicación en 4 pasos simples</p>
          </div>
          <div className="grid md:grid-cols-4 gap-8 relative">
            {[
              { num: '1', icon: <PenSquare className="w-6 h-6 text-[#1e3a8a]" />, title: 'Escribe el tema', desc: 'Describe brevemente el tema' },
              { num: '2', icon: <Sparkles className="w-6 h-6 text-[#06b6d4]" />, title: 'IA genera contenido', desc: 'El agente crea el copy' },
              { num: '3', icon: <Eye className="w-6 h-6 text-[#1e3a8a]" />, title: 'Revisa y edita', desc: 'Ajusta en tiempo real' },
              { num: '4', icon: <Calendar className="w-6 h-6 text-[#06b6d4]" />, title: 'Programa publicación', desc: 'Selecciona fecha y hora' }
            ].map((step, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: i * 0.1 }}
                className="relative text-center"
              >
                <div className="w-20 h-20 mx-auto bg-white/80 dark:bg-card backdrop-blur-md rounded-3xl flex items-center justify-center border border-white/60 shadow-lg shadow-[#06b6d4]/5 mb-6 relative group hover:-translate-y-1 transition-transform">
                  <div className="absolute inset-0 bg-gradient-to-br from-[#1e3a8a]/5 to-[#06b6d4]/10 rounded-3xl opacity-0 group-hover:opacity-100 transition-opacity" />
                  <div className="absolute -top-3 -right-3 w-8 h-8 bg-gradient-to-br from-[#1e3a8a] to-[#06b6d4] text-white rounded-full flex items-center justify-center font-bold text-sm shadow-sm border-2 border-white dark:border-background">
                    {step.num}
                  </div>
                  {step.icon}
                </div>
                <h4 className="font-bold text-lg mb-2">{step.title}</h4>
                <p className="text-sm text-muted-foreground">{step.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/40 dark:border-border bg-white/40 dark:bg-card/50 backdrop-blur-md relative z-10">
        <div className="max-w-7xl mx-auto px-6 py-10">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <ConectiaLogo size="sm" textClassName="!text-foreground font-bold !bg-none" />
            </div>
            <div className="flex flex-col sm:flex-row items-center gap-2 sm:gap-6 text-sm text-muted-foreground font-medium">
              <a href="/privacidad" className="hover:text-[#06b6d4] transition-colors">
                Política de privacidad
              </a>
              <a href="/terminos" className="hover:text-[#06b6d4] transition-colors">
                Términos y condiciones
              </a>
              <span className="hidden sm:inline text-[#06b6d4]/30">•</span>
              <span>© 2026 Conect.ia</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

// ============================================================================
// PANTALLA 2: LOGIN + DASHBOARD SHELL (Sidebar + Topbar)
// ============================================================================

// Animated Search Bar with typing placeholder
const SEARCH_PLACEHOLDERS = [
  'Buscar publicaciones...',
  'Buscar borradores...',
  'Buscar canales...',
  'Buscar en el calendario...',
];

const SearchBarAnimated: React.FC<{
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}> = ({ value, onChange }) => {
  const [placeholderIndex, setPlaceholderIndex] = useState(0);
  const [displayedPlaceholder, setDisplayedPlaceholder] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    if (value) return; // Don't animate when there's real input
    const fullText = SEARCH_PLACEHOLDERS[placeholderIndex];
    let timeout: ReturnType<typeof setTimeout>;

    if (!isDeleting) {
      if (displayedPlaceholder.length < fullText.length) {
        timeout = setTimeout(() => {
          setDisplayedPlaceholder(fullText.slice(0, displayedPlaceholder.length + 1));
        }, 60);
      } else {
        timeout = setTimeout(() => setIsDeleting(true), 2000);
      }
    } else {
      if (displayedPlaceholder.length > 0) {
        timeout = setTimeout(() => {
          setDisplayedPlaceholder(displayedPlaceholder.slice(0, -1));
        }, 35);
      } else {
        setIsDeleting(false);
        setPlaceholderIndex((i) => (i + 1) % SEARCH_PLACEHOLDERS.length);
      }
    }
    return () => clearTimeout(timeout);
  }, [displayedPlaceholder, isDeleting, placeholderIndex, value]);

  return (
    <div className="relative group">
      <div className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground flex items-center justify-center [&>svg]:w-4 [&>svg]:h-4 transition-colors group-focus-within:text-[#06b6d4]">
        <Search />
      </div>
      <input
        type="text"
        placeholder={value ? '' : displayedPlaceholder}
        className="w-full px-4 py-2.5 pl-10 bg-white/50 dark:bg-accent/30 border border-white/40 dark:border-border/50 rounded-2xl text-sm transition-all duration-300
          focus:outline-none focus:ring-2 focus:ring-[#06b6d4]/30 focus:border-[#06b6d4]/40 focus:bg-white dark:focus:bg-card focus:shadow-lg focus:shadow-[#06b6d4]/5
          hover:bg-white/70 dark:hover:bg-accent/50 hover:shadow-sm cursor-text"
        value={value}
        onChange={onChange}
      />
    </div>
  );
};
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
  const searchResults = useCampusSearch(searchTerm);
  const initials = (profile?.nombre || user?.email || 'U').slice(0, 2).toUpperCase();
  const unreadCount = actividad.length;

  const menuItems = [
    { id: 'dashboard', icon: <Home className="w-5 h-5" />, label: 'Inicio' },
    { id: 'new-post', icon: <PenSquare className="w-5 h-5" />, label: 'Nueva publicación' },
    { id: 'manual-post', icon: <Upload className="w-5 h-5" />, label: 'Subir publicación' },
    { id: 'drafts', icon: <FileText className="w-5 h-5" />, label: 'Borradores' },
    { id: 'calendar', icon: <Calendar className="w-5 h-5" />, label: 'Calendario' },
    { id: 'agent', icon: <MessageSquare className="w-5 h-5" />, label: 'Asistente IA' },
    { id: 'channels', icon: <Share2 className="w-5 h-5" />, label: 'Canales' },
    { id: 'settings', icon: <Settings className="w-5 h-5" />, label: 'Ajustes' },
  ];

  return (
    <div className="flex h-screen bg-background overflow-hidden relative">
      {/* Drawer Menu */}
      <AnimatePresence>
        {isMenuOpen && (
          <>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/20 backdrop-blur-sm z-40"
              onClick={() => setIsMenuOpen(false)}
            />
            <motion.aside 
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="fixed top-0 left-0 bottom-0 w-72 bg-card/95 backdrop-blur-md z-50 flex flex-col shadow-2xl border-r border-border"
            >
              <div className="p-4 flex items-center justify-between border-b border-border">
                 <ConectiaLogo size="md" />
                 <button onClick={() => setIsMenuOpen(false)} className="p-2 hover:bg-accent rounded-xl text-muted-foreground transition-all cursor-pointer hover:rotate-90 duration-200">
                   <X className="w-5 h-5" />
                 </button>
              </div>
              <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
                {menuItems.map(item => (
                  <button
                    key={item.id}
                    onClick={() => { onNavigate(item.id); setIsMenuOpen(false); }}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-medium transition-all duration-200 cursor-pointer hover:translate-x-1
                      ${activeScreen === item.id 
                        ? 'liquid-button' 
                        : 'text-foreground hover:bg-accent'
                      }`}
                  >
                    {item.icon}
                    {item.label}
                  </button>
                ))}
              </nav>
              <div className="p-4 border-t border-border space-y-2">
                <div className="flex items-center gap-3 px-4 py-3 bg-accent/50 rounded-2xl">
                  <div className="w-10 h-10 bg-gradient-to-br from-[#1e3a8a] to-[#06b6d4] rounded-full flex items-center justify-center text-white font-semibold text-sm shadow-md">
                    {initials}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium truncate">{profile?.nombre || 'Usuario'}</div>
                    <div className="text-xs text-muted-foreground truncate">{profile?.email || user?.email}</div>
                  </div>
                </div>
                <button
                  onClick={onLogout}
                  className="w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-medium text-muted-foreground hover:bg-red-50 hover:text-red-600 transition-all duration-200 group cursor-pointer"
                >
                  <LogOut className="w-4 h-4 group-hover:translate-x-0.5 transition-transform duration-200" />
                  Cerrar sesión
                </button>
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden relative">
        {/* Topbar */}
        <header className="h-16 liquid-glass-header flex items-center justify-between px-4 sm:px-6 gap-3 z-30 shrink-0">
          <div className="flex items-center gap-3">
             {/* Hamburger with animation */}
             <motion.button
               onClick={() => setIsMenuOpen(true)}
               className="p-2 hover:bg-slate-100 dark:hover:bg-accent rounded-xl transition-colors text-foreground cursor-pointer"
               whileHover={{ scale: 1.05 }}
               whileTap={{ scale: 0.92 }}
               transition={{ type: 'spring', stiffness: 400, damping: 20 }}
             >
               <Menu className="w-6 h-6" />
             </motion.button>
             <div className="hidden sm:block">
               <ConectiaLogo size="sm" />
             </div>
          </div>
          
          <div className="flex-1 max-w-md relative hidden md:block">
            <SearchBarAnimated
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            {searchTerm.trim() && (
              <motion.div
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                className="absolute top-full left-0 right-0 mt-1 z-50 bg-card border rounded-2xl shadow-lg max-h-64 overflow-y-auto p-2"
              >
                {searchResults.publicaciones.length === 0 && searchResults.borradores.length === 0 && (
                  <p className="text-xs text-muted-foreground p-2">Sin resultados</p>
                )}
                {searchResults.publicaciones.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    className="w-full text-left p-2 rounded-lg hover:bg-accent text-sm cursor-pointer transition-colors"
                    onClick={() => { onNavigate('calendar'); setSearchTerm(''); }}
                  >
                    <span className="font-medium">{p.titulo}</span>
                    <span className="text-xs text-muted-foreground block">{p.estado}</span>
                  </button>
                ))}
                {searchResults.borradores.map((b) => (
                  <button
                    key={b.id}
                    type="button"
                    className="w-full text-left p-2 rounded-lg hover:bg-accent text-sm cursor-pointer transition-colors"
                    onClick={() => {
                      resumeBorradorAndNavigate(b, onNavigate);
                      setSearchTerm('');
                    }}
                  >
                    <span className="font-medium">{b.titulo || 'Borrador'}</span>
                  </button>
                ))}
              </motion.div>
            )}
          </div>
          <div className="flex items-center gap-2">
            {/* Theme toggle with animation */}
            <motion.button
              type="button"
              title={mode === 'dark' ? 'Modo claro' : 'Modo oscuro'}
              onClick={toggleTheme}
              className="p-2 hover:bg-slate-100 dark:hover:bg-accent rounded-xl transition-colors text-foreground cursor-pointer"
              whileHover={{ scale: 1.15 }}
              whileTap={{ scale: 0.85, rotate: 180 }}
              transition={{ type: 'spring', stiffness: 400, damping: 17 }}
            >
              <AnimatePresence mode="wait">
                {mode === 'dark' ? (
                  <motion.div
                    key="sun"
                    initial={{ rotate: -90, opacity: 0 }}
                    animate={{ rotate: 0, opacity: 1 }}
                    exit={{ rotate: 90, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                  >
                    <Sun className="w-5 h-5 text-amber-400" />
                  </motion.div>
                ) : (
                  <motion.div
                    key="moon"
                    initial={{ rotate: 90, opacity: 0 }}
                    animate={{ rotate: 0, opacity: 1 }}
                    exit={{ rotate: -90, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                  >
                    <Moon className="w-5 h-5 text-slate-500 dark:text-slate-400" />
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.button>

            {/* Notifications with animated dot */}
            <div className="relative">
              <motion.button
                type="button"
                className="relative p-2 hover:bg-slate-100 dark:hover:bg-accent rounded-xl transition-colors text-foreground cursor-pointer"
                onClick={() => setShowNotif((v) => !v)}
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                transition={{ type: 'spring', stiffness: 400, damping: 17 }}
              >
                <Bell className="w-5 h-5 text-muted-foreground" />
                {unreadCount > 0 && (
                  <motion.span
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="absolute top-1.5 right-1.5 w-2.5 h-2.5 bg-red-500 rounded-full ring-2 ring-white/80"
                  >
                    <span className="absolute inset-0 rounded-full bg-red-400 animate-ping opacity-75" />
                  </motion.span>
                )}
              </motion.button>
              <AnimatePresence>
                {showNotif && (
                  <motion.div
                    initial={{ opacity: 0, y: -8, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -8, scale: 0.95 }}
                    transition={{ type: 'spring', stiffness: 400, damping: 25 }}
                    className="absolute right-0 top-full mt-1 w-80 z-50 bg-card border rounded-2xl shadow-xl max-h-80 overflow-y-auto"
                  >
                    <p className="px-3 py-2 text-xs font-semibold border-b">Actividad reciente</p>
                    {actividad.length === 0 && (
                      <p className="p-3 text-xs text-muted-foreground">Sin notificaciones</p>
                    )}
                    {actividad.slice(0, 8).map((a) => (
                      <div key={a.id} className="px-3 py-2 border-b last:border-0 text-sm">
                        <p className="font-medium">{a.mensaje}</p>
                        <p className="text-xs text-muted-foreground">{formatRelative(toDate(a.creadoEn))}</p>
                      </div>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Profile avatar with ring animation */}
            <motion.button
              type="button"
              onClick={() => setShowProfile((v) => !v)}
              className="relative w-10 h-10 rounded-full cursor-pointer group"
              whileHover={{ scale: 1.08 }}
              whileTap={{ scale: 0.92 }}
              transition={{ type: 'spring', stiffness: 400, damping: 20 }}
            >
              <div className="absolute inset-0 rounded-full border-2 border-transparent group-hover:border-[#06b6d4]/50 transition-all duration-300 group-hover:scale-110" />
              <div className="w-full h-full bg-gradient-to-br from-[#1e3a8a] to-[#06b6d4] rounded-full flex items-center justify-center text-white font-semibold text-sm shadow-md">
                {initials}
              </div>
            </motion.button>
          </div>
        </header>

        {/* Profile popup with entry/exit animations */}
        <AnimatePresence>
          {showProfile && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              className="fixed inset-0 z-50 flex items-start justify-end p-4 pt-20"
              onClick={() => setShowProfile(false)}
            >
              <motion.div
                initial={{ opacity: 0, y: -12, scale: 0.9 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -12, scale: 0.9 }}
                transition={{ type: 'spring', stiffness: 400, damping: 25 }}
                className="bg-card border rounded-2xl shadow-xl p-6 w-72"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex flex-col items-center text-center gap-3">
                  <div className="w-16 h-16 bg-gradient-to-br from-[#1e3a8a] to-[#06b6d4] rounded-full flex items-center justify-center text-white text-xl font-bold shadow-lg">
                    {initials}
                  </div>
                  <div>
                    <p className="font-semibold">{profile?.nombre || 'Usuario'}</p>
                    <p className="text-sm text-muted-foreground">{profile?.email || user?.email}</p>
                  </div>
                  <Button variant="outline" size="sm" onClick={() => { setShowProfile(false); onNavigate('settings'); }}>
                    Ajustes
                  </Button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Content Area */}
        <main className="flex-1 overflow-y-auto">
          {children}
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
    <div>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
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
              onClick={() => toggle(red.id)}
              title={title}
              className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border text-left transition-all duration-200 text-sm
                ${selected ? 'border-[#06b6d4] bg-[#06b6d4]/10 shadow-sm' : 'border-border/60 bg-white/40 dark:bg-accent/30 hover:border-[#06b6d4]/40'}
                ${bloqueada ? 'opacity-45 cursor-not-allowed' : 'cursor-pointer'}`}
            >
              {redIcono(red.id, 'w-4 h-4')}
              <span className="flex-1 truncate font-medium">{red.nombre}</span>
              <span
                className={`w-3.5 h-3.5 rounded border flex items-center justify-center shrink-0 ${
                  selected ? 'bg-[#06b6d4] border-[#06b6d4]' : 'border-muted-foreground/40'
                }`}
              >
                {selected && <Check className="w-2.5 h-2.5 text-white" />}
              </span>
            </button>
          );
        })}
      </div>
      <p className="text-xs text-muted-foreground mt-2 flex items-center gap-1.5">
        <Info className="w-3.5 h-3.5 shrink-0" />
        Solo se muestran activos los canales conectados. Gestiona conexiones en
        <span className="font-medium text-foreground">Canales</span>.
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

  return (
    <div className="h-full">
      <Toast message={toastMsg || '¡Publicación programada!'} type="success" show={showToast} />
      
      <div className="max-w-[1400px] mx-auto p-4 sm:p-6 lg:p-8 h-full">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="mb-6"
        >
          <h1 className="text-2xl font-bold bg-gradient-to-r from-[#0B1F4B] to-[#2BBDE8] dark:from-[#60a5fa] dark:to-[#22d3ee] bg-clip-text text-transparent">Nueva publicación</h1>
          <p className="text-sm text-muted-foreground mt-1">Crea contenido atractivo con ayuda de IA</p>
          <AnimatePresence>
            {errorMsg && (
              <motion.p
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                className="mt-3 text-sm text-red-600 bg-red-50 border border-red-200 rounded-2xl px-4 py-2.5"
              >
                {errorMsg}
              </motion.p>
            )}
            {makeWarning && (
              <motion.p
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                className="mt-3 text-sm text-amber-800 bg-amber-50 border border-amber-200 rounded-2xl px-4 py-2.5"
              >
                {makeWarning} Puedes vaciar la URL de Make en Ajustes si no lo usas.
              </motion.p>
            )}
          </AnimatePresence>
        </motion.div>

        <div className="grid lg:grid-cols-2 gap-6 h-[calc(100%-8rem)]">
          {/* Left Panel - Form */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.4, delay: 0.1 }}
            className="bg-white/60 dark:bg-card backdrop-blur-xl border border-white/40 dark:border-border rounded-3xl p-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)] overflow-y-auto"
          >
            <div className="space-y-5">
              {/* Topic */}
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-foreground flex items-center gap-2">
                  <PenSquare className="w-4 h-4 text-[#06b6d4]" />
                  Tema del post
                </label>
                <textarea
                  placeholder="Ej: Lanzamiento nuevo bootcamp de desarrollo web en Bucaramanga"
                  rows={3}
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                  className="w-full px-4 py-3 bg-white/50 dark:bg-input-background border border-white/40 dark:border-input rounded-2xl text-sm transition-all duration-300 resize-none
                    focus:outline-none focus:ring-2 focus:ring-[#06b6d4]/30 focus:border-[#06b6d4]/40 focus:bg-white dark:focus:bg-input-background focus:shadow-lg focus:shadow-[#06b6d4]/5
                    hover:bg-white/70 dark:hover:bg-input-background/80"
                />
              </div>

              {/* Tone */}
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-foreground flex items-center gap-2">
                  <MessageSquare className="w-4 h-4 text-[#06b6d4]" />
                  Tono de voz
                </label>
                <select
                  value={tone}
                  onChange={(e) => setTone(e.target.value)}
                  className="w-full px-4 py-3 bg-white/50 dark:bg-input-background border border-white/40 dark:border-input rounded-2xl text-sm transition-all duration-300 appearance-none cursor-pointer
                    focus:outline-none focus:ring-2 focus:ring-[#06b6d4]/30 focus:border-[#06b6d4]/40 focus:bg-white dark:focus:bg-input-background
                    hover:bg-white/70 dark:hover:bg-input-background/80"
                >
                  <option value="profesional">Profesional</option>
                  <option value="educativo">Educativo</option>
                  <option value="promocional">Promocional</option>
                </select>
              </div>

              {/* Publicar en */}
              <div className="space-y-3 bg-gradient-to-r from-[#1e3a8a]/5 to-[#06b6d4]/5 border border-[#06b6d4]/15 p-4 rounded-2xl">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-[#06b6d4]/10 rounded-xl flex items-center justify-center">
                    <Share2 className="w-5 h-5 text-[#06b6d4]" />
                  </div>
                  <div>
                    <p className="text-sm font-medium">Redes de publicación</p>
                    <p className="text-xs text-muted-foreground">
                      Elige dónde publicar esta publicación (puedes elegir varias)
                    </p>
                  </div>
                </div>
                <RedSelector value={selectedRedes} onChange={setSelectedRedes} canales={canales} />
              </div>

              {/* Image toggle */}
              <div className="space-y-3 bg-white/40 dark:bg-accent/30 backdrop-blur-sm p-4 rounded-2xl border border-white/30 dark:border-border">
                <Toggle
                  label="Generar imagen con IA"
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
                  label="Generar video con IA (TikTok)"
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
                {generarVideo && (
                  <p className="text-xs text-cyan-700 dark:text-cyan-300 bg-cyan-50 dark:bg-cyan-950/40 border border-cyan-200 dark:border-cyan-800 rounded-2xl px-3 py-2">
                    Se genera un video vertical (9:16) con IA al crear la publicación. Requiere
                    POLLINATIONS_API_KEY en las variables de entorno de Vercel (gratis en enter.pollinations.ai/keys).
                  </p>
                )}
                <AnimatePresence>
                  {!generateImage && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      transition={{ duration: 0.3 }}
                      className="space-y-3 pt-2 border-t border-border/50 overflow-hidden"
                    >
                      <p className="text-sm font-medium">Subir foto o archivo</p>
                      <div
                        onDragOver={(e) => {
                          e.preventDefault();
                          setIsDraggingMedia(true);
                        }}
                        onDragLeave={() => setIsDraggingMedia(false)}
                        onDrop={(e) => {
                          e.preventDefault();
                          setIsDraggingMedia(false);
                          if (e.dataTransfer.files?.length) {
                            addManualFiles(Array.from(e.dataTransfer.files));
                          }
                        }}
                        onClick={() => newPostFileRef.current?.click()}
                        className={`border-2 border-dashed rounded-2xl p-6 flex flex-col items-center gap-2 cursor-pointer transition-all duration-300
                          ${isDraggingMedia ? 'border-[#06b6d4] bg-[#06b6d4]/5 scale-[1.02]' : 'border-border/50 hover:border-[#06b6d4]/40 hover:bg-[#06b6d4]/5'}`}
                      >
                        <FileUp className="w-6 h-6 text-muted-foreground" />
                        <p className="text-xs text-center text-muted-foreground">
                          Arrastra imágenes o haz clic (PNG, JPG, GIF, MP4)
                        </p>
                        <input
                          ref={newPostFileRef}
                          type="file"
                          accept="image/*,video/*"
                          multiple
                          className="hidden"
                          onChange={(e) =>
                            e.target.files && addManualFiles(Array.from(e.target.files))
                          }
                        />
                      </div>
                      {manualUploads.length > 0 && (
                        <div className="grid grid-cols-3 gap-2">
                          {manualUploads.map((f, i) => (
                            <motion.div
                              key={i}
                              initial={{ opacity: 0, scale: 0.8 }}
                              animate={{ opacity: 1, scale: 1 }}
                              className="relative aspect-square rounded-xl overflow-hidden bg-accent"
                            >
                              {f.preview ? (
                                f.type === 'video' ? (
                                  <video src={f.preview} muted playsInline className="w-full h-full object-cover" />
                                ) : (
                                  <img
                                    src={f.preview}
                                    alt={f.name}
                                    className="w-full h-full object-cover"
                                  />
                                )
                              ) : (
                                <div className="w-full h-full flex items-center justify-center">
                                  <Video className="w-6 h-6 text-muted-foreground" />
                                </div>
                              )}
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  removeManualFile(i);
                                }}
                                className="absolute top-1 right-1 w-6 h-6 bg-black/60 rounded-full flex items-center justify-center cursor-pointer hover:bg-black/80 transition-colors"
                              >
                                <X className="w-3 h-3 text-white" />
                              </button>
                            </motion.div>
                          ))}
                        </div>
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Actions */}
              <div className="flex gap-3 pt-2">
                <motion.div className="flex-1" whileTap={{ scale: 0.98 }}>
                  <Button 
                    variant="liquid" 
                    className="w-full"
                    icon={isGenerating ? <Loader2 className="animate-spin" /> : <Sparkles />}
                    onClick={handleGenerate}
                    disabled={!topic || isGenerating}
                  >
                    {isGenerating ? 'Generando...' : 'Generar con IA'}
                  </Button>
                </motion.div>
                <Button variant="ghost" onClick={() => {
                  setTopic('');
                  setGeneratedText('');
                  setImagenUrl('');
                  setManualUploads([]);
                  setHasContent(false);
                  setEditingBorradorId(null);
                }}>
                  Limpiar
                </Button>
              </div>
            </div>
          </motion.div>

          {/* Right Panel - Preview */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.4, delay: 0.2 }}
            className="bg-white/60 dark:bg-card backdrop-blur-xl border border-white/40 dark:border-border rounded-3xl p-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)]"
          >
            <div className="space-y-4 h-full flex flex-col">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold flex items-center gap-2">
                  <Eye className="w-4 h-4 text-[#06b6d4]" />
                  Vista previa
                </h3>
                <span className="inline-flex items-center px-2.5 py-1 rounded-xl text-xs font-medium bg-[#0a66c2]/10 text-[#0a66c2]">
                  LinkedIn
                </span>
              </div>

              {/* Preview content */}
              <div className="flex-1 overflow-y-auto">
                {!showPreview && (
                  <div className="h-full flex items-center justify-center text-center p-8">
                    <motion.div
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ duration: 0.5 }}
                      className="space-y-4"
                    >
                      <div className="w-20 h-20 bg-gradient-to-br from-[#1e3a8a]/10 to-[#06b6d4]/10 rounded-3xl flex items-center justify-center mx-auto">
                        <Eye className="w-10 h-10 text-[#06b6d4]/60" />
                      </div>
                      <p className="text-sm text-muted-foreground max-w-[200px]">
                        Escribe un tema y genera contenido para ver la vista previa
                      </p>
                    </motion.div>
                  </div>
                )}

                {isGenerating && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="space-y-4"
                  >
                    <div className="flex items-center gap-3">
                      <Skeleton className="w-12 h-12 rounded-full" />
                      <div className="flex-1 space-y-2">
                        <Skeleton className="h-4 w-32" />
                        <Skeleton className="h-3 w-24" />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Skeleton className="h-4 w-full" />
                      <Skeleton className="h-4 w-full" />
                      <Skeleton className="h-4 w-3/4" />
                    </div>
                    <Skeleton className="h-48 w-full rounded-2xl" />
                  </motion.div>
                )}

                {showPreview && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.4 }}
                    className="space-y-4"
                  >
                    {videoUrl || manualUploads[0]?.type === 'video' ? (
                      <div className="rounded-2xl overflow-hidden border border-white/40 dark:border-border bg-black/5 dark:bg-black/20">
                        <video
                          src={videoUrl || (previewImageUrl ?? undefined)}
                          controls
                          playsInline
                          className="w-full max-h-[480px] object-contain"
                        />
                        <p className="text-xs text-center text-muted-foreground px-3 py-2">
                          {videoUrl
                            ? 'Video generado con IA · vertical 9:16 · listo para TikTok'
                            : 'Video subido · listo para publicar en TikTok'}
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
                    {generateImage && imagenNota && (
                      <p className="text-xs text-amber-800 dark:text-amber-200 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 rounded-2xl px-3 py-2">
                        {imagenNota}
                      </p>
                    )}
                  </motion.div>
                )}
              </div>
            </div>
          </motion.div>
        </div>

        {/* Sticky Bottom Bar */}
        <AnimatePresence>
          {hasContent && (
            <motion.div
              initial={{ y: 80, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 80, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 300, damping: 25 }}
              className="fixed bottom-0 left-0 right-0 z-30"
            >
              <div className="liquid-glass-header border-t border-white/30 p-4">
                <div className="max-w-[1400px] mx-auto flex flex-wrap items-center justify-between gap-4">
                  <div className="flex flex-wrap items-center gap-3">
                    <select
                      value={scheduleMode}
                      onChange={(e) => setScheduleMode(e.target.value as 'now' | 'schedule')}
                      className="px-3 py-2.5 bg-white/50 dark:bg-input-background border border-white/40 dark:border-input rounded-2xl text-sm cursor-pointer transition-all hover:bg-white/70 dark:hover:bg-input-background/80 focus:ring-2 focus:ring-[#06b6d4]/30 focus:outline-none"
                    >
                      <option value="now">Publicar ahora</option>
                      <option value="schedule">Programar</option>
                    </select>
                    <AnimatePresence>
                      {scheduleMode === 'schedule' && (
                        <motion.div
                          initial={{ opacity: 0, width: 0 }}
                          animate={{ opacity: 1, width: 'auto' }}
                          exit={{ opacity: 0, width: 0 }}
                          className="flex items-center gap-2 overflow-hidden"
                        >
                          <input type="date" value={scheduledDate} onChange={(e) => setScheduledDate(e.target.value)} className="px-3 py-2.5 bg-white/50 dark:bg-input-background border border-white/40 dark:border-input rounded-2xl text-sm w-40 focus:ring-2 focus:ring-[#06b6d4]/30 focus:outline-none" />
                          <input type="time" value={scheduledTime} onChange={(e) => setScheduledTime(e.target.value)} className="px-3 py-2.5 bg-white/50 dark:bg-input-background border border-white/40 dark:border-input rounded-2xl text-sm w-32 focus:ring-2 focus:ring-[#06b6d4]/30 focus:outline-none" />
                          <select value={timezone} onChange={(e) => setTimezone(e.target.value)} className="px-3 py-2.5 bg-white/50 dark:bg-input-background border border-white/40 dark:border-input rounded-2xl text-sm cursor-pointer focus:ring-2 focus:ring-[#06b6d4]/30 focus:outline-none">
                            <option value="America/Bogota">Colombia</option>
                            <option value="America/Mexico_City">México</option>
                            <option value="UTC">UTC</option>
                          </select>
                          <select value={repeatMode} onChange={(e) => setRepeatMode(e.target.value)} className="px-3 py-2.5 bg-white/50 dark:bg-input-background border border-white/40 dark:border-input rounded-2xl text-sm cursor-pointer focus:ring-2 focus:ring-[#06b6d4]/30 focus:outline-none" title="Repetir la misma publicación">
                            <option value="none">Sin repetir</option>
                            <option value="daily">Diario</option>
                            <option value="weekly">Semanal</option>
                          </select>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                  <div className="flex items-center gap-3">
                    <Button variant="outline" icon={<Save />} onClick={handleSaveBorrador}>
                      Guardar borrador
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
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
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

  return (
    <div className="h-full overflow-y-auto">
      <Toast message={toastMsg} type="success" show={showToast} />

      <div className="max-w-[1400px] mx-auto p-4 sm:p-6 lg:p-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="mb-6 flex flex-col sm:flex-row sm:items-start justify-between gap-4"
        >
          <div>
            <h1 className="text-2xl font-bold bg-gradient-to-r from-[#0B1F4B] to-[#2BBDE8] dark:from-[#60a5fa] dark:to-[#22d3ee] bg-clip-text text-transparent mb-1">Subir publicación</h1>
            <p className="text-muted-foreground text-sm">Crea y programa contenido manualmente sin IA</p>
          </div>
          <div className="flex items-center gap-2 text-xs text-amber-800 dark:text-amber-200 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 rounded-2xl px-4 py-2.5">
            <Info className="w-4 h-4 text-amber-500 shrink-0" />
            <span>Las publicaciones programadas se envían via <strong>n8n + Postiz</strong></span>
          </div>
        </motion.div>

        <div className="grid lg:grid-cols-[1fr_380px] gap-6">
          {/* LEFT COLUMN */}
          <div className="space-y-6">

            {/* Content editor */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.4, delay: 0.1 }}
              className="bg-white/60 dark:bg-card backdrop-blur-xl border border-white/40 dark:border-border rounded-3xl p-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)]"
            >
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold flex items-center gap-2">
                    <PenSquare className="w-4 h-4 text-[#06b6d4]" />
                    Contenido del post
                  </h3>
                  <span className={`text-xs font-medium px-2 py-1 rounded-lg ${postText.length > 3000 ? 'bg-red-100 text-red-600' : 'bg-accent text-muted-foreground'}`}>
                    {postText.length} / 3000
                  </span>
                </div>
                <textarea
                  placeholder="Escribe aquí el contenido de tu publicación..."
                  value={postText}
                  onChange={e => setPostText(e.target.value)}
                  rows={8}
                  className="w-full px-4 py-3 bg-white/50 dark:bg-input-background border border-white/40 dark:border-input rounded-2xl text-sm transition-all duration-300 resize-none
                    focus:outline-none focus:ring-2 focus:ring-[#06b6d4]/30 focus:border-[#06b6d4]/40 focus:bg-white dark:focus:bg-input-background focus:shadow-lg focus:shadow-[#06b6d4]/5
                    hover:bg-white/70 dark:hover:bg-input-background/80 leading-relaxed placeholder:text-muted-foreground/70"
                />
                <div className="flex items-center gap-2 flex-wrap">
                  {['😊', '🚀', '✅', '💡', '🎯', '🔥', '📌', '💬'].map(e => (
                    <motion.button key={e} onClick={() => setPostText(p => p + e)} whileHover={{ scale: 1.15 }} whileTap={{ scale: 0.9 }}
                      className="w-9 h-9 text-lg hover:bg-white/60 dark:hover:bg-accent rounded-xl transition-colors cursor-pointer shadow-sm border border-transparent hover:border-border/50 flex items-center justify-center">
                      {e}
                    </motion.button>
                  ))}
                  <span className="text-xs text-muted-foreground ml-2">Emojis rápidos</span>
                </div>
              </div>
            </motion.div>

            {/* Media Upload */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.4, delay: 0.15 }}
              className="bg-white/60 dark:bg-card backdrop-blur-xl border border-white/40 dark:border-border rounded-3xl p-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)]"
            >
              <div className="space-y-4">
                <h3 className="font-semibold flex items-center gap-2">
                  <Image className="w-4 h-4 text-[#06b6d4]" />
                  Medios adjuntos
                </h3>

                {/* Drop zone */}
                <div
                  onDragOver={e => { e.preventDefault(); setIsDragging(true); }}
                  onDragLeave={() => setIsDragging(false)}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                  className={`border-2 border-dashed rounded-2xl p-8 flex flex-col items-center justify-center gap-3 cursor-pointer transition-all duration-300
                    ${isDragging ? 'border-[#06b6d4] bg-[#06b6d4]/5 scale-[1.02]' : 'border-border/50 hover:border-[#06b6d4]/40 hover:bg-[#06b6d4]/5'}`}
                >
                  <div className={`w-14 h-14 rounded-full flex items-center justify-center transition-all duration-300 ${isDragging ? 'bg-gradient-to-br from-[#1e3a8a] to-[#06b6d4] shadow-lg shadow-[#06b6d4]/20' : 'bg-accent'}`}>
                    <FileUp className={`w-6 h-6 ${isDragging ? 'text-white' : 'text-muted-foreground'}`} />
                  </div>
                  <div className="text-center">
                    <p className="text-sm font-medium">Arrastra archivos aquí o <span className="text-[#06b6d4]">haz clic para seleccionar</span></p>
                    <p className="text-xs text-muted-foreground mt-1">PNG, JPG, GIF, MP4 — máx. 10 MB por archivo</p>
                  </div>
                  <div className="flex gap-3 mt-1">
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground bg-white/50 dark:bg-accent border border-white/40 dark:border-border px-3 py-1.5 rounded-xl shadow-sm">
                      <Image className="w-3.5 h-3.5 text-[#06b6d4]" />Imagen
                    </div>
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground bg-white/50 dark:bg-accent border border-white/40 dark:border-border px-3 py-1.5 rounded-xl shadow-sm">
                      <Video className="w-3.5 h-3.5 text-[#06b6d4]" />Video
                    </div>
                  </div>
                  <input ref={fileInputRef} type="file" multiple accept="image/*,video/*" className="hidden"
                    onChange={e => e.target.files && handleFiles(Array.from(e.target.files))} />
                </div>

                {/* Uploaded files */}
                {uploadedFiles.length > 0 && (
                  <div className="grid grid-cols-3 gap-3">
                    <AnimatePresence>
                      {uploadedFiles.map((f, i) => (
                        <motion.div key={i} initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.8 }}
                          className="relative group rounded-2xl overflow-hidden bg-accent aspect-square shadow-sm border border-border/50">
                          {f.preview ? (
                            f.type === 'video' ? (
                              <video src={f.preview} muted playsInline className="w-full h-full object-cover" />
                            ) : (
                              <img src={f.preview} alt={f.name} className="w-full h-full object-cover" />
                            )
                          ) : (
                            <div className="w-full h-full flex flex-col items-center justify-center gap-2">
                              <Video className="w-8 h-8 text-muted-foreground" />
                              <span className="text-xs text-muted-foreground truncate px-2 text-center">{f.name}</span>
                            </div>
                          )}
                          <button onClick={() => removeFile(i)}
                            className="absolute top-2 right-2 w-7 h-7 bg-black/60 backdrop-blur-sm rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300 hover:bg-red-500/80 hover:scale-110 cursor-pointer">
                            <X className="w-3.5 h-3.5 text-white" />
                          </button>
                          <div className="absolute bottom-0 left-0 right-0 bg-black/60 backdrop-blur-sm text-white text-xs p-2 truncate opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                            {f.name}
                          </div>
                        </motion.div>
                      ))}
                    </AnimatePresence>
                    <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} onClick={() => fileInputRef.current?.click()}
                      className="aspect-square border-2 border-dashed border-border/50 rounded-2xl flex flex-col items-center justify-center gap-2 hover:border-[#06b6d4]/40 hover:bg-[#06b6d4]/5 transition-all cursor-pointer">
                      <Plus className="w-6 h-6 text-muted-foreground" />
                      <span className="text-xs text-muted-foreground">Añadir más</span>
                    </motion.button>
                  </div>
                )}
              </div>
            </motion.div>
          </div>

          {/* RIGHT COLUMN — Scheduling & Actions */}
          <div className="space-y-6">

            {/* Destinos */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.4, delay: 0.2 }}
              className="bg-white/60 dark:bg-card backdrop-blur-xl border border-white/40 dark:border-border rounded-3xl p-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)]"
            >
              <div className="flex items-center gap-4 mb-4">
                <div className="w-12 h-12 bg-[#06b6d4]/10 rounded-2xl flex items-center justify-center shrink-0">
                  <Share2 className="w-6 h-6 text-[#06b6d4]" />
                </div>
                <div>
                  <h3 className="font-semibold">Redes de publicación</h3>
                  <p className="text-xs text-muted-foreground mt-0.5">Elige dónde publicar (puede ser más de una)</p>
                </div>
              </div>
              <RedSelector value={redesDestino} onChange={setRedesDestino} canales={canales} />
            </motion.div>

            {/* Scheduling card */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.4, delay: 0.25 }}
              className="bg-white/60 dark:bg-card backdrop-blur-xl border border-white/40 dark:border-border rounded-3xl p-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)]"
            >
              <div className="space-y-5">
                <div className="flex items-center gap-2">
                  <CalendarClock className="w-5 h-5 text-[#06b6d4]" />
                  <h3 className="font-semibold">Programación</h3>
                </div>

                {/* Mode toggle */}
                <div className="grid grid-cols-2 gap-2 p-1.5 bg-white/50 dark:bg-accent/50 border border-white/40 dark:border-border rounded-2xl backdrop-blur-sm">
                  {([['now', 'Publicar ahora'], ['schedule', 'Programar']] as const).map(([mode, label]) => (
                    <button key={mode} onClick={() => setScheduleMode(mode)}
                      className={`py-2 rounded-xl text-sm font-medium transition-all duration-300 cursor-pointer
                        ${scheduleMode === mode
                          ? 'bg-white shadow-md text-foreground'
                          : 'text-muted-foreground hover:text-foreground hover:bg-white/40'}`}>
                      {label}
                    </button>
                  ))}
                </div>

                <AnimatePresence mode="wait">
                  {scheduleMode === 'now' && (
                    <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
                      className="overflow-hidden">
                      <div className="flex items-center gap-4 p-4 bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-emerald-950/30 dark:to-teal-950/30 border border-emerald-200 dark:border-emerald-800/50 rounded-2xl">
                        <div className="w-10 h-10 bg-emerald-500 rounded-xl flex items-center justify-center shrink-0 shadow-sm">
                          <Send className="w-5 h-5 text-white" />
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-emerald-800 dark:text-emerald-400">Publicación inmediata</p>
                          <p className="text-xs text-emerald-600 dark:text-emerald-500 mt-0.5">Se enviará a LinkedIn ahora mismo</p>
                        </div>
                      </div>
                    </motion.div>
                  )}

                  {scheduleMode === 'schedule' && (
                    <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
                      className="space-y-4 overflow-hidden">
                      <div className="space-y-1.5">
                        <label className="text-sm font-medium text-foreground">Fecha</label>
                        <input type="date" min={today} value={scheduledDate} onChange={e => setScheduledDate(e.target.value)}
                          className="w-full px-4 py-2.5 bg-white/50 dark:bg-input-background border border-white/40 dark:border-input rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#06b6d4]/30 focus:border-[#06b6d4]/40 hover:bg-white/70 transition-all cursor-pointer" />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-sm font-medium text-foreground">Hora</label>
                        <input type="time" value={scheduledTime} onChange={e => setScheduledTime(e.target.value)}
                          className="w-full px-4 py-2.5 bg-white/50 dark:bg-input-background border border-white/40 dark:border-input rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#06b6d4]/30 focus:border-[#06b6d4]/40 hover:bg-white/70 transition-all cursor-pointer" />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-sm font-medium text-foreground flex items-center gap-1.5">
                          <Globe className="w-4 h-4 text-muted-foreground" />Zona horaria
                        </label>
                        <select value={timezone} onChange={e => setTimezone(e.target.value)}
                          className="w-full px-4 py-2.5 bg-white/50 dark:bg-input-background border border-white/40 dark:border-input rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#06b6d4]/30 focus:border-[#06b6d4]/40 hover:bg-white/70 transition-all cursor-pointer">
                          <option value="America/Bogota">Colombia (UTC-5)</option>
                          <option value="America/Mexico_City">México (UTC-6)</option>
                          <option value="America/Lima">Perú (UTC-5)</option>
                          <option value="America/Argentina/Buenos_Aires">Argentina (UTC-3)</option>
                          <option value="Europe/Madrid">España (UTC+1)</option>
                          <option value="UTC">UTC</option>
                        </select>
                      </div>

                      {/* Repeat */}
                      <div className="space-y-1.5">
                        <label className="text-sm font-medium text-foreground flex items-center gap-1.5">
                          <AlarmClock className="w-4 h-4 text-muted-foreground" />Repetir
                        </label>
                        <select value={repeatMode} onChange={e => setRepeatMode(e.target.value)}
                          className="w-full px-4 py-2.5 bg-white/50 dark:bg-input-background border border-white/40 dark:border-input rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#06b6d4]/30 focus:border-[#06b6d4]/40 hover:bg-white/70 transition-all cursor-pointer">
                          <option value="none">Sin repetición</option>
                          <option value="daily">Diario</option>
                          <option value="weekly">Semanal</option>
                          <option value="biweekly">Cada 2 semanas</option>
                          <option value="monthly">Mensual</option>
                        </select>
                      </div>

                      <AnimatePresence>
                        {scheduledDate && scheduledTime && (
                          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
                            className="p-4 bg-gradient-to-r from-[#1e3a8a]/5 to-[#06b6d4]/5 border border-[#06b6d4]/20 rounded-2xl">
                            <p className="text-xs font-medium text-[#1e3a8a] dark:text-[#06b6d4] flex items-center gap-1.5">
                              <CalendarClock className="w-4 h-4" />Programado para
                            </p>
                            <p className="text-sm font-semibold text-foreground mt-1.5">
                              {new Date(`${scheduledDate}T${scheduledTime}`).toLocaleString('es-CO', {
                                weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
                                hour: '2-digit', minute: '2-digit'
                              })}
                            </p>
                            <p className="text-xs text-muted-foreground mt-0.5">{timezone.replace('_', ' ')}</p>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </motion.div>

            {/* Preview mini */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.4, delay: 0.3 }}
              className="bg-white/60 dark:bg-card backdrop-blur-xl border border-white/40 dark:border-border rounded-3xl p-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)]"
            >
              <div className="space-y-4">
                <h3 className="font-semibold flex items-center gap-2 text-sm">
                  <Eye className="w-4 h-4 text-[#06b6d4]" />
                  Vista previa
                </h3>
                <div className="max-h-[300px] overflow-y-auto rounded-2xl bg-white/50 dark:bg-black/20 backdrop-blur-sm">
                  {uploadedFiles[0]?.type === 'video' && uploadedFiles[0]?.preview ? (
                    <div className="rounded-2xl overflow-hidden border border-white/40 dark:border-border bg-black/5 dark:bg-black/20">
                      <video
                        src={uploadedFiles[0].preview}
                        controls
                        playsInline
                        className="w-full max-h-[260px] object-contain"
                      />
                      <p className="text-xs text-center text-muted-foreground px-3 py-2">
                        Video subido · listo para publicar en TikTok
                      </p>
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
                  )}
                </div>
              </div>
            </motion.div>

            {/* Action buttons */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.35 }}
              className="space-y-3"
            >
              <Button variant="liquid" className="w-full" size="lg"
                icon={saving ? <Loader2 className="animate-spin" /> : scheduleMode === 'now' ? <Send /> : <CalendarClock />}
                onClick={handleSchedule}
                disabled={saving || !postText.trim()}>
                {saving ? 'Guardando…' : scheduleMode === 'now' ? 'Publicar ahora' : 'Programar publicación'}
              </Button>
              <Button variant="outline" className="w-full bg-white/60 dark:bg-card backdrop-blur-xl border-white/40 dark:border-border shadow-sm hover:bg-white/80" icon={<Save />}
                onClick={async () => {
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
                }}
                disabled={!postText.trim()}>
                Guardar como borrador
              </Button>
            </motion.div>

            {/* Pipeline info */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.4, delay: 0.4 }}
              className="p-5 bg-white/40 dark:bg-accent/30 backdrop-blur-xl border border-white/30 dark:border-border/50 rounded-3xl space-y-3"
            >
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest flex items-center gap-2">
                <Activity className="w-3.5 h-3.5" />
                Pipeline de publicación
              </p>
              <div className="space-y-2.5">
                {[
                  { icon: <Save className="w-4 h-4" />, label: 'Conect.ia', desc: 'Almacena y programa' },
                  { icon: <ChevronRight className="w-4 h-4" />, label: 'n8n', desc: 'Automatiza el flujo' },
                  { icon: <ChevronRight className="w-4 h-4" />, label: 'Postiz', desc: 'Publica en LinkedIn' },
                ].map((s, i) => (
                  <div key={i} className="flex items-center gap-3 text-xs group">
                    <div className="w-6 h-6 rounded-lg bg-white/50 dark:bg-accent flex items-center justify-center text-[#06b6d4] shadow-sm group-hover:scale-110 transition-transform">
                      {s.icon}
                    </div>
                    <span className="font-medium text-foreground">{s.label}</span>
                    <span className="text-muted-foreground/70">— {s.desc}</span>
                  </div>
                ))}
              </div>
            </motion.div>
          </div>
        </div>
      </div>
    </div>
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

  return (
    <div className="h-full overflow-y-auto">
      <div className="max-w-[1400px] mx-auto p-4 sm:p-6 lg:p-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="mb-8"
        >
          <h1 className="text-2xl font-bold bg-gradient-to-r from-[#0B1F4B] to-[#2BBDE8] dark:from-[#60a5fa] dark:to-[#22d3ee] bg-clip-text text-transparent mb-1">
            Borradores
          </h1>
          <p className="text-muted-foreground text-sm">Gestiona tus publicaciones guardadas y programadas</p>
        </motion.div>

        {/* Filters */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.1 }}
          className="flex items-center gap-3 mb-6 p-1.5 bg-white/40 dark:bg-accent/30 border border-white/40 dark:border-border/50 rounded-2xl w-fit backdrop-blur-md"
        >
          {['todos', 'pendientes', 'programados'].map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-5 py-2 rounded-xl text-sm font-medium transition-all duration-300 cursor-pointer
                ${filter === f 
                  ? 'bg-gradient-to-r from-[#1e3a8a] to-[#06b6d4] text-white shadow-md shadow-[#06b6d4]/20' 
                  : 'text-muted-foreground hover:text-foreground hover:bg-white/50 dark:hover:bg-accent/50'
                }`}
            >
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
        </motion.div>

        {/* Table / List */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.2 }}
          className="bg-white/60 dark:bg-card backdrop-blur-xl border border-white/40 dark:border-border rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] overflow-hidden"
        >
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-white/40 dark:border-border/50 bg-white/30 dark:bg-accent/20">
                  <th className="py-4 px-6 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Título</th>
                  <th className="py-4 px-6 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Redes</th>
                  <th className="py-4 px-6 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Estado</th>
                  <th className="py-4 px-6 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Fecha</th>
                  <th className="py-4 px-6 text-xs font-semibold text-muted-foreground uppercase tracking-wider text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/30 dark:divide-border/40">
                {isLoading && (
                  <tr>
                    <td colSpan={5} className="py-12 text-center">
                      <Loader2 className="w-6 h-6 text-[#06b6d4] animate-spin mx-auto mb-2" />
                      <p className="text-sm text-muted-foreground">Cargando borradores...</p>
                    </td>
                  </tr>
                )}
                {!isLoading && filtered.length > 0 && filtered.map((draft, i) => (
                  <motion.tr
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3, delay: 0.1 + i * 0.05 }}
                    key={draft.id}
                    className="hover:bg-white/50 dark:hover:bg-accent/30 transition-colors duration-200 cursor-pointer group"
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
                    <td className="py-4 px-6">
                      <div className="font-medium text-foreground group-hover:text-[#06b6d4] transition-colors line-clamp-1 max-w-[400px]">
                        {draft.titulo || draft.promptOriginal.slice(0, 50)}
                      </div>
                      <div className="text-xs text-muted-foreground mt-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        Clic para continuar editando
                      </div>
                    </td>
                    <td className="py-4 px-6">
                      <div className="flex items-center gap-2">
                        {draft.redesDestino.map((net) => (
                          <div key={net} className="w-8 h-8 rounded-full bg-white/80 dark:bg-accent flex items-center justify-center shadow-sm border border-white/50 dark:border-border">
                            {networkIcons[net as keyof typeof networkIcons]}
                          </div>
                        ))}
                      </div>
                    </td>
                    <td className="py-4 px-6">
                      <Badge variant={statusColors[draft.estado] ?? 'default'} className="shadow-sm">
                        {draft.estado}
                      </Badge>
                    </td>
                    <td className="py-4 px-6 text-sm text-muted-foreground">
                      {formatRelative(toDate(draft.creadoEn))}
                    </td>
                    <td className="py-4 px-6">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          type="button"
                          title="Continuar editando"
                          className="w-8 h-8 rounded-full hover:bg-white/80 dark:hover:bg-accent flex items-center justify-center transition-all duration-300 text-[#06b6d4] hover:scale-110 shadow-sm border border-transparent hover:border-white/50"
                          onClick={(e) => {
                            e.stopPropagation();
                            resumeBorradorAndNavigate(draft, onNavigate);
                          }}
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          title="Eliminar"
                          className="w-8 h-8 rounded-full hover:bg-red-50 dark:hover:bg-red-950/30 flex items-center justify-center transition-all duration-300 text-red-500 hover:scale-110 shadow-sm border border-transparent hover:border-red-100"
                          onClick={async (e) => {
                            e.stopPropagation();
                            if (!user || !confirm('¿Eliminar borrador?')) return;
                            await eliminarBorrador(draft.id);
                            invalidate();
                            refetch();
                          }}
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
        </motion.div>

        {/* Empty State (conditional) */}
        {!isLoading && filtered.length === 0 && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.4, delay: 0.2 }}
            className="mt-6 bg-white/60 dark:bg-card backdrop-blur-xl border border-white/40 dark:border-border rounded-3xl p-12 text-center shadow-[0_8px_30px_rgb(0,0,0,0.04)]"
          >
            <div className="w-20 h-20 bg-gradient-to-br from-[#1e3a8a]/10 to-[#06b6d4]/10 rounded-full flex items-center justify-center mx-auto mb-6 shadow-inner border border-white/50">
              <FileText className="w-10 h-10 text-[#06b6d4]" />
            </div>
            <h3 className="text-xl font-bold bg-gradient-to-r from-[#0B1F4B] to-[#2BBDE8] dark:from-[#60a5fa] dark:to-[#22d3ee] bg-clip-text text-transparent mb-2">No hay borradores</h3>
            <p className="text-muted-foreground mb-8 max-w-sm mx-auto">
              Aún no tienes borradores en este estado. Empieza a crear contenido genial y guárdalo aquí para más tarde.
            </p>
            <Button variant="liquid" icon={<Plus />} onClick={() => onNavigate('new-post')}>
              Crear nueva publicación
            </Button>
          </motion.div>
        )}
      </div>
    </div>
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

  return (
    <div className="h-full overflow-y-auto">
      <div className="max-w-[1400px] mx-auto p-4 sm:p-6 lg:p-8">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="mb-8 flex flex-col sm:flex-row sm:items-start justify-between gap-4"
        >
          <div>
            <h1 className="text-2xl font-bold bg-gradient-to-r from-[#0B1F4B] to-[#2BBDE8] dark:from-[#60a5fa] dark:to-[#22d3ee] bg-clip-text text-transparent mb-2">Calendario Editorial</h1>
            <p className="text-muted-foreground text-sm max-w-xl">
              Visualiza y organiza tus publicaciones programadas. Arrastra una publicación a otro día para reprogramarla.
            </p>
          </div>
          <Button variant="liquid" icon={<Plus />} onClick={() => onNavigate('new-post')}>
            Nueva publicación
          </Button>
        </motion.div>

        <AnimatePresence>
          {overdueCount > 0 && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
              className="mb-6 overflow-hidden">
              <div className="rounded-2xl border border-[#06b6d4]/30 bg-gradient-to-r from-[#1e3a8a]/5 to-[#06b6d4]/5 backdrop-blur-md px-5 py-4 text-sm text-[#1e3a8a] dark:text-[#06b6d4] shadow-sm flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-[#06b6d4]/20 flex items-center justify-center shrink-0">
                  <Clock className="w-4 h-4 text-[#06b6d4]" />
                </div>
                <div>
                  <span className="font-semibold">{overdueCount} publicación(es) pasaron su hora</span> y siguen programadas. Se publicarán automáticamente en el próximo ciclo (cada 1 min) o usa <strong>Publicar ahora</strong>.
                </div>
              </div>
            </motion.div>
          )}

          {schedulerMsg && (
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
              className="mb-6 overflow-hidden">
              <div className="rounded-2xl border border-emerald-200/50 dark:border-emerald-800/50 bg-emerald-50/50 dark:bg-emerald-950/20 backdrop-blur-md px-5 py-4 text-sm text-emerald-800 dark:text-emerald-300 shadow-sm flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-emerald-500/20 flex items-center justify-center shrink-0">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                </div>
                {schedulerMsg}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="grid lg:grid-cols-[1fr_360px] gap-6">
          {/* Calendar Grid */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.4, delay: 0.1 }}
            className="bg-white/60 dark:bg-card backdrop-blur-xl border border-white/40 dark:border-border rounded-3xl p-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)]"
          >
            <div className="mb-6 flex items-center justify-between">
              <h3 className="text-xl font-bold text-foreground capitalize flex items-center gap-2">
                <Calendar className="w-5 h-5 text-[#06b6d4]" />
                {monthLabel}
              </h3>
              <div className="flex items-center gap-2 bg-white/50 dark:bg-accent/30 p-1 rounded-2xl border border-white/40 dark:border-border">
                <button onClick={() => setViewDate(new Date(anio, mes - 1, 1))} className="p-2 hover:bg-white dark:hover:bg-accent rounded-xl transition-all text-muted-foreground hover:text-foreground">
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <span className="text-sm font-medium px-2 text-muted-foreground">Mes</span>
                <button onClick={() => setViewDate(new Date(anio, mes + 1, 1))} className="p-2 hover:bg-white dark:hover:bg-accent rounded-xl transition-all text-muted-foreground hover:text-foreground">
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Days header */}
            <div className="grid grid-cols-7 gap-3 mb-3">
              {['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'].map(day => (
                <div key={day} className="text-center text-xs font-bold text-muted-foreground uppercase tracking-widest py-2">
                  {day}
                </div>
              ))}
            </div>

            {/* Calendar days */}
            <div className="grid grid-cols-7 gap-3">
              {/* Empty cells for offset */}
              {Array.from({ length: firstDayOffset }).map((_, i) => (
                <div key={`empty-${i}`} className="aspect-square opacity-0" />
              ))}
              
              {/* Days */}
              {Array.from({ length: daysInMonth }).map((_, i) => {
                const day = i + 1;
                const posts = porDia[day] || [];
                const isSelected = selectedDay === day;
                const hasContent = posts.length > 0;
                
                return (
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
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
                    className={`aspect-square p-2 rounded-2xl border transition-all duration-300 relative flex flex-col
                      ${isSelected ? 'border-[#06b6d4] bg-gradient-to-br from-[#1e3a8a]/10 to-[#06b6d4]/10 shadow-md shadow-[#06b6d4]/20' : 'border-white/50 dark:border-border/50 hover:border-[#06b6d4]/50 hover:bg-[#06b6d4]/5'}
                      ${dropTargetDay === day && draggingPostId ? 'ring-2 ring-[#06b6d4] ring-offset-2 ring-offset-transparent bg-[#06b6d4]/10 scale-105' : ''}
                      ${hasContent && !isSelected ? 'bg-white dark:bg-accent/40 shadow-sm' : ''}
                      ${!hasContent && !isSelected ? 'bg-white/30 dark:bg-card/50' : ''}
                    `}
                  >
                    <div className={`text-sm font-semibold ml-1 mt-1 ${isSelected ? 'text-[#06b6d4]' : 'text-foreground'}`}>{day}</div>
                    
                    {hasContent && (
                      <div className="mt-auto mb-1 flex flex-col gap-1 w-full px-1">
                        {posts.slice(0, 2).map(post => (
                          <div key={post.id} className={`h-1.5 w-full rounded-full ${isPostOverdue(post) ? 'bg-red-400' : 'bg-gradient-to-r from-[#1e3a8a] to-[#06b6d4]'}`} />
                        ))}
                        {posts.length > 2 && (
                          <div className="text-[10px] text-muted-foreground font-medium text-right leading-none">+{posts.length - 2}</div>
                        )}
                      </div>
                    )}
                  </motion.button>
                );
              })}
            </div>
          </motion.div>

          {/* Sidebar - Selected Day Posts */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.4, delay: 0.2 }}
            className="bg-white/60 dark:bg-card backdrop-blur-xl border border-white/40 dark:border-border rounded-3xl p-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)] h-fit sticky top-8"
          >
            <h3 className="text-lg font-bold mb-5 flex items-center gap-2">
              <CalendarClock className="w-5 h-5 text-[#06b6d4]" />
              {selectedDay ? `${selectedDay} de ${monthLabel}` : 'Selecciona un día'}
            </h3>
            
            {isLoading && (
              <div className="flex flex-col items-center justify-center py-10">
                <Loader2 className="w-6 h-6 text-[#06b6d4] animate-spin mb-3" />
                <p className="text-sm text-muted-foreground">Cargando...</p>
              </div>
            )}

            {!isLoading && selectedDay && selectedPosts.length > 0 ? (
              <div className="space-y-4 max-h-[600px] overflow-y-auto pr-2 -mr-2">
                <AnimatePresence>
                  {selectedPosts.map((post, i) => {
                    const fp = toDate(post.fechaProgramada);
                    const overdue = isPostOverdue(post);
                    return (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      transition={{ duration: 0.2, delay: i * 0.05 }}
                      key={post.id}
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
                      className={`p-4 bg-white/80 dark:bg-accent/50 rounded-2xl border border-white/60 dark:border-border/50 hover:bg-white dark:hover:bg-accent shadow-sm hover:shadow-md transition-all cursor-pointer relative group overflow-hidden
                        ${draggingPostId === post.id ? 'opacity-50 ring-2 ring-[#06b6d4] cursor-grabbing scale-95' : 'active:cursor-grab'}
                        ${overdue ? 'border-red-200 dark:border-red-900/50 bg-red-50/30 dark:bg-red-950/10' : ''}`}
                      title="Clic para previsualizar · arrastra para cambiar la fecha"
                    >
                      {/* Drag handle indicator */}
                      <div className="absolute left-1.5 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <div className="w-1 h-8 rounded-full bg-border" />
                      </div>

                      {post.imagenUrl && (
                        <div className="w-full h-32 rounded-xl overflow-hidden mb-3">
                          <img src={post.imagenUrl} alt="" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 pointer-events-none" />
                        </div>
                      )}
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex-1 pr-3">
                          <div className="font-semibold text-sm line-clamp-1 mb-1 group-hover:text-[#06b6d4] transition-colors">{post.titulo}</div>
                          <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground bg-accent w-fit px-2 py-0.5 rounded-lg">
                            <Clock className="w-3 h-3 text-[#06b6d4]" />
                            {fp ? fp.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' }) : ''}
                          </div>
                        </div>
                        <div className="w-7 h-7 rounded-full bg-[#0a66c2]/10 flex items-center justify-center shrink-0">
                          <Linkedin className="w-3.5 h-3.5 text-[#0a66c2]" />
                        </div>
                      </div>
                      <p className="text-xs text-muted-foreground line-clamp-2 mb-3 pl-1 leading-relaxed">{post.contenido}</p>
                      
                      <div className="flex items-center gap-2 pt-3 border-t border-border/50">
                        {overdue && (
                          <button
                            type="button"
                            disabled={publishingId === post.id}
                            className="flex-1 py-1.5 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 text-xs rounded-lg transition-colors flex items-center justify-center gap-1.5 font-semibold"
                            onClick={(e) => {
                              e.stopPropagation();
                              void publicarProgramadoAhora(post);
                            }}
                          >
                            {publishingId === post.id ? (
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            ) : (
                              <Send className="w-3.5 h-3.5" />
                            )}
                            Publicar
                          </button>
                        )}
                        <button
                          type="button"
                          className="flex-1 py-1.5 text-muted-foreground text-xs hover:bg-accent rounded-lg transition-colors flex items-center justify-center gap-1.5 font-medium border border-transparent hover:border-border"
                          onClick={(e) => {
                            e.stopPropagation();
                            setPreviewPost(post);
                          }}
                        >
                          <Eye className="w-3.5 h-3.5" />
                          Ver
                        </button>
                        <button
                          type="button"
                          className="px-3 py-1.5 text-red-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors border border-transparent hover:border-red-100"
                          onClick={async (e) => {
                            e.stopPropagation();
                            if (!user || !confirm('¿Eliminar publicación?')) return;
                            await eliminarPublicacion(post.id);
                            if (previewPost?.id === post.id) setPreviewPost(null);
                            invalidate();
                          }}
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </motion.div>
                  );})}
                </AnimatePresence>
              </div>
            ) : !isLoading && selectedDay ? (
              <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="text-center py-12 bg-white/40 dark:bg-accent/20 rounded-2xl border border-dashed border-border/50">
                <div className="w-14 h-14 bg-gradient-to-br from-accent to-background border border-border/50 rounded-full flex items-center justify-center mx-auto mb-4 shadow-sm">
                  <Calendar className="w-6 h-6 text-muted-foreground/70" />
                </div>
                <p className="text-sm font-medium text-foreground mb-1">Día libre</p>
                <p className="text-xs text-muted-foreground px-4">No hay publicaciones programadas para este día.</p>
              </motion.div>
            ) : null}
          </motion.div>
        </div>

        <Modal
          isOpen={!!previewPost}
          onClose={() => setPreviewPost(null)}
          title={previewPost?.titulo || 'Vista previa'}
          maxWidthClass="max-w-xl"
          footer={
            <Button variant="outline" onClick={() => setPreviewPost(null)} className="w-full sm:w-auto">
              Cerrar vista previa
            </Button>
          }
        >
          {previewPost && (
            <div className="space-y-5">
              <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground bg-accent/50 p-3 rounded-2xl border border-border/50">
                {previewPost.fechaProgramada && (
                  <span className="inline-flex items-center gap-1.5 font-medium bg-white dark:bg-card px-2.5 py-1 rounded-lg shadow-sm border border-border/50">
                    <Clock className="w-4 h-4 text-[#06b6d4]" />
                    {formatDateTime(toDate(previewPost.fechaProgramada))}
                  </span>
                )}
                <Badge variant={previewPost.estado === 'publicado' ? 'success' : 'default'} className="shadow-sm">
                  {previewPost.estado}
                </Badge>
                {previewPost.redesDestino.map((net) => (
                  <Badge key={net} variant="purple" className="shadow-sm">
                    {net}
                  </Badge>
                ))}
              </div>
              <div className="bg-white/50 dark:bg-black/20 rounded-2xl overflow-hidden shadow-inner border border-border/50 backdrop-blur-sm">
                <SocialPostPreview
                  network={previewPost.redesDestino[0] || RED_PRINCIPAL}
                  authorName={displayName}
                  authorInitials={initials}
                  content={previewPost.contenido}
                  imageUrl={previewPost.imagenUrl}
                  charLimit={3000}
                />
              </div>
            </div>
          )}
        </Modal>
      </div>
    </div>
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
  const { data: stored = [], isLoading } = useChatMensajes();
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

  return (
    <div className="h-full flex flex-col overflow-hidden">
      <div className="max-w-[1400px] w-full mx-auto p-4 sm:p-6 lg:p-8 flex-1 flex flex-col min-h-0">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="mb-6 shrink-0"
        >
          <h1 className="text-2xl font-bold bg-gradient-to-r from-[#0B1F4B] to-[#2BBDE8] dark:from-[#60a5fa] dark:to-[#22d3ee] bg-clip-text text-transparent mb-1">
            Asistente IA
          </h1>
          <p className="text-muted-foreground text-sm">
            Apartado del agente Conect.ia: ideas, edición y copy para LinkedIn (Gemini)
          </p>
        </motion.div>

        <div className="grid lg:grid-cols-[1fr_300px] gap-6 flex-1 min-h-0">
          {/* Chat Area */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.4, delay: 0.1 }}
            className="flex flex-col bg-white/60 dark:bg-card backdrop-blur-xl border border-white/40 dark:border-border rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] overflow-hidden"
          >
            {/* Banner */}
            <div className="px-5 py-3 bg-white/40 dark:bg-accent/20 border-b border-white/40 dark:border-border/50 flex items-center justify-between shrink-0 backdrop-blur-md">
              <div className="flex items-center gap-3">
                <div className="relative flex h-3 w-3">
                  <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${backendOk === false || error ? 'bg-red-400' : 'bg-[#06b6d4]'}`}></span>
                  <span className={`relative inline-flex rounded-full h-3 w-3 ${backendOk === false || error ? 'bg-red-500' : 'bg-[#06b6d4]'}`}></span>
                </div>
                <span className="text-sm font-medium text-foreground">
                  {backendOk === false || error
                    ? `Sin conexión IA${aiHint ? ` · ${aiHint}` : ''}`
                    : `Asistente de marketing`}
                </span>
              </div>
              {backendOk && !error && <span className="text-xs font-semibold px-2 py-1 bg-[#06b6d4]/10 text-[#06b6d4] rounded-lg">{aiHint || 'IA Activa'}</span>}
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-5 space-y-6 scroll-smooth">
              <AnimatePresence initial={false}>
                {messages.map((msg, i) => (
                  <motion.div
                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    transition={{ duration: 0.3 }}
                    key={i}
                    className={`flex flex-col gap-2 ${msg.role === 'user' ? 'items-end' : 'items-start'}`}
                  >
                    <div className="flex items-end gap-2 max-w-[85%]">
                      {msg.role === 'bot' && (
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#1e3a8a] to-[#06b6d4] flex items-center justify-center shrink-0 shadow-sm text-white mb-1">
                          <Sparkles className="w-4 h-4" />
                        </div>
                      )}
                      <div className={`px-5 py-3.5 rounded-2xl whitespace-pre-wrap shadow-sm ${
                        msg.role === 'user' 
                          ? 'bg-gradient-to-r from-[#1e3a8a] to-[#06b6d4] text-white ml-auto rounded-br-sm' 
                          : 'bg-white dark:bg-accent border border-white/50 dark:border-border/50 text-foreground rounded-bl-sm'
                      }`}>
                        {msg.role === 'bot' ? (
                          <div className="prose prose-sm dark:prose-invert max-w-none prose-p:leading-relaxed prose-a:text-[#06b6d4]">
                            <ChatMessageBody text={msg.text} />
                          </div>
                        ) : (
                          <p className="text-sm leading-relaxed">{msg.text}</p>
                        )}
                      </div>
                    </div>
                    
                    {/* Action buttons from bot */}
                    {msg.role === 'bot' && (msg.accionSugerida === 'generar_publicacion' || msg.accionSugerida === 'ver_calendario') && (
                      <div className="ml-10 flex gap-2 mt-1">
                        {msg.accionSugerida === 'generar_publicacion' && (
                          <Button
                            variant="liquid"
                            size="sm"
                            icon={<PenSquare className="w-4 h-4" />}
                            onClick={() =>
                              irAGenerarPublicacion(
                                msg.temaSugerido || lastUserPrompt,
                                msg.tonoSugerido || 'profesional'
                              )
                            }
                          >
                            Generar publicación
                          </Button>
                        )}
                        {msg.accionSugerida === 'ver_calendario' && (
                          <Button variant="outline" size="sm" icon={<Calendar className="w-4 h-4" />} onClick={() => onNavigate('calendar')}>
                            Ver calendario
                          </Button>
                        )}
                      </div>
                    )}
                  </motion.div>
                ))}
              </AnimatePresence>
              {sending && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex items-end gap-2">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#1e3a8a] to-[#06b6d4] flex items-center justify-center shrink-0 shadow-sm text-white mb-1">
                    <Sparkles className="w-4 h-4" />
                  </div>
                  <div className="px-5 py-4 bg-white dark:bg-accent border border-white/50 dark:border-border/50 rounded-2xl rounded-bl-sm flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-[#06b6d4] animate-bounce" style={{ animationDelay: '0ms' }} />
                    <div className="w-2 h-2 rounded-full bg-[#06b6d4] animate-bounce" style={{ animationDelay: '150ms' }} />
                    <div className="w-2 h-2 rounded-full bg-[#06b6d4] animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                </motion.div>
              )}
            </div>

            {/* Input */}
            <div className="p-4 bg-white/40 dark:bg-accent/20 border-t border-white/40 dark:border-border/50 shrink-0 backdrop-blur-md">
              <div className="flex items-end gap-3 relative">
                <textarea
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSend();
                    }
                  }}
                  placeholder="Pide ideas, optimiza copy, o genera contenido..."
                  className="flex-1 bg-white/70 dark:bg-input-background border border-white/60 dark:border-input rounded-2xl px-5 py-3.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#06b6d4]/30 focus:border-[#06b6d4]/50 hover:bg-white transition-all shadow-inner resize-none min-h-[52px] max-h-[120px]"
                  rows={1}
                />
                <button 
                  onClick={handleSend}
                  disabled={!input.trim() || sending}
                  className="w-[52px] h-[52px] rounded-2xl bg-gradient-to-br from-[#1e3a8a] to-[#06b6d4] text-white flex items-center justify-center hover:scale-105 active:scale-95 transition-all disabled:opacity-50 disabled:hover:scale-100 disabled:cursor-not-allowed shadow-md shadow-[#06b6d4]/20 shrink-0"
                >
                  <Send className="w-5 h-5 ml-1" />
                </button>
              </div>
              <div className="text-center mt-2">
                <span className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">Conect.ia AI • Gemini Powered</span>
              </div>
            </div>
          </motion.div>

          {/* Quick Actions Sidebar */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.4, delay: 0.2 }}
            className="bg-white/60 dark:bg-card backdrop-blur-xl border border-white/40 dark:border-border rounded-3xl p-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)] flex flex-col shrink-0 overflow-y-auto"
          >
            <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
              <Zap className="w-5 h-5 text-[#06b6d4]" />
              Acciones rápidas
            </h3>
            
            <Button
              variant="liquid"
              className="w-full mb-4 shadow-md shadow-[#06b6d4]/20"
              icon={<Sparkles className="w-4 h-4" />}
              onClick={() => irAGenerarPublicacion(lastUserPrompt || input || 'Publicación Conect.ia')}
            >
              Generar publicación
            </Button>
            <p className="text-xs text-muted-foreground mb-6 leading-relaxed">
              Abre Nueva publicación con el tema del chat y genera el borrador con IA automáticamente.
            </p>
            
            <div className="space-y-2.5">
              {quickActions.map((action, i) => (
                <button
                  key={i}
                  onClick={() => setInput(action)}
                  className="w-full text-left px-4 py-3 bg-white/50 dark:bg-accent/40 hover:bg-white dark:hover:bg-accent border border-white/60 dark:border-border/50 rounded-xl text-sm transition-all duration-200 hover:shadow-sm hover:border-[#06b6d4]/30 group flex items-center justify-between"
                >
                  <span className="text-foreground font-medium">{action}</span>
                  <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-[#06b6d4] transition-colors" />
                </button>
              ))}
            </div>

            <div className="mt-8 pt-6 border-t border-white/40 dark:border-border/50">
              <h4 className="text-sm font-bold mb-3 uppercase tracking-wider text-muted-foreground">Sugerencias</h4>
              <ul className="space-y-3">
                {[
                  'Pide ideas de contenido específicas',
                  'Solicita optimización de copy',
                  'Genera hashtags relevantes',
                  'Analiza borradores guardados'
                ].map((sug, i) => (
                  <li key={i} className="flex items-start gap-2 text-xs text-muted-foreground font-medium">
                    <div className="w-1.5 h-1.5 rounded-full bg-[#06b6d4] mt-1 shrink-0" />
                    {sug}
                  </li>
                ))}
              </ul>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
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

  const renderCanalCard = (red: (typeof CATALOGO_REDES)[number]) => {
    const config = redConfig(red.id);
    if (!config) return null;
    const canal = canales?.[red.id];
    const conectado = Boolean(canal?.conectado);
    const cuenta = canal?.cuentaNombre;

    return (
      <Card key={red.id} className={conectado ? 'border-emerald-200 dark:border-emerald-900' : ''}>
        <div className="flex items-start gap-4">
          <div
            className="w-14 h-14 bg-white dark:bg-card rounded-xl flex items-center justify-center shadow-sm shrink-0"
            style={{ border: `1px solid ${config.color}22` }}
          >
            {redIcono(red.id, 'w-7 h-7')}
          </div>
          <div className="flex-1 min-w-0">
            <div className="font-semibold text-lg flex items-center gap-2">
              {config.nombre}
              {conectado && <CheckCircle2 className="w-5 h-5 text-emerald-600" />}
            </div>
            {config.tipo === 'proximamente' ? (
              <span className="inline-block mt-1 text-[11px] font-medium px-2 py-0.5 rounded-lg bg-accent text-muted-foreground">
                Próximamente
              </span>
            ) : conectado ? (
              <p className="text-sm text-muted-foreground mt-1">
                {config.tipo === 'manual' ? (
                  'Canal manual activo'
                ) : (
                  <>
                    Conectado:{' '}
                    <span className="font-medium text-foreground">{cuenta ?? 'Cuenta'}</span>
                  </>
                )}
              </p>
            ) : (
              <p className="text-sm text-muted-foreground mt-1">Sin conectar</p>
            )}
            <p className="text-xs text-muted-foreground mt-2">{config.descripcion}</p>
          </div>
        </div>
        <div className="mt-6 pt-4 border-t border-border flex flex-wrap gap-2">
          {config.tipo === 'proximamente' ? (
            <Button variant="ghost" size="sm" disabled>
              Se habilita con la conexión real
            </Button>
          ) : config.tipo === 'manual' ? (
            fiverrActivo ? (
              <Button
                variant="destructive"
                size="sm"
                onClick={() => void toggleCanal(red.id, false)}
              >
                Desactivar canal manual
              </Button>
            ) : (
              <Button variant="primary" size="sm" onClick={() => void toggleCanal(red.id, true)}>
                Activar canal manual
              </Button>
            )
          ) : conectado ? (
            <>
              <Button variant="ghost" size="sm" onClick={() => setConnectModalRed(red.id)}>
                Reconfigurar
              </Button>
              <Button
                variant="destructive"
                size="sm"
                onClick={() => void toggleCanal(red.id, false)}
              >
                Desconectar
              </Button>
            </>
          ) : (
            <Button variant="primary" size="sm" onClick={() => setConnectModalRed(red.id)}>
              Conectar {config.nombre}
            </Button>
          )}
        </div>
      </Card>
    );
  };

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold mb-2">Canales conectados</h1>
        <p className="text-muted-foreground">
          Conecta tus redes con OAuth oficial. Las publicaciones usan las APIs reales de cada
          plataforma y puedes elegir las redes al crear cada publicación.
        </p>
      </div>

      {oauthNotice && (
        <div className="mb-4 p-3 rounded-xl border border-emerald-200 bg-emerald-50 text-sm text-emerald-900">
          {oauthNotice}
        </div>
      )}

      {isLoading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-40 w-full rounded-3xl" />
          ))}
        </div>
      ) : (
        <div className="grid md:grid-cols-2 gap-4 mb-8">
          {CATALOGO_REDES.map(renderCanalCard)}
        </div>
      )}

      {/* Stats */}
      <div className="mt-4 grid md:grid-cols-3 gap-4">
        <Card className="text-center">
          <div className="text-3xl font-bold bg-gradient-to-r from-[#667eea] to-[#764ba2] bg-clip-text text-transparent">
            {conectadas}/{totalOauth}
          </div>
          <p className="text-sm text-muted-foreground mt-1">Canales OAuth conectados</p>
        </Card>
        <Card className="text-center">
          <div className="text-3xl font-bold text-emerald-600">{stats.publicados}</div>
          <p className="text-sm text-muted-foreground mt-1">Posts publicados</p>
        </Card>
        <Card className="text-center">
          <div className="text-3xl font-bold text-purple-600">{stats.programados}</div>
          <p className="text-sm text-muted-foreground mt-1">Posts programados</p>
        </Card>
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
    </div>
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

  return (
    <div className="h-full overflow-y-auto">
      <div className="max-w-[1000px] mx-auto p-4 sm:p-6 lg:p-8">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="mb-8"
        >
          <h1 className="text-2xl font-bold bg-gradient-to-r from-[#0B1F4B] to-[#2BBDE8] dark:from-[#60a5fa] dark:to-[#22d3ee] bg-clip-text text-transparent mb-1">
            Ajustes
          </h1>
          <p className="text-muted-foreground text-sm">Configura integraciones y preferencias de la plataforma</p>
        </motion.div>

        <div className="space-y-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.1 }}
            className="bg-white/60 dark:bg-card backdrop-blur-xl border border-white/40 dark:border-border rounded-3xl p-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)]"
          >
            <h3 className="font-semibold mb-3 flex items-center gap-2 text-foreground">
              <div className="w-8 h-8 rounded-full bg-purple-500/10 flex items-center justify-center shrink-0">
                <Sparkles className="w-4 h-4 text-purple-600" />
              </div>
              Secretos del servidor
            </h3>
            <p className="text-sm text-muted-foreground ml-10">
              Gemini, Telegram y Postiz se configuran como variables de entorno en Vercel, no aquí.
            </p>
          </motion.div>

          {/* n8n / Make Webhook */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.2 }}
            className="bg-white/60 dark:bg-card backdrop-blur-xl border border-white/40 dark:border-border rounded-3xl p-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)]"
          >
            <h3 className="font-semibold mb-5 flex items-center gap-2 text-foreground">
              <div className="w-8 h-8 rounded-full bg-emerald-500/10 flex items-center justify-center shrink-0">
                <Network className="w-4 h-4 text-emerald-600" />
              </div>
              Automatización Make / n8n
            </h3>
            <div className="space-y-4 ml-10">
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <Network className="h-5 w-5 text-muted-foreground group-focus-within:text-[#06b6d4] transition-colors" />
                </div>
                <input
                  type="text"
                  value={automationWebhook}
                  onChange={(e) => setAutomationWebhook(e.target.value)}
                  placeholder="https://hook.us2.make.com/xxxxxxxx"
                  className="w-full pl-11 pr-4 py-3 bg-white/50 dark:bg-input-background border border-white/40 dark:border-input rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-[#06b6d4]/30 focus:border-[#06b6d4]/50 hover:bg-white/70 transition-all shadow-inner"
                />
              </div>
              <div className="p-4 bg-accent/40 rounded-2xl border border-border/50 text-xs text-muted-foreground space-y-2">
                <p>
                  Secreto en <code className="bg-background px-1.5 py-0.5 rounded text-[11px] font-mono border border-border">variables de entorno de Vercel</code>:{' '}
                  <code className="bg-background px-1.5 py-0.5 rounded text-[11px] font-mono border border-border">MAKE_WEBHOOK_SECRET</code> = API key del Custom webhook en Make
                  (no el token de API access). Headers: <code className="bg-background px-1.5 py-0.5 rounded text-[11px] font-mono border border-border">x-make-apikey</code> y{' '}
                  <code className="bg-background px-1.5 py-0.5 rounded text-[11px] font-mono border border-border">X-Campus-Secret</code>. Guía:{' '}
                  <code className="bg-background px-1.5 py-0.5 rounded text-[11px] font-mono border border-border">Flujo_Automatizacion/POSTMAN_MAKE.md</code>
                </p>
                <p>
                  n8n local: <code className="bg-background px-1.5 py-0.5 rounded text-[11px] font-mono border border-border">cd Flujo_Automatizacion &amp;&amp; docker compose up -d</code>
                </p>
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.3 }}
            className="bg-white/60 dark:bg-card backdrop-blur-xl border border-white/40 dark:border-border rounded-3xl p-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)]"
          >
            <h3 className="font-semibold mb-5 flex items-center gap-2 text-foreground">
              <div className="w-8 h-8 rounded-full bg-slate-500/10 flex items-center justify-center shrink-0">
                <Settings className="w-4 h-4 text-slate-600" />
              </div>
              Preferencias
            </h3>
            <div className="space-y-6 ml-10">
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Zona horaria</label>
                <select
                  value={timezone}
                  onChange={(e) => setTimezone(e.target.value)}
                  className="w-full px-4 py-3 bg-white/50 dark:bg-input-background border border-white/40 dark:border-input rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-[#06b6d4]/30 focus:border-[#06b6d4]/50 hover:bg-white/70 transition-all shadow-inner cursor-pointer"
                >
                  <option value="America/Bogota">Colombia (Bogotá)</option>
                  <option value="America/Mexico_City">México</option>
                  <option value="UTC">UTC</option>
                </select>
              </div>
              <div className="flex items-center justify-between p-4 bg-white/50 dark:bg-accent/40 rounded-2xl border border-white/40 dark:border-border/50">
                <div>
                  <p className="text-sm font-medium text-foreground">Notificaciones</p>
                  <p className="text-xs text-muted-foreground mt-0.5">Recibir alertas en el navegador</p>
                </div>
                <Toggle checked={notifications} onChange={setNotifications} />
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.4 }}
            className="flex flex-col items-end gap-3 pt-4"
          >
            <AnimatePresence>
              {saveError && (
                <motion.p initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="text-sm text-red-500 bg-red-50 px-4 py-2 rounded-xl">
                  {saveError}
                </motion.p>
              )}
            </AnimatePresence>
            <Button
              variant="liquid"
              icon={saving ? <Loader2 className="animate-spin w-4 h-4" /> : <CheckCircle2 className="w-4 h-4" />}
              disabled={saving || !user || isLoading}
              onClick={async () => {
                if (!user) return;
                setSaving(true);
                setSaveError('');
                try {
                  if (notifications && typeof Notification !== 'undefined') {
                    if (Notification.permission === 'default') {
                      await Notification.requestPermission();
                    }
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
                  setSaveError(e instanceof Error ? e.message : 'No se pudo guardar. ¿Emulador activo?');
                } finally {
                  setSaving(false);
                }
              }}
              className="min-w-[160px] shadow-md shadow-[#06b6d4]/20"
            >
              {saved ? '¡Guardado!' : 'Guardar cambios'}
            </Button>
          </motion.div>
        </div>
      </div>
    </div>
  );
};

const DashboardHome: React.FC = () => {
  const { stats, isLoading } = useDashboardStats();
  const { data: actividad = [], isLoading: loadingAct } = useActividad();

  const statCards = [
    { label: 'Posts publicados', value: stats.publicados, icon: <BarChart3 className="w-6 h-6" />, color: 'from-[#1e3a8a]/10 to-[#06b6d4]/10', iconColor: 'text-[#1e3a8a]' },
    { label: 'Programados', value: stats.programados, icon: <Calendar className="w-6 h-6" />, color: 'from-emerald-50 to-teal-50', iconColor: 'text-emerald-600' },
    { label: 'Borradores', value: stats.borradores, icon: <FileText className="w-6 h-6" />, color: 'from-amber-50 to-orange-50', iconColor: 'text-amber-600' },
  ];

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <h1 className="text-2xl font-bold bg-gradient-to-r from-[#0B1F4B] to-[#2BBDE8] dark:from-[#60a5fa] dark:to-[#22d3ee] bg-clip-text text-transparent">Panel principal</h1>
        <p className="text-sm text-muted-foreground mt-1">Resumen de tu actividad en Conect.ia</p>
      </motion.div>

      {/* Stat Cards */}
      <div className="grid md:grid-cols-3 gap-4">
        {statCards.map((card, i) => (
          <motion.div
            key={card.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.1 * (i + 1) }}
          >
            <div className="group relative bg-white/60 dark:bg-card backdrop-blur-xl border border-white/40 dark:border-border rounded-3xl p-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-2xl hover:shadow-[#06b6d4]/8 hover:-translate-y-1 transition-all duration-300 cursor-default">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">{card.label}</p>
                  <motion.p
                    className="text-3xl font-bold mt-2"
                    initial={{ opacity: 0, scale: 0.5 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.5, delay: 0.2 * (i + 1), type: 'spring', stiffness: 200 }}
                  >
                    {isLoading ? '…' : card.value}
                  </motion.p>
                </div>
                <div className={`w-14 h-14 bg-gradient-to-br ${card.color} rounded-2xl flex items-center justify-center ${card.iconColor} group-hover:scale-110 transition-transform duration-300`}>
                  {card.icon}
                </div>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Activity Feed */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.4 }}
      >
        <div className="bg-white/60 dark:bg-card backdrop-blur-xl border border-white/40 dark:border-border rounded-3xl p-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
          <h3 className="font-semibold mb-5 flex items-center gap-2">
            <Zap className="w-5 h-5 text-[#06b6d4]" />
            Actividad reciente
          </h3>
          {loadingAct && (
            <div className="flex items-center gap-3 py-8 justify-center">
              <Loader2 className="w-5 h-5 animate-spin text-[#06b6d4]" />
              <p className="text-sm text-muted-foreground">Cargando…</p>
            </div>
          )}
          {!loadingAct && actividad.length === 0 && (
            <div className="text-center py-10">
              <div className="w-16 h-16 mx-auto mb-4 bg-gradient-to-br from-[#1e3a8a]/10 to-[#06b6d4]/10 rounded-2xl flex items-center justify-center">
                <Sparkles className="w-8 h-8 text-[#06b6d4]" />
              </div>
              <p className="text-sm text-muted-foreground">Sin actividad aún. ¡Crea tu primera publicación!</p>
            </div>
          )}
          <div className="space-y-2">
            {actividad.map((a, idx) => (
              <motion.div
                key={a.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.3, delay: 0.05 * idx }}
                className="flex items-center gap-3 p-3 rounded-2xl hover:bg-accent/40 transition-colors duration-200"
              >
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                  a.tipo === 'publicado' ? 'bg-emerald-100 text-emerald-600' :
                  a.tipo === 'programado' ? 'bg-[#1e3a8a]/10 text-[#1e3a8a]' :
                  a.tipo === 'borrador' ? 'bg-amber-100 text-amber-600' :
                  a.tipo === 'error' ? 'bg-red-100 text-red-600' :
                  'bg-[#06b6d4]/10 text-[#06b6d4]'
                }`}>
                  {a.tipo === 'publicado' && <CheckCircle2 className="w-4 h-4" />}
                  {a.tipo === 'programado' && <Calendar className="w-4 h-4" />}
                  {a.tipo === 'borrador' && <FileText className="w-4 h-4" />}
                  {a.tipo === 'sistema' && <CheckCircle2 className="w-4 h-4" />}
                  {a.tipo === 'error' && <X className="w-4 h-4" />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{a.mensaje}</p>
                  <p className="text-xs text-muted-foreground">{formatRelative(toDate(a.creadoEn))}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </motion.div>
    </div>
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

  // Simulate responsive views
  const viewports = [
    { name: 'Desktop', width: 1440 },
    { name: 'Tablet', width: 768 }
  ];

  const renderScreen = () => {
    const onLogout = () => setCurrentScreen(productionMode ? 'login' : 'landing');

    switch (currentScreen) {
      case 'landing':
        return <LandingPage onNavigate={setCurrentScreen} />;
      
      case 'login':
      case 'dashboard':
        return (
          <DashboardShell activeScreen="dashboard" onNavigate={setCurrentScreen} onLogout={() => logout()}>
            <DashboardHome />
          </DashboardShell>
        );
      
      case 'new-post':
        return (
          <DashboardShell activeScreen="new-post" onNavigate={setCurrentScreen} onLogout={() => logout()}>
            <NewPostScreen />
          </DashboardShell>
        );

      case 'manual-post':
        return (
          <DashboardShell activeScreen="manual-post" onNavigate={setCurrentScreen} onLogout={() => logout()}>
            <ManualPostScreen />
          </DashboardShell>
        );

      case 'drafts':
        return (
          <DashboardShell activeScreen="drafts" onNavigate={setCurrentScreen} onLogout={() => logout()}>
            <DraftsScreen onNavigate={setCurrentScreen} />
          </DashboardShell>
        );
      
      case 'calendar':
        return (
          <DashboardShell activeScreen="calendar" onNavigate={setCurrentScreen} onLogout={() => logout()}>
            <CalendarScreen onNavigate={setCurrentScreen} />
          </DashboardShell>
        );
      
      case 'agent':
        return (
          <DashboardShell activeScreen="agent" onNavigate={setCurrentScreen} onLogout={() => logout()}>
            <AgentScreen onNavigate={setCurrentScreen} />
          </DashboardShell>
        );
      
      case 'channels':
        return (
          <DashboardShell activeScreen="channels" onNavigate={setCurrentScreen} onLogout={() => logout()}>
            <ChannelsScreen />
          </DashboardShell>
        );
      
      case 'settings':
        return (
          <DashboardShell activeScreen="settings" onNavigate={setCurrentScreen} onLogout={() => logout()}>
            <SettingsScreen />
          </DashboardShell>
        );
      
      default:
        return <LandingPage onNavigate={setCurrentScreen} />;
    }
  };

  if (productionMode) {
    return <div className="w-full min-h-screen bg-background overflow-auto">{renderScreen()}</div>;
  }

  return (
    <div className="w-full h-screen bg-muted/30 overflow-auto">
      {/* Viewport Controls */}
      <div className="sticky top-0 z-50 bg-card/95 backdrop-blur-sm border-b border-border">
        <div className="max-w-[1600px] mx-auto px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <ConectiaLogo size="sm" textClassName="!text-foreground font-bold text-sm !bg-none" />
            </div>
            <Badge variant="purple">8 pantallas</Badge>
          </div>
          
          <div className="flex items-center gap-3">
            {/* Screen Selector */}
            <select
              value={currentScreen}
              onChange={(e) => setCurrentScreen(e.target.value)}
              className="px-3 py-1.5 bg-accent border border-border rounded-lg text-sm font-medium cursor-pointer"
            >
              <option value="landing">1. Landing</option>
              <option value="dashboard">2. Dashboard</option>
              <option value="new-post">3. Nueva publicación</option>
              <option value="manual-post">3b. Subir publicación manual</option>
              <option value="drafts">4. Borradores</option>
              <option value="calendar">5. Calendario</option>
              <option value="agent">6. Asistente IA</option>
              <option value="channels">7. Canales</option>
              <option value="settings">8. Ajustes</option>
            </select>

            {/* Viewport Selector */}
            <div className="flex gap-2 px-2 py-1 bg-accent rounded-lg">
              {viewports.map(vp => (
                <button
                  key={vp.width}
                  onClick={() => setViewportWidth(vp.width)}
                  className={`px-3 py-1 rounded-md text-xs font-medium transition-all ${
                    viewportWidth === vp.width
                      ? 'bg-gradient-to-r from-[#667eea] to-[#764ba2] text-white'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {vp.name} ({vp.width}px)
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Frame Container */}
      <div className="flex items-start justify-center p-6 min-h-screen">
        <div 
          className="bg-background shadow-2xl rounded-2xl overflow-hidden border border-border transition-all duration-300"
          style={{ 
            width: `${viewportWidth}px`,
            height: '900px'
          }}
        >
          {renderScreen()}
        </div>
      </div>

      {/* Component Library Footer */}
      <div className="fixed bottom-6 right-6 bg-card border border-border rounded-xl shadow-lg p-4 max-w-xs">
        <h4 className="text-sm font-semibold mb-2">Componentes incluidos</h4>
        <div className="flex flex-wrap gap-1.5 text-xs">
          {['Button', 'Input', 'Textarea', 'Select', 'Toggle', 'Checkbox', 'Badge', 'Card', 'Modal', 'Toast', 'Skeleton'].map(comp => (
            <span key={comp} className="px-2 py-1 bg-purple-100 text-purple-700 rounded-md">
              {comp}
            </span>
          ))}
        </div>
        <p className="text-xs text-muted-foreground mt-3">
          Estados: hover, focus, disabled, loading
        </p>
      </div>
    </div>
  );
}
