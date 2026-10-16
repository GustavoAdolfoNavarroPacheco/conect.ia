# Arreglar el escenario Make (Module Not Found)

Si ves **Module Not Found** en el primer módulo o en Telegram, el blueprint anterior tenía nombres internos incorrectos. Sigue una de estas dos opciones.

---

## Opción A — Reimportar (recomendado)

1. Crea un **escenario nuevo** en Make (no edites el roto).
2. **⋯ → Import blueprint** → `campussocial-linkedin-make.blueprint.json` (versión corregida).
3. En el módulo **Webhooks → Custom webhook**:
   - Clic en **Add** / **Create a webhook**
   - Copia la URL generada
4. **Guardar** el escenario.

---

## Opción B — Reparar el escenario actual (sin reimportar)

### 1. Primer módulo (Module Not Found)

1. **Elimina** el módulo roto del inicio.
2. Añade **Webhooks → Custom webhook** (arrastra desde el panel izquierdo).
3. **Create a webhook** → copia la URL.
4. Conecta la salida al **Router** que ya tienes.

### 2. Webhook response (badge rojo)

1. Elimina cada módulo roto **Webhook response**.
2. Añade **Webhooks → Webhook response** al final de cada rama.
3. Configura:
   - **Status**: `200`
   - **Body type**: JSON
   - **Body** (ejemplo publicar):

```json
{
  "success": true,
  "linkedin_status": "published",
  "platforms_published": ["linkedin"]
}
```

4. Cabecera: `Content-Type: application/json`

### 3. Module Not Found en Telegram

El blueprint corregido **no incluye Telegram** (el nombre del módulo cambia según la cuenta). Si lo necesitas:

1. Después del HTTP de LinkedIn, añade **Telegram Bot → Send a Text Message**.
2. Filtro en la ruta: `telegram_notify` = `true`.
3. Conecta tu bot con el token de BotFather.

### 4. HTTP LinkedIn (módulos azules)

En cada **HTTP (legacy)**:

1. Sustituye `urn:li:person:REEMPLAZA_POR_TU_ID` por tu URN real.
2. En **Authorization**, usa un token con permiso `w_member_social`, o mejor: sustituye HTTP por **LinkedIn → Create a User Text Post** / **Create a User Image Post** y conecta tu cuenta LinkedIn en Make.

### 5. CampusSocial

- **Ajustes** → URL del webhook Make (la del paso 1).
- `variables de entorno de Vercel`:

```env
MAKE_WEBHOOK_URL=https://hook.eu1.make.com/...
MAKE_WEBHOOK_SECRET=tu-secreto
```

---

## Probar

1. Escenario **ON**.
2. En el webhook → **Redetermine data structure** → envía `campus-social-webhook-ejemplo.json` con Postman o curl.
3. **Run once** y revisa **History**.

---

## Publicar sin Make

Si solo quieres LinkedIn con OAuth de CampusSocial (sin Make):

1. **Canales → Iniciar sesión con LinkedIn**
2. Publica con **Publicar ahora** en la app (usa `publishPostNow`, no el webhook).

Make es opcional para orquestación externa o Telegram.
