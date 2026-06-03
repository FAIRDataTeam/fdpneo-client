/**
 * Instance settings — `GET /settings`, `GET|PUT|DELETE /settings/{key}`
 * (TASKS 10.5).
 *
 * `GET /settings` is public and returns every key merged with its defaults.
 * Each value is a free-form JSON **object** (the server validates the inner
 * shape per key with Pydantic — the OpenAPI types it only as an open object),
 * so the client edits it as JSON and surfaces the server's 422 on a bad shape
 * rather than inventing field forms it can't keep in sync.
 *
 * `PUT` (admin) writes one key; `DELETE` (admin) resets it to the bundled
 * default. The PUT body is the value object itself.
 */

import { http } from "./http";
import type { components } from "./schema";

export type SettingsValues = components["schemas"]["SettingsResponse"]["values"];
export type SettingValue = components["schemas"]["SettingsValueResponse"]["value"];

/** All settings keys → value object, merged with server defaults. */
export async function fetchSettings(): Promise<SettingsValues> {
  const res = await http.get<components["schemas"]["SettingsResponse"]>("/settings");
  return res.data.values ?? {};
}

/** Write one key (admin). Returns the stored value. Throws 422 on a bad shape. */
export async function putSetting(key: string, value: SettingValue): Promise<SettingValue> {
  const res = await http.put<components["schemas"]["SettingsValueResponse"]>(
    `/settings/${encodeURIComponent(key)}`,
    value,
  );
  return res.data.value;
}

/** Reset one key to its bundled default (admin). */
export async function resetSetting(key: string): Promise<void> {
  await http.delete(`/settings/${encodeURIComponent(key)}`);
}
