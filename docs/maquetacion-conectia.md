# Maquetación de Conect.ia: especificación para implementación

**Para:** Opus 5.5
**Principios de diseño:** [guia-diseno-confort.md](guia-diseno-confort.md) (copia de la guía de confort inspirada en Apple)
**Estado:** propuesta de maquetación pendiente de implementar. Revisada contra el código y contra la guía (ver sección 10).

---

## 0. Encargo para Opus 5.5

Lee esta sección antes de tocar código.

1. **Implementa** la maquetación de este documento en la app autenticada (shell y 8 pantallas) y en la pantalla de acceso. Sigue el orden de la sección 8.
2. **Después de implementarla, revisa tu propia maquetación y mejórala.** Esta especificación es un punto de partida, no el resultado final. Los valores aquí escritos pueden romper la composición real: renderiza, observa qué falla y corrígelo.
3. Antes de dar la tarea por cerrada, renderiza a estos anchos: **320, 360, 390, 639, 640, 767, 768, 1023, 1024, 1279, 1280 y 1440 px**. Añade las alturas cortas **1024×640** y **1280×720**. Comprueba modo claro y oscuro, navegación por teclado y `prefers-reduced-motion`. Aplica la lista de revisión de la guía (sección 21).
4. Si cambias un valor de esta especificación, anótalo en el resumen final con su motivo. No dejes desviaciones sin documentar.
5. **Fuera de alcance:** landing pública (`LandingPage` en `App.tsx`), páginas legales (`/privacidad`, `/terminos`) y modo diseño (`productionMode=false`).
6. **Commits:** mensaje exacto `conect.ia`. No hagas push sin confirmación de la persona usuaria.

---

## 1. Decisión previa: base de 16px

Hoy `html` tiene `font-size: 15px` (`frontend/src/styles/theme.css:12` y `:244`). Tailwind mide todo en `rem`, así que cada medida del código está escalada a 15px:

| Clase | Medida actual | Medida real que debería tener |
|---|---|---|
| `w-64` (sidebar) | 240px | 256px |
| `h-11` (botón lg, campo de acceso) | 41.25px | 44px |
| `max-w-md` (tarjeta de acceso) | 420px | 448px |
| `p-5` (cuerpo de Panel) | 18.75px | 20px |
| `text-xs` | 11.25px | 12px |
| `text-sm` | 13.1px | 14px |

**Primer paso obligatorio:** cambiar `--font-size` a `16px` en `theme.css`. Con esto, la rejilla de 4px se cumple exacta. Además, `text-xs` pasa a 12px, que cumple la guía (§5: textos auxiliares que no cuesten leer). Revisa el resultado visual después del cambio.

**Tokens de tipografía a ajustar en `theme.css`** (ver sección 2.5): las alturas de línea de `--text-xs`, `--text-sm`, `--text-base` y `--text-2xl` deben quedar en múltiplos de 4.

---

## 2. Tokens de maquetación

### 2.1 Espaciado

Escala (px): **4 · 8 · 12 · 16 · 20 · 24 · 32 · 40**. En Tailwind: `1`=4, `2`=8, `3`=12, `4`=16, `5`=20, `6`=24, `8`=32, `10`=40.

| Relación | Separación |
|---|---|
| Dentro de un control (icono y texto) | 8 |
| Elementos de un mismo grupo (etiqueta y campo, valor y descripción) | 8 |
| Entre elementos de un bloque | 12 |
| Entre bloques dentro de una sección | 16 |
| Entre secciones de una pantalla | 24, en todos los anchos |

| Espacio | Valor |
|---|---|
| Margen exterior del contenido de la pantalla | 16 (menos de 640) · 24 (640–1023) · 32 (1024 o más) |
| Padding horizontal de cabecera, cuerpo y pie de Panel | 20 (menos de 1024) · 24 (1024 o más) |
| Padding interno de Card | 24 (excepción: tarjetas de estadísticas de Inicio, 20, porque tres columnas caben en 640px) |
| Padding del cuerpo de Modal | 24. Cabecera y pie: 24 horizontal y 16 vertical (compactan la altura) |
| Padding de la tarjeta de acceso | 32 (menos de 640) · 40 (640 o más) |

Anchos máximos: contenido funcional **1440px**; formularios y ajustes **1100px**; tarjeta de acceso **448px**.

### 2.2 Radios

| Radio | Uso |
|---|---|
| 6 | Badge, checkbox, ítems de Segmented, líneas de skeleton |
| 10 | Controles: botones, campos, contenedor de Segmented, botones de icono, ítems de navegación, cuadros de IconTile |
| 12 | Avisos (Notice), toasts, popovers, menú Dropdown |
| 16 | Superficies (Panel, Card, tarjeta de acceso) y modal |

Regla: los cuadros de icono (IconTile, EmptyState) usan radio 10 en todos los componentes. El radio 16 es solo para superficies y modales.

### 2.3 Alturas de control

Regla: **ningún control interactivo mide menos de 40px de alto**, y debe haber al menos 8px entre controles. No existe el tamaño `sm` de control.

| Tamaño | Alto | Uso |
|---|---|---|
| md | 40 | Botones de barra y de tarjeta, botones de icono de la topbar, ítems de navegación, ítems de Segmented (contenedor de 48), acciones de tabla y de tarjeta, chips, filas de Dropdown |
| lg | 44 | Campos de formulario, botones de acción de formulario, botón Guardar de Ajustes, acceso |

### 2.4 Elevación

- **Sin sombra:** sidebar, topbar y Panel (Panel usa solo borde de 1px del token `border`).
- **`elev-sm`:** Card.
- **`elev-md`:** hover de Card interactiva y tarjeta de acceso (en lugar de `shadow-lg`).
- **`float`:** solo elementos flotantes: popovers, Dropdown, drawer, modal, toast. Sustituye a `shadow-lg`.

Valores propuestos para definir en `theme.css`, a verificar en modo oscuro:
- `elev-sm`: `0 1px 2px rgb(0 0 0 / .04), 0 2px 8px rgb(0 0 0 / .05)`
- `elev-md`: `0 4px 16px rgb(0 0 0 / .08)`
- `float`: `0 12px 32px rgb(0 0 0 / .12)`

Color muted y placeholder: contraste mínimo **4.5:1** sobre `card` y `background`, en ambos modos. El placeholder usa el color muted al 100%, no al 80%.

### 2.5 Tipografía (base 16px)

Tokens de `theme.css` que deben quedar así:

| Token | Tamaño / interlineado |
|---|---|
| `--text-xs` | 12 / 16 |
| `--text-sm` | 14 / 20 |
| `--text-base` | 16 / 24 |
| `--text-lg` | 18 / 24 |
| `--text-2xl` | 24 / 32 |

Cuerpo base: `line-height: 1.5` en `body`.

| Rol | Clase de referencia | Peso |
|---|---|---|
| Título de página (h1) | `text-2xl`, 24 / 32 | 600 |
| Título de Panel | `text-sm`, 14 / 20 | 600 |
| Título de modal | `text-base`, 16 / 24 | 600 |
| Subtítulo de página | `text-sm`, 14 / 20, muted | 400 |
| Cuerpo | `text-base`, 16 / 24 | 400 |
| Etiqueta de campo y texto de control | `text-sm`, 14 / 20 | 500 |
| Auxiliar, metadatos y legal | `text-xs`, 12 / 16, muted | 400 |
| Cifras de estadísticas | `text-2xl`, 24 / 32, `tabular-nums` | 600 |

Mínimo: 12px. No usar mayúsculas generalizadas (guía §5). Los títulos de grupo de la navegación pasan a 12px semibold en tipo normal, sin mayúsculas. Fechas, horas, contadores y cifras de tabla usan `tabular-nums`.

### 2.6 Movimiento

- **Dos duraciones:** **150ms** para microinteracciones (pulsación, cambios de color, hover de tarjeta) y **240ms** para todo lo que entra o sale (paneles, popovers, drawer, modal, toasts, cambio de pantalla, toggles, `animate-enter`).
- **Curva única:** `cubic-bezier(0.22, 1, 0.36, 1)`, que ya es `--ease-out`.
- **Sin rebote.** Los springs del menú, del drawer y del Segmented pasan a tween.
- **Sin escalonado** entre elementos de una misma pantalla: la entrada se aplica al contenedor de la pantalla, no a cada fila.
- **Movimiento reducido:** `MotionConfig` en la raíz (sección 6).

---

## 3. Shell autenticado

### 3.1 Estructura por ancho

| Ancho | Navegación | Topbar | Área principal |
|---|---|---|---|
| Menos de 1024px | Drawer de 288px, abierto con el botón de menú | Menú, logo (icono de 32px desde 768), búsqueda (desde 768), tema, notificaciones, perfil | Una columna. Es el único contenedor con scroll. Los Paneles crecen con su contenido |
| 1024px o más | Sidebar fija de 256px | Búsqueda, tema, notificaciones, perfil | Ancho disponible. Sin scroll en `main`: cada pantalla tiene un único scroll interno |

La raíz ocupa `h-dvh` con `flex` y `overflow-hidden`. La topbar es `sticky`.

### 3.2 Sidebar (1024 o más)

- Ancho **256px** (`w-64` con base 16px). Borde derecho de 1px en `sidebar-border`.
- Cabecera de **64px** de alto, padding horizontal 20. Logo tamaño md.
- Navegación: **padding horizontal 8** y vertical 20. Separación entre grupos de 24.
- Título de grupo: 12/16 semibold, muted, padding horizontal 12, inferior 8. Con padding 12 y el padding de 8 del contenedor, el texto queda en x=20, igual que el logo.
- Ítems apilados con 4px entre ellos. Cada ítem mide **40px de alto**, padding horizontal 12, **gap 8** entre icono y texto, radio 10, texto 14 medium, icono 18. El texto queda en x=20.
- **Sección activa:** fondo `brand-soft`, texto `brand-strong`, barra de 3px en el borde izquierdo con 8px de margen arriba y abajo, `aria-current="page"`.
- **Inactivo:** texto muted; hover con fondo `accent`.
- Pie del sidebar: padding vertical 12, horizontal 20, borde superior. Avatar de 36px en x=20. Nombre (14 medium) y correo (12 muted), ambos truncados.
- **Cerrar sesión:** no va en el pie del sidebar. Queda solo en el menú de perfil (sección 3.4). Hoy aparece en tres sitios (sección 7).

### 3.3 Drawer (menos de 1024)

- Ancho **288px** (`w-72`), altura completa, fondo `sidebar`, `float`.
- Entrada y salida: deslizar desde la izquierda, **240ms** con `--ease-out`. Fondo negro al 40%, con el mismo fade de 240ms.
- Semántica: `role="dialog"`, `aria-modal="true"`, `aria-label="Menú principal"`.
- Al abrir, el foco va al botón de cerrar. Tab queda atrapado dentro del drawer. Escape cierra y devuelve el foco al botón de menú.
- Al abrir, `main` y la topbar reciben `inert`; al cerrar, se quita. Así el foco y los lectores de pantalla no alcanzan el contenido de detrás.
- Se cierra al elegir un ítem.

### 3.4 Topbar

- Alto **64px**. Padding horizontal: **16** (menos de 640), **24** (640–1023), **32** (1024 o más). Coincide con el margen del área principal.
- Fondo `card` al 94%, con borde inferior y sin sombra. El desenfoque (`backdrop-filter`) es opcional y solo desde 1024, por coste de rendimiento.
- Botones de icono de **40×40**, separados 8px.
- **Logo:** tamaño md desde 1024; icono de 32px entre 768 y 1023; menos de 768, icono de 32px junto al botón de menú.
- **Búsqueda:**
  - Desde 768: campo de 40px de alto, `flex-1`, `min-w` 192px y `max-w` 384px.
  - Menos de 768: botón de lupa de 40px. Al pulsarlo, el campo ocupa todo el ancho de la topbar (tapa logo y menú) con botón de cerrar.
- **Perfil (disparador):** avatar de 28px. El nombre va dentro del popover, no en la barra.
- **Tema:** un solo control, en la topbar. Se quita del menú de perfil.
- **Notificaciones:**
  - Ancho `min(320px, 100vw - 32px)`, alineado a la derecha del botón, con 8px de separación.
  - Menos de 640: el popover ocupa el ancho del viewport con 16px a cada lado, debajo de la topbar.
  - Lista con `max-height: min(448px, 60dvh)` y scroll interno. Máximo 8 ítems visibles.
- **Perfil (popover):** 256px de ancho. Opciones de 40px de alto. **Cerrar sesión solo aquí.**

### 3.5 Área principal y cambio de pantalla

- Padding: 16 (menos de 640), 24 (640–1023), 32 (1024 o más). Separación entre secciones de la pantalla: 24 en todos los anchos (`gap-6`). Dentro de una sección, 16.
- Ancho máximo: 1440px en pantallas funcionales; 1100px en formularios y ajustes.
- **Scroll:**
  - Menos de 1024: `main` es el único contenedor de scroll. Los Paneles no tienen altura fija ni scroll interno; crecen con su contenido.
  - 1024 o más: `main` no desplaza. Cada pantalla ocupa el alto disponible y tiene **un único scroll interno** (un Panel o la lista principal). No anidar dos scrolls en la misma vista.
- **Transición entre pantallas:** 240ms, de opacidad 0 a 1 con desplazamiento vertical de 8px. Entrada y salida simultáneas (`mode="popLayout"`), para que la pantalla nueva no espere a que termine la anterior.

---

## 4. Primitivos

| Primitivo | Especificación |
|---|---|
| **Button** | md 40px (padding horizontal 16, texto 14 medium) · lg 44px (padding horizontal 20, texto 14 medium). Radio 10. Iconos 16 (md) y 18 (lg). Primary: fondo `brand`; hover, fondo `brand-strong`, **sin glow ni sombra**. Secondary y outline con borde. Ghost sin fondo. Destructive en rojo. Disabled: 50% de opacidad y cursor no permitido. |
| **Campo (`.field`)** | Alto **44px** en formularios. Padding horizontal 16. Radio 10. Borde en `input`. Texto 14. Placeholder en muted al 100% (§2.4). Hover: borde brand al 35%. Focus: borde brand y halo de 3px al 18%. |
| **Etiqueta y ayuda** | Etiqueta 14 medium, con 8px hasta el campo. Ayuda 12 muted. Error 12 en `destructive`, con 4px de separación del campo. |
| **Textarea** | Igual que el campo, con padding vertical 12, interlineado 20px y altura mínima 44. |
| **Toggle** | Pista de 40×24, radio completo. Botón de 20px. Transición de 240ms. La zona de activación es **toda la fila** (etiqueta y descripción), con altura mínima de 40. Etiqueta 14 medium, descripción 12 muted. |
| **Checkbox** | Caja de 18px con radio 6. Etiqueta 14 medium, separada 12px de la caja. La zona de activación es la fila completa, con altura mínima de 40. |
| **Badge** | Alto 24. Padding horizontal 8. Radio 6. Texto 12 medium. El texto de estado usa capitalización de frase. No es un control interactivo. |
| **Card (`.surface`)** | Padding 24 (excepción de §2.1). Radio 16. Sombra `elev-sm`. Si es interactiva, hover: `elev-md`. Sin cambio de borde al hover. |
| **Panel** | Sin sombra, con borde de 1px. Cabecera de 56px con padding horizontal 20 (24 desde 1024) y borde inferior. Cuerpo con padding 20 (24 desde 1024). Pie con padding horizontal 20 (24 desde 1024) y vertical 12, fondo `accent` al 40%. |
| **Modal** | Ancho 448px. Radio 16. Altura máxima `88dvh`. Cuerpo con padding 24 y scroll interno. Cabecera y pie: 24 horizontal y 16 vertical. Desde menos de 640px se muestra como **hoja inferior** a ancho completo, con radio 16 solo en las esquinas superiores y padding inferior `max(24px, env(safe-area-inset-bottom))`. Mientras está abierto, bloquea el scroll de la página. Escape, clic en el fondo y botón de cerrar lo cierran. Atrapa el foco y lo devuelve al disparador al cerrar. |
| **Toast** | `fixed inset-x-4 bottom-4` en móvil; `sm:inset-x-auto sm:right-5 sm:bottom-5` desde 640. Ancho máximo 384. Radio 12. **No se coloca arriba a la derecha**, porque tapa notificaciones y perfil. Duración de 5s (8s si tiene acción), se pausa al hover o foco, cierre manual. Usa `role="status"`; los errores usan `role="alert"`. En el Asistente, se ancla 16px por encima del composer. |
| **Notice** | Radio 12, padding vertical 12 y horizontal 16, separación 12, texto 14. Usar siempre junto al contenido afectado, no solo como toast. |
| **Segmented** | Contenedor con padding 4, radio 10 y fondo `secondary`. Ítems de **40px** (contenedor de 48), padding horizontal 12, texto 14, radio 6. Activo: fondo `card` y `elev-sm`. Rol `radiogroup`; las flechas cambian la selección. |
| **EmptyState** | Altura mínima 220. Cuadro de icono de 48 con radio 10. Título 14 semibold. Texto 14 muted, máximo 320px de ancho. Acción con 20px de margen superior. |
| **IconTile** | 36px por defecto, 44px en tarjetas de estadísticas y de canal. Radio 10. Icono 18 (20 en la variante de 44px). |
| **Skeleton** | Radio 6 en líneas de texto, 10 en controles y 16 en superficies. **Con las mismas dimensiones que el contenido final**, para que no haya salto de maquetación al cargar. Animación: opacidad de 0.6 a 1 en 1.2s, `ease-in-out`. Con movimiento reducido, estático. |
| **Dropdown** | Ancho igual al disparador. Alto del disparador: 44 en formularios, 40 en barra. Ítems de 40px. Menú con radio 12, sombra `float`, altura máxima 256 con scroll. Abre hacia abajo, o hacia arriba si no hay espacio. Se renderiza en un **portal**, para que no lo recorte un Panel con `overflow-hidden`. Estado vacío en 14 muted. |

---

## 5. Pantallas

Cada pantalla indica su maquetación en **escritorio** (1024 o más), **tableta** (768–1023) y **móvil** (menos de 768). Los estados (carga, vacío, error) se resumen en la sección 5.10.

### 5.1 Inicio

- **Cabecera:** título "Hola, {nombre}" (o "Panel principal" si no hay nombre) y subtítulo. Es la **única** acción "Nueva publicación" de la pantalla: a la derecha en escritorio y tableta; debajo del título, a ancho completo, en móvil.
- **Estadísticas:** tres tarjetas. Menos de 640: apiladas, una columna. 640 o más: tres columnas con separación de 16. Cada tarjeta con padding 20 (excepción de §2.1), etiqueta 14 muted, cifra 24 semibold con `tabular-nums` e icono de 44px.
- **Bloque principal:** por debajo de 1024, Actividad y después Accesos, apilados. Desde 1024: `minmax(0,1fr) 320px` con separación de 24.
- **Actividad:** Panel con scroll interno, que es el único scroll de la pantalla desde 1024. Cada fila mide al menos 56px, con icono de 36px, texto 14 y fecha 12.
- **Accesos rápidos:** tres filas de 40px de alto: Subir publicación, Calendario y Asistente IA. "Nueva publicación" queda solo en la cabecera.

### 5.2 Nueva publicación

- **Cabecera:** título y subtítulo, sin CTA. La acción principal está en el formulario.
- **Selector de redes (`RedSelector`):** bajo el título del Panel Contenido, como chips de 40px de alto con `aria-pressed`, selección múltiple.
- **Disposición:** por debajo de 1024, Contenido y después Vista previa, apilados. Desde 1024: dos columnas iguales (`1fr 1fr`) con separación de 24.
- **Panel Contenido:** cuerpo con scroll interno desde 1024. Pie fijo con "Generar con IA" (primary, ocupa el resto del ancho) y "Limpiar" (ghost). Si hay contenido, "Limpiar" abre un modal de confirmación; si no lo hay, queda desactivado.
- **"Generar con IA" sobre texto existente:** si ya hay texto, pide confirmación antes de sustituirlo.
- **Panel Vista previa:** sin contenido, `EmptyState`. Con contenido, la vista previa con altura máxima de 420px y la relación de aspecto de la imagen o del vídeo. **Muestra la red seleccionada**, no una fija.
- **Pie de publicación** (al final del Panel Vista previa, solo con contenido):
  1. Segmented "Ahora / Programar" a ancho completo.
  2. Solo en "Programar": fecha y hora en la misma fila (fecha `1fr`, hora 120px). Por debajo de 400px de ancho, fecha y hora se apilan a ancho completo.
  3. Bloque plegable **"Opciones de programación"** con zona horaria y repetición, visible solo al elegir Programar. Reduce la cantidad de decisiones a la vez.
  4. Acciones: "Guardar borrador" (outline) y "Publicar" o "Programar" (primary). Menos de 640: a ancho completo y apiladas. 640 o más: en fila y alineadas a la derecha.

### 5.3 Subir publicación

- **Escritorio grande (1280 o más):** editor (`1.1fr`) | vista previa (`1fr`) | publicación (340px).
- **Escritorio (1024–1279):** editor (`1fr`) | publicación (360px). La vista previa se abre con el botón "Vista previa" de la cabecera del Panel Editor, alineado a la derecha, que muestra un modal.
- **Tableta y móvil:** editor y publicación apilados. La vista previa, en modal con el mismo botón.
- **Panel Publicación:** redes, Ahora/Programar y fecha y hora, en el mismo orden que §5.2. El botón principal va a ancho completo al final del panel; "Guardar como borrador" debajo, como outline. Desde 1280, el bloque de acciones queda pegado al fondo del panel.
- **Editor:** textarea de altura mínima 160. Contador "x / 3000" en 12px. Al superar 3000, el contador pasa a `destructive`, el botón de publicar se desactiva y el motivo aparece junto a él.
- **Medios:** grid `repeat(auto-fill, minmax(72px, 1fr))` con separación de 8. Miniaturas cuadradas. El botón "Añadir" es una celda más. Máximo de medios: "Añadir" se desactiva con su motivo. Subida en curso: progreso en la miniatura.

### 5.4 Borradores

- **Cabecera:** título, Segmented de filtro y contador. Con más de tres filtros, o por debajo de 640, el filtro es un Dropdown de ancho completo.
- **Desde 768:** Panel con tabla.
  - Cabecera de tabla sticky: `top` 64px por debajo de 1024 y `top` 0 dentro del Panel desde 1024. Altura 44, texto 12 semibold muted.
  - Filas de al menos 56px.
  - Columnas: **Título** (flexible, `min-w` 192px, truncado a una línea; el título es el botón que abre el borrador), **Redes** (avatares), **Estado** (badge), **Fecha** (sin salto de línea), **Acciones** (botones de 40×40 siempre visibles, en tono muted, con `aria-label`). "Eliminar" va separado 16px del resto o dentro de un menú "…".
  - Paginación de 20 filas con controles de 40px en el pie del Panel. El filtro y el contador se mantienen al cambiar de página.
- **Menos de 768:** sin tabla. Lista de tarjetas: título de hasta dos líneas, estado y fecha en una línea, redes y acciones en una fila.
- **Eliminar:** modal de confirmación (no `confirm()` nativo).

### 5.5 Calendario

- **Escritorio (1024 o más):** `minmax(0,1fr) 320px` con separación de 24. Panel Mes (sin scroll) y Panel Día (con scroll). Por debajo de 1024, Mes y después Día, apilados.
- **Mes:** cabecera con el título del mes (primera letra en mayúscula), botón "Hoy" y flechas de 40×40. Fila de días en 12 muted.
- **Celdas:** altura mínima 56px en escritorio, 44px en móvil y **48px cuando el alto de la ventana es menor de 720px**, para que quepan seis semanas. Número del día de 14px dentro de un círculo de 28px. Hoy: anillo brand. Día seleccionado: fondo `brand-soft`. Área de activación de al menos 40×44 aunque el círculo mida 28px. Por debajo de 360px, padding del Panel de 8.
- **Indicadores:** hasta tres puntos o barras de 6px y "+N" si hay más. Cada indicador tiene `aria-label` con el recuento y el estado en texto (por ejemplo, "2 publicaciones: 1 programada, 1 publicada").
- **Navegación por teclado:** las celdas usan roving tabindex; las flechas mueven el foco entre días.
- **Día:** cabecera con la fecha completa. Tarjetas de publicación con imagen de 112px de alto, título, hora y acciones (`flex-wrap`, separación 8): "Ver" (abre la publicación en solo lectura), "Reprogramar" (abre un modal con fecha, hora y zona, en el formato de §5.2) y "Eliminar". "Publicar" solo en las vencidas.
- **Arrastrar para reprogramar** sigue disponible como atajo, pero el botón "Reprogramar" es la vía principal.
- **Móvil:** al elegir un día, el foco pasa al encabezado del Panel Día y la página se desplaza hasta él.

### 5.6 Asistente IA

- **Escritorio (1024 o más):** `minmax(0,1fr) 300px` con separación de 24. Panel de chat a altura completa: mensajes con scroll interno y composer fijo abajo. Textarea de altura mínima 44 que crece hasta 120. Botón de enviar de 44×44.
- **Por debajo de 1024:** el chat tiene altura `calc(100dvh - 96px)` con margen de 16 (menos de 640), o `calc(100dvh - 112px)` con margen de 24 (de 640 a 1023). Mínimo 420px. **Esta altura definida es imprescindible:** sin ella, el composer queda debajo de todo el historial.
- **Acciones rápidas:** por debajo de 1024, van como fila de atajos de 40px encima del hilo, con ajuste en varias líneas y sin scroll horizontal. Desde 1024, en el panel lateral (CTA "Generar publicación" primary, cuatro atajos y sugerencias).
- **Teclado:** Enter envía; Shift+Enter inserta un salto de línea.
- **Burbujas:** máximo 85% del ancho, con `overflow-wrap: anywhere`. Las acciones de cada respuesta se alinean con la burbuja.
- **Respuesta en curso:** texto discreto "Escribiendo…" (12 muted) y el botón de enviar pasa a "Detener".
- **Errores de la IA:** un `Notice` dentro del hilo, con acción "Reintentar". No basta con cambiar la píldora del encabezado.
- **Región de chat:** `aria-live="polite"` que anuncia la respuesta completa, no cada fragmento.
- **Móvil:** el meta viewport de `index.html` debe incluir `interactive-widget=resizes-content` para que el teclado virtual no tape el composer. Verifícalo en un dispositivo o emulador.

### 5.7 Canales

- **Cabecera:** título y subtítulo. Sin acciones globales. `Notice` de OAuth cuando corresponda.
- **Indicadores:** una columna por debajo de 640; tres columnas desde 640, separación de 16.
- **Grid de canales:** una columna por debajo de 640; dos entre 640 y 1279; tres desde 1280. Separación de 16. Desde 1024, el grid es el único área con scroll de la pantalla.
- **Tarjeta:** padding 24, separación interna de 16. Cabecera con icono de 44px, nombre (14 semibold) y badge de estado. Descripción en 14 muted. Pie con `mt-auto`, acciones de 40px con `flex-wrap` y separación de 8.
- **Desconectar:** modal de confirmación.

### 5.8 Ajustes

- **Ancho máximo:** 1100px.
- **Escritorio (1024 o más):** dos columnas iguales (`1fr 1fr`) con separación de 24. Izquierda: "Automatización Make / n8n". Derecha: "Preferencias" y "Secretos del servidor", apilados con 24 de separación.
- **Por debajo de 1024:** todo apilado.
- **Guardar:** botón de 44px en la cabecera (lg). Mientras no haya cambios pendientes, está desactivado y se muestra el texto **"Sin cambios pendientes"** (12 muted) junto a él, que desaparece en el primer cambio. Se desactiva también mientras se guarda, sin usuario o durante la carga.
- **Por debajo de 1024:** una barra inferior sticky con el botón Guardar, con `env(safe-area-inset-bottom)`, visible mientras haya cambios.
- **Campos:** URL del webhook a 44px. Textos de ayuda 12 muted. Los campos de secreto usan `type="password"`; si ya hay un valor, se muestra "Configurado" sin el valor y un botón "Reemplazar".
- **Salir con cambios pendientes:** modal "Tienes cambios sin guardar" con Guardar, Descartar y Seguir editando.

### 5.9 Acceso

- **Fondo:** `ambient-light`. Contenedor `min-h-dvh` con el contenido centrado vertical y horizontalmente (`my-auto` en la tarjeta) y padding de 16. Si no cabe, la página desplaza.
- **Tarjeta:** ancho máximo 448px. Padding 32 (menos de 640) y 40 (640 o más). Radio 16. Sombra `elev-md` (en lugar de `shadow-lg`). Animación `animate-enter`.
- **"Volver al inicio":** fuera de la tarjeta, alineado a su borde izquierdo y 16px por encima.
- **Logo:** centrado, tamaño lg, con 12px hasta el subtítulo.
- **Subtítulo:** 14 muted, centrado.
- **Modo:** Segmented de dos opciones ("Entrar" / "Crear cuenta") entre el subtítulo y el formulario, con 24px a cada lado.
- **Formulario:** bloques apilados con 16. Campos y botón principal de 44px a ancho completo. Los requisitos de la contraseña se muestran antes de escribir (guía §12).
- **Separador "o":** margen vertical de 20.
- **Google:** botón de 44px a ancho completo, con estilo secundario (borde y fondo `card`).
- **Errores:** por campo, texto 12 en `destructive` bajo el campo. Un `Notice` general, encima del formulario, solo para fallos de servidor. Las credenciales incorrectas no indican qué dato falló.
- **Pie legal:** 12 muted, centrado, con 32px de margen superior.

### 5.10 Estados por pantalla (resumen)

Todas las pantallas definen carga (skeleton con la forma final), vacío y error. Lo específico de cada una:

- **Inicio:** skeleton de las tres tarjetas y cinco filas de Actividad. Vacío de Actividad con acción "Subir publicación" (no repetir "Nueva publicación"). Cifras a cero se muestran como 0. Nombres largos: una línea con truncado y `title`.
- **Nueva publicación:** skeleton del Panel Vista previa. Error de generación: `Notice` en Contenido con "Reintentar", conservando el texto. Sin red seleccionada: `Notice` junto al selector y "Publicar" desactivado con su motivo. Contador con el límite de la red seleccionada. Error al publicar: `Notice` junto al pie, con los datos conservados.
- **Subir publicación:** skeleton del editor. Sin medios, la celda "Añadir" basta. Error de subida, formato o tamaño no admitido: `Notice` bajo la cuadrícula con "Reintentar".
- **Borradores:** skeleton de cinco filas (tabla) o cuatro tarjetas (móvil). Vacío total y vacío por filtro son distintos: "No hay borradores en este estado" con "Ver todos". Error: `Notice` sobre la tabla con "Reintentar". Fecha o redes vacías: "Sin fecha" y "Sin redes", en 12 muted.
- **Calendario:** skeleton de seis filas en el Mes y del Panel Día. Error: `Notice` sobre Mes y Día, con las celdas navegables. Publicación en curso: badge "Publicando". Fallo de una publicación: `Notice` en su tarjeta con "Reintentar".
- **Asistente IA:** vacío inicial con texto de 14 muted y dos ejemplos de petición. Cargando: indicador en la burbuja y botón "Detener". Código largo: bloques con scroll horizontal propio.
- **Canales:** vacío con `EmptyState` "Todavía no hay canales" y "Conectar" en cada canal. Error de carga: `Notice` con "Reintentar". Estados por canal: conectado (badge con texto), desconectado, token caducado (`Notice` en la tarjeta con "Reconectar") y error de publicación. "Conectar" en curso: botón con estado de carga.
- **Ajustes:** error de carga: `Notice` con "Reintentar" y campos deshabilitados. Error al guardar: `Notice` en la cabecera, conservando los cambios. Skeleton de campos durante la carga.
- **Acceso:** envío con indicador de carga y campos bloqueados. Requisitos de contraseña visibles antes de escribir.
- **Global:** sesión caducada: volver a Acceso con `Notice` "Tu sesión ha caducado". Sin conexión: `Notice` persistente en la topbar, y las acciones que requieren red quedan desactivadas con su motivo.

---

## 6. Accesibilidad y movimiento

- `MotionConfig reducedMotion="user"` en la raíz de la app. La regla CSS de `theme.css` no cubre las animaciones de motion/react (drawer, transiciones y `layoutId`).
- Foco visible en todos los controles (`:focus-visible` global), con borde brand y halo de 3px.
- Objetivos táctiles de al menos 40×40, con separación de al menos 8.
- Todo control tiene nombre accesible. Los botones solo de icono llevan `aria-label`.
- Popovers y Dropdown: `aria-expanded` en el disparador; el foco entra al abrir y vuelve al disparador al cerrar.
- Los mensajes de estado usan `role="status"` (información y éxito) o `role="alert"` (errores).
- El estado nunca depende solo del color: los badges y los indicadores llevan texto.
- Las acciones destructivas se confirman con modal, no con `confirm()` nativo.
- Áreas seguras: topbar y drawer con `env(safe-area-inset-top)`; composer, toasts y hojas inferiores con `env(safe-area-inset-bottom)`.

---

## 7. Problemas detectados en el código actual

Ordenados por prioridad. Las referencias son de `frontend/src/app/App.tsx` salvo que se indique otra ruta.

1. **Base de 15px:** todas las medidas `rem` están escaladas (sección 1).
2. **Sidebar de 240px** en lugar de 256px, por la base de 15px (`:1078`).
3. **Chat del asistente sin altura definida en móvil:** el composer queda debajo del historial (`:3306-3307`).
4. **Calendario con siete columnas en unos 340px** y `p-2` en las celdas. Con 360px de ancho, cada día mide unos 35px (`:2925-2965`). Es un cálculo; comprobarlo en render.
5. **Borradores en móvil:** tabla de cinco columnas con scroll horizontal. Las filas son `role="button"` y contienen botones dentro (`:2652-2684`, `:2708-2731`).
6. **Toasts arriba a la derecha:** tapan notificaciones y perfil (`:376`).
7. **Dropdown dentro de Panel con `overflow-hidden`:** se recorta si está cerca del borde inferior (`App.tsx:430` y `:442`; `components/Dropdown.tsx:156-163`). El Dropdown no usa portal y siempre abre hacia abajo.
8. **Miniaturas con cinco columnas fijas:** Subir publicación (`:2404`) y Nueva publicación (`:1978`).
9. **Acciones repetidas:** tema en topbar (`:1170`) y en perfil (`:1232`); cerrar sesión en tres sitios (pie del sidebar, drawer y perfil, `:1062-1070`, `:1085`, `:1113`, `:1247-1254`); "Nueva publicación" dos veces en Inicio (`:3808` y `:3824`).
10. **Drawer sin semántica de diálogo** ni gestión de foco ni bloqueo de scroll (`:1099-1117`). Solo Escape funciona (`:967-972`).
11. **`ScreenLayout` con `overflow-hidden` desde 1024:** si un Panel no tiene scroll, el contenido se corta en alturas cortas (`:396-406`).
12. **Vista previa fija:** Nueva publicación muestra siempre "LinkedIn" (`:2023`, `:2133`), aunque se elija otra red en el selector (`:1933`).
13. **Estados de error:** Inicio, Borradores, Calendario y Canales no muestran error de carga. Ajustes no muestra error de carga, pero sí el de guardar (`:3672`, `:3730`).
14. **Ajustes sin skeleton** al cargar la configuración (`:3666-3680`).
15. **Ajustes, Guardar:** se desactiva también sin usuario o durante la carga (`:3721`). Su tamaño es md (40px), no lg.
16. **Confirmación y carga:** Borradores y Calendario usan `confirm()` nativo (`:2727`, `:3098`) y spinners en lugar de skeleton (`:2635-2639`, `:3002-3006`).
17. **Modo diseño:** los breakpoints responden al viewport real y no al ancho del marco (`:3968-3973`, `:4012-4016`). Por eso no sirve para comprobar tableta ni móvil. Usa el ancho real del navegador en las pruebas.

---

## 8. Orden de implementación

1. Base de 16px en `theme.css:12` y `:244`, con los tokens de tipografía de la sección 2.5. Revisión visual general.
2. Tokens de movimiento (150 y 240ms) y de elevación (`elev-sm`, `elev-md`, `float`). Toggle a 240ms.
3. Primitivos: Button, campo, Panel, Card, Modal, Toast, Notice, Segmented, EmptyState, Skeleton y Dropdown (con portal).
4. Shell: sidebar, drawer con semántica de diálogo, topbar y transición entre pantallas.
5. Pantallas, en este orden: Inicio, Nueva publicación, Subir publicación, Borradores, Calendario, Asistente IA, Canales, Ajustes.
6. Pantalla de acceso.
7. Renderizado en todos los anchos de la sección 0 y **revisión propia**, con las correcciones que surjan.
8. Resumen final: cambios, desviaciones de esta especificación y motivo de cada una.

---

## 9. Lista de verificación final

- [ ] Sin scroll horizontal en ningún ancho (`scrollWidth` igual a `clientWidth`).
- [ ] Sin contenido cortado en 1024×640 ni en 1280×720.
- [ ] Modo claro y oscuro. Contraste de al menos 4.5:1 en textos de 12 a 14px, también los muted y los placeholders.
- [ ] Ningún control interactivo mide menos de 40px de alto.
- [ ] Teclado: orden de foco lógico; el drawer atrapa el foco; Escape cierra popovers y modales.
- [ ] Movimiento reducido: sin desplazamientos ni transiciones de posición; los estados siguen siendo visibles.
- [ ] Lista de revisión de la guía (sección 21) completa.
- [ ] Desviaciones de esta especificación documentadas.

---

## 10. Revisión de esta especificación

Esta versión incorpora las correcciones de dos revisiones independientes: una comprobó cada afirmación sobre el código actual; la otra, la coherencia interna de la especificación y su cumplimiento de la guía. Cambios principales:

- Corregidas medidas del código actual: el cierre de sesión aparece en tres sitios, el guardado de Ajustes se desactiva en más casos de los descritos, el Dropdown no usa portal y las alturas de línea de los tokens no son múltiplos de 4.
- Cuerpo fijado en 16/24. Eliminado el tamaño `sm` de control: todo control mide al menos 40px.
- Reglas de scroll: `main` es el único contenedor con scroll por debajo de 1024, y cada pantalla tiene un solo scroll interno desde 1024.
- Eliminado el glow en el hover del botón primario y el doble señalizado en el hover de Card.
- Duraciones reducidas a dos: 150ms y 240ms.
- Añadidos estados por pantalla (sección 5.10), accesibilidad de popovers, calendario y chat, y áreas seguras.

---

## 11. Implementación (rama `preview`)

Implementada sobre `frontend/src/styles/theme.css`, `frontend/src/app/App.tsx`, `AuthGate.tsx`, `components/Dropdown.tsx`, `components/ConectiaLogo.tsx`, `AppRoutes.tsx` e `index.html`.

### Verificación realizada

- `tsc` y `vite build` sin errores.
- Auditoría automática de las 8 pantallas en 320, 360, 390, 639, 640, 767, 768, 1023, 1024×640, 1279, 1280×720 y 1440 px: sin scroll horizontal, sin controles interactivos de menos de 40px de alto y, desde 1024, sin scroll de pantalla completa.
- Drawer: `role="dialog"`, foco inicial en "Cerrar menú", contenido de detrás `inert`, Escape cierra y el foco vuelve al botón de menú.
- Dropdown: se pinta en un portal, mide lo mismo que el disparador y se abre hacia arriba cuando no cabe debajo.
- **No verificado:** las animaciones a simple vista (el navegador de pruebas tenía el reloj de animación detenido), el modo claro y los estados con datos reales (la revisión se hizo sin backend, con estados de error y vacíos).

### Desviaciones de la especificación

1. **Transición entre pantallas (§3.5):** sin animación de salida. Con `mode="popLayout"` las pantallas salientes no se desmontaban y se acumulaban en `main`. Ahora la nueva entra en 240ms y la anterior se desmonta al instante, lo que cumple "sin esperar".
2. **Accesos rápidos de Inicio (§5.1):** filas de 56px en lugar de 40px, porque llevan una línea de descripción.
3. **Quitar miniatura (§2.3):** botón de 32px dentro de miniaturas de 72px; uno de 40px taparía media imagen.
4. **Ajustes, salir con cambios (§5.8):** solo el aviso nativo del navegador (`beforeunload`). La navegación interna entre pantallas aún no pide confirmación.
5. **Campos de secreto (§5.8):** no aplica; la interfaz no tiene campos de secreto (van como variables de entorno en Vercel).
6. **Toast (§4):** posición, rol y animación según la especificación. La duración la sigue fijando cada pantalla; no hay pausa al hover ni cierre manual.
7. **Asistente, "Detener" (§5.6):** descarta la respuesta en curso; la petición al servidor no se cancela.
8. **Estados globales (§5.10):** sesión caducada y sin conexión, sin implementar.
9. **`ScreenLayout` desde 1024:** altura mínima de 560px; por debajo de esa altura la pantalla desplaza en lugar de recortar contenido.
10. **Button `size="sm"`:** se conserva por compatibilidad, pero mide 40px.
11. **Fuera de alcance afectado:** la landing y las páginas legales no se tocaron, pero heredan la base de 16px y los nuevos tokens.
