# CampusSocial + Make.com (reemplazo de n8n)

Tu jefe pidió dejar de pagar **n8n Cloud** y no mantener n8n local. **Make** (make.com) ofrece plan **Gratis** con:

| Límite plan Gratis | Valor |
|--------------------|--------|
| Créditos / mes | 1.000 operaciones |
| Escenarios activos | **2** |
| Reinicio | cada 31 días |

El JSON del flujo antiguo (n8n) está en:

`Flujo_Automatizacion/CampusSocial _ Publicación LinkedIn.json`

**Blueprint importable para Make:**

`Flujo_Automatizacion/CampusSocial_LinkedIn_Make.blueprint.json`

Guía paso a paso: **`Flujo_Automatizacion/IMPORTAR_EN_MAKE.md`**

En Make: menú **⋯** → **Import blueprint** → selecciona el archivo `.blueprint.json`.

---

## Arquitectura recomendada (ahorra créditos)

CampusSocial **ya genera texto e imagen** con Gemini en Cloud Functions. Por eso conviene **un solo escenario Make** enfocado en **publicar**, no en volver a generar IA dentro de Make.

```
CampusSocial (UI + Functions)
    → POST webhook Make
        → (opcional) Telegram notificación
        → Postiz / LinkedIn / Meta según platforms[]
    → Respuesta JSON a CampusSocial
```

Si necesitas el flujo completo como el JSON de n8n (Gemini + DALL-E dentro de Make), usarás muchos más créditos y puede no caber en 1.000 ops/mes.

---

## Paso 1 — Crear escenario en Make

1. Entra a [make.com](https://www.make.com) → **Crear escenario**.
2. Primer módulo: **Webhooks** → **Custom webhook**.
3. Clic en el webhook → **Copiar dirección** (URL tipo `https://hook.eu1.make.com/...`).
4. En CampusSocial → **Ajustes** → pega la URL en **Automatización Make** → Guardar.

### Seguridad (opcional pero recomendado)

En `variables de entorno de Vercel`:

```env
MAKE_WEBHOOK_URL=https://hook.eu1.make.com/tu-id
MAKE_WEBHOOK_SECRET=un-texto-largo-secreto
```

En Make, después del webhook añade **Filtro** (o Router):

- Condición: `X-Campus-Secret` igual a `un-texto-largo-secreto`  
  (el header lo envía la Cloud Function `triggerMakeWorkflow`).

---

## Paso 2 — Cuerpo JSON que envía CampusSocial

Mismo contrato que el webhook `campus-post-form` del JSON n8n:

```json
{
  "topic": "Inteligencia Artificial en educación",
  "tone": "profesional",
  "include_image": true,
  "telegram_notify": false,
  "schedule_now": false,
  "platforms": ["linkedin", "instagram"],
  "action": "publish",
  "provider": "make",
  "body": "Texto ya generado por CampusSocial...",
  "image_url": "https://...",
  "title": "Título opcional",
  "hashtags": ["#CampusLands"]
}
```

### Verificar canal (Canales → Conectar cuenta)

```json
{
  "action": "verify_channel",
  "provider": "make",
  "red": "linkedin",
  "integrationId": "stivenmartinezvillamizar",
  "profileUrl": "https://linkedin.com/in/...",
  "uid": "google-user-id"
}
```

En Make: **Router** por `action`:

| Rama | Qué hacer |
|------|-----------|
| `verify_channel` | Comprobar cuenta en Postiz (HTTP) → devolver `{ "success": true }` |
| `publish` (default) | Publicar en redes |

---

## Paso 3 — Módulos sugeridos en Make

### Rama `publish`

1. **Webhook** (entrada)
2. **Router** → `platforms` contiene `linkedin`
3. **HTTP** o conector **LinkedIn** / **Postiz** (si tienes API):
   - Texto: `{{body}}` o `{{topic}}`
   - Imagen: `{{image_url}}` si `include_image`
4. Repetir ramas para `instagram`, `facebook` si aplica
5. (Opcional) **Telegram** → mensaje si `telegram_notify` es true
6. **Webhook response** → JSON:

```json
{
  "success": true,
  "platforms_published": ["linkedin"],
  "linkedin_status": "scheduled"
}
```

### Rama `verify_channel`

1. Validar `integrationId` contra Postiz (módulo HTTP)
2. **Webhook response** → `{ "success": true, "cuentaNombre": "..." }`

---

## Paso 4 — Activar y probar

1. En Make: interruptor **ON** (escenario activo). Máximo **2** en plan Gratis.
2. Reinicia `npx vercel dev` (o vuelve a desplegar) para cargar `triggerMakeWorkflow`.
3. En CampusSocial: **Nueva publicación** → generar → si el webhook está en Ajustes, se dispara Make.
4. Revisa **Historial** del escenario en Make si falla.

---

## Equivalencia con el JSON n8n

| Nodo n8n (JSON) | En Make |
|-----------------|--------|
| Campus Post Form Webhook | Webhooks → Custom webhook |
| Agente Publicación Campus + Gemini | **Opcional** — mejor usar `body` desde CampusSocial |
| Agente Prompt Imágenes + DALL-E | **Opcional** — usar `image_url` desde CampusSocial |
| Telegram | Módulo Telegram |
| Publish to LinkedIn / Postiz | HTTP / LinkedIn / tu API Postiz |
| Success / Error Response | Webhook response |

---

## Variables en el proyecto

| Antes (n8n) | Ahora (Make) |
|-------------|--------------|
| `N8N_WEBHOOK_URL` | `MAKE_WEBHOOK_URL` (prioridad) |
| `N8N_WEBHOOK_SECRET` | `MAKE_WEBHOOK_SECRET` |
| Neon `n8nWebhookUrl` | `makeWebhookUrl` (UI Ajustes) |

Siguen funcionando las variables **legacy** `N8N_*` y `n8nWebhookUrl` por compatibilidad.

---

## Cloud Function

- Nueva: `triggerMakeWorkflow`
- Legacy: `triggerN8nWorkflow` (alias del mismo código)

---

## Plan Gratis — consejos

1. **Un escenario** para publicar (no dupliques IA en Make).
2. Usa **filtros** para no ejecutar módulos si `body` ya viene lleno.
3. Programación pesada: deja que **Vercel** (`schedulePost`) programe y Make solo publique al llegar la hora, o un segundo escenario si necesitas las 2 ranuras.

---

## Soporte

Si Make devuelve error, CampusSocial muestra el mensaje de la Function. Revisa:

- URL correcta en Ajustes
- Escenario **activo** en Make
- Respuesta final del escenario (módulo *Webhook response*)
