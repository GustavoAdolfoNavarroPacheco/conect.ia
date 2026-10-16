/**
 * Medidor de contraseña con lista de requisitos. Componente propio, inspirado en la vista previa de
 * "password-strength-input" de Ruixen UI (cuyo código fuente no es público).
 * Solo "al menos 8 caracteres" es obligatorio (es lo que valida el servidor); el resto orienta.
 */
import * as React from 'react';
import { Check, X } from 'lucide-react';
import { cn } from '../ui/utils';

const REGLAS = [
  { id: 'largo', texto: '8 o más caracteres', prueba: (p: string) => p.length >= 8, obligatoria: true },
  { id: 'mayuscula', texto: 'Una mayúscula', prueba: (p: string) => /\p{Lu}/u.test(p) },
  { id: 'numero', texto: 'Un número', prueba: (p: string) => /\d/.test(p) },
  { id: 'simbolo', texto: 'Un símbolo', prueba: (p: string) => /[^\p{L}\d\s]/u.test(p) },
];

/** 0 = vacía, 1 = débil, 2 = media, 3 = fuerte. Sin los 8 caracteres nunca pasa de débil. */
export function nivelContrasena(password: string): 0 | 1 | 2 | 3 {
  if (!password) return 0;
  if (password.length < 8) return 1;
  const cumplidas = REGLAS.filter((r) => !r.obligatoria && r.prueba(password)).length;
  return cumplidas >= 3 ? 3 : cumplidas >= 1 ? 2 : 1;
}

const NIVELES = {
  0: { texto: 'Escribe una contraseña', barra: 'bg-border', color: 'text-muted-foreground' },
  1: { texto: 'Débil', barra: 'bg-destructive', color: 'text-destructive' },
  2: { texto: 'Aceptable', barra: 'bg-warning', color: 'text-warning' },
  3: { texto: 'Fuerte', barra: 'bg-success', color: 'text-success' },
} as const;

export function PasswordStrength({ password, className }: { password: string; className?: string }) {
  const nivel = nivelContrasena(password);
  const info = NIVELES[nivel];
  return (
    <div className={cn('space-y-3 rounded-[12px] border border-border bg-accent/50 p-3', className)}>
      <div className="flex items-center gap-3">
        <div className="flex flex-1 gap-1.5" aria-hidden>
          {[1, 2, 3].map((n) => (
            <span
              key={n}
              className={cn('h-1.5 flex-1 rounded-full transition-colors duration-300', nivel >= n ? info.barra : 'bg-border')}
            />
          ))}
        </div>
        <span role="status" aria-live="polite" className={cn('min-w-24 text-right text-xs font-semibold', info.color)}>
          {info.texto}
        </span>
      </div>
      <ul className="grid grid-cols-2 gap-x-3 gap-y-1.5">
        {REGLAS.map((r) => {
          const ok = r.prueba(password);
          return (
            <li key={r.id} className={cn('flex items-center gap-1.5 text-xs transition-colors', ok ? 'text-success' : 'text-muted-foreground')}>
              {ok ? <Check className="h-3.5 w-3.5 shrink-0" strokeWidth={3} /> : <X className="h-3.5 w-3.5 shrink-0 opacity-50" />}
              <span>{r.texto}</span>
              <span className="sr-only">{ok ? ' (cumplido)' : r.obligatoria ? ' (obligatorio, pendiente)' : ' (opcional, pendiente)'}</span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
