/**
 * `configureOidc` lets the server's `GET /config` drive the OIDC `authority` and
 * `client_id`, with the `.env` `VITE_OIDC_*` values as fallback.
 */

import { describe, expect, it, beforeEach, afterEach, vi } from "vitest";
import { configureOidc, getUserManager, __resetUserManager } from "./userManager";

beforeEach(() => {
  __resetUserManager();
  vi.stubEnv("VITE_OIDC_AUTHORITY", "http://env-authority");
  vi.stubEnv("VITE_OIDC_CLIENT_ID", "env-client");
  vi.stubEnv("VITE_PUBLIC_ORIGIN", "http://localhost:5173");
});

afterEach(() => {
  __resetUserManager();
  vi.unstubAllEnvs();
});

describe("userManager OIDC resolution", () => {
  it("uses the env fallback when no server config is provided", () => {
    const m = getUserManager();
    expect(m.settings.authority).toBe("http://env-authority");
    expect(m.settings.client_id).toBe("env-client");
  });

  it("prefers server config (issuer → authority, client_id_hint → client_id)", () => {
    configureOidc({ issuer: "http://srv-idp", audience: "fdp", client_id_hint: "srv-client" });
    const m = getUserManager();
    expect(m.settings.authority).toBe("http://srv-idp");
    expect(m.settings.client_id).toBe("srv-client");
  });

  it("falls back to the env client_id when the hint is null", () => {
    configureOidc({ issuer: "http://srv-idp", audience: "fdp", client_id_hint: null });
    const m = getUserManager();
    expect(m.settings.authority).toBe("http://srv-idp");
    expect(m.settings.client_id).toBe("env-client");
  });

  it("leaves the env fallback in force when config is unavailable (null)", () => {
    configureOidc(null);
    const m = getUserManager();
    expect(m.settings.authority).toBe("http://env-authority");
  });
});
