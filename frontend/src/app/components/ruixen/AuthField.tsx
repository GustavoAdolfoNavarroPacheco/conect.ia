/**
 * Campo con icono y etiqueta flotante. Componente propio, inspirado en la vista previa de "floating-input"
 * de Ruixen UI (cuyo código fuente no es público): icono a la izquierda y etiqueta que sube al enfocar o escribir.
 * La etiqueta es un <label> real asociado al campo, así que lectores de pantalla y autocompletado funcionan.
 */
import * as React from 'react';
import { cn } from '../ui/utils';

export interface AuthFieldProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'id' | 'placeholder'> {
  id: string;
  label: string;
  icon: React.ReactNode;
  error?: string;
  hint?: string;
  /** Contenido a la derecha del campo (p. ej. el ojo de la contraseña). */
  trailing?: React.ReactNode;
}

export const AuthField = React.forwardRef<HTMLInputElement, AuthFieldProps>(function AuthField(
  { id, label, icon, error, hint, trailing, className, ...props },
  ref
) {
  const ayudaId = error || hint ? `${id}-ayuda` : undefined;
  return (
    <div className="flex flex-col gap-1.5">
      <div className="relative">
        <input
          ref={ref}
          id={id}
          placeholder=" "
          aria-invalid={error ? true : undefined}
          aria-describedby={ayudaId}
          className={cn('field peer h-[3.25rem] pb-1 pl-11 pt-5', trailing ? 'pr-12' : 'pr-4', error && '!border-destructive', className)}
          {...props}
        />
        {/* Después del campo en el DOM para poder reaccionar a su foco (peer); la posición es absoluta. */}
        <span
          aria-hidden
          className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground transition-colors peer-focus:text-brand-strong [&>svg]:h-[18px] [&>svg]:w-[18px]"
        >
          {icon}
        </span>
        <label
          htmlFor={id}
          className={cn(
            'pointer-events-none absolute left-11 top-1/2 -translate-y-1/2 origin-left text-sm text-muted-foreground transition-all duration-200 ease-[var(--ease-out)]',
            'peer-focus:top-2.5 peer-focus:translate-y-0 peer-focus:text-xs peer-focus:font-medium peer-focus:text-brand-strong',
            'peer-[:not(:placeholder-shown)]:top-2.5 peer-[:not(:placeholder-shown)]:translate-y-0 peer-[:not(:placeholder-shown)]:text-xs peer-[:not(:placeholder-shown)]:font-medium',
            'peer-autofill:top-2.5 peer-autofill:translate-y-0 peer-autofill:text-xs',
            error && '!text-destructive'
          )}
        >
          {label}
        </label>
        {trailing && <div className="absolute right-1 top-1/2 -translate-y-1/2">{trailing}</div>}
      </div>
      {(error || hint) && (
        <span id={ayudaId} className={cn('px-1 text-xs', error ? 'text-destructive' : 'text-muted-foreground')}>
          {error ?? hint}
        </span>
      )}
    </div>
  );
});
