import React from 'react';
import { Link } from 'react-router';
import { ArrowLeft } from 'lucide-react';
import { ConectiaLogo } from '../components/ConectiaLogo';

const CONTACT_EMAIL = 'adolfonavarro0212@gmail.com';
const LAST_UPDATED = '18 de agosto de 2026';

/**
 * Términos y Condiciones públicos (requeridos por LinkedIn Developers y Meta for Developers).
 * URL recomendada: https://campussocial-f56a0.web.app/terminos
 */
export function TermsPage() {
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
            <h1 className="text-3xl md:text-4xl font-extrabold mb-2 bg-clip-text text-transparent bg-gradient-to-r from-brand-deep to-brand">Términos y Condiciones</h1>
            <p className="text-sm font-medium text-muted-foreground not-prose mb-10">Última actualización: {LAST_UPDATED}</p>

            <section className="space-y-4 text-[15px] leading-relaxed text-slate-600 dark:text-slate-300">
              <p className="text-lg font-medium text-slate-800 dark:text-slate-200">
                Estos términos regulan el uso de <strong>Conect.ia</strong> (producto de{' '}
                <strong>Conect.ia</strong>, Colombia), la plataforma de automatización de publicaciones
                en redes sociales con asistencia de inteligencia artificial.
              </p>

              <h2 className="text-xl font-bold mt-10 mb-4 text-slate-800 dark:text-slate-100 flex items-center gap-3">
                <span className="w-8 h-8 rounded-xl bg-gradient-to-br from-brand-deep/10 to-brand/10 dark:from-brand-deep/30 dark:to-brand/30 flex items-center justify-center text-brand">1</span>
                Aceptación de los términos
              </h2>
              <p>
                Al crear una cuenta, acceder o utilizar Conect.ia aceptas estos términos y nuestra{' '}
                <Link to="/privacidad" className="font-medium hover:underline cursor-pointer">
                  Política de Privacidad
                </Link>
                . Si no estás de acuerdo, no debes usar el servicio.
              </p>

              <h2 className="text-xl font-bold mt-10 mb-4 text-slate-800 dark:text-slate-100 flex items-center gap-3">
                <span className="w-8 h-8 rounded-xl bg-gradient-to-br from-brand-deep/10 to-brand/10 dark:from-brand-deep/30 dark:to-brand/30 flex items-center justify-center text-brand">2</span>
                Descripción del servicio
              </h2>
              <p>
                Conect.ia te permite crear contenido con asistencia de IA, programar y publicar
                publicaciones en las redes sociales que conectes (LinkedIn, Facebook, Instagram, TikTok,
                entre otras), así como automatizar flujos mediante integraciones externas (n8n, Make).
              </p>
              <p>
                El servicio se ofrece «tal cual» y «según disponibilidad». Podemos modificar, suspender o
                interrumpir funcionalidades en cualquier momento, con o sin aviso previo.
              </p>

              <h2 className="text-xl font-bold mt-10 mb-4 text-slate-800 dark:text-slate-100 flex items-center gap-3">
                <span className="w-8 h-8 rounded-xl bg-gradient-to-br from-brand-deep/10 to-brand/10 dark:from-brand-deep/30 dark:to-brand/30 flex items-center justify-center text-brand">3</span>
                Cuenta y registro
              </h2>
              <ul className="list-disc pl-6 space-y-2 marker:text-brand">
                <li>Debes proporcionar información veraz y mantener tus credenciales seguras.</li>
                <li>Eres responsable de toda la actividad que ocurra con tu cuenta.</li>
                <li>Debes tener al menos 18 años para usar el servicio.</li>
                <li>Nos reservamos el derecho de suspender o eliminar cuentas que incumplan estos términos.</li>
              </ul>

              <h2 className="text-xl font-bold mt-10 mb-4 text-slate-800 dark:text-slate-100 flex items-center gap-3">
                <span className="w-8 h-8 rounded-xl bg-gradient-to-br from-brand-deep/10 to-brand/10 dark:from-brand-deep/30 dark:to-brand/30 flex items-center justify-center text-brand">4</span>
                Conexión de redes sociales
              </h2>
              <p>
                Para publicar, autorizas expresamente a Conect.ia a conectarse con tus cuentas de
                redes sociales mediante OAuth. Al hacerlo aceptas los términos y políticas de cada
                plataforma (LinkedIn, Meta, TikTok, entre otras).
              </p>
              <p>
                Puedes desconectar un canal en cualquier momento desde la aplicación (Canales → Desconectar)
                o revocando el acceso desde la propia red social. Las publicaciones ya realizadas no se
                eliminan al desconectar.
              </p>

              <h2 className="text-xl font-bold mt-10 mb-4 text-slate-800 dark:text-slate-100 flex items-center gap-3">
                <span className="w-8 h-8 rounded-xl bg-gradient-to-br from-brand-deep/10 to-brand/10 dark:from-brand-deep/30 dark:to-brand/30 flex items-center justify-center text-brand">5</span>
                Contenido generado con IA
              </h2>
              <p>
                El contenido generado por el asistente de IA es una <strong>propuesta</strong>: tú eres
                responsable de revisarlo, editarlo y aprobarlo antes de publicarlo. No garantizamos la
                exactitud, originalidad ni idoneidad del contenido generado.
              </p>

              <h2 className="text-xl font-bold mt-10 mb-4 text-slate-800 dark:text-slate-100 flex items-center gap-3">
                <span className="w-8 h-8 rounded-xl bg-gradient-to-br from-brand-deep/10 to-brand/10 dark:from-brand-deep/30 dark:to-brand/30 flex items-center justify-center text-brand">6</span>
                Usos prohibidos
              </h2>
              <p>No puedes usar Conect.ia para:</p>
              <ul className="list-disc pl-6 space-y-2 marker:text-brand">
                <li>Publicar contenido ilegal, fraudulento, difamatorio o que viole derechos de terceros.</li>
                <li>Difundir spam, malware o contenido engañoso.</li>
                <li>Publicar contenido que infrinja las políticas de las redes sociales conectadas.</li>
                <li>Intentar acceder a cuentas de otros usuarios o a datos no autorizados.</li>
                <li>Utilizar el servicio para fines distintos a los previstos o de forma automatizada abusiva.</li>
              </ul>

              <h2 className="text-xl font-bold mt-10 mb-4 text-slate-800 dark:text-slate-100 flex items-center gap-3">
                <span className="w-8 h-8 rounded-xl bg-gradient-to-br from-brand-deep/10 to-brand/10 dark:from-brand-deep/30 dark:to-brand/30 flex items-center justify-center text-brand">7</span>
                Responsabilidad sobre el contenido publicado
              </h2>
              <p>
                Eres el único responsable del contenido que programas o publicas a través del servicio y de
                las consecuencias de su publicación, incluyendo el cumplimiento de las políticas de cada red
                social y de la normativa aplicable.
              </p>

              <h2 className="text-xl font-bold mt-10 mb-4 text-slate-800 dark:text-slate-100 flex items-center gap-3">
                <span className="w-8 h-8 rounded-xl bg-gradient-to-br from-brand-deep/10 to-brand/10 dark:from-brand-deep/30 dark:to-brand/30 flex items-center justify-center text-brand">8</span>
                Propiedad intelectual
              </h2>
              <p>
                La plataforma, su diseño, código y marcas son de Conect.ia. Conservas los derechos
                sobre el contenido que creas. Nos otorgas una licencia limitada para procesar, almacenar y
                transmitir tu contenido con el fin de prestar el servicio.
              </p>

              <h2 className="text-xl font-bold mt-10 mb-4 text-slate-800 dark:text-slate-100 flex items-center gap-3">
                <span className="w-8 h-8 rounded-xl bg-gradient-to-br from-brand-deep/10 to-brand/10 dark:from-brand-deep/30 dark:to-brand/30 flex items-center justify-center text-brand">9</span>
                Limitación de responsabilidad
              </h2>
              <p>
                En la máxima medida permitida por la ley, Conect.ia no será responsable por daños
                indirectos, pérdida de datos, lucro cesante o fallos de servicios de terceros (incluidos
                Vercel, Neon, n8n, Make o las propias redes sociales). No garantizamos que las publicaciones se
                realicen sin errores ni que las plataformas externas permanezcan disponibles.
              </p>

              <h2 className="text-xl font-bold mt-10 mb-4 text-slate-800 dark:text-slate-100 flex items-center gap-3">
                <span className="w-8 h-8 rounded-xl bg-gradient-to-br from-brand-deep/10 to-brand/10 dark:from-brand-deep/30 dark:to-brand/30 flex items-center justify-center text-brand">10</span>
                Terminación
              </h2>
              <p>
                Puedes dejar de usar el servicio cuando quieras y solicitar la eliminación de tu cuenta
                contactándonos. Podemos suspender o terminar tu acceso si incumples estos términos o si el
                servicio se descontinúa.
              </p>

              <h2 className="text-xl font-bold mt-10 mb-4 text-slate-800 dark:text-slate-100 flex items-center gap-3">
                <span className="w-8 h-8 rounded-xl bg-gradient-to-br from-brand-deep/10 to-brand/10 dark:from-brand-deep/30 dark:to-brand/30 flex items-center justify-center text-brand">11</span>
                Cambios a estos términos
              </h2>
              <p>
                Podemos actualizar estos términos periódicamente. Publicaremos la versión vigente en esta
                misma URL con su fecha de revisión. El uso continuado del servicio tras los cambios implica
                su aceptación.
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-12 pt-8 border-t border-slate-200 dark:border-border/50">
                <div>
                  <h2 className="text-lg font-bold mb-2 text-slate-800 dark:text-slate-100">12. Ley aplicable</h2>
                  <p className="text-sm text-slate-500 dark:text-slate-400">
                    Estos términos se rigen por la ley de la República de Colombia. Cualquier controversia se
                    somete a los tribunales competentes de la ciudad de domicilio de la empresa.
                  </p>
                </div>
                <div>
                  <h2 className="text-lg font-bold mb-2 text-slate-800 dark:text-slate-100">13. Contacto</h2>
                  <p className="text-sm text-slate-500 dark:text-slate-400">
                    Para consultas sobre estos términos, escribe a{' '}
                    <a href={`mailto:${CONTACT_EMAIL}`} className="font-medium hover:underline cursor-pointer">
                      {CONTACT_EMAIL}
                    </a>
                    .
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