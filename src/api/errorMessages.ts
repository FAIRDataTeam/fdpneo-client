/**
 * Friendly-message resolver for known FDP error codes.
 *
 * The server's `code` field is the stable identifier; this turns it into copy a
 * non-technical reader can act on. The copy itself lives in the i18n bundles
 * under `errors.*` (keyed by the code, e.g. `http.400` → `errors.http.400`), so
 * it follows the active UI language. Anything missing falls back to the
 * server-supplied `message`, then to a generic phrase.
 *
 * Keep entries succinct, action-oriented, no jargon. The error boundary already
 * shows the technical details (code, docs link); this is the layer above.
 */

import { hasMessage, translate } from "@/i18n";

/**
 * Map a code to friendly copy. Falls back to the server message when the code
 * is unknown, then to a generic phrase when neither is available.
 */
export function friendlyMessage(code: string, serverMessage: string | null): string {
  const key = `errors.${code}`;
  if (hasMessage(key)) return translate(key);
  if (serverMessage && serverMessage.length > 0) return serverMessage;
  return translate("errors.generic");
}
