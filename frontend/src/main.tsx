import { createRoot } from 'react-dom/client';
import AppRoutes from './app/AppRoutes';
import { RootErrorBoundary } from './app/RootErrorBoundary';
import './styles/index.css';

const root = document.getElementById('root')!;

createRoot(root).render(
  <RootErrorBoundary>
    <AppRoutes />
  </RootErrorBoundary>
);
