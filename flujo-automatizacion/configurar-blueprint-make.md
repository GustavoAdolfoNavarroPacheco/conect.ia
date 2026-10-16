# Configurar el blueprint en Make (5 minutos)

Archivo: **`campussocial-linkedin-make.blueprint.json`**

Flujo **lineal** (izquierda → derecha). Solo configuras webhook, variables y conexiones.

---

## Vista del escenario (después de importar)

```
[Webhook] → [Router] → [Variables] → [Router principal]
                                         ├─ A: Campus ya publicó (+ Telegram opcional) → [Respuesta]
                                         ├─ B: Programado en calendario (+ Telegram) → [Respuesta]
                                         ├─ C: Publicar desde Make (HTTP, opcional) → [Respuesta]
                                         └─ D: Borrador / generado → [Respuesta]
```

**Rama A** es la que usa CampusSocial al pulsar **Publicar ahora** (OAuth en la app).

---

## Paso 1 — Importar

1. Make → **Create a new scenario**
2. **⋯ → Import blueprint** → selecciona `campussocial-linkedin-make.blueprint.json`
3. **Save**

Si un módulo Telegram dice **Module Not Found**: elimínalo y conecta **Telegram → Send a Text Message** manualmente en las ramas A1 y B1 (mismo texto del mapper).

---

## Paso 2 — Webhook (módulo 1)

1. Clic en **Custom webhook** → **Create a webhook**
2. **API Key authentication** → **+ Add API key**
   - Nombre: `CampusSocial`
   - Valor: el mismo que `MAKE_WEBHOOK_SECRET` en `variables de entorno de Vercel`
3. **Redetermine data structure** → pega el JSON `notify_published` de `campus-social-webhook-ejemplo.json`
4. Copia la **URL** del webhook

En CampusSocial → **Ajustes** → pega la URL → Guardar.

---

## Paso 3 — Variables del escenario (engranaje ⚙)

| Variable | Ejemplo | Obligatorio |
|----------|---------|-------------|
| `linkedinAuthorUrn` | `urn:li:person:XXXX` | Solo rama C (Make publica) |
| `telegramChatId` | `-1001234567890` | Solo si usas Telegram |
| `linkedinAccessToken` | *(vacío)* | Solo rama C — mejor dejar vacío y usar OAuth CampusSocial |

Tras conectar LinkedIn en **Canales**, el backend envía `linkedin_member_urn` en cada webhook (no hace falta copiar el URN a mano para la rama A).

---

## Paso 4 — Telegram (opcional)

1. Ramas **A1** y **B1** → módulo Telegram → **Add** conexión (token de @BotFather)
2. Rellena `telegramChatId` en variables del escenario
3. En CampusSocial, cuando quieras aviso: payload con `"telegram_notify": true`

---

## Paso 5 — Rama C (opcional, no recomendada)

Solo si quieres publicar **desde Make** sin OAuth de CampusSocial:

- Rellena `linkedinAccessToken` y `linkedinAuthorUrn`
- Requiere producto **Share on LinkedIn** aprobado

**Recomendación:** ignora la rama C; CampusSocial publica con OAuth y Make solo notifica (rama A).

---

## Paso 6 — Activar

- Escenario **ON**
- Modo: **En cuanto llegan los datos**
- Reinicia `npx vercel dev

---

## Probar

1. Postman POST → body `notify_published` (ver `postman-make.md`)
2. CampusSocial → **Publicar ahora** → Make **History** debe mostrar rama **A_campus_ya_publico**

---

## Mapa de ramas vs CampusSocial

| Acción en la app | Rama Make | `linkedin_status` |
|------------------|-----------|-------------------|
| Publicar ahora | A | `published_via_campus` |
| Programar | B | `scheduled_in_campus` |
| Solo generar IA | D | `draft` |
| Canales verificar (legacy) | 1_verificar_canal | `success` |
