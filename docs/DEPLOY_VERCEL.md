# Despliegue en Vercel

El repositorio es un monorepo: el frontend está en `Frontend/` y la API en `api/` + `server/`. El `vercel.json` de la raíz construye el frontend y publica las funciones.

## 1. Base de datos en Neon

1. Crea un proyecto en [Neon](https://neon.tech) y copia la cadena de conexión (`postgresql://…`).
2. Aplica el esquema (una vez, y cada vez que cambie `server/db/schema.sql`):

```bash
DATABASE_URL="postgresql://…" npm run db:migrate
```

## 2. Proyecto en Vercel

1. Importa el repositorio en Vercel. **Root Directory**: la raíz del repo (no `Frontend/`).
2. Vercel usa `vercel.json`: instala dependencias de la raíz y de `Frontend/`, compila `Frontend/dist` y publica `api/`.
3. Añade un almacén de **Vercel Blob** (Storage → Create → Blob) con acceso **público**. Se crea `BLOB_READ_WRITE_TOKEN` automáticamente.

## 3. Variables de entorno (Production)

| Variable | Cómo obtenerla |
|----------|----------------|
| `DATABASE_URL` | Neon → Connection string |
| `AUTH_SECRET` | `openssl rand -base64 32` |
| `AUTH_GOOGLE_ID`, `AUTH_GOOGLE_SECRET` | Google Cloud Console → Credenciales → ID de cliente OAuth (tipo Aplicación web) |
| `CRON_SECRET` | Cualquier cadena larga aleatoria |
| `GEMINI_API_KEY` | https://aistudio.google.com/apikey |
| `LINKEDIN_*`, `META_*`, `TIKTOK_*` | Cada plataforma (ver docs de cada red) |
| `MAKE_WEBHOOK_URL`, `N8N_WEBHOOK_URL` | Opcionales |

Tras añadir variables, haz **Redeploy**.

## 4. URIs de redirección

Registra estas URLs en cada plataforma (sustituye `TU-DOMINIO`):

| Servicio | URI |
|----------|-----|
| Google (inicio de sesión) | `https://TU-DOMINIO/api/auth/callback/google` |
| LinkedIn | `https://TU-DOMINIO/oauth/linkedin` |
| Meta | `https://TU-DOMINIO/oauth/meta` |
| TikTok | `https://TU-DOMINIO/oauth/tiktok` |

Las URLs de LinkedIn, Meta y TikTok también deben coincidir con `Frontend/.env.production` (`VITE_*_OAUTH_REDIRECT_URI`).

## 5. Límites del plan

- **Plan Hobby** (configuración actual): las funciones tienen 60 s de máximo y el cron solo puede correr una vez al día. `vercel.json` usa `0 9 * * *`, así que por sí solo las publicaciones programadas se revisan solo a las 9:00. Para publicar a tiempo, configura un disparador externo cada 5 minutos (por ejemplo cron-job.org) que haga `GET` a `https://TU-DOMINIO/api/cron/publicar-programadas` con la cabecera `Authorization: Bearer <valor de CRON_SECRET>`. Cada ejecución publica como máximo 5 publicaciones. Con el plan Pro puedes cambiar el cron de `vercel.json` a `* * * * *`; en Hobby ese valor impide desplegar.
- **Generación de video** (Pollinations) puede tardar hasta 240 s: necesita el plan Pro y subir `maxDuration` a 300 en `vercel.json`.
- **Subida de imágenes** va directa a Vercel Blob (no pasa por la función), así que no tiene el límite de 4,5 MB del cuerpo de las funciones.

## Desarrollo local

Usa `npx vercel dev` (ver [README.md](../README.md)). Las rutas `/api/*` solo funcionan con la CLI de Vercel o en el despliegue; `npm run dev --prefix Frontend` sirve solo la interfaz.
