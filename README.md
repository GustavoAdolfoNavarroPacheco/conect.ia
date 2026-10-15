# Conect.ia

Automatización de publicaciones en redes sociales con IA: genera contenido con Gemini, lo programa y lo publica en LinkedIn, Facebook, Instagram y TikTok. Opcionalmente se integra con Make o n8n.

## Stack

| Pieza | Tecnología |
|-------|------------|
| Frontend | React + Vite (`Frontend/`) |
| API | Funciones serverless de Vercel (`api/` y `server/`) |
| Autenticación | Auth.js (`@auth/core`) con Google |
| Base de datos | Neon (PostgreSQL), esquema en `server/db/schema.sql` |
| Imágenes | Vercel Blob |
| Programación | Vercel Cron (`api/cron/publicar-programadas.ts`) |
| Automatización opcional | Make / n8n (`Flujo_Automatizacion/`) |

## Requisitos

- Node.js 20 o superior
- Cuenta de [Neon](https://neon.tech) (base de datos)
- Proyecto en [Vercel](https://vercel.com) (hosting y funciones)
- Cliente OAuth de Google (inicio de sesión)

## Variables de entorno

Se definen en Vercel (Settings → Environment Variables) y, para desarrollo local, en `.env.local` en la raíz del repositorio. Nunca se suben al repositorio.

Cómo obtener cada una, paso a paso: [docs/VARIABLES_DE_ENTORNO.md](docs/VARIABLES_DE_ENTORNO.md).

| Variable | Obligatoria | Para qué |
|----------|-------------|----------|
| `DATABASE_URL` | Sí | Cadena de conexión de Neon |
| `AUTH_SECRET` | Sí | Firma de la sesión de Auth.js (`openssl rand -base64 32`) |
| `AUTH_GOOGLE_ID` / `AUTH_GOOGLE_SECRET` | Sí | Cliente OAuth de Google |
| `CRON_SECRET` | Sí en producción | Protege el cron de publicaciones programadas |
| `BLOB_READ_WRITE_TOKEN` | Para imágenes | Se crea al conectar un almacén de Vercel Blob |
| `GEMINI_API_KEY` | Para IA | Generación de texto e imágenes |
| `ANTHROPIC_API_KEY` | No | Proveedor de IA alternativo |
| `POLLINATIONS_API_KEY` | Para video | Generación de video vertical |
| `LINKEDIN_CLIENT_ID` / `LINKEDIN_CLIENT_SECRET` | Para LinkedIn | OAuth y publicación |
| `META_CLIENT_ID` / `META_CLIENT_SECRET` | Para Facebook/Instagram | OAuth y publicación |
| `TIKTOK_CLIENT_KEY` / `TIKTOK_CLIENT_SECRET` | Para TikTok | OAuth y publicación |
| `MAKE_WEBHOOK_URL` / `MAKE_WEBHOOK_SECRET` | No | Escenario de Make |
| `N8N_WEBHOOK_URL` / `N8N_WEBHOOK_SECRET` | No | Webhook de n8n |

Otras variables opcionales (modelos de Gemini, alcances OAuth, etc.) están en `server/ai/aiProvider.ts`, `server/ai/generateImage.ts` y `server/integracion/*Config.ts`.

## Desarrollo local

Instala las dependencias de la raíz (API) y del frontend:

```bash
npm install
```

```bash
npm install --prefix Frontend
```

Crea `.env.local` en la raíz con `DATABASE_URL`, `AUTH_SECRET`, `AUTH_GOOGLE_ID` y `AUTH_GOOGLE_SECRET` (y las demás que necesites).

Aplica el esquema a tu base de Neon:

```bash
npm run db:migrate
```

Arranca frontend y API juntos con la CLI de Vercel (la primera vez te pedirá vincular el proyecto):

```bash
npx vercel dev
```

La app queda en http://localhost:3000. En Google Cloud registra `http://localhost:3000/api/auth/callback/google` como URI de redirección.

## Despliegue

Ver [docs/DEPLOY_VERCEL.md](docs/DEPLOY_VERCEL.md).

## Documentación

- [docs/DEPLOY_VERCEL.md](docs/DEPLOY_VERCEL.md): despliegue, variables y límites del plan
- [docs/LINKEDIN_OAUTH.md](docs/LINKEDIN_OAUTH.md): configurar LinkedIn
- [docs/MAKE_SETUP.md](docs/MAKE_SETUP.md): escenario de Make
- [docs/N8N_DOCKER.md](docs/N8N_DOCKER.md): n8n con Docker
- [docs/MODULO_ASISTENTE_IA.md](docs/MODULO_ASISTENTE_IA.md): Asistente IA
- [STRUCTURA_PROYECTO.md](STRUCTURA_PROYECTO.md): estructura del repositorio
