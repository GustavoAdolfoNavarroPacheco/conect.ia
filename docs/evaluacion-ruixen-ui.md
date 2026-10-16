# Evaluación de Ruixen UI para Conect.ia

Rama: `preview`. Objetivo: llevar cada interfaz de la web al siguiente nivel visual usando la biblioteca
[Ruixen UI](https://21st.dev/@ruixen.ui/library/ruixen-ui), eligiendo componente por componente y no por cantidad.

## 1. Fuente, licencia y alcance

| Tema | Detalle |
| --- | --- |
| Biblioteca | Ruixen UI: 154 componentes con vista previa y 277 archivos en su registro, repartidos en 33 categorías. |
| Fuente del código | El código en 21st.dev está tras inicio de sesión (la descarga responde 403). No se sorteó. Se usó el repositorio oficial MIT [`ruixenui/ruixen.com`](https://github.com/ruixenui/ruixen.com) (`registry/ruixenui/<nombre>.tsx` y vistas previas claro/oscuro). |
| Licencia | MIT, © 2025 Ruixen UI. El texto viaja con el código en `frontend/src/app/components/ruixen/LICENSE.md` y el origen de cada pieza está en la cabecera de su archivo y en el `README.md` de esa carpeta. |
| Dos tipos de pieza | **Adaptada**: parte del código MIT de Ruixen. **Propia inspirada**: se ve la vista previa pero no hay código público utilizable, o el código público es otro diseño; se escribe código nuevo y así consta en su cabecera. |

## 2. Criterios de selección

Un componente entra solo si cumple **todo** esto:

1. **Resuelve algo que la pantalla ya necesita** (no se añaden funciones para usar un componente).
2. **Encaja con la identidad actual** (colores de marca, tokens de `theme.css`, tipografía Poppins) o se puede adaptar sin perder el diseño original.
3. **Accesible**: teclado, foco visible, roles ARIA, contraste, objetivos táctiles suficientes (los controles principales miden 40 px o más; los secundarios, como las celdas del selector de fecha o las ideas rápidas, 36 px, por encima del mínimo de 24 px de WCAG 2.2 AA) y `prefers-reduced-motion` respetado.
4. **Sin dependencias nuevas** (todo con `motion/react`, Radix y Tailwind que el proyecto ya usa).
5. **Funciona en claro y oscuro, de 320 a 1440 px.**
6. **No añade peso ni movimiento gratuito**: la animación debe comunicar algo (estado, jerarquía, causa y efecto).

## 3. Piezas adoptadas (resumen)

| Componente Ruixen | Tipo | Archivo | Dónde se usa | Qué se cambió |
| --- | --- | --- | --- | --- |
| `navbar-floating` | Adaptada | `FloatingNavbar.tsx` | Landing | Seguimiento de sección activa, píldora animada, menú móvil, botón de tema y acceso. |
| `banner-announcement` | Adaptada | `AnnouncementBanner.tsx` | Landing | Textos reales, brillo de una sola pasada, descartable. |
| `feature-highlights` | Adaptada | `FeatureHighlights.tsx` | Landing (5 funciones) | Semántica de pestañas, autoavance que se detiene con movimiento reducido, visuales propios de la app. |
| `auto-scrolling-client-carousel` | Adaptada | `ClientRibbon.tsx` | Landing (redes y herramientas) | Cinta con tres copias, máscara en bordes, pausa con movimiento reducido. |
| `wizard-stepper` | Adaptada | `StepsStepper.tsx` | Landing ("Cómo funciona") | Horizontal desde 768 px y vertical en móvil, conector animado. |
| `staggered-faq-section` | Adaptada | `FaqSection.tsx` | Landing | Seis preguntas reales en español sobre Radix Accordion. |
| `footer-pro` | Adaptada | `SiteFooter.tsx` | Landing | Sin indicador de estado ni enlaces repetidos. |
| `animated-theme-toggler` | Adaptada | `ThemeToggle.tsx` | Barra superior y landing | Sin sonido, enlazado a `ThemeContext`. |
| `notification-inbox-popover` | Adaptada | `NotificationInbox.tsx` | Avisos de la barra superior | Pestañas Todas / Sin leer, icono por tipo, contraste con tokens, sin sonido. |
| `account-menu` | Adaptada | `AccountMenu.tsx` | Menú de la persona usuaria | Radix Dropdown con tema, buscador (Ctrl K) y cerrar sesión; sustituye al menú manual. |
| `load-ripple` | Adaptada | `RippleLoader.tsx` | Pantalla de carga inicial | Anillos con color de marca y el logo al centro. |
| `number-ticker` | Adaptada | `NumberTicker.tsx` | Inicio, Analítica y Canales | Formato es-CO, resorte más rápido (el original tarda más de 3 s en asentarse; este llega en ~1 s sin pasarse), valor final inmediato con movimiento reducido, vuelve a animar si cambian los datos. |
| `animated-circular-progress-bar` | Adaptada | `ProgressRing.tsx` | Analítica (publicadas) y Asistente (cuota) | Llenado con `pathLength`, colores por tono (marca / aviso / peligro), `role="progressbar"`. |
| `badge-morph` | Adaptada | `BadgeMorph.tsx` | Estado de cada canal | Píldora suave por tono con icono que se dibuja; estados Conectado, Vence pronto, Caducado, Sin conectar, Próximamente. |
| `floating-input` / `password-field` | Propia inspirada | `AuthField.tsx` | Acceso y registro | Etiqueta flotante con icono, error, ayuda y botón de ver contraseña. |
| `password-strength-input` | Propia inspirada | `PasswordStrength.tsx` | Registro | Medidor y lista de requisitos. |
| `sliding-tabs` / `pill-morph-tabs` | Propia inspirada | `SlidingTabs.tsx` | Entrar / Crear cuenta | `radiogroup` con píldora animada. |
| `calendar-scheduler` / `calendar-planner` | Propia inspirada | `DateTimePicker.tsx` | Nueva publicación, Subir publicación y Reprogramar | Rejilla del mes y horarios cada 30 min, en español, con mínimo "hoy" y horas pasadas bloqueadas. El código público de `calendar-scheduler` es un selector por segmentos en inglés, que no sirve. |
| `claude-chat-input` / `ai-chat-input` | Propia inspirada | `ChatComposer.tsx` | Asistente IA | Tarjeta que une campo y envío, saludo con sugerencias, puntos al escribir. Sin adjuntos ni selector de modelo (no aplican). |
| `idea-generator-card` | Propia inspirada | (en `NewPostScreen`) | Nueva publicación | Fila de ideas rápidas que rellena el tema. |
| `spark-chart` | Idea reutilizada | `ruixen.css` (`.ruixen-grow`) | Analítica | Las barras crecen desde la base, escalonadas. |
| `aurora-hero-section`, `dot-pattern`, `shine-border` | Idea reutilizada | `ruixen.css` | Hero de la landing | Halo de marca, rejilla de puntos y borde con degradado, solo con CSS. |

## 4. Evaluación por categoría (todas las de la biblioteca)

Cada fila nombra los componentes revisados. "No" va acompañado del motivo concreto en esta app.

| Categoría | Adoptados | Descartados y motivo |
| --- | --- | --- |
| **ai-chat-inputs** | `claude-chat-input`, `ai-chat-input` (idea, ver arriba) | Código de `claude-chat-input` incluye adjuntos, modelos y la marca de Claude: no aplican; se tomó solo la composición. |
| **avatars** | — | `avatar-hover-card`, `avatar-quick-actions`, `avatar-spring-stack`: hay una sola persona por cuenta; no existen equipos ni listas de personas. |
| **badges** | `badge-morph` | — |
| **banners** | `banner-announcement` | `banner-cookie`: no hay cookies de seguimiento que pedir; `banner-countdown` y `banner-newsletter`: no hay campaña ni boletín. |
| **breadcrumbs** | — | `breadcrumb-dropdown`, `breadcrumb-icon`, `breadcrumb-separator`, `smart-breadcrumb`: la navegación tiene un solo nivel (barra lateral). |
| **buttons** | Borde con degradado (idea de `glow-link-button`) | `badge-button-combo`, `button-badge`, `button-dropdown`, `button-split`, `button-toggle-group`, `hover-preview-button`, `icon-label-subtext-button`: duplican el `Button` del sistema; `button-copy`: se evaluó para webhooks, pero la app no muestra URLs propias que copiar; `dynamic-status-button`, `multi-state-morph-button`, `progress-button`: los envíos ya muestran estado con el icono de carga; `slide-to-delete-button`: borrar con arrastre es poco accesible. |
| **cards** | `load-ripple` (adaptada), `idea-generator-card` (idea), `schedule-card` (referencia de filas de Inicio) | `card-stack`, `portfolio-card`, `showcase-card`, `social-card`, `product-*`: contenido de tienda/portafolio que no existe; `doctor-profile-card`, `order-*`, `verification-card`, `environment-card`: dominios ajenos; `goal-tracker-card`, `project-progress-card`: sin metas; `loading-circle`, `ripple-circles`, `solar-loader`: ya hay un cargador. |
| **charts** | Idea de `spark-chart` | El componente completo no se incluyó: el gráfico de alcance ya existe y conserva su leyenda y accesibilidad; se le añadió la animación de entrada. |
| **checkboxes** | — | Los siete tipos duplican el control del sistema; solo hay interruptores en Nueva publicación y selección de redes ya resuelta. |
| **client-sections** | `auto-scrolling-client-carousel` | `client-carousel-showcase`, `trusted-clients-showcase`: no hay logotipos de clientes que mostrar, solo integraciones. |
| **dialogs** | — | `add-task-sheet`, `credit-card-dialog`, `identity-verification-dialog`: no hay pagos ni verificación; el `Modal` propio ya cubre los diálogos. |
| **drawer** | — | `bottom-drawers`, `centered-feedback-drawer`, `drawer-inner-content`: el menú móvil ya es un panel lateral. |
| **event-calendars** | `calendar-scheduler`, `calendar-planner` (idea, selector) | `calendar-lume`, `calendar-twin`, `chrono-select`, `event-scheduler`: el calendario editorial ya tiene vistas Mes / Semana / Lista a medida y datos propios; reemplazarlo sería retroceder. |
| **faqs** | `staggered-faq-section`, `feature-highlights` | `faq-auto-accordion`, `faq-chat-accordion`, `faq-scroll-accordion`: variantes con más movimiento sin más claridad. |
| **featured-sections** | Estructura de `split-feature-showcase` (visuales alternados) | `automated-tasks-panel`, `integration-and-stats-section`, `product-*`, `rotating-gradient-right`: cifras y capturas inventadas que la app no puede respaldar. |
| **footer-sections** | `footer-pro` | `corporate-footer`, `footer-enterprise`: demasiados enlaces para el contenido real. |
| **hero-sections** | Idea de `aurora-hero-section` | `card-carousel-hero`, `gradient-hero-showcase`, `hero-section-glass-web`, `hero-title-slide`, `spectrum-hero-section`, `structured-hero-section`, `video-hero-showcase`, `visionary-hero-section`: no hay vídeo propio ni capturas definitivas; varios dependen de imágenes externas. |
| **inputs** | `floating-input`, `password-field`, `password-strength-input`, `time-with-icon`/`better-time-picker` (idea del selector) | `action-hub-input`, `circular-stepper-input`, `clean-tag-input`, `color-picker-input`, `correct-number-input`, `gravatar-email-input`, `input-with-select`, `modern-card-input`, `otp-field`, `range-slider-input`, `search-with-category`, `smart-assist-input`: sin caso de uso (no hay códigos OTP, colores, rangos ni etiquetas); `inline-copy-input`, `url-input`: se probaron para los webhooks de Canales, pero esos campos ya llevan botón de prueba y validación propios. |
| **loaders** | `load-ripple` | `credit-card-dialog`, `loading-circle`, `ripple-circles`, `solar-loader`: variantes del mismo cargador. |
| **menu** | `account-menu` | `action-toolbar`, `app-menu-bar`, `nested-dashboard-menu`: la barra lateral ya cumple el rol. |
| **navbars** | `navbar-floating` | `floating-navbar`, `hover-gradient-navbar`, `navbar-*` (breadcrumb, centered, icon-links, minimal, simple, split, status, tabs, user-menu, with-search), `promote-header`: la landing necesita una sola barra; dentro de la app existe la barra superior con buscador. `luma-bar` (barra inferior móvil) se descartó para no duplicar la navegación del panel lateral en móvil. |
| **notifications** | `notification-inbox-popover` | `notification`, `notifications-carousel`, `notifications-filter`: el buzón ya incluye filtro; no se necesitan avisos flotantes extra (existe el aviso emergente del sistema). |
| **pagination** | — | `animated-number-flip`, `morphing-page-dots`, `scroll-pagination`, `wheel-pagination`: no hay listas paginadas en la app. |
| **select** | — | `color-emotion-select`: no aplica. |
| **steppers** | `wizard-stepper` | `milestone-stepper`: se prefirió el asistente horizontal/vertical. |
| **tabs** | `sliding-tabs` / `pill-morph-tabs` (idea) | `capsule-tabs`, `drag-and-drop-tabs`, `fade-slide-tabs`, `hybrid-tabs`, `magnetic-tabs`, `nested-tabs`, `zoom-depth-tabs`: efectos que no aportan información; las pestañas de la app (Mes / Semana / Lista, Entrar / Crear cuenta) ya tienen su píldora animada. |

## 5. Decisiones por pantalla

| Pantalla | Mejora aplicada |
| --- | --- |
| **Landing** | Banner de anuncio, barra flotante con sección activa, hero con halo y rejilla, panel de demostración, cinta de redes, funciones con pestañas y autoavance, pasos animados, preguntas frecuentes, tarjeta final y pie nuevo. |
| **Acceso / Registro** | Pantalla dividida con panel de marca (avisos animados) y formulario con etiquetas flotantes, interruptor Entrar / Crear cuenta, medidor de contraseña y botón de ver contraseña. La lógica de autenticación no cambió. |
| **Carga inicial** | Cargador de anillos con el logo. |
| **Barra superior** | Selector de tema animado, buzón de avisos con filtro y menú de cuenta con tema, buscador y cierre de sesión. |
| **Inicio** | Contadores animados en las cuatro tarjetas. |
| **Nueva publicación** | Ideas rápidas para el tema (una fila, sin añadir scroll) y selector de fecha y hora propio al programar. |
| **Subir publicación** | Selector de fecha y hora propio (sustituye los campos nativos, que se veían distintos en cada navegador). |
| **Calendario** | El modal de reprogramar usa el nuevo selector. Vistas Mes / Semana / Lista sin cambios (ya eran a medida). |
| **Analítica** | Contadores animados, anillo de publicaciones publicadas, barras que crecen y tarjetas sin textos cortados. |
| **Asistente IA** | Saludo con sugerencias, campo y envío unidos en una tarjeta, puntos animados al escribir y anillos de cuota (cambian a ámbar y rojo cerca del límite). |
| **Canales** | Estados con píldora animada y contadores animados. |

## 6. Accesibilidad, rendimiento y movimiento

- Todas las animaciones nuevas se detienen o se reducen con `prefers-reduced-motion` (autoavance, cinta, halo, contadores, anillos, barras y píldoras).
- Los controles nuevos miden 40 px o más (botones, campos, envío del chat, meses anterior/siguiente del selector) salvo las celdas del selector de fecha y las ideas rápidas, que miden 36 px.
- Sin dependencias nuevas: todo usa `motion/react`, Radix y Tailwind ya instalados.
- Los números animados escriben directo en el DOM (sin re-renderizar por fotograma).

## 7. Qué no se hizo y por qué

- **Código de 21st.dev**: no se accedió a nada tras inicio de sesión; las piezas "propias inspiradas" lo declaran en su cabecera.
- **Barra inferior móvil (`luma-bar`)**: duplicaría la navegación y quitaría espacio vertical.
- **Reemplazo del calendario editorial**: los componentes de calendario de Ruixen son selectores, no vistas editoriales.
- **Cifras inventadas** (clientes, estadísticas): ningún componente de "social proof" se usó con datos que la app no pueda respaldar.

## 8. Verificación

Se revisó en local con un servidor de datos simulados (no con el backend real) y el navegador integrado de la aplicación (Chromium):

- **Revisado**: landing a 320, 375, 768 y 1238 px (claro y oscuro); acceso y registro a 320 px en oscuro, con medidor de contraseña; las nueve pantallas de la app a 1238 px en claro y a 375 px en oscuro, midiendo desbordes horizontales (ninguno); selector de fecha y hora en escritorio y móvil, claro y oscuro, dentro y fuera de un modal; chat del asistente enviando un mensaje; contadores, anillos y barras de Analítica; estados de Canales.
- **Corregido durante la revisión**: la barra de la landing se salía 24 px a 320 px; la lista de horarios del selector se encogía en móvil; el marcador de posición del chat se partía en dos líneas en móvil; el resorte de los contadores era demasiado lento.
- **No verificado**: backend real y redes reales (OAuth, publicación), movimiento reducido activado en el sistema, Safari y Firefox, lectores de pantalla, y el despliegue de vista previa en Vercel.
- Comprobaciones automáticas: `tsc` del frontend, `npm run typecheck` (servidor y edge) y `npm run build` del frontend pasan.
