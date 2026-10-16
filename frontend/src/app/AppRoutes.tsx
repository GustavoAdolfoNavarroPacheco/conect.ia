import React from 'react';
import { BrowserRouter, Route, Routes } from 'react-router';
import { MotionConfig } from 'motion/react';
import { PrivacyPolicyPage } from './pages/PrivacyPolicyPage';
import { TermsPage } from './pages/TermsPage';
import AppRoot from './AppRoot';
import { useSmoothScroll } from '../hooks/useSmoothScroll';

/** Rutas públicas (/privacidad, /terminos) y aplicación principal. */
export default function AppRoutes() {
  // Aquí y no en AppRoot: así el scroll suave también cubre las páginas legales.
  useSmoothScroll();

  return (
    // Respeta "reducir movimiento" también en las animaciones de motion/react (drawer, transiciones, layoutId).
    <MotionConfig reducedMotion="user">
      <BrowserRouter>
        <Routes>
          <Route path="/privacidad" element={<PrivacyPolicyPage />} />
          <Route path="/terminos" element={<TermsPage />} />
          <Route path="/*" element={<AppRoot />} />
        </Routes>
      </BrowserRouter>
    </MotionConfig>
  );
}
