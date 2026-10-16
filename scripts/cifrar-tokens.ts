// Cifra en la base los tokens OAuth que aún están en claro (tabla tokens_redes).
// Requisito: TOKEN_ENCRYPTION_KEY con la MISMA clave que tiene Vercel, y DATABASE_URL.
// Se puede ejecutar varias veces: los tokens ya cifrados se saltan.
// Uso: npx tsx scripts/cifrar-tokens.ts
import { existsSync } from 'node:fs';
import { sql } from '../server/db/client';
import { cifrarValor, esCifrado } from '../server/db/cifradoTokens';

const COLUMNAS = ['linkedin', 'meta', 'tiktok'] as const;

async function main() {
  if (existsSync('.env.local')) process.loadEnvFile('.env.local');
  if (!process.env.TOKEN_ENCRYPTION_KEY?.trim()) {
    throw new Error('Define TOKEN_ENCRYPTION_KEY (la misma de Vercel) antes de cifrar los tokens.');
  }

  const filas = await sql().query(`SELECT usuario_id, ${COLUMNAS.join(', ')} FROM tokens_redes`, []);
  let cifrados = 0;
  for (const fila of filas) {
    for (const columna of COLUMNAS) {
      const valor = fila[columna];
      if (valor === null || valor === undefined || esCifrado(valor)) continue;
      await sql().query(`UPDATE tokens_redes SET ${columna} = $2::jsonb WHERE usuario_id = $1`, [
        fila.usuario_id,
        JSON.stringify(cifrarValor(valor)),
      ]);
      cifrados++;
    }
  }
  console.log(`Filas revisadas: ${filas.length}. Tokens cifrados ahora: ${cifrados}.`);
}

main().catch((err) => {
  console.error('ERROR al cifrar tokens:', err instanceof Error ? err.message : err);
  process.exit(1);
});
