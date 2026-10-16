/**
 * Adaptado de "footer-pro" de Ruixen UI (MIT, © 2025 Ruixen UI, ver LICENSE.md).
 * Marca + descripción a la izquierda y columnas de enlaces; fila inferior con legal y copyright.
 * Cambios: sin next/link (enlaces normales o botones), sin indicador de estado del servicio (no hay fuente
 * real que lo respalde), tokens de Conect.ia y textos en español.
 */
import * as React from 'react';

export interface FooterLink {
  label: string;
  /** Ancla o ruta. Si se da `onClick`, se muestra como botón. */
  href?: string;
  onClick?: () => void;
}

export interface FooterColumn {
  title: string;
  links: FooterLink[];
}

export interface SiteFooterProps {
  brand: React.ReactNode;
  description: string;
  columns: FooterColumn[];
  bottomLinks: FooterLink[];
  copyright: string;
}

const claseEnlace =
  'group/link inline-flex min-h-10 items-center text-left text-sm font-normal text-muted-foreground transition-colors duration-150 hover:text-foreground';

function Enlace({ link }: { link: FooterLink }) {
  const contenido = <span className="transition-transform duration-150 group-hover/link:translate-x-0.5">{link.label}</span>;
  return link.onClick ? (
    <button type="button" onClick={link.onClick} className={claseEnlace}>
      {contenido}
    </button>
  ) : (
    <a href={link.href} className={claseEnlace}>
      {contenido}
    </a>
  );
}

export function SiteFooter({ brand, description, columns, bottomLinks, copyright }: SiteFooterProps) {
  return (
    <footer className="border-t border-border bg-background">
      <div className="mx-auto max-w-6xl px-6 py-12 lg:py-16">
        <div className="flex flex-col gap-10 lg:flex-row lg:gap-16">
          <div className="shrink-0 lg:max-w-[300px]">
            {brand}
            <p className="mt-4 text-sm leading-relaxed text-muted-foreground">{description}</p>
          </div>

          <div className="grid flex-1 grid-cols-2 gap-x-8 gap-y-10 sm:grid-cols-3">
            {columns.map((col) => (
              <nav key={col.title} aria-label={col.title}>
                <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">{col.title}</p>
                <ul className="mt-3">
                  {col.links.map((link) => (
                    <li key={link.label}>
                      <Enlace link={link} />
                    </li>
                  ))}
                </ul>
              </nav>
            ))}
          </div>
        </div>

        <div className="mt-12 flex flex-col items-start justify-between gap-3 border-t border-border pt-6 sm:flex-row sm:items-center">
          <p className="text-sm text-muted-foreground">{copyright}</p>
          <div className="flex flex-wrap items-center gap-x-5">
            {bottomLinks.map((link) => (
              <Enlace key={link.label} link={link} />
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
}
