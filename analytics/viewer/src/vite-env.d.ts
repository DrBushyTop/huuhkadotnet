/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_CLIENT_ID: string;
  readonly VITE_TENANT_ID: string;
  /** Reports container URL, or a local path such as /data for the dev server. */
  readonly VITE_DATA_URL: string;
}
