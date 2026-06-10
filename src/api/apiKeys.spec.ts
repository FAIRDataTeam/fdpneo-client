/**
 * API-keys client: list unwrapping + correct verbs/paths/body.
 */

import { describe, expect, it, beforeEach, vi } from "vitest";

vi.mock("@/api/http", () => ({ http: { get: vi.fn(), post: vi.fn(), delete: vi.fn() } }));

import { http } from "@/api/http";
import { createApiKey, listApiKeys, revokeApiKey } from "./apiKeys";

/* eslint-disable @typescript-eslint/unbound-method -- mocking method references */
const mockGet = vi.mocked(http.get);
const mockPost = vi.mocked(http.post);
const mockDelete = vi.mocked(http.delete);
/* eslint-enable @typescript-eslint/unbound-method */

beforeEach(() => {
  mockGet.mockReset();
  mockPost.mockReset();
  mockDelete.mockReset();
});

describe("apiKeys", () => {
  it("lists, unwrapping the keys array", async () => {
    mockGet.mockResolvedValueOnce({ data: { keys: [{ id: "1", label: "CI" }] } });
    await expect(listApiKeys()).resolves.toEqual([{ id: "1", label: "CI" }]);
    expect(mockGet).toHaveBeenCalledWith("/fdp-api/me/api-keys");
  });

  it("creates with label + expiry and returns the one-time key", async () => {
    const created = { id: "1", label: "CI", key: "fdpk_secret" };
    mockPost.mockResolvedValueOnce({ data: created });
    const input = { label: "CI", expires_at: "2026-12-31T23:59:59Z" };
    await expect(createApiKey(input)).resolves.toEqual(created);
    expect(mockPost).toHaveBeenCalledWith("/fdp-api/me/api-keys", input);
  });

  it("revokes by id", async () => {
    mockDelete.mockResolvedValueOnce({});
    await revokeApiKey("k1");
    expect(mockDelete).toHaveBeenCalledWith("/fdp-api/me/api-keys/k1");
  });
});
