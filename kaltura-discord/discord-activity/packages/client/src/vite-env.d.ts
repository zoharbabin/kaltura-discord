/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_CLIENT_ID: string;
  readonly VITE_KALTURA_PARTNER_ID: string;
  readonly VITE_KALTURA_PLAYER_ID: string;
  readonly VITE_KALTURA_API_ENDPOINT: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}