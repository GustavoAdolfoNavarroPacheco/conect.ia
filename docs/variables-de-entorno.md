# Variables de entorno

## Dónde configurarlas

- **Producción**: Vercel → tu proyecto → **Settings → Environment Variables** (ámbito *Production*). Tras cambiarlas, haz **Redeploy**.
- **Local**: archivo `.env.local` en la raíz del repo. Puedes descargar las de Vercel con `npx vercel env pull .env.local`.

`TU-DOMINIO` es tu dominio de Vercel (por ejemplo `campus-social-indol.vercel.app`). En local, usa `localhost:3000`.

Para generar secretos aleatorios (funciona en Windows, macOS y Linux):

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

## Resumen

| Variable | Obligatoria | Sección |
|----------|:-----------:|---------|
| `DATABASE_URL` | Sí | [1](#1-base-de-datos-neon) |
| `AUTH_GOOGLE_ID`, `AUTH_GOOGLE_SECRET` | Sí | [2](#2-inicio-de-sesión-con-google) |
| `AUTH_SECRET` | Sí | [2](#2-inicio-de-sesión-con-google) |
| `BLOB_READ_WRITE_TOKEN` | Sí (para imágenes) | [3](#3-imágenes-vercel-blob) |
| `GEMINI_API_KEY` | Sí (para IA) | [4](#4-inteligencia-artificial) |
| `POLLINATIONS_API_KEY` | No (solo video) | [4](#4-inteligencia-artificial) |
| `CRON_SECRET` | Sí en producción | [5](#5-publicaciones-programadas) |
| `LINKEDIN_CLIENT_ID`, `LINKEDIN_CLIENT_SECRET` | Para LinkedIn | [6](#6-redes-sociales) |
| `FACEBOOK_APP_ID`, `FACEBOOK_CLIENT_SECRET` | Para Facebook/Instagram | [6](#6-redes-sociales) |
| `INSTAGRAM_APP_ID`, `INSTAGRAM_CLIENT_SECRET` | No (si es otra app) | [6](#6-redes-sociales) |
| `TIKTOK_CLIENT_KEY`, `TIKTOK_CLIENT_SECRET`, `TIKTOK_REDIRECT_URI` | Para TikTok | [6](#6-redes-sociales) |
| `MAKE_WEBHOOK_URL` | No | [7](#7-automatización-opcional-make-o-n8n) |
| `N8N_WEBHOOK_URL` | No | [7](#7-automatización-opcional-make-o-n8n) |

Si defines `N8N_WEBHOOK_URL` y `MAKE_WEBHOOK_URL` a la vez, el servidor usa **n8n**.

## 1. Base de datos (Neon)

### `DATABASE_URL`

1. Entra en [neon.tech](https://neon.tech) y abre tu proyecto.
2. Pulsa **Connect** y copia la cadena que empieza por `postgresql://`.
3. Pégala en `.env.local` y aplica el esquema:

```bash
npm run db:migrate
```

## 2. Inicio de sesión (Google y correo)

### `AUTH_GOOGLE_ID` y `AUTH_GOOGLE_SECRET`

1. En [Google Cloud Console](https://console.cloud.google.com), crea o elige un proyecto.
2. Configura la **pantalla de consentimiento de OAuth** (nombre de la app y correo). Mientras esté en modo *Testing*, añade tu cuenta como usuario de prueba.
3. Ve a **Credenciales → Crear credenciales → ID de cliente de OAuth** y elige **Aplicación web**.
4. En **URIs de redireccionamiento autorizados** añade:
   - `https://TU-DOMINIO/api/auth/callback/google`
   - `http://localhost:3000/api/auth/callback/google` (solo desarrollo)
5. Copia el **ID de cliente** a `AUTH_GOOGLE_ID` y el **secreto del cliente** a `AUTH_GOOGLE_SECRET`.

### `AUTH_SECRET`

Genera un valor con el comando de arriba. Si lo cambias, se cierran todas las sesiones.

## 3. Imágenes (Vercel Blob)

### `BLOB_READ_WRITE_TOKEN`

1. En Vercel, abre tu proyecto → **Storage → Create → Blob**. Elige acceso **Public**.
2. Conéctalo al proyecto. Vercel crea `BLOB_READ_WRITE_TOKEN` automáticamente.
3. Para local, ejecuta `npx vercel env pull .env.local`.

## 4. Inteligencia artificial

### `GEMINI_API_KEY`

1. Abre [aistudio.google.com/apikey](https://aistudio.google.com/apikey) y pulsa **Create API key**.
2. Copia la clave.

Generar imágenes con Gemini puede requerir facturación activa en AI Studio. Si no la tienes, la app usa imágenes de respaldo (`IMAGE_FALLBACK`).

### `POLLINATIONS_API_KEY` (opcional, solo video)

1. Crea una clave en [enter.pollinations.ai/keys](https://enter.pollinations.ai/keys).

La generación de video necesita el plan Pro de Vercel (ver [deploy-vercel.md](deploy-vercel.md)).

## 5. Publicaciones programadas

### `CRON_SECRET`

Genera un valor con el comando de arriba. Vercel lo envía automáticamente en la cabecera `Authorization: Bearer` a `/api/cron/publicar-programadas`; si no coincide, la función rechaza la petición. El cron diario de Vercel (plan Hobby) no basta para publicar a tiempo: añade un disparador externo cada 5 minutos con ese mismo valor en `Authorization: Bearer` (ver [deploy-vercel.md](deploy-vercel.md#5-límites-del-plan)).

## 6. Redes sociales

Cada red necesita su propia app. Registra las URIs de redirección **exactamente** como aparecen aquí, porque deben coincidir con `VITE_*_OAUTH_REDIRECT_URI` en `frontend/.env.production`.

### LinkedIn: `LINKEDIN_CLIENT_ID` y `LINKEDIN_CLIENT_SECRET`

1. En [developers.linkedin.com](https://developers.linkedin.com) pulsa **Create app**. Te pedirá una página de empresa de LinkedIn.
2. En **Products**, solicita **Sign In with LinkedIn using OpenID Connect** y **Share on LinkedIn**. La publicación requiere aprobación de LinkedIn.
3. En la pestaña **Auth** copia el **Client ID** a `LINKEDIN_CLIENT_ID` y el **Primary Client Secret** a `LINKEDIN_CLIENT_SECRET`.
4. En **Authorized redirect URLs** añade `https://TU-DOMINIO/oauth/linkedin`.

Mientras LinkedIn no apruebe *Share on LinkedIn*, define `LINKEDIN_OAUTH_INCLUDE_POST_SCOPE=false` para que solo se pida el inicio de sesión.

### Facebook e Instagram: `FACEBOOK_APP_ID` y `FACEBOOK_CLIENT_SECRET`

1. En [developers.facebook.com](https://developers.facebook.com) abre **Mis apps → Crear app**.
2. Añade el producto **Facebook Login**.
3. En **Configuración → Básica** copia el **Identificador de la app** a `FACEBOOK_APP_ID` y la **Clave secreta** a `FACEBOOK_CLIENT_SECRET`.
4. En **Facebook Login → Configuración** añade `https://TU-DOMINIO/oauth/meta` en **URI de redireccionamiento de OAuth válidos**.

Para Instagram, añade el producto de Instagram de tu app y su permiso de publicación (`instagram_content_publish`). Si usas otra app para Instagram, define `INSTAGRAM_APP_ID` e `INSTAGRAM_CLIENT_SECRET`; si no, se usan las de Facebook. `META_CLIENT_ID` y `META_CLIENT_SECRET` sirven de respaldo si no defines las de Facebook.

La cuenta de Instagram debe ser profesional y estar vinculada a una página de Facebook. Para que otros usuarios conecten sus páginas, Meta debe aprobar los permisos (*App Review*). Mientras tanto, solo funciona con cuentas añadidas a la app como roles.

### TikTok: `TIKTOK_CLIENT_KEY`, `TIKTOK_CLIENT_SECRET` y `TIKTOK_REDIRECT_URI`

1. En [developers.tiktok.com](https://developers.tiktok.com) abre **Manage apps → Create app**.
2. Añade los productos **Login Kit** y **Content Posting API**.
3. Copia el **Client Key** a `TIKTOK_CLIENT_KEY` y el **Client Secret** a `TIKTOK_CLIENT_SECRET`.
4. Registra `https://TU-DOMINIO/oauth/tiktok` como **Redirect URL** y pon esa misma URL en `TIKTOK_REDIRECT_URI`.

## 6b. Seguridad, cuotas y modelos

- **`TOKEN_ENCRYPTION_KEY`** (recomendada): clave de 32 bytes en base64 para cifrar los tokens de LinkedIn, Meta y TikTok en la base. Genérala con `openssl rand -base64 32`. Sin ella los tokens se guardan en claro, como antes. **Si la defines**, después ejecuta una vez `npx tsx scripts/cifrar-tokens.ts` con esa misma clave en `.env.local`. No la cambies después sin reconectar las cuentas: los tokens cifrados con una clave distinta no se pueden leer.
- **`ANTHROPIC_MODEL`** (opcional): modelo de Anthropic para el respaldo de texto. Por defecto `claude-haiku-5-5`.
- **`LINKEDIN_API_VERSION`** (opcional): versión de la API de LinkedIn (`AAAAMM`). Por defecto `202609`. Si LinkedIn responde con un error de versión, cámbiala aquí sin tocar código.
- **`CUOTA_IA_TEXTO`, `CUOTA_IA_IMAGEN`, `CUOTA_IA_VIDEO`, `CUOTA_IA_CHAT`** (opcionales): generaciones por usuario y día (UTC). Por defecto 40, 15, 3 y 60.
- **`TOPE_IA_TEXTO`, `TOPE_IA_IMAGEN`, `TOPE_IA_VIDEO`, `TOPE_IA_CHAT`** (opcionales): tope de todos los usuarios juntos por día.
- **`BLOB_READ_WRITE_TOKEN`**: ahora es obligatorio para generar videos con IA, porque el video se guarda en Blob para publicarlo siempre igual.

## 7. Automatización (opcional): Make o n8n

Define solo una de las dos. Detalles de los escenarios en [make-setup.md](make-setup.md) y [n8n-docker.md](n8n-docker.md).

### `MAKE_WEBHOOK_URL`

1. En [make.com](https://make.com), abre tu escenario y añade el módulo **Webhooks → Custom webhook**.
2. Pulsa **Copiar dirección** y pega la URL (formato `https://hook.eu1.make.com/…`).

Opcional: `MAKE_WEBHOOK_SECRET` con un texto largo. El servidor lo envía en las cabeceras `X-Campus-Secret` y `x-make-apikey`, solo a la URL de esta variable de Vercel. Nunca se envía a la URL que guardas en Ajustes. Filtra por esa cabecera dentro de Make. Si el secreto estuvo en una URL que no controlas, rótalo en Make y en Vercel.

### `N8N_WEBHOOK_URL`

Vercel no puede llegar a `localhost`, así que n8n debe ser accesible desde internet.

1. Levanta n8n con `docker compose up -d` en `flujo-automatizacion/`.
2. Expón el puerto 5678 con `ngrok http 5678` y copia la URL `https://…`.
3. En n8n abre el workflow, nodo **Campus Post Form Webhook**, y copia la URL de producción. Tendrá esta forma: `https://TU-SUBDOMINIO.ngrok-free.dev/webhook/campus-post-form`.
4. Activa el workflow (interruptor **Active**).

Con ngrok gratuito la URL cambia al reiniciarlo: actualiza la variable y redespliega. Opcional: `N8N_WEBHOOK_SECRET`, que en n8n se configura como *Header Auth* con nombre `X-Campus-Secret`.
