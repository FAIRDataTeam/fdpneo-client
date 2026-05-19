/**
 * HTTP client for the FDP API.
 *
 * Wraps Axios with two interceptors:
 *
 *   1. Request: attach the OIDC bearer token if the auth store has one.
 *   2. Response: on 401, attempt one silent token renewal before propagating.
 *
 * The TypeScript types for request and response shapes come from the
 * server's OpenAPI specification. Regenerate after server contract changes:
 *
 *     npm run generate-api
 *
 * The generated file is `./schema.ts` and must not be hand-edited.
 *
 * Higher-level wrappers in this directory (records.ts, schemas.ts,
 * policies.ts, metrics.ts) use the generated types and the configured
 * Axios instance to provide a typed query API consumed by Pinia stores
 * and TanStack Query composables.
 */

import axios, { type AxiosInstance } from "axios";

const baseURL = import.meta.env.VITE_FDP_API_URL || "/";

export const http: AxiosInstance = axios.create({
  baseURL,
  timeout: 30_000,
  // SPARQL responses can be large RDF documents; let consumers pick the type.
  responseType: "json",
});

http.interceptors.request.use((config) => {
  // TODO: read the access token from the auth store once it exists.
  // const token = useAuthStore().accessToken;
  // if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

http.interceptors.response.use(
  (response) => response,
  (error: unknown) => {
    // TODO: on 401, attempt silentRenew() once, then re-issue the request.
    return Promise.reject(error instanceof Error ? error : new Error(String(error)));
  },
);
