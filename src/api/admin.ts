/**
 * Admin operations — `POST /admin/reset` (TASKS 10.7).
 *
 * Factory reset: truncates the runtime settings and re-applies the bundled
 * profile (schemas, offers, resource definitions, seed records). Destructive and
 * irreversible, so the server requires a fixed confirmation token in the body;
 * the UI makes the admin type it. The response reports what was re-applied.
 */

import { http } from "./http";
import type { components } from "./schema";

export type ResetResponse = components["schemas"]["ResetResponse"];

/** The literal the admin must type to confirm (server `RESET_CONFIRMATION_TOKEN`). */
export const RESET_CONFIRMATION_TOKEN = "reset-to-factory-defaults";

export async function resetToFactoryDefaults(confirmation: string): Promise<ResetResponse> {
  const res = await http.post<ResetResponse>("/admin/reset", { confirmation });
  return res.data;
}
