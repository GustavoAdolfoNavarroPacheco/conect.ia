import React from 'react';

const LOGO_SRC = '/logo.png';
const LOGO_FALLBACK = '/logo.svg';

type Props = {
  size?: 'sm' | 'md' | 'lg';
  showText?: boolean;
  className?: string;
  textClassName?: string;
};

const sizeMap = {
  sm: 'h-8 w-8',
  md: 'h-10 w-10',
  lg: 'h-12 w-12',
};

const textSizeMap = {
  sm: 'text-sm font-bold bg-gradient-to-r from-[#0B1F4B] to-[#2BBDE8] dark:from-[#60a5fa] dark:to-[#22d3ee] bg-clip-text text-transparent',
  md: 'text-lg font-bold bg-gradient-to-r from-[#0B1F4B] to-[#2BBDE8] dark:from-[#60a5fa] dark:to-[#22d3ee] bg-clip-text text-transparent',
  lg: 'text-xl font-bold bg-gradient-to-r from-[#0B1F4B] to-[#2BBDE8] dark:from-[#60a5fa] dark:to-[#22d3ee] bg-clip-text text-transparent',
};

export function ConectiaLogo({
  size = 'md',
  showText = true,
  className = '',
  textClassName = '',
}: Props) {
  return (
    <div className={`flex items-center gap-2 shrink-0 ${className}`}>
      <img
        src={LOGO_SRC}
        alt="Conect.ia"
        className={`${sizeMap[size]} object-contain`}
        onError={(e) => {
          const img = e.currentTarget;
          if (img.src.endsWith('logo.png')) img.src = LOGO_FALLBACK;
        }}
      />
      {showText && (
        <span className={`${textSizeMap[size]} ${textClassName}`.trim()}>Conect.ia</span>
      )}
    </div>
  );
}

