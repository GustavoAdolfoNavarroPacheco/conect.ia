/**
 * Adaptado de "account-menu" de Ruixen UI (MIT, © 2025 Ruixen UI, ver LICENSE.md).
 * Menú con secciones (Cuenta, Preferencias, Acciones), submenú de tema con radios y salida destacada.
 * Cambios: disparador de avatar, cabecera con nombre y correo, opciones reales de Conect.ia
 * (Ajustes, Canales, tema, paleta de comandos, cerrar sesión), filas de 40 px y tokens de la marca.
 * Usa el menú de Radix del proyecto (flechas, escritura rápida y cierre con Escape ya incluidos).
 */
import * as React from 'react';
import { Command, LogOut, Moon, Palette, Settings, Share2, Sun } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuPortal,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from '../ui/dropdown-menu';

export interface AccountMenuProps {
  nombre: string;
  email: string;
  iniciales: string;
  tema: 'light' | 'dark';
  onTema: (tema: 'light' | 'dark') => void;
  onAjustes: () => void;
  onCanales: () => void;
  onPaleta: () => void;
  onCerrarSesion?: () => void;
}

const FILA = 'min-h-10 gap-3 rounded-[8px] px-3 text-sm [&_svg]:h-4 [&_svg]:w-4';

export function AccountMenu({ nombre, email, iniciales, tema, onTema, onAjustes, onCanales, onPaleta, onCerrarSesion }: AccountMenuProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          aria-label="Menú de perfil"
          className="press flex h-10 w-10 items-center justify-center rounded-[10px] transition-colors duration-150 hover:bg-accent data-[state=open]:bg-accent"
        >
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-brand text-xs font-semibold text-white">{iniciales}</span>
        </button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" sideOffset={8} className="w-72 rounded-[12px] border-border bg-popover p-1.5 text-popover-foreground shadow-[var(--elev-float)]">
        <div className="flex items-center gap-3 px-3 py-2.5">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand text-sm font-semibold text-white">{iniciales}</span>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold" title={nombre}>
              {nombre}
            </p>
            <p className="truncate text-xs text-muted-foreground" title={email}>
              {email}
            </p>
          </div>
        </div>

        <DropdownMenuSeparator />
        <DropdownMenuLabel className="px-3 text-xs font-semibold text-muted-foreground">Cuenta</DropdownMenuLabel>
        <DropdownMenuItem className={FILA} onSelect={onAjustes}>
          <Settings />
          <span className="flex-1">Ajustes</span>
        </DropdownMenuItem>
        <DropdownMenuItem className={FILA} onSelect={onCanales}>
          <Share2 />
          <span className="flex-1">Canales</span>
        </DropdownMenuItem>

        <DropdownMenuSeparator />
        <DropdownMenuLabel className="px-3 text-xs font-semibold text-muted-foreground">Preferencias</DropdownMenuLabel>
        <DropdownMenuSub>
          <DropdownMenuSubTrigger className={FILA}>
            <Palette />
            <span className="flex-1">Tema</span>
          </DropdownMenuSubTrigger>
          <DropdownMenuPortal>
            <DropdownMenuSubContent className="w-44 rounded-[12px] border-border bg-popover p-1.5 shadow-[var(--elev-float)]">
              <DropdownMenuRadioGroup value={tema} onValueChange={(v) => onTema(v as 'light' | 'dark')}>
                <DropdownMenuRadioItem value="light" className={FILA}>
                  <Sun />
                  <span className="flex-1">Claro</span>
                </DropdownMenuRadioItem>
                <DropdownMenuRadioItem value="dark" className={FILA}>
                  <Moon />
                  <span className="flex-1">Oscuro</span>
                </DropdownMenuRadioItem>
              </DropdownMenuRadioGroup>
            </DropdownMenuSubContent>
          </DropdownMenuPortal>
        </DropdownMenuSub>
        <DropdownMenuItem className={FILA} onSelect={onPaleta}>
          <Command />
          <span className="flex-1">Buscar y saltar</span>
          <DropdownMenuShortcut>Ctrl K</DropdownMenuShortcut>
        </DropdownMenuItem>

        {onCerrarSesion && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              variant="destructive"
              className={`${FILA} text-destructive focus:bg-destructive-soft focus:text-destructive`}
              onSelect={onCerrarSesion}
            >
              <LogOut />
              <span className="flex-1">Cerrar sesión</span>
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
