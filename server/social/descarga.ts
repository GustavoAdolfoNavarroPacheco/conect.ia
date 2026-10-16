import { ErrorApi } from './retry';

/**
 * Descarga un medio con un tope de tamaño. Corta la lectura en cuanto supera el límite, aunque el
 * servidor no declare el tamaño, para no cargar en memoria un archivo enorme.
 */
export async function descargarConLimite(
  url: string,
  maxBytes: number,
  etiqueta: string
): Promise<{ buffer: Buffer; contentType: string }> {
  const res = await fetch(url, { redirect: 'follow' });
  if (!res.ok) {
    throw new ErrorApi(`${etiqueta}: no se pudo descargar el archivo (${res.status})`, res.status);
  }

  const declarado = Number(res.headers.get('content-length') ?? '0');
  if (declarado > maxBytes) {
    await res.body?.cancel();
    throw new Error(`${etiqueta}: el archivo supera el tamaño permitido`);
  }

  const contentType = res.headers.get('content-type')?.split(';')[0]?.trim() ?? '';
  if (!res.body) {
    return { buffer: Buffer.alloc(0), contentType };
  }

  const lector = res.body.getReader();
  const trozos: Buffer[] = [];
  let total = 0;
  for (;;) {
    const { done, value } = await lector.read();
    if (done) break;
    total += value.byteLength;
    if (total > maxBytes) {
      await lector.cancel();
      throw new Error(`${etiqueta}: el archivo supera el tamaño permitido`);
    }
    trozos.push(Buffer.from(value));
  }
  return { buffer: Buffer.concat(trozos), contentType };
}
