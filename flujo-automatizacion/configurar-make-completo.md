# Configurar Make.com alineado con CampusSocial

Guía para terminar el escenario **CampusSocial | Publicación LinkedIn** y que funcione con el software (OAuth + Gemini + calendario Vercel).

---

## Arquitectura (quién hace qué)

| Tarea | Quién |
|--------|--------|
| Generar texto / imagen (Gemini) | **CampusSocial** |
| Publicar en LinkedIn (OAuth) | **CampusSocial** (`publishPostNow`) |
| Programar hora de publicación | **Vercel** (`schedulePost` + cron de Vercel cada minuto) |
| Notificar Telegram, Slack, email, Sheets… | **Make** (opcional) |
| Publicar en LinkedIn *desde* Make | Solo si quieres duplicar (no recomendado si ya usas OAuth) |

**Recomendación:** deja los módulos **LinkedIn** nativos de Make en rojo **desconectados** o elimínalos. CampusSocial ya publica con tu cuenta conectada en Canales. Make recibe el aviso *después* de publicar.

---

## Paso 1 — Arreglar tu escenario actual (captura con badges rojos)

### A) Eliminar o ignorar módulos rotos

1. **LinkedIn → Create a User Text Post** (badge rojo): **elimínalo** o no lo uses. Requiere otra conexión LinkedIn en Make, distinta del OAuth de CampusSocial.
2. **HTTP (legacy) POST /v2/ugcPosts** con `Bearer TU_TOKEN_LINKEDIN`: solo útil si quieres publicar *solo* desde Make. Si usas Canales → OAuth, **no hace falta**.

### B) Mantener esta estructura mínima

```
[Custom webhook]
    → [Router: action = verify_channel?]
         → Sí → [Webhook response OK verificación]
         → No → [Set variables: postText, postTitle, imageUrl]
              → [Router]
                   → campus_published = true  → [Webhook response éxito]
                   → action = notify_scheduled → [Webhook response programado]
                   → schedule_now = true      → (HTTP LinkedIn — opcional)
                   → resto                    → [Webhook response borrador]
```

### C) Reimportar blueprint actualizado (opcional)

1. Escenario nuevo → **⋯ → Import blueprint** → `campussocial-linkedin-make.blueprint.json` (incluye ramas `campus_ya_publico` y `notify_scheduled`).
2. **Create a webhook** → copia URL → CampusSocial **Ajustes**.

---

## Paso 2 — Webhook y API key

1. Módulo **Webhooks → Custom webhook** → **Create a webhook**.
2. **API Key authentication** → **+ Add API key** → nombre `CampusSocial` → valor largo (ej. `campus-make-...`).
3. Copia la URL del webhook.

En `variables de entorno de Vercel`:

```env
MAKE_WEBHOOK_URL=https://hook.us2.make.com/tu-id
MAKE_WEBHOOK_SECRET=el-mismo-api-key-del-paso-2
```

Reinicia `npm run dev` en **Backend**.

En CampusSocial → **Ajustes** → pega la misma URL → **Guardar**.

---

## Paso 3 — Activar escenario

- Interruptor **ON** (plan gratis: máximo 2 escenarios activos).
- Modo: **En cuanto llegan los datos** (instant).

---

## Paso 4 — Probar con Postman o colección

Archivo: `campus-social-webhook-ejemplo.json`

| Prueba | `action` | `campus_published` | Resultado esperado en Make |
|--------|----------|-------------------|----------------------------|
| Ya publicó CampusSocial | `notify_published` | `true` | Rama `campus_ya_publico` → JSON `published_via_campus` |
| Programó en calendario | `notify_scheduled` | `false` | Rama `notify_scheduled` |
| Verificar canal | `verify_channel` | — | Rama verify → `success: true` |

Método **POST**, headers `Content-Type`, `x-make-apikey` = tu secreto.

Detalle: `postman-make.md`

---

## Paso 5 — Probar desde CampusSocial

1. **Canales**: LinkedIn conectado (1/1).
2. **Nueva publicación** → generar texto → **Publicar ahora**.
   - CampusSocial publica en LinkedIn (OAuth).
   - Si hay webhook en Ajustes, llama a Make con `notify_published` + `campus_published: true`.
3. **Programar** → Make recibe `notify_scheduled`; a la hora indicada **Vercel** publica (no Make).

Revisa **History** en Make: debe verse la ejecución verde en la rama `campus_ya_publico`.

---

## Paso 6 — Añadir módulos extra (tú como asistente en Make)

Después de **Set variables** o en la rama `campus_ya_publico`, puedes encadenar:

| Módulo | Cuándo | Filtro |
|--------|--------|--------|
| **Telegram → Send a message** | Aviso al publicar | `telegram_notify` = true |
| **Google Sheets → Add a row** | Log de posts | siempre en `notify_published` |
| **Gmail → Send an email** | Resumen al equipo | opcional |
| **Slack → Create a message** | Canal #marketing | opcional |

Ejemplo mensaje Telegram:

```
✅ CampusSocial publicó en LinkedIn
{{4.postTitle}}
{{4.postText}}
```

Variables del escenario (engranaje): `telegramChatId` = tu chat id.

---

## Paso 7 — Si quieres publicar SOLO desde Make (no recomendado con OAuth)

1. Producto **Share on LinkedIn** aprobado.
2. Conecta cuenta en módulo **LinkedIn** de Make.
3. Usa `schedule_now: true` y `campus_published: false` en Postman.
4. Quita `LINKEDIN_OAUTH_INCLUDE_POST_SCOPE=false` y reconecta OAuth en CampusSocial para no duplicar.

Evita publicar dos veces (Make + CampusSocial) en el mismo post.

---

## Checklist final

- [ ] Webhook creado y URL en Ajustes + `variables de entorno de Vercel`
- [ ] API key en Make = `MAKE_WEBHOOK_SECRET`
- [ ] Escenario **ON**
- [ ] Módulos LinkedIn rojos eliminados o sustituidos por ramas `campus_published`
- [ ] Postman POST `notify_published` → History OK
- [ ] Publicar ahora en app → post visible en LinkedIn + ejecución Make

---

## Archivos del repo

| Archivo | Uso |
|---------|-----|
| `campussocial-linkedin-make.blueprint.json` | Importar escenario |
| `campus-social-webhook-ejemplo.json` | Cuerpos de prueba |
| `campussocial-make.postman-collection.json` | Colección Postman |
| `postman-make.md` | Headers y errores |
| `arreglar-escenario-make.md` | Module Not Found |
| `docs/make-setup.md` | Resumen técnico |

Contrato JSON: `server/integracion/automationTypes.ts`
