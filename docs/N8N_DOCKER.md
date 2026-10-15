# n8n local con Docker (CampusSocial)

Instalación **gratuita** (Community Edition) en tu PC. Compatible con el JSON en `Flujo_Automatizacion/`.

## Requisitos

- [Docker Desktop](https://www.docker.com/products/docker-desktop/) en Windows
- Conect.ia desplegado en Vercel, o en local con `npx vercel dev`

## 1. Levantar n8n

```powershell
cd Flujo_Automatizacion
docker compose up -d
```

Abre **http://localhost:5678** y crea tu usuario (primera vez).

Comandos útiles:

```powershell
docker compose logs -f n8n    # ver logs
docker compose down           # detener
docker compose down -v        # detener y borrar datos (cuidado)
```

## 2. Importar el workflow

1. En n8n: **Workflows** → **Import from file**
2. Elige `CampusSocial _ Publicación LinkedIn.json`
3. Revisa credenciales que pide el flujo:
   - **Header Auth** → nombre del header: `X-Campus-Secret`, valor = el mismo que `N8N_WEBHOOK_SECRET`
   - **Google Gemini** → API key (puede ser la misma que `GEMINI_API_KEY` del Backend)
   - **OpenAI** → si usas generación de imagen DALL-E en el flujo
   - **Telegram** → bot token (opcional)
   - **Postiz / LinkedIn** → según nodos del JSON

## 3. Activar el workflow

1. Abre el workflow importado
2. Nodo **Campus Post Form Webhook** → copia la URL de producción  
   Formato típico:
   ```
   http://localhost:5678/webhook/campus-post-form
   ```
3. Interruptor **Active** (ON) arriba a la derecha

> Sin **Active**, el webhook no responde.

## 4. Conectar CampusSocial

### Con ngrok (recomendado si Functions están en la nube o quieres probar desde fuera)

En una terminal:

```powershell
ngrok http 5678
```

Copia la URL HTTPS (ej. `https://tables-haziness-tinderbox.ngrok-free.dev`) y usa:

```env
N8N_WEBHOOK_URL=https://TU-SUBDOMINIO.ngrok-free.dev/webhook/campus-post-form
N8N_WEBHOOK_SECRET=elige-un-secreto-largo-aqui
```

### Solo en local (sin ngrok)

```env
N8N_WEBHOOK_URL=http://127.0.0.1:5678/webhook/campus-post-form
N8N_WEBHOOK_SECRET=elige-un-secreto-largo-aqui
```

### App (opcional)

**Ajustes** → **Automatización n8n** → pega la misma URL del webhook.

### Reiniciar `vercel dev`

```powershell
cd Backend
npm run dev
```

## 5. Probar

1. n8n en marcha (`docker compose ps`)
2. Workflow **activo**
3. En CampusSocial: **Nueva publicación** → generar → o programar con webhook configurado
4. En n8n: **Executions** → debe aparecer una ejecución

Prueba manual con PowerShell:

```powershell
$secret = "elige-un-secreto-largo-aqui"
$body = @{
  topic = "Prueba CampusSocial"
  tone = "profesional"
  include_image = $false
  telegram_notify = $false
  schedule_now = $false
  platforms = @("linkedin")
} | ConvertTo-Json

Invoke-RestMethod -Uri "http://127.0.0.1:5678/webhook/campus-post-form" `
  -Method POST `
  -Headers @{ "Content-Type" = "application/json"; "X-Campus-Secret" = $secret } `
  -Body $body
```

## Arquitectura

```
CampusSocial (React + Cloud Functions)
    │  POST + header X-Campus-Secret
    ▼
n8n Docker :5678  (/webhook/campus-post-form)
    │  Gemini, imagen, Telegram…
    ▼
Postiz / LinkedIn / redes
```

**Neon y Storage:** los guarda CampusSocial **antes** de llamar al webhook (borradores, publicaciones). n8n orquesta publicación y pasos extra del JSON.

## JSON que envía la app

```json
{
  "topic": "Tema del post",
  "tone": "profesional",
  "include_image": true,
  "telegram_notify": false,
  "schedule_now": false,
  "platforms": ["linkedin", "instagram"],
  "body": "Texto ya generado por Gemini (opcional)",
  "image_url": "https://..."
}
```

Cloud Function: `triggerN8nWorkflow` (alias de la misma lógica que Make).

## Producción en Vercel

Si despliegas Functions en la nube, `http://localhost:5678` **no** les llega. Opciones:

1. **n8n en un VPS** con URL pública + HTTPS  
2. **Túnel** ([ngrok](https://ngrok.com), Cloudflare Tunnel) hacia tu PC solo para pruebas  
3. Mantener automatización pesada en local y producción solo con `schedulePost` / Functions

## Plan Gratis vs Cloud

| | n8n Docker local | n8n Cloud |
|--|------------------|-----------|
| Costo licencia | $0 Community | Suscripción |
| Mantenimiento | Tú (Docker encendido) | n8n |
| Webhook desde Vercel remoto | Requiere URL pública | Sí |

## Make

Si más adelante quieres Make en la nube sin Docker, ver [MAKE_SETUP.md](MAKE_SETUP.md). Puedes tener `N8N_WEBHOOK_URL` **o** `MAKE_WEBHOOK_URL`; el Backend usa primero n8n si ambos están definidos.
