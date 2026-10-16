# Estructura del proyecto

```
.
├── frontend/              Interfaz React + Vite (build en frontend/dist)
│   └── src/
│       ├── app/           Pantallas y componentes
│       ├── context/       Sesión (Auth.js)
│       ├── hooks/         Consultas de datos (React Query)
│       ├── lib/           Cliente de API (lib/api.ts), capa de datos (lib/db/), Blob
│       └── services/      Llamadas a las funciones del servidor
├── api/                   Funciones de Vercel
│   ├── auth/[...auth].ts  Rutas de Auth.js (Google)                  [Edge]
│   ├── fn/[name].ts       Despachador de todas las funciones invocables
│   ├── blob-upload.ts     Token de subida directa a Vercel Blob        [Edge]
│   └── cron/publicar-programadas.ts  Publica las programadas (cron)
├── server/                Lógica del servidor (compartida por api/)
│   ├── ai/                Gemini, Anthropic, generación de texto, imagen y video
│   ├── auth/              Configuración de Auth.js y validación de sesión
│   ├── db/                Cliente de Neon, esquema SQL y repositorio
│   ├── handlers/          Operaciones de datos (crear, listar, actualizar)
│   ├── integracion/       OAuth de LinkedIn/Meta/TikTok, Make y n8n
│   ├── platform/          Errores, logger y secretos (sobre variables de entorno)
│   ├── posts/             Publicación, programación y cron
│   ├── social/            Clientes de LinkedIn, Facebook, Instagram y TikTok
│   └── registry.ts        Lista de funciones invocables desde el frontend
├── scripts/db-migrate.mjs Aplica server/db/schema.sql a Neon
├── flujo-automatizacion/  Escenarios y guías de Make / n8n (opcional)
├── docs/                  Guías de despliegue y de integraciones
├── postman/               Colecciones de pruebas de API
└── vercel.json            Build, funciones, cron y reescrituras
```
