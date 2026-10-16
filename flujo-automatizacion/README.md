# Flujo de automatización — n8n (Docker)

Workflow exportado:

- **`campussocial-publicacion-linkedin.json`**

## Inicio rápido

```powershell
cd flujo-automatizacion
docker compose up -d
```

Luego sigue la guía completa: **[docs/n8n-docker.md](../docs/n8n-docker.md)**

1. Abrir http://localhost:5678  
2. Importar el JSON  
3. Configurar credenciales (`X-Campus-Secret`, Gemini, etc.)  
4. Activar el workflow  
5. Poner la URL del webhook en `variables de entorno de Vercel` como `N8N_WEBHOOK_URL`

## Checklist por sección del software

**[checklist.md](checklist.md)** — Docker, ngrok, credenciales n8n, Asistente IA, Canales, Ajustes, etc.

## Webhook esperado

- **Ruta:** `/webhook/campus-post-form`  
- **Método:** POST  
- **Header:** `X-Campus-Secret` (mismo valor que `N8N_WEBHOOK_SECRET`)

## Alternativa en la nube

- **Make (gratis):** [docs/make-setup.md](../docs/make-setup.md)  
- **n8n Cloud:** de pago en app.n8n.cloud
