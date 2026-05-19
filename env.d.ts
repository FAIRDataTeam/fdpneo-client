/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Base URL of the FDP server (e.g. https://fdp.example.org). Set at build time. */
  readonly VITE_FDP_API_URL: string;
  /** OIDC issuer URL (e.g. https://idp.example.org/realms/fdp). */
  readonly VITE_OIDC_AUTHORITY: string;
  /** OIDC client ID registered for this SPA. */
  readonly VITE_OIDC_CLIENT_ID: string;
  /** Public origin of the SPA itself, used for OIDC redirect URIs. */
  readonly VITE_PUBLIC_ORIGIN: string;
  /**
   * Dot-path into the ID token claims at which the roles array lives.
   * Defaults to "realm_access.roles" (Keycloak convention). Override for
   * other IdPs — e.g. "roles" for a flat claim, or a namespaced URI for Auth0.
   */
  readonly VITE_OIDC_ROLES_CLAIM?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
