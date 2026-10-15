# Conect.ia · Frontend

Interfaz de **Conect.ia** (React + Vite). La API y la base de datos están en la raíz del repositorio (`api/`, `server/`), desplegadas como funciones de Vercel.

## Desarrollo

Desde la raíz del repositorio, con la CLI de Vercel (sirve frontend y `/api` juntos):

```bash
npx vercel dev
```

Solo la interfaz (sin `/api`, la sesión y los datos no funcionarán):

```bash
npm install
```

```bash
npm run dev
```

## Variables

Ver `.env.example`. Solo se usan las redirecciones OAuth (`VITE_*_OAUTH_REDIRECT_URI`) y `VITE_APP_MODE`. Los secretos nunca van aquí: viven en Vercel.

## Estructura relevante

- `src/context/AuthContext.tsx`: sesión con Auth.js (`/api/auth/*`)
- `src/lib/api.ts`: cliente de las funciones del servidor (`POST /api/fn/<nombre>`)
- `src/lib/db/`: operaciones de datos (publicaciones, borradores, canales, etc.)
- `src/lib/storage.ts`: subida de imágenes a Vercel Blob
- `src/hooks/useCampusData.ts`: consultas con React Query

Salida de producción: `dist/`, publicada por Vercel según el `vercel.json` de la raíz.
