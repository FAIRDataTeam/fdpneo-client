/**
 * Friendly-message map for known FDP error codes.
 *
 * The server's `code` field is the stable identifier; this map turns it into
 * copy a non-technical reader can act on. Anything missing falls back to the
 * server-supplied `message`, then to a generic phrase.
 *
 * Keep entries succinct, action-oriented, no jargon. The error boundary
 * already shows the technical details (code, docs link) for those who want
 * them; this is the layer above.
 */

const MESSAGES: Record<string, string> = {
  // HTTP fallbacks
  "http.400": "The request was malformed. Refresh the page and try again.",
  "http.401": "Your session has expired. Sign back in to continue.",
  "http.403": "You don't have permission to do that.",
  "http.404": "That record doesn't exist, or it was removed.",
  "http.408": "The request timed out. Try again in a moment.",
  "http.500": "The server hit an unexpected error. We've been notified.",
  "http.502": "The server is temporarily unreachable. Try again shortly.",
  "http.503": "The server is offline for maintenance. Try again later.",
  "http.504": "The server didn't respond in time. Try again.",

  // FDP envelopes
  "fdp.access.denied":
    "You don't have access to this record. If you think this is wrong, ask the steward listed on the record page.",
  "fdp.access.unauthenticated": "Sign in to see this record.",
  "fdp.validation.failed":
    "The submitted data didn't pass validation against the schema. See the listed violations.",
  "fdp.validation.profile":
    "The submission falls outside the FDP profile this server accepts.",
  "fdp.ldp.conflict":
    "Another change to this record landed first. Reload and re-apply your edits.",
  "fdp.ldp.gone":
    "This record was deleted. Its identifier is preserved for citations.",
  "fdp.sparql.parse":
    "The query couldn't be parsed. Check the syntax around the highlighted position.",
  "fdp.sparql.timeout":
    "The query took too long and was cancelled. Narrow it with a LIMIT or a more selective filter.",

  // Client-side
  "client.network": "We couldn't reach the FDP server. Check the connection and try again.",
  "client.exception": "An unexpected error occurred.",
  "client.unknown": "An unexpected error occurred.",
};

/**
 * Map a code to friendly copy. Falls back to the server message when the code
 * is unknown, then to a generic phrase when neither is available.
 */
export function friendlyMessage(code: string, serverMessage: string | null): string {
  const known = MESSAGES[code];
  if (known) return known;
  if (serverMessage && serverMessage.length > 0) return serverMessage;
  return "An unexpected error occurred.";
}
