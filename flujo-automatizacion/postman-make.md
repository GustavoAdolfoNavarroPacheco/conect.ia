# Probar Make con Postman (CampusSocial)

## 1. ¿Qué va en `MAKE_WEBHOOK_SECRET`?

**No** es el token de **Make → API access** (ese sirve para administrar escenarios por API).

**Sí** es la clave que creas en el **Custom webhook** del escenario:

1. Abre el módulo **Webhooks → Custom webhook**.
2. En **API Key authentication** → **+ Add API key**.
3. Nombre: `CampusSocial`.
4. Valor: inventa uno largo (ej. `campus-make-7f3a9c2e1b8d4f6a0e5c9b2d8a1f4e6`).
5. **Save** el webhook.

Copia **ese mismo valor** en `variables de entorno de Vercel`:

```env
MAKE_WEBHOOK_URL=https://hook.us2.make.com/g351w484xphhl67h38fzwmaqhbggvr6m
MAKE_WEBHOOK_SECRET=campus-make-7f3a9c2e1b8d4f6a0e5c9b2d8a1f4e6
```

CampusSocial envía dos cabeceras con el mismo valor:

- `x-make-apikey` (lo que pide Make)
- `X-Campus-Secret` (compatibilidad n8n)

Reinicia el backend: `cd Backend && npm run dev`.

---

## 2. Postman — configuración correcta

Tu prueba con **GET** solo devuelve `Accepted` y **no ejecuta** el escenario con datos.

### Request

| Campo | Valor |
|-------|--------|
| Método | **POST** |
| URL | Tu `MAKE_WEBHOOK_URL` |
| Body | **raw** → **JSON** |

### Headers

| Header | Valor |
|--------|--------|
| `Content-Type` | `application/json` |
| `x-make-apikey` | el mismo `MAKE_WEBHOOK_SECRET` |
| `X-Campus-Secret` | (opcional) el mismo secreto |

### Body (publicar en LinkedIn)

Usa `campus-social-webhook-ejemplo.json` o:

```json
{
  "topic": "Prueba CampusSocial",
  "tone": "profesional",
  "include_image": false,
  "telegram_notify": false,
  "schedule_now": true,
  "platforms": ["linkedin"],
  "action": "publish",
  "provider": "make",
  "title": "Prueba",
  "body": "Texto de prueba desde Postman para LinkedIn.",
  "hashtags": ["#CampusLands"]
}
```

### Antes de enviar

1. Escenario Make **ON**.
2. En el webhook: **Redetermine data structure** (con este JSON).
3. **Run once** en Make (escucha activa) o escenario activado.

### Respuesta esperada

JSON con `"success": true` y `"linkedin_status": "published"` o `"draft"` (si `schedule_now` es false).

---

## 3. Importar colección Postman

Archivo: **`campussocial-make.postman-collection.json`** (misma carpeta).

En Postman: **Import** → selecciona el archivo → ajusta variables:

- `make_webhook_url`
- `make_webhook_secret`

---

## 4. Token de LinkedIn en HTTP (módulo Make)

`Bearer TU_TOKEN_LINKEDIN` **no** sale de Make API access.

Opciones:

| Opción | Dónde obtener el token |
|--------|-------------------------|
| A | **CampusSocial → Canales → OAuth LinkedIn** (publicas con `publishPostNow`, sin Make HTTP) |
| B | **Make → LinkedIn** → Create a User Text Post (conexión OAuth en Make) |
| C | LinkedIn Developers → flujo OAuth manual (avanzado) |

---

## 5. CampusSocial en la app

1. **Ajustes** → URL webhook = la misma de Make → Guardar.
2. **Canales** → LinkedIn OAuth (para publicar desde la app).
3. Nueva publicación → Generar / Programar.
