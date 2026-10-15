# Make: recibir post de CampusSocial y publicar en LinkedIn

Guía corta para que **Make publique en tu cuenta de LinkedIn** cuando CampusSocial envía el webhook.

---

## Cómo funciona (1 frase)

CampusSocial → **POST al webhook Make** → Make → **módulo LinkedIn** → post en tu perfil.

Si tienes URL de Make en **Ajustes**, la app **no** publica sola por OAuth: delega en Make.

---

## Paso 1 — LinkedIn Developers (una vez)

1. App **CampusSocial** en [LinkedIn Developers](https://www.linkedin.com/developers/apps)
2. Producto **Share on LinkedIn** activo (verde)
3. No hace falta OAuth de CampusSocial si solo publicas vía Make

---

## Paso 2 — Escenario Make (mínimo)

Importa `CampusSocial_LinkedIn_Make.blueprint.json` o crea manualmente:

```
[Webhooks → Custom webhook]
    → [Tools → Set variables]
    → [Router: schedule_now = true]
         → [LinkedIn → Create a User Text Post]  (sin imagen)
         → o [LinkedIn → Create a User Image Post] (con imagen)
    → [Webhooks → Webhook response]  Status 200, JSON {"success":true}
```

### 2.1 Webhook

- **Create a webhook** → copia URL
- **API Key** = mismo valor que `MAKE_WEBHOOK_SECRET` en `variables de entorno de Vercel`
- **Redetermine data structure** con:

```json
{
  "topic": "Prueba Campus Lands",
  "tone": "profesional",
  "title": "Prueba Campus Lands",
  "body": "Texto del post de prueba desde CampusSocial.",
  "include_image": false,
  "telegram_notify": false,
  "schedule_now": true,
  "campus_published": false,
  "platforms": ["linkedin"],
  "action": "publish",
  "provider": "make",
  "post_id": "test-1",
  "image_url": null
}
```

### 2.2 Set variables (igual que el blueprint)

| Variable | Valor Make |
|----------|------------|
| postTitle | `{{ifempty(1.title; 1.topic)}}` |
| postText | `{{ifempty(1.body; 1.topic)}}` |
| imageUrl | `{{1.image_url}}` |

### 2.3 Conectar **tu** LinkedIn en Make

1. Módulo **LinkedIn → Create a User Text Post** (o Image Post)
2. **Add** → inicia sesión con **tu cuenta LinkedIn**
3. Mapeo:
   - **Text / Commentary** → `{{4.postText}}`
   - **Image** (solo Image Post) → `{{4.imageUrl}}`

**Elimina** módulos HTTP con `Bearer TU_TOKEN_LINKEDIN` y **Telegram** hasta que los configures (evitan el error “3 parámetros”).

### 2.4 Webhook response (obligatorio)

- **Status:** `200`
- **Body type:** JSON
- **Body:** `{"success":true,"linkedin_status":"published","platforms_published":["linkedin"]}`
- **Header:** `Content-Type: application/json`

### 2.5 Activar

- Escenario **ON**
- Modo: **En cuanto llegan los datos**

---

## Paso 3 — CampusSocial + Backend

**variables de entorno de Vercel:**

```env
MAKE_WEBHOOK_URL=https://hook.us2.make.com/TU_ID
MAKE_WEBHOOK_SECRET=tu-api-key-del-webhook
```

**CampusSocial → Ajustes** → misma URL → **Guardar**

Reinicia Backend: `npm run dev`

---

## Paso 4 — Probar

1. Make **Run once** (escucha activa)
2. CampusSocial → **Nueva publicación** → generar → **Publicar ahora**
3. Make **History** → verde en LinkedIn
4. Revisa tu perfil LinkedIn

---

## Errores frecuentes

| Error Make | Solución |
|------------|----------|
| Validación 3 parámetros | Quita Telegram o configura `chatId`; revisa Webhook response (Status + Body + Content-Type) |
| HTTP 500 | History → módulo rojo; suele ser LinkedIn sin conectar en Make |
| Accepted pero no publica | CampusSocial debe enviar `action: publish` y `schedule_now: true` (actualizado en la app) |
| Doble publicación | No uses OAuth en Canales **y** Make a la vez; con URL Make en Ajustes, publica Make |

---

## Programar en calendario

- **Calendario** = Vercel publica a la hora (`schedulePost` + `scheduledPublisher` en la nube)
- Make recibe `notify_scheduled` solo como aviso (opcional)
- Para que Make publique a una hora concreta haría falta un módulo **Schedule** en Make (no incluido en el flujo base)
