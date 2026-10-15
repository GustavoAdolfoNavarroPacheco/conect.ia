import React from 'react';

/** Ícono de Campuslands (casco). Se pinta con máscara CSS para heredar el color de marca. */
const ICONO = '/campuslands-icon.svg';

type Props = {
  size?: 'sm' | 'md' | 'lg';
  showText?: boolean;
  className?: string;
  textClassName?: string;
};

const iconSize = {
  sm: 'h-7 w-9',
  md: 'h-8 w-10',
  lg: 'h-9 w-11',
};

const textSize = {
  sm: 'text-sm',
  md: 'text-base',
  lg: 'text-lg',
};

export function ConectiaLogo({ size = 'md', showText = true, className = '', textClassName = '' }: Props) {
  return (
    <div className={`group/logo flex items-center gap-2.5 shrink-0 select-none ${className}`}>
      <span
        role="img"
        aria-label="Campuslands"
        className={`${iconSize[size]} block bg-brand transition-transform duration-300 ease-out group-hover/logo:-rotate-6 group-hover/logo:scale-105`}
        style={{
          WebkitMask: `url(${ICONO}) center / contain no-repeat`,
          mask: `url(${ICONO}) center / contain no-repeat`,
        }}
      />
      {showText && (
        <span className={`${textSize[size]} font-semibold tracking-tight text-foreground ${textClassName}`.trim()}>
          Conect<span className="text-brand-strong">.ia</span>
        </span>
      )}
    </div>
  );
}
