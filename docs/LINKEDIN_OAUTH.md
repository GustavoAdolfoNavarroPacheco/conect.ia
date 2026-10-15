# LinkedIn OAuth — CampusSocial

CampusSocial conecta LinkedIn con **OAuth 2.0** ([LinkedIn Developers](https://www.linkedin.com/developers/apps)). No hace falta Postiz.

## Política de privacidad (formulario LinkedIn)

| URL | Cuándo |
|-----|--------|
| `https://campussocial-f56a0.web.app/privacidad` | Producción (recomendada) |
| `http://localhost:5173/privacidad` | Solo pruebas locales |

LinkedIn **no** acepta `localhost` en producción; despliega Hosting antes de crear la app.

## 1. App en LinkedIn Developers

1. App **CampusSocial** (Client ID `78yegyn4dy3vpv`).
2. **Products**: **Sign In with LinkedIn using OpenID Connect** + **Share on LinkedIn**.
3. **Auth** → **Authorized redirect URLs** (local):

```
http://localhost:5173/oauth/linkedin
http://127.0.0.1:5173/oauth/linkedin
```

4. Pulsa **Update** al final de la sección.

**Producción (flujo legacy HTTP opcional):**

```
https://us-central1-campussocial-f56a0.cloudfunctions.net/linkedinOAuthCallback
```

| Entorno | Redirect (recomendado) |
|---------|------------------------|
| Local Vite | `http://localhost:5173/oauth/linkedin` |
| Producción | `https://campussocial-f56a0.web.app/oauth/linkedin` |

## 2. Secretos (`variables de entorno de Vercel`)

```env
LINKEDIN_CLIENT_ID=78yegyn4dy3vpv
LINKEDIN_CLIENT_SECRET=tu_primary_client_secret
LINKEDIN_OAUTH_INCLUDE_POST_SCOPE=false
APP_FRONTEND_URL=https://campussocial-f56a0.web.app
```

En producción:

```bash
# Vercel → Settings → Environment Variables: LINKEDIN_CLIENT_ID
# Vercel → Settings → Environment Variables: LINKEDIN_CLIENT_SECRET
# Vercel → Settings → Environment Variables: APP_FRONTEND_URL
```

Reinicia `npm run dev` tras cambiar `variables de entorno de Vercel`.

## 3. Frontend (opcional)

```env
VITE_LINKEDIN_OAUTH_REDIRECT_URI=http://localhost:5173/oauth/linkedin
```

## 4. Flujo en la app (recomendado)

1. **Canales** → **Conectar LinkedIn** → **Iniciar sesión con LinkedIn**.
2. LinkedIn redirige a `/oauth/linkedin?code=...&state=...`.
3. `completeLinkedInOAuth` guarda tokens en `tokens_redes/{uid}`.
4. `publishPostNow` publica con `POST https://api.linkedin.com/v2/ugcPosts`.

**Flujo legacy:** `linkedinOAuthStart` → callback HTTP → `/?linkedin=success`.

## 5. Scopes

- `openid`, `profile`, `email`
- `w_member_social` — publicar (requiere Share on LinkedIn aprobado)

## 6. Errores frecuentes

| Error | Causa |
|-------|--------|
| «Bummer» en linkedin.com | Share on LinkedIn pendiente → `LINKEDIN_OAUTH_INCLUDE_POST_SCOPE=false` |
| `redirect_uri mismatch` | URL en Developers ≠ la que envía el frontend |
| `403` al publicar | Sin permiso `w_member_social` o producto no aprobado |

## 7. Make / n8n

Opcional para notificaciones. La **publicación** la hace CampusSocial con OAuth.

## 8. Desplegar

```bash
cd Frontend && npm run build
git push origin main   # Vercel despliega automáticamente
```
