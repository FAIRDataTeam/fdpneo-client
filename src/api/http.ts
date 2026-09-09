/**
 * HTTP client for the FDP API.
 *
 * Axios instance with two interceptors:
 *
 *   1. Request: attach the OIDC bearer token, when the auth store has one.
 *   2. Response: on a 401, attempt one silent renewal and replay the request
 *      with the refreshed token. If the renewal fails the session is over
 *      (the store has already cleared it): idempotent reads are replayed once
 *      *anonymously* so public content still renders; writes are not re-sent.
 *      A second 401 propagates to the caller.
 *
 * The TypeScript types for request/response shapes come from the server's
 * OpenAPI spec — regenerate after server contract changes:
 *
 *     npm run generate-api
 *
 * The generated `./schema.ts` must not be hand-edited.
 *
 * Auth resolution is lazy: importing `useAuthStore` at module scope would
 * fail because Pinia isn't installed yet when this file evaluates. We resolve
 * the store inside each interceptor instead.
 */

import axios, {
  AxiosError,
  type AxiosInstance,
  type InternalAxiosRequestConfig,
} from "axios";
import { useAuthStore } from "@/stores/auth";
import { runtimeApiUrl } from "@/runtimeConfig";

const baseURL = runtimeApiUrl();

// Augment Axios's request config with a one-shot retry flag so we can detect
// the "second 401 in a row" case and stop retrying.
interface RetryConfig extends InternalAxiosRequestConfig {
  _retried?: boolean;
}

export const http: AxiosInstance = axios.create({
  baseURL,
  timeout: 30_000,
  responseType: "json",
});

http.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  try {
    const token = useAuthStore().accessToken;
    if (token) {
      config.headers = config.headers ?? {};
      config.headers.Authorization = `Bearer ${token}`;
    }
  } catch {
    // Pinia not installed yet (unit-test edge case). Send without the header;
    // the API will respond 401 and the caller will redirect to login.
  }
  return config;
});

http.interceptors.response.use(
  (response) => response,
  async (error: unknown) => {
    if (!(error instanceof AxiosError) || error.response?.status !== 401) {
      return Promise.reject(error instanceof Error ? error : new Error(String(error)));
    }
    const config = error.config as RetryConfig | undefined;
    if (!config || config._retried) {
      return Promise.reject(error);
    }
    config._retried = true;
    try {
      const auth = useAuthStore();
      const renewed = await auth.silentRenew();
      const token = auth.accessToken;
      if (renewed === null || !token) {
        // Session gone. Public GETs must not fail just because a dead token
        // was attached — replay without it (the request interceptor finds no
        // token in the cleared store). Never re-send a write anonymously.
        const method = (config.method ?? "get").toLowerCase();
        if (method !== "get" && method !== "head") return Promise.reject(error);
        config.headers?.delete("Authorization");
        return await http.request(config);
      }
      config.headers = config.headers ?? {};
      config.headers.Authorization = `Bearer ${token}`;
      return await http.request(config);
    } catch (renewErr) {
      return Promise.reject(renewErr instanceof Error ? renewErr : new Error(String(renewErr)));
    }
  },
);
