/**
 * Piezas del chat del asistente. Código propio, inspirado en las vistas previas de "claude-chat-input" y
 * "ai-chat-input" de Ruixen UI: tarjeta redondeada que une campo de texto y botón de envío, saludo con
 * sugerencias al estar vacío y puntos animados mientras responde. Sin adjuntos ni selector de modelo (no aplican).
 */
import * as React from 'react';
import { motion } from 'motion/react';
import { ArrowUp, Sparkles, Square } from 'lucide-react';
import { cn } from '../ui/utils';

export interface ChatComposerProps {
  value: string;
  onChange: (value: string) => void;
  onSend: () => void;
  onStop: () => void;
  sending: boolean;
  textareaRef: React.RefObject<HTMLTextAreaElement>;
  placeholder?: string;
  describedBy?: string;
}

/** Campo y botón en una sola tarjeta que se resalta al enfocar. */
export function ChatComposer({ value, onChange, onSend, onStop, sending, textareaRef, placeholder, describedBy }: ChatComposerProps) {
  const puedeEnviar = value.trim().length > 0;
  return (
    <div className="flex items-end gap-2 rounded-[16px] border border-border bg-card p-2 pl-4 shadow-[var(--elev-xs)] transition-[border-color,box-shadow] duration-200 focus-within:border-brand focus-within:shadow-[0_0_0_3px_color-mix(in_srgb,var(--brand)_18%,transparent)]">
      <textarea
        ref={textareaRef}
        value={value}
        onChange={(e) => {
          onChange(e.target.value);
          const el = e.target;
          el.style.height = '';
          el.style.height = `${Math.min(el.scrollHeight + 2, 140)}px`;
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            onSend();
          }
        }}
        aria-label="Mensaje para el asistente"
        aria-describedby={describedBy}
        placeholder={placeholder}
        rows={1}
        className="max-h-[140px] min-h-11 flex-1 resize-none bg-transparent py-3 text-sm leading-5 text-foreground outline-none placeholder:text-muted-foreground"
      />
      {sending ? (
        <button
          type="button"
          onClick={onStop}
          aria-label="Detener respuesta"
          className="press flex h-11 w-11 shrink-0 items-center justify-center rounded-[12px] border border-border bg-card text-foreground transition-colors duration-150 hover:bg-accent"
        >
          <Square className="h-4 w-4 fill-current" />
        </button>
      ) : (
        <button
          type="button"
          onClick={onSend}
          disabled={!puedeEnviar}
          aria-label="Enviar mensaje"
          className="press flex h-11 w-11 shrink-0 items-center justify-center rounded-[12px] bg-brand text-white shadow-[var(--glow)] transition-[background-color,opacity,transform] duration-150 hover:bg-brand-strong disabled:cursor-not-allowed disabled:opacity-40 disabled:shadow-none"
        >
          <ArrowUp className="h-5 w-5" />
        </button>
      )}
    </div>
  );
}

export interface ChatSuggestion {
  label: string;
  icon: React.ReactNode;
  onClick: () => void;
}

/** Saludo inicial con sugerencias: aparece mientras la conversación no ha empezado. */
export function ChatGreeting({ title, subtitle, suggestions }: { title: string; subtitle: string; suggestions: ChatSuggestion[] }) {
  return (
    <div className="flex flex-col items-center px-2 py-6 text-center sm:py-10">
      <motion.span
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 300, damping: 22 }}
        className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-light via-brand to-brand-deep text-white shadow-[var(--glow)]"
        aria-hidden
      >
        <Sparkles className="h-7 w-7" />
      </motion.span>
      <h2 className="mt-4 text-xl font-semibold text-foreground [text-wrap:balance]">{title}</h2>
      <p className="mt-1 max-w-md text-sm text-muted-foreground [text-wrap:balance]">{subtitle}</p>
      <div className="mt-6 grid w-full max-w-xl gap-2 sm:grid-cols-2">
        {suggestions.map((s, i) => (
          <motion.button
            key={s.label}
            type="button"
            onClick={s.onClick}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.08 + i * 0.05, duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
            className="press group flex min-h-11 items-center gap-3 rounded-[12px] border border-border bg-card px-3 py-2 text-left text-sm text-foreground transition-colors duration-150 hover:border-brand/40 hover:bg-accent"
          >
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[8px] bg-brand-soft text-brand-strong [&>svg]:h-4 [&>svg]:w-4">{s.icon}</span>
            <span className="min-w-0 flex-1">{s.label}</span>
          </motion.button>
        ))}
      </div>
    </div>
  );
}

/** Tres puntos que laten mientras el asistente escribe. */
export function TypingDots({ className }: { className?: string }) {
  return (
    <span className={cn('inline-flex items-center gap-1', className)} role="status" aria-label="El asistente está escribiendo">
      {[0, 1, 2].map((i) => (
        <motion.span
          key={i}
          className="h-1.5 w-1.5 rounded-full bg-muted-foreground"
          animate={{ y: [0, -4, 0], opacity: [0.4, 1, 0.4] }}
          transition={{ duration: 0.9, repeat: Infinity, delay: i * 0.15, ease: 'easeInOut' }}
        />
      ))}
    </span>
  );
}
