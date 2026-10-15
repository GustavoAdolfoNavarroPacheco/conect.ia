/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_APP_MODE?: string;
  readonly VITE_LINKEDIN_OAUTH_REDIRECT_URI?: string;
  readonly VITE_META_OAUTH_REDIRECT_URI?: string;
  readonly VITE_TIKTOK_OAUTH_REDIRECT_URI?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
