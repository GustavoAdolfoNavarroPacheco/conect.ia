-- Conect.ia · esquema para Neon (Postgres)
-- Aplicar con: npm run db:migrate  (idempotente: usa IF NOT EXISTS)

CREATE TABLE IF NOT EXISTS usuarios (
  uid              TEXT PRIMARY KEY,
  email            TEXT NOT NULL DEFAULT '',
  nombre           TEXT NOT NULL DEFAULT '',
  rol              TEXT NOT NULL DEFAULT 'editor',
  redes_conectadas JSONB NOT NULL DEFAULT '{}'::jsonb,
  creado_en        TIMESTAMPTZ NOT NULL DEFAULT now(),
  actualizado_en   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS publicaciones (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  titulo           TEXT NOT NULL DEFAULT '',
  contenido        TEXT NOT NULL DEFAULT '',
  imagen_url       TEXT,
  redes_destino    JSONB NOT NULL DEFAULT '[]'::jsonb,
  estado           TEXT NOT NULL,
  fecha_programada TIMESTAMPTZ,
  creado_por       TEXT NOT NULL REFERENCES usuarios(uid) ON DELETE CASCADE,
  resultados       JSONB NOT NULL DEFAULT '{}'::jsonb,
  n8n_execution_id TEXT,
  creado_en        TIMESTAMPTZ NOT NULL DEFAULT now(),
  actualizado_en   TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS publicaciones_creado_por_idx ON publicaciones (creado_por, creado_en DESC);
CREATE INDEX IF NOT EXISTS publicaciones_programadas_idx ON publicaciones (estado, fecha_programada);

CREATE TABLE IF NOT EXISTS borradores (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_id        TEXT NOT NULL REFERENCES usuarios(uid) ON DELETE CASCADE,
  titulo            TEXT NOT NULL DEFAULT '',
  contenido_generado TEXT NOT NULL DEFAULT '',
  hashtags          JSONB NOT NULL DEFAULT '[]'::jsonb,
  prompt_original   TEXT NOT NULL DEFAULT '',
  tono              TEXT NOT NULL DEFAULT '',
  red_social        TEXT,
  redes_destino     JSONB NOT NULL DEFAULT '[]'::jsonb,
  imagen_url        TEXT,
  imagen_con_ia     BOOLEAN NOT NULL DEFAULT false,
  estado            TEXT NOT NULL DEFAULT 'pendiente',
  n8n_execution_id  TEXT,
  programado_para   TIMESTAMPTZ,
  creado_en         TIMESTAMPTZ NOT NULL DEFAULT now(),
  actualizado_en    TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS borradores_usuario_idx ON borradores (usuario_id, creado_en DESC);

CREATE TABLE IF NOT EXISTS ejecuciones_n8n (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_id      TEXT NOT NULL REFERENCES usuarios(uid) ON DELETE CASCADE,
  borrador_id     UUID REFERENCES borradores(id) ON DELETE SET NULL,
  publicacion_id  UUID REFERENCES publicaciones(id) ON DELETE SET NULL,
  payload         JSONB NOT NULL DEFAULT '{}'::jsonb,
  respuesta       JSONB,
  estado          TEXT NOT NULL DEFAULT 'enviado',
  error_mensaje   TEXT,
  creado_en       TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS canales (
  usuario_id      TEXT PRIMARY KEY REFERENCES usuarios(uid) ON DELETE CASCADE,
  linkedin        JSONB NOT NULL DEFAULT '{"conectado":false,"cuentaNombre":null}'::jsonb,
  instagram       JSONB NOT NULL DEFAULT '{"conectado":false,"cuentaNombre":null}'::jsonb,
  facebook        JSONB NOT NULL DEFAULT '{"conectado":false,"cuentaNombre":null}'::jsonb,
  twitter         JSONB NOT NULL DEFAULT '{"conectado":false,"cuentaNombre":null}'::jsonb,
  tiktok          JSONB NOT NULL DEFAULT '{"conectado":false,"cuentaNombre":null}'::jsonb,
  freelancer      JSONB,
  fiverr          JSONB,
  actualizado_en  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS chat_mensajes (
  id               BIGSERIAL PRIMARY KEY,
  usuario_id       TEXT NOT NULL REFERENCES usuarios(uid) ON DELETE CASCADE,
  role             TEXT NOT NULL,
  content          TEXT NOT NULL,
  accion_sugerida  TEXT,
  tema_sugerido    TEXT,
  tono_sugerido    TEXT,
  creado_en        TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS chat_mensajes_usuario_idx ON chat_mensajes (usuario_id, id);

CREATE TABLE IF NOT EXISTS actividad (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_id  TEXT NOT NULL REFERENCES usuarios(uid) ON DELETE CASCADE,
  tipo        TEXT NOT NULL,
  mensaje     TEXT NOT NULL,
  red         TEXT,
  creado_en   TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS actividad_usuario_idx ON actividad (usuario_id, creado_en DESC);

CREATE TABLE IF NOT EXISTS configuracion (
  usuario_id        TEXT PRIMARY KEY REFERENCES usuarios(uid) ON DELETE CASCADE,
  n8n_webhook_url   TEXT NOT NULL DEFAULT '',
  make_webhook_url  TEXT NOT NULL DEFAULT '',
  notifications     BOOLEAN NOT NULL DEFAULT true,
  timezone          TEXT NOT NULL DEFAULT 'America/Bogota',
  creado_en         TIMESTAMPTZ NOT NULL DEFAULT now(),
  actualizado_en    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Tokens OAuth por red. Solo los lee/escribe el servidor.
CREATE TABLE IF NOT EXISTS tokens_redes (
  usuario_id      TEXT PRIMARY KEY REFERENCES usuarios(uid) ON DELETE CASCADE,
  linkedin        JSONB,
  meta            JSONB,
  tiktok          JSONB,
  actualizado_en  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Estado temporal de los flujos OAuth (inicio → callback), se borra al completarlo.
CREATE TABLE IF NOT EXISTS oauth_pendientes (
  state          TEXT PRIMARY KEY,
  usuario_id     TEXT NOT NULL REFERENCES usuarios(uid) ON DELETE CASCADE,
  red            TEXT NOT NULL,
  provider       TEXT,
  redirect_uri   TEXT NOT NULL,
  code_verifier  TEXT,
  creado_en      TIMESTAMPTZ NOT NULL DEFAULT now()
);
