import { useEffect } from 'react';
import Lenis from 'lenis';

/**
 * Scroll suave con inercia en toda la app:
 *  - la página (landing, login, legales) y los enlaces ancla (#funciones…);
 *  - cada contenedor desplazable, también los que solo lo son en algunos anchos
 *    (`overflow-y-auto` o `lg:overflow-y-auto`) y los que aparecen después.
 * Un solo bucle de animación para todas las instancias. Se desactiva con
 * "reducir movimiento"; `data-lenis-prevent` excluye un elemento.
 *
 * `allowNestedScroll` (raíz e instancias) deja que la rueda desplace los elementos anidados
 * que puedan desplazarse, como textareas, listas y chats; si no, el contenedor padre los bloquea.
 */
const SELECTOR = [
  '.overflow-y-auto',
  '.overflow-auto',
  '[class*="overflow-y-auto"]',
  '[class*="overflow-auto"]',
  '[data-smooth]',
].join(', ');

export function useSmoothScroll() {
  useEffect(() => {
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return;

    const instancias = new Map<HTMLElement, Lenis>();
    const raiz = new Lenis({ anchors: true, lerp: 0.1, smoothWheel: true, allowNestedScroll: true });

    let raf = 0;
    const bucle = (t: number) => {
      raiz.raf(t);
      instancias.forEach((l) => l.raf(t));
      raf = requestAnimationFrame(bucle);
    };
    raf = requestAnimationFrame(bucle);

    const esDesplazable = (el: HTMLElement) => {
      if (el.hasAttribute('data-lenis-prevent') || el.closest('[data-lenis-prevent]')) return false;
      const overflow = getComputedStyle(el).overflowY;
      return overflow === 'auto' || overflow === 'scroll';
    };

    const conectar = (el: HTMLElement) => {
      if (instancias.has(el) || !esDesplazable(el)) return;
      instancias.set(
        el,
        new Lenis({
          wrapper: el,
          content: el,
          lerp: 0.1,
          smoothWheel: true,
          eventsTarget: el,
          allowNestedScroll: true,
        })
      );
    };

    /** Libera instancias de elementos eliminados o que ya no son desplazables (p. ej. al cambiar de ancho). */
    const limpiar = () => {
      instancias.forEach((lenis, el) => {
        if (!el.isConnected || !esDesplazable(el)) {
          lenis.destroy();
          instancias.delete(el);
        }
      });
    };

    const escanear = (root: ParentNode) => {
      if (root instanceof HTMLElement && root.matches(SELECTOR)) conectar(root);
      root.querySelectorAll?.<HTMLElement>(SELECTOR).forEach(conectar);
    };

    escanear(document);

    // Nodos añadidos pendientes: se acumulan entre lotes para no perder ninguno.
    const pendientesMO = new Set<HTMLElement>();
    let timerMO = 0;
    const mo = new MutationObserver((mutations) => {
      for (const m of mutations) {
        m.addedNodes.forEach((n) => {
          if (n instanceof HTMLElement) pendientesMO.add(n);
        });
      }
      window.clearTimeout(timerMO);
      timerMO = window.setTimeout(() => {
        limpiar();
        pendientesMO.forEach((n) => {
          if (n.isConnected) escanear(n);
        });
        pendientesMO.clear();
      }, 50);
    });
    mo.observe(document.body, { childList: true, subtree: true });

    // Los contenedores con `lg:overflow-y-auto` cambian al cruzar el breakpoint sin cambiar el DOM.
    let timerResize = 0;
    const alRedimensionar = () => {
      window.clearTimeout(timerResize);
      timerResize = window.setTimeout(() => {
        limpiar();
        escanear(document);
      }, 150);
    };
    window.addEventListener('resize', alRedimensionar);

    return () => {
      mo.disconnect();
      window.removeEventListener('resize', alRedimensionar);
      window.clearTimeout(timerMO);
      window.clearTimeout(timerResize);
      cancelAnimationFrame(raf);
      raiz.destroy();
      instancias.forEach((l) => l.destroy());
      instancias.clear();
    };
  }, []);
}
