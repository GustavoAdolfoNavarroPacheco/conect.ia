# Checklist — Flujo_Automatizacion y CampusSocial

Usa esto para validar que todo el software y n8n Docker/ngrok quedan alineados.

## Infraestructura

| Paso | Estado | Notas |
|------|--------|-------|
| Docker Desktop en ejecución | ☐ | Contenedor `n8n` puerto 5678 |
| Workflow importado y **Active** | ☐ | JSON en esta carpeta |
| ngrok → `localhost:5678` (opcional remoto) | ☐ | URL pública para Functions en la nube |
| `N8N_WEBHOOK_URL` en `variables de entorno de Vercel` o Ajustes | ☐ | Producción: `https://xxx.ngrok-free.dev/webhook/campus-post-form` |
| `N8N_WEBHOOK_SECRET` = Header Auth en n8n | ☐ | Mismo valor en nodo webhook |
| Entorno local reiniciado | ☐ | `npx vercel dev` |

## Credenciales en n8n (workflow JSON)

| Credencial | Obligatorio | CampusSocial |
|------------|-------------|--------------|
| Header `X-Campus-Secret` | Sí | `N8N_WEBHOOK_SECRET` |
| Google Gemini | Sí* | Misma idea que `GEMINI_API_KEY` |
| OpenAI (DALL-E) | Si `include_image` en n8n | Opcional si la app ya envía `image_url` |
| Telegram | Opcional | `telegram_notify: true` en payload |
| Postiz / LinkedIn | Para publicar | Canales → Postiz |

\* La app ya genera texto/imagen; n8n puede solo publicar.

## Secciones de la app (solo LinkedIn)

| Pantalla | Qué debe hacer | Enlace con n8n |
|----------|----------------|----------------|
| **Asistente IA** | Ideas + **Generar publicación** → Nueva pub. auto | No llama n8n directo |
| **Nueva publicación** | Gemini + webhook n8n con `body`/`image_url` | `platforms: ["linkedin"]` |
| **Subir publicación** | Storage + programar en LinkedIn | Opcional webhook |
| **Borradores** | Neon | n8n crea borrador al disparar webhook |
| **Calendario** | Programados + arrastrar fecha | Solo icono LinkedIn |
| **Canales** | **Solo LinkedIn** — Postiz + Developers | `verify_channel` + `red: linkedin` |
| **Ajustes** | URL webhook n8n/ngrok | `N8N_WEBHOOK_URL` |
| **Inicio** | KPIs y actividad | Trazas en `ejecuciones_n8n` |

Facebook e Instagram **no** aparecen en la UI; el workflow n8n puede simplificarse a una sola rama LinkedIn.

## Payload mínimo de prueba

```json
{
  "topic": "Bootcamp Campus Lands",
  "tone": "profesional",
  "include_image": true,
  "telegram_notify": false,
  "schedule_now": false,
  "platforms": ["linkedin"]
}
```

En n8n puedes desactivar o eliminar las ramas Instagram/Facebook/Twitter del JSON importado si solo usas LinkedIn.

## Pendientes habituales (fuera de n8n)

- [ ] Subir imagen IA a Vercel Blob antes del webhook (URL estable)
- [x] Política de privacidad `/privacidad` (Hosting)
- [x] OAuth LinkedIn (`startLinkedInOAuth` + `/oauth/linkedin`) — configurar `LINKEDIN_CLIENT_ID` en `variables de entorno de Vercel`
- [ ] OAuth Meta Graph API
- [ ] Callback n8n → actualizar `publicaciones.estado` en Neon
