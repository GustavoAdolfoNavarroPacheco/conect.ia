/**
 * Estado de una publicación según la respuesta de Make. `publicado` solo si Make confirma con
 * `success: true` y no es un borrador. Una respuesta 2xx sin confirmación queda como `enviado`:
 * Make recibió la petición, pero no hay prueba de que la publicación saliera.
 */
export function estadoTrasEnvioMake(
  respuesta: { success?: boolean; linkedin_status?: string } | null
): 'publicado' | 'enviado' {
  return respuesta?.success === true && respuesta.linkedin_status !== 'draft' ? 'publicado' : 'enviado';
}

/**
 * Mensaje para la persona usuaria cuando un envío falla. Un corte por tiempo puede ocurrir
 * después de que el escenario ya publicó, así que se avisa antes de reintentar.
 */
export function mensajeDeFalloEnvio(err: unknown): string {
  const cortado = err instanceof Error && (err.name === 'TimeoutError' || err.name === 'AbortError');
  if (cortado) {
    return 'El escenario no respondió a tiempo. Puede que ya se haya publicado: revísalo en Make antes de reintentar.';
  }
  return err instanceof Error ? err.message : 'Error desconocido';
}
