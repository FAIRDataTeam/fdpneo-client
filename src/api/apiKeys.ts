/**
 * Personal access tokens — `GET|POST /me/api-keys`, `DELETE /me/api-keys/{id}`
 * (TASKS 10.4).
 *
 * Tokens are `fdpk_…` strings sent as a normal `Authorization: Bearer` (no
 * client auth change — they're a user-facing credential for scripts/CI). The
 * list returns metadata only (`display_prefix`, never the secret); the plaintext
 * `key` is returned **once** from create and is never re-fetchable, so the UI
 * must show it in a copy-once dialog. All endpoints require auth; admins may
 * revoke any key.
 */

import { http } from "./http";
import type { components } from "./schema";

export type ApiKeyInfo = components["schemas"]["ApiKeyInfo"];
export type ApiKeyCreated = components["schemas"]["ApiKeyCreated"];
export type ApiKeyCreateRequest = components["schemas"]["ApiKeyCreateRequest"];

export async function listApiKeys(): Promise<ApiKeyInfo[]> {
  const res = await http.get<components["schemas"]["ApiKeyList"]>("/fdp-api/me/api-keys");
  return res.data.keys ?? [];
}

/** Mint a key. The response carries the plaintext `key` exactly once. */
export async function createApiKey(input: ApiKeyCreateRequest): Promise<ApiKeyCreated> {
  const res = await http.post<ApiKeyCreated>("/fdp-api/me/api-keys", input);
  return res.data;
}

export async function revokeApiKey(id: string): Promise<void> {
  await http.delete(`/fdp-api/me/api-keys/${encodeURIComponent(id)}`);
}
