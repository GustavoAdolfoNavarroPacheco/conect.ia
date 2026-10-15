import { useEffect } from 'react';
import Lenis from 'lenis';

/**
 * Scroll suave con inercia en toda la app:
 *  - la página (landing, login, legales) y los enlaces ancla (#funciones…);
 *  - cada panel con scroll interno (`overflow-y-auto` / `overflow-auto`), también los
 *    que aparecen después (cambios de pantalla, modales, menús).
 * Un solo bucle de animación para todas las instancias. Se desactiva con
 * "reducir movimiento"; `data-lenis-prevent` excluye un elemento.
 */
const SELECTOR = '.overflow-y-auto, .overflow-auto, [data-smooth]';

export function useSmoothScroll() {
  useEffect(() => {
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return;

    const instancias = new Map<HTMLElement, Lenis>();
    const raiz = new Lenis({ anchors: true, lerp: 0.1, smoothWheel: true });

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
        new Lenis({ wrapper: el, content: el, lerp: 0.1, smoothWheel: true, eventsTarget: el })
      );
    };

    const limpiar = () => {
      instancias.forEach((lenis, el) => {
        if (!el.isConnected) {
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

    let pendiente = 0;
    const mo = new MutationObserver((mutations) => {
      window.clearTimeout(pendiente);
      pendiente = window.setTimeout(() => {
        limpiar();
        for (const m of mutations) {
          m.addedNodes.forEach((n) => n instanceof HTMLElement && escanear(n));
        }
      }, 50);
    });
    mo.observe(document.body, { childList: true, subtree: true });

    return () => {
      mo.disconnect();
      window.clearTimeout(pendiente);
      cancelAnimationFrame(raf);
      raiz.destroy();
      instancias.forEach((l) => l.destroy());
      instancias.clear();
    };
  }, []);
}
