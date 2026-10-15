// Aplica server/db/schema.sql en la base de Neon indicada por DATABASE_URL.
// Uso: npm run db:migrate   (lee DATABASE_URL de .env.local si existe)
import { readFileSync } from 'node:fs';
import { neon } from '@neondatabase/serverless';

try {
  process.loadEnvFile('.env.local');
} catch {
  // Sin .env.local: se usa el entorno del proceso.
}

const url = process.env.DATABASE_URL?.trim();
if (!url) {
  console.error('Falta DATABASE_URL (define la variable o añádela en .env.local).');
  process.exit(1);
}

const sql = neon(url);
const schema = readFileSync(new URL('../server/db/schema.sql', import.meta.url), 'utf8');
const sentencias = schema
  .split('\n')
  .filter((linea) => !linea.trim().startsWith('--'))
  .join('\n')
  .split(/;\s*\n/)
  .map((s) => s.trim())
  .filter(Boolean);

for (const sentencia of sentencias) {
  await sql.query(sentencia);
}
console.log(`Esquema aplicado: ${sentencias.length} sentencias.`);
