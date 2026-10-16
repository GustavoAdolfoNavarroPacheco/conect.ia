/**
 * Landing pública de Conect.ia.
 * Compuesta con piezas adaptadas de Ruixen UI (ver components/ruixen/README.md):
 * cabecera flotante, banner de anuncio, cinta de logos, funciones con escenario, stepper, FAQ y pie.
 */
import * as React from 'react';
import { MotionConfig, motion } from 'motion/react';
import {
  ArrowRight,
  BarChart3,
  CalendarClock,
  CheckCircle2,
  Eye,
  Facebook,
  Instagram,
  Linkedin,
  MessageSquare,
  Moon,
  Music2,
  Network,
  PenSquare,
  Share2,
  Sparkles,
  Sun,
  Workflow,
} from 'lucide-react';
import { ConectiaLogo } from '../../components/ConectiaLogo';
import { useTheme } from '../../../context/ThemeContext';
import { AnnouncementBanner } from '../../components/ruixen/AnnouncementBanner';
import { ClientRibbon } from '../../components/ruixen/ClientRibbon';
import { FaqSection } from '../../components/ruixen/FaqSection';
import { FeatureHighlights } from '../../components/ruixen/FeatureHighlights';
import { FloatingNavbar } from '../../components/ruixen/FloatingNavbar';
import { SiteFooter } from '../../components/ruixen/SiteFooter';
import { StepsStepper } from '../../components/ruixen/StepsStepper';
import {
  PanelDemo,
  VisualAnalitica,
  VisualAsistente,
  VisualAutomatizacion,
  VisualCalendario,
  VisualCanales,
} from './visuales';

const ENLACES = [
  { label: 'Funciones', href: '#funciones' },
  { label: 'Cómo funciona', href: '#como-funciona' },
  { label: 'Preguntas', href: '#preguntas' },
];

const REDES_Y_HERRAMIENTAS = [
  { name: 'LinkedIn', logo: <Linkedin className="h-6 w-6 text-[#0a66c2]" /> },
  { name: 'Facebook', logo: <Facebook className="h-6 w-6 text-[#1877f2]" /> },
  { name: 'Instagram', logo: <Instagram className="h-6 w-6 text-[#e1306c]" /> },
  { name: 'TikTok', logo: <Music2 className="h-6 w-6 text-foreground" /> },
  { name: 'Make', logo: <Workflow className="h-6 w-6 text-[#6d00cc]" /> },
  { name: 'n8n', logo: <Network className="h-6 w-6 text-[#ea4b71]" /> },
  { name: 'Gemini', logo: <Sparkles className="h-6 w-6 text-brand" /> },
];

const FUNCIONES = [
  {
    title: 'Asistente IA',
    description:
      'Genera el copy en segundos, adapta el tono a cada red y propone imágenes y video. Tú revisas y ajustas con vista previa en vivo antes de publicar.',
    visual: <VisualAsistente />,
  },
  {
    title: 'Programación y calendario',
    description:
      'Elige fecha y hora, arrastra para reprogramar y mira el mes, la semana por horas o una lista. Si una red falla, solo se reintenta esa.',
    visual: <VisualCalendario />,
  },
  {
    title: 'Conexiones oficiales',
    description:
      'LinkedIn, Facebook, Instagram y TikTok con el OAuth de cada plataforma. Ves cuándo caduca cada acceso y lo verificas con un clic.',
    visual: <VisualCanales />,
  },
  {
    title: 'Analítica por publicación',
    description:
      'Alcance, interacciones y la mejor hora de tu propia cuenta en Facebook e Instagram. LinkedIn y TikTok dependen de los permisos de cada red.',
    visual: <VisualAnalitica />,
  },
  {
    title: 'Automatización Make y n8n',
    description:
      'Conecta tus flujos para aprobar, notificar y publicar sin pasos manuales. Cada flujo tiene su propia URL y puedes probarla antes de usarla.',
    visual: <VisualAutomatizacion />,
  },
];

const PASOS = [
  { icon: <PenSquare />, title: 'Escribe el tema', description: 'Describe en una línea lo que quieres comunicar.' },
  { icon: <Sparkles />, title: 'La IA redacta', description: 'Obtén un borrador listo para tu red.' },
  { icon: <Eye />, title: 'Revisa y ajusta', description: 'Edita el texto con vista previa en vivo.' },
  { icon: <CalendarClock />, title: 'Programa', description: 'Elige fecha y hora, o publica al instante.' },
];

const PREGUNTAS = [
  {
    id: 'redes',
    question: '¿Qué redes puedo conectar?',
    answer:
      'LinkedIn, Facebook, Instagram y TikTok, con las conexiones OAuth oficiales de cada plataforma. Fiverr se registra como canal manual y Freelancer.com llegará más adelante.',
  },
  {
    id: 'revision',
    question: '¿La IA publica sin que yo lo revise?',
    answer:
      'No. La IA redacta un borrador y tú lo revisas con vista previa en vivo. Solo se publica cuando eliges Publicar ahora o programas una fecha y hora.',
  },
  {
    id: 'fallos',
    question: '¿Qué pasa si una publicación falla en una red?',
    answer:
      'Ves el motivo de cada red y puedes reintentar únicamente la que falló. Las redes que ya publicaron no se vuelven a enviar.',
  },
  {
    id: 'claves',
    question: '¿Dónde se guardan los accesos de mis redes?',
    answer:
      'En el servidor, nunca en tu navegador. Los secretos de Make y n8n viven en variables de entorno y no se muestran en ningún formulario.',
  },
  {
    id: 'automatizacion',
    question: '¿Puedo usar Make o n8n?',
    answer:
      'Sí. En Canales configuras la URL de cada flujo por separado y puedes probar la conexión antes de usarla.',
  },
  {
    id: 'caducidad',
    question: '¿Cómo sé cuándo caduca el acceso a una red?',
    answer:
      'Cada canal muestra su fecha de vencimiento y avisa con tiempo. Con Verificar se comprueba el acceso contra la propia red.',
  },
];

const BOTON_PRIMARIO =
  'press inline-flex h-12 items-center justify-center gap-2 rounded-[12px] bg-brand px-6 text-sm font-semibold text-white shadow-[var(--glow)] transition-colors hover:bg-brand-strong';

function EncabezadoSeccion({ etiqueta, titulo, subtitulo }: { etiqueta: string; titulo: string; subtitulo?: string }) {
  return (
    <div className="mx-auto mb-12 max-w-2xl text-center" data-reveal>
      <p className="mb-3 text-xs font-semibold uppercase tracking-[0.18em] text-brand-strong">{etiqueta}</p>
      <h2 className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">{titulo}</h2>
      {subtitulo && <p className="mt-3 text-base text-muted-foreground">{subtitulo}</p>}
    </div>
  );
}

export const LandingPage: React.FC<{ onNavigate: (screen: string) => void }> = ({ onNavigate }) => {
  const { mode, toggleTheme } = useTheme();

  return (
    <MotionConfig reducedMotion="user">
      <div className="relative min-h-full bg-background">
        <AnnouncementBanner badge="Nuevo" action={{ label: 'Ver funciones', href: '#funciones' }}>
          Calendario por horas y analítica de Facebook e Instagram
        </AnnouncementBanner>

        <FloatingNavbar
          logo={<ConectiaLogo size="md" />}
          links={ENLACES}
          actions={
            <>
              <button
                type="button"
                aria-label={mode === 'dark' ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
                onClick={toggleTheme}
                className="press flex max-[359px]:hidden h-10 w-10 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
              >
                {mode === 'dark' ? <Sun className="h-[18px] w-[18px]" /> : <Moon className="h-[18px] w-[18px]" />}
              </button>
              <button
                type="button"
                onClick={() => onNavigate('login')}
                className="press inline-flex h-10 items-center whitespace-nowrap rounded-full bg-brand px-4 text-sm font-semibold text-white transition-colors hover:bg-brand-strong sm:px-5"
              >
                <span className="sm:hidden">Entrar</span>
                <span className="hidden sm:inline">Iniciar sesión</span>
              </button>
            </>
          }
        />

        {/* Hero */}
        <section id="inicio" className="relative isolate -mt-[4.5rem] scroll-mt-0 overflow-hidden pb-4 pt-36 sm:pt-40">
          <div className="ruixen-aurora absolute inset-x-0 top-0 -z-10 h-[40rem]" aria-hidden />
          <div className="ruixen-dots absolute inset-x-0 top-0 -z-10 h-[40rem]" aria-hidden />

          <div className="mx-auto max-w-4xl px-6 text-center">
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
              className="space-y-7"
            >
              <span className="inline-flex h-8 items-center gap-2 rounded-full border border-brand/20 bg-brand-soft px-3.5 text-xs font-medium text-brand-strong">
                <Sparkles className="h-3.5 w-3.5" />
                Potenciado por IA · Campuslands
              </span>
              <h1 className="text-balance text-4xl font-semibold leading-[1.1] tracking-tight text-foreground sm:text-5xl lg:text-6xl">
                Automatiza tus redes con <span className="text-gradient-brand">Inteligencia Artificial</span>
              </h1>
              <p className="mx-auto max-w-2xl text-pretty text-base leading-relaxed text-muted-foreground sm:text-lg">
                Conect.ia genera, programa y publica contenido para LinkedIn, Facebook, Instagram y TikTok desde un solo
                panel, con conexiones oficiales y un asistente que escribe contigo.
              </p>
              <div className="flex flex-col items-center justify-center gap-3 sm:flex-row">
                <button type="button" onClick={() => onNavigate('new-post')} className={BOTON_PRIMARIO}>
                  <PenSquare className="h-4 w-4" />
                  Crear publicación
                </button>
                {/* Borde con degradado de marca, como el botón secundario de "gradient-hero-showcase" */}
                <span className="ruixen-gradient-border rounded-[14px] p-[1.5px]">
                  <button
                    type="button"
                    onClick={() => onNavigate('login')}
                    className="press inline-flex h-[45px] items-center justify-center gap-2 rounded-[12.5px] bg-background px-6 text-sm font-semibold text-foreground transition-colors hover:bg-accent"
                  >
                    Ingresar al panel
                    <ArrowRight className="h-4 w-4" />
                  </button>
                </span>
              </div>
              <ul className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm text-muted-foreground">
                {['Configuración en minutos', 'Vista previa en vivo', 'Programación automática'].map((t) => (
                  <li key={t} className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-success" />
                    {t}
                  </li>
                ))}
              </ul>
            </motion.div>
          </div>

          <motion.div
            initial={{ opacity: 0, y: 28, filter: 'blur(10px)' }}
            animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
            transition={{ duration: 1, delay: 0.25, ease: [0.22, 1, 0.36, 1] }}
            className="mt-14 px-4 sm:px-6"
          >
            <PanelDemo />
          </motion.div>
        </section>

        {/* Redes y herramientas */}
        <section aria-label="Redes y herramientas compatibles" className="border-y border-border bg-card/50 py-8">
          <p className="mb-4 text-center text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            Publica en tus redes y conecta tus herramientas
          </p>
          <ClientRibbon items={REDES_Y_HERRAMIENTAS} />
        </section>

        {/* Funciones */}
        <section id="funciones" className="mx-auto max-w-6xl scroll-mt-24 px-6 py-24">
          <EncabezadoSeccion
            etiqueta="Funciones"
            titulo="Todo lo que necesitas en una plataforma"
            subtitulo="Crea, programa, publica y mide desde un solo lugar."
          />
          <div data-reveal>
            <FeatureHighlights features={FUNCIONES} aria-label="Funciones de Conect.ia" />
          </div>
        </section>

        {/* Cómo funciona */}
        <section id="como-funciona" className="mx-auto max-w-6xl scroll-mt-24 px-6 pb-24">
          <div className="surface relative overflow-hidden px-6 py-14 sm:px-12" data-reveal>
            <div className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-brand/10 blur-3xl" aria-hidden />
            <EncabezadoSeccion etiqueta="Cómo funciona" titulo="De la idea a la publicación en 4 pasos" />
            <StepsStepper steps={PASOS} className="mx-auto max-w-4xl" />
          </div>
        </section>

        {/* Preguntas */}
        <section id="preguntas" className="mx-auto max-w-5xl scroll-mt-24 px-6 pb-24">
          <div data-reveal>
            <FaqSection
              title="Preguntas frecuentes"
              subtitle="Lo que más nos preguntan antes de conectar la primera red."
              items={PREGUNTAS}
            />
          </div>
        </section>

        {/* Llamado a la acción */}
        <section className="mx-auto max-w-6xl px-6 pb-24">
          <div
            className="relative isolate overflow-hidden rounded-3xl bg-gradient-to-br from-brand-deep via-brand to-[#0a89d1] px-8 py-16 text-center text-white shadow-[var(--glow)] sm:px-14"
            data-reveal="scale"
          >
            <div className="ruixen-dots absolute inset-0 -z-10 opacity-40 [mask-image:radial-gradient(ellipse_70%_90%_at_50%_0%,#000,transparent_80%)]" aria-hidden />
            <div className="pointer-events-none absolute -left-16 -top-16 -z-10 h-56 w-56 rounded-full bg-white/10 blur-2xl" aria-hidden />
            <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">Empieza a publicar con Conect.ia</h2>
            <p className="mx-auto mt-3 max-w-lg text-sm text-white/85 sm:text-base">
              Crea tu cuenta, conecta tus redes y programa tu primera publicación en minutos.
            </p>
            <button
              type="button"
              onClick={() => onNavigate('login')}
              className="press mt-8 inline-flex h-12 items-center gap-2 rounded-[12px] bg-white px-6 text-sm font-semibold text-brand-deep shadow-md transition-transform hover:-translate-y-0.5"
            >
              Comenzar ahora
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </section>

        <SiteFooter
          brand={<ConectiaLogo size="md" />}
          description="Genera, programa y publica contenido para tus redes desde un solo panel, con conexiones oficiales y un asistente de IA."
          columns={[
            {
              title: 'Producto',
              links: [
                { label: 'Funciones', href: '#funciones' },
                { label: 'Cómo funciona', href: '#como-funciona' },
                { label: 'Preguntas', href: '#preguntas' },
              ],
            },
            {
              title: 'Cuenta',
              links: [
                { label: 'Iniciar sesión', onClick: () => onNavigate('login') },
                { label: 'Crear cuenta', onClick: () => onNavigate('login') },
              ],
            },
            {
              title: 'Legal',
              links: [
                { label: 'Política de privacidad', href: '/privacidad' },
                { label: 'Términos y condiciones', href: '/terminos' },
              ],
            },
          ]}
          bottomLinks={[]}
          copyright={`© ${new Date().getFullYear()} Conect.ia`}
        />
      </div>
    </MotionConfig>
  );
};

export default LandingPage;
