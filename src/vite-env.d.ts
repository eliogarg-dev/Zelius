/// <reference types="svelte" />
/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_FIREBASE_EMULATORE?: string;
  /** Indirizzo degli emulatori se diverso dalla pagina (app sul telefono via USB: 127.0.0.1). */
  readonly VITE_HOST_EMULATORE?: string;
  readonly VITE_FIREBASE_API_KEY?: string;
  readonly VITE_FIREBASE_AUTH_DOMAIN?: string;
  readonly VITE_FIREBASE_DATABASE_URL?: string;
  readonly VITE_FIREBASE_PROJECT_ID?: string;
  readonly VITE_FIREBASE_APP_ID?: string;
  /** Es. https://zapp-paroliere.web.app — usato nei link delle stanze. */
  readonly VITE_URL_PUBBLICO?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
