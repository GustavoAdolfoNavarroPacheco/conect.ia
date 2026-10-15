import { useEffect } from 'react';

/**
 * Activa las animaciones de scroll de toda la app: cualquier elemento con
 * `data-reveal` aparece (clase `is-revealed`) al entrar en pantalla.
 * Observa también los elementos que se montan después (cambios de pantalla).
 */
export function useScrollReveal() {
  useEffect(() => {
    if (typeof IntersectionObserver === 'undefined') return;

    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-revealed');
            io.unobserve(entry.target);
          }
        }
      },
      { rootMargin: '0px 0px -8% 0px', threshold: 0.08 }
    );

    const observar = (root: ParentNode) => {
      root.querySelectorAll?.('[data-reveal]:not(.is-revealed)').forEach((el) => io.observe(el));
    };

    observar(document);

    const mo = new MutationObserver((mutations) => {
      for (const m of mutations) {
        m.addedNodes.forEach((node) => {
          if (!(node instanceof HTMLElement)) return;
          if (node.hasAttribute('data-reveal')) io.observe(node);
          observar(node);
        });
      }
    });
    mo.observe(document.body, { childList: true, subtree: true });

    return () => {
      mo.disconnect();
      io.disconnect();
    };
  }, []);
}
