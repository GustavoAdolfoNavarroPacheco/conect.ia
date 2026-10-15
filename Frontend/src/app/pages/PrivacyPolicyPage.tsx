import React from 'react';
import { Link } from 'react-router';
import { ArrowLeft } from 'lucide-react';
import { ConectiaLogo } from '../components/ConectiaLogo';

const CONTACT_EMAIL = 'stivenmartinezvillamizar@gmail.com';
const LAST_UPDATED = '28 de mayo de 2026';

/**
 * Política de privacidad pública (requerida por LinkedIn Developers y Meta for Developers).
 * URL recomendada: https://campussocial-f56a0.web.app/privacidad
 */
export function PrivacyPolicyPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-[#f8fafc] via-[#eff6ff] to-[#f0fdfa] dark:from-background dark:via-background dark:to-background/90 text-slate-800 dark:text-slate-200 relative overflow-hidden">
      {/* Background Orbs */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden z-0 pointer-events-none fixed">
        <div className="absolute top-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full bg-gradient-to-br from-brand/10 to-brand-deep/10 blur-[120px] animate-pulse-slow" />
        <div className="absolute bottom-[-10%] left-[-10%] w-[40%] h-[60%] rounded-full bg-gradient-to-br from-brand-light/10 to-brand-deep/10 blur-[100px]" style={{ animation: 'pulse 8s infinite alternate' }} />
      </div>

      <header className="border-b border-white/60 dark:border-border/50 bg-white/60 dark:bg-card/80 backdrop-blur-xl sticky top-0 z-50 shadow-sm">
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between gap-4">
          <ConectiaLogo size="sm" textClassName="!text-foreground !bg-none" />
          <Link
            to="/"
            className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-brand transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            Volver al inicio
          </Link>
        </div>
      </header>

      <main className="relative z-10 max-w-4xl mx-auto px-4 py-12">
        <div className="bg-white/70 dark:bg-card/80 backdrop-blur-2xl border border-white/80 dark:border-border/50 rounded-3xl p-8 sm:p-12 shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
          <div className="prose prose-slate dark:prose-invert max-w-none prose-headings:text-slate-900 dark:prose-headings:text-slate-100 prose-a:text-brand hover:prose-a:text-brand-deep transition-colors">
            <h1 className="text-3xl md:text-4xl font-extrabold mb-2 bg-clip-text text-transparent bg-gradient-to-r from-brand-deep to-brand">Política de Privacidad</h1>
            <p className="text-sm font-medium text-muted-foreground not-prose mb-10">Última actualización: {LAST_UPDATED}</p>

            <section className="space-y-4 text-[15px] leading-relaxed text-slate-600 dark:text-slate-300">
              <p className="text-lg font-medium text-slate-800 dark:text-slate-200">
                Esta política describe cómo <strong>Conect.ia</strong> (producto de{' '}
                <strong>Conect.ia</strong>, Colombia) recopila, usa y protege
                los datos personales cuando utilizas nuestra plataforma de automatización de publicaciones
                en redes sociales.
              </p>

              <h2 className="text-xl font-bold mt-10 mb-4 text-slate-800 dark:text-slate-100 flex items-center gap-3">
                <span className="w-8 h-8 rounded-xl bg-gradient-to-br from-brand-deep/10 to-brand/10 dark:from-brand-deep/30 dark:to-brand/30 flex items-center justify-center text-brand">1</span>
                Responsable del tratamiento
              </h2>
              <div className="bg-white/50 dark:bg-accent/20 p-5 rounded-2xl border border-white/60 dark:border-border/50">
                <p className="m-0">
                  <strong>Conect.ia</strong>
                  <br />
                  Contacto:{' '}
                  <a href={`mailto:${CONTACT_EMAIL}`} className="font-medium hover:underline cursor-pointer">
                    {CONTACT_EMAIL}
                  </a>
                </p>
              </div>

              <h2 className="text-xl font-bold mt-10 mb-4 text-slate-800 dark:text-slate-100 flex items-center gap-3">
                <span className="w-8 h-8 rounded-xl bg-gradient-to-br from-brand-deep/10 to-brand/10 dark:from-brand-deep/30 dark:to-brand/30 flex items-center justify-center text-brand">2</span>
                Datos que recopilamos
              </h2>
              <ul className="list-none pl-0 space-y-3">
                {[
                  { title: 'Cuenta', desc: 'Correo electrónico, nombre e identificador de usuario de tu cuenta de Google (Auth.js).' },
                  { title: 'Contenido', desc: 'Textos, imágenes y borradores de publicaciones que creas o programas en la aplicación.' },
                  { title: 'Redes sociales (con tu consentimiento)', desc: 'Tokens de acceso OAuth, identificador de perfil, nombre visible y permisos necesarios para publicar en LinkedIn, Meta (Facebook/Instagram) u otras redes que conectes.' },
                  { title: 'Técnico', desc: 'Registros de uso, identificadores de sesión y metadatos de ejecución de automatizaciones (webhooks n8n/Make).' }
                ].map((item, i) => (
                  <li key={i} className="flex items-start gap-3 bg-white/40 dark:bg-accent/10 p-4 rounded-2xl border border-white/50 dark:border-border/30">
                    <div className="w-2 h-2 mt-2 rounded-full bg-brand shrink-0" />
                    <div>
                      <strong className="text-slate-800 dark:text-slate-200">{item.title}:</strong> <span className="text-slate-600 dark:text-slate-400">{item.desc}</span>
                    </div>
                  </li>
                ))}
              </ul>

              <h2 className="text-xl font-bold mt-10 mb-4 text-slate-800 dark:text-slate-100 flex items-center gap-3">
                <span className="w-8 h-8 rounded-xl bg-gradient-to-br from-brand-deep/10 to-brand/10 dark:from-brand-deep/30 dark:to-brand/30 flex items-center justify-center text-brand">3</span>
                Finalidad del tratamiento
              </h2>
              <ul className="list-disc pl-6 space-y-2 marker:text-brand">
                <li>Autenticarte y mantener tu sesión segura.</li>
                <li>Generar y editar contenido con asistentes de inteligencia artificial.</li>
                <li>Programar y publicar en las redes que autorices.</li>
                <li>Verificar el estado de conexión de tus canales.</li>
                <li>Mejorar el servicio y resolver incidencias técnicas.</li>
              </ul>

              <h2 className="text-xl font-bold mt-10 mb-4 text-slate-800 dark:text-slate-100 flex items-center gap-3">
                <span className="w-8 h-8 rounded-xl bg-gradient-to-br from-brand-deep/10 to-brand/10 dark:from-brand-deep/30 dark:to-brand/30 flex items-center justify-center text-brand">4</span>
                Base legal
              </h2>
              <p>
                El tratamiento se basa en la ejecución del contrato de uso del servicio, tu consentimiento
                explícito al conectar una red social (OAuth) y, cuando aplique, el interés legítimo en
                seguridad y mejora del producto.
              </p>

              <h2 className="text-xl font-bold mt-10 mb-4 text-slate-800 dark:text-slate-100 flex items-center gap-3">
                <span className="w-8 h-8 rounded-xl bg-gradient-to-br from-brand-deep/10 to-brand/10 dark:from-brand-deep/30 dark:to-brand/30 flex items-center justify-center text-brand">5</span>
                Servicios de terceros
              </h2>
              <p>Podemos compartir datos limitados con proveedores que nos ayudan a operar Conect.ia:</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                {[
                  { name: 'Vercel y Neon', desc: 'Alojamiento, funciones del servidor, base de datos PostgreSQL (Neon) y almacenamiento de imágenes (Vercel Blob).' },
                  { name: 'Google Gemini', desc: 'Generación de texto e imágenes (solo el contenido que envías al asistente).' },
                  { name: 'LinkedIn & Meta', desc: 'Cuando conectas esas cuentas para publicar.' },
                  { name: 'n8n / Make / Postiz', desc: 'Orquestación opcional de publicaciones, si las configuras.' }
                ].map((s, i) => (
                  <div key={i} className="bg-white/50 dark:bg-accent/20 p-4 rounded-2xl border border-white/60 dark:border-border/50">
                    <strong className="block text-slate-800 dark:text-slate-200 mb-1">{s.name}</strong>
                    <span className="text-sm text-slate-500 dark:text-slate-400">{s.desc}</span>
                  </div>
                ))}
              </div>
              <p className="mt-6 text-sm italic text-muted-foreground bg-blue-50/50 dark:bg-blue-900/10 p-4 rounded-xl border border-blue-100 dark:border-blue-800/30">
                Estos proveedores procesan datos según sus propias políticas. Los tokens de redes sociales se
                almacenan en la base de datos con acceso restringido exclusivamente a nuestro servidor (funciones de Vercel); la aplicación cliente no puede leerlos.
              </p>

              <h2 className="text-xl font-bold mt-10 mb-4 text-slate-800 dark:text-slate-100 flex items-center gap-3">
                <span className="w-8 h-8 rounded-xl bg-gradient-to-br from-brand-deep/10 to-brand/10 dark:from-brand-deep/30 dark:to-brand/30 flex items-center justify-center text-brand">6</span>
                Conservación
              </h2>
              <p>
                Conservamos tus datos mientras mantengas una cuenta activa. Los tokens OAuth se eliminan o
                invalidan cuando desconectas un canal o revocas el acceso en LinkedIn/Meta. Puedes solicitar
                la eliminación de tu cuenta y datos asociados contactándonos.
              </p>

              <h2 className="text-xl font-bold mt-10 mb-4 text-slate-800 dark:text-slate-100 flex items-center gap-3">
                <span className="w-8 h-8 rounded-xl bg-gradient-to-br from-brand-deep/10 to-brand/10 dark:from-brand-deep/30 dark:to-brand/30 flex items-center justify-center text-brand">7</span>
                Tus derechos
              </h2>
              <p>De acuerdo con la normativa aplicable en Colombia, puedes:</p>
              <ul className="list-disc pl-6 space-y-2 marker:text-brand">
                <li>Acceder, rectificar o suprimir tus datos personales.</li>
                <li>Revocar el consentimiento de una red social desde la app (Canales → Desconectar) o desde la configuración de LinkedIn/Meta.</li>
                <li>Oponerte a tratamientos no esenciales o solicitar limitación del tratamiento.</li>
              </ul>
              <p>
                Para ejercer estos derechos, escribe a{' '}
                <a href={`mailto:${CONTACT_EMAIL}`} className="font-medium hover:underline cursor-pointer">
                  {CONTACT_EMAIL}
                </a>.
              </p>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-12 pt-8 border-t border-slate-200 dark:border-border/50">
                <div>
                  <h2 className="text-lg font-bold mb-2 text-slate-800 dark:text-slate-100">8. Seguridad</h2>
                  <p className="text-sm text-slate-500 dark:text-slate-400">
                    Aplicamos medidas técnicas razonables: HTTPS, control de acceso por usuario en el servidor, secretos en servidor y mínimo privilegio.
                  </p>
                </div>
                <div>
                  <h2 className="text-lg font-bold mb-2 text-slate-800 dark:text-slate-100">9. Menores</h2>
                  <p className="text-sm text-slate-500 dark:text-slate-400">
                    Conect.ia está dirigido a organizaciones y profesionales. No recopilamos datos de menores de 18 años intencionadamente.
                  </p>
                </div>
                <div>
                  <h2 className="text-lg font-bold mb-2 text-slate-800 dark:text-slate-100">10. Cambios</h2>
                  <p className="text-sm text-slate-500 dark:text-slate-400">
                    Podemos actualizar esta política. Publicaremos la versión vigente en esta misma URL con la fecha de revisión.
                  </p>
                </div>
              </div>
            </section>
          </div>
        </div>
      </main>

      <footer className="relative z-10 border-t border-white/60 dark:border-border/50 bg-white/40 dark:bg-card/50 backdrop-blur-md mt-12">
        <div className="max-w-4xl mx-auto px-6 py-8 text-sm text-center font-medium text-slate-500 dark:text-slate-400">
          © 2026 Conect.ia
        </div>
      </footer>
    </div>
  );
}
