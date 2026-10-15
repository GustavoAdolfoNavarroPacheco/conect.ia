/** Mensaje legible para errores del inicio de sesión con Google y de la cuenta. */
export function mensajeErrorAuth(err: unknown): string {
  if (err instanceof Error && err.message) return err.message;
  return 'Ocurrió un error al iniciar sesión. Intenta de nuevo.';
}
