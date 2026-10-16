import React from 'react';

type Props = { children: React.ReactNode };
type State = { error: Error | null };

/** Evita pantalla en blanco si React crashea al arrancar. */
export class RootErrorBoundary extends React.Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  render() {
    if (this.state.error) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-slate-50 p-6">
          <div className="max-w-lg rounded-2xl border bg-white p-8 shadow-sm">
            <h1 className="text-xl font-bold text-slate-900 mb-2">Error al cargar Conect.ia</h1>
            <p className="text-sm text-slate-600 mb-3">{this.state.error.message}</p>
            <p className="text-xs text-slate-500">
              Si acabas de desplegar, haz <strong>Redeploy</strong> en Vercel sin caché y revisa la consola del
              navegador (F12).
            </p>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
