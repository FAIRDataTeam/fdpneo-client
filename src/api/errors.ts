/**
 * FDP error envelope handling.
 *
 * The server returns errors as a JSON envelope, roughly:
 *
 *   { code: "fdp.access.denied",
 *     message: "...",
 *     docs_url: "https://specs.fairdatapoint.org/...",
 *     violations?: [{ path, message }, ...] }
 *
 * `parseFdpError` accepts anything (`unknown`) and normalises to a
 * `ParsedError`. It handles four input shapes defensively:
 *
 *   1. Axios error with the envelope in `response.data`
 *   2. A bare envelope object
 *   3. A standard `Error`
 *   4. Anything else (stringified)
 *
 * Callers (the error boundary, view-level error UIs) consume only the
 * normalised result.
 */

import { AxiosError } from "axios";
import { friendlyMessage } from "./errorMessages";

export interface FdpViolation {
  path?: string;
  message: string;
}

export interface ParsedError {
  /** Best-effort headline shown to the user. */
  title: string;
  /** Body text — already mapped to friendly copy when the code is known. */
  message: string;
  /** Stable identifier — `fdp.access.denied`, `http.404`, etc. */
  code: string;
  /** HTTP status when one was present (Axios path). */
  status: number | null;
  /** Server-provided docs link, if any. */
  docsUrl: string | null;
  /** SHACL / profile / LDP validation details, if any. */
  violations: FdpViolation[];
  /** True iff the envelope came from the FDP server (not a generic error). */
  fromServer: boolean;
}

type Envelope = Record<string, unknown>;

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function readString(source: Record<string, unknown>, key: string): string | null {
  const v = source[key];
  return typeof v === "string" && v.length > 0 ? v : null;
}

function readViolations(source: unknown): FdpViolation[] {
  if (!Array.isArray(source)) return [];
  return source
    .filter(isObject)
    .map((raw): FdpViolation | null => {
      const message = readString(raw, "message");
      if (!message) return null;
      const path = readString(raw, "path");
      return path ? { path, message } : { message };
    })
    .filter((v): v is FdpViolation => v !== null);
}

function readEnvelope(source: unknown): Envelope | null {
  if (!isObject(source)) return null;
  // Accept either the envelope itself or `{ error: envelope }`.
  if (isObject(source.error)) return source.error;
  return source;
}

function titleFor(code: string, status: number | null): string {
  if (status === 401) return "You need to sign in";
  if (status === 403) return "You don't have access to this";
  if (status === 404) return "We couldn't find that";
  if (status === 408 || status === 504) return "The server didn't respond in time";
  if (status === 500) return "Something went wrong on the server";
  if (status && status >= 500) return "The server is having trouble";
  if (code.startsWith("fdp.validation.")) return "That didn't pass validation";
  if (code.startsWith("fdp.access.")) return "Access denied";
  return "Something went wrong";
}

function parseEnvelope(
  envelope: Envelope | null,
  status: number | null,
): ParsedError {
  const code =
    (envelope && readString(envelope, "code")) ??
    (status !== null ? `http.${status}` : "client.unknown");
  const serverMessage = envelope && readString(envelope, "message");
  const docsUrl =
    (envelope && (readString(envelope, "docs_url") ?? readString(envelope, "docsUrl"))) ?? null;
  const violations = envelope ? readViolations(envelope.violations) : [];
  const message = friendlyMessage(code, serverMessage);
  return {
    title: titleFor(code, status),
    message,
    code,
    status,
    docsUrl,
    violations,
    fromServer: envelope !== null,
  };
}

export function parseFdpError(input: unknown): ParsedError {
  if (input instanceof AxiosError) {
    const status = input.response?.status ?? null;
    const envelope = readEnvelope(input.response?.data);
    if (envelope || status !== null) return parseEnvelope(envelope, status);
    // Network error, no response.
    return {
      title: "The server is unreachable",
      message:
        "We couldn't reach the FDP server. Check the connection and try again.",
      code: "client.network",
      status: null,
      docsUrl: null,
      violations: [],
      fromServer: false,
    };
  }

  if (isObject(input)) {
    const envelope = readEnvelope(input);
    if (envelope && readString(envelope, "code")) return parseEnvelope(envelope, null);
  }

  if (input instanceof Error) {
    return {
      title: "Something went wrong",
      message: input.message || "An unexpected error occurred.",
      code: "client.exception",
      status: null,
      docsUrl: null,
      violations: [],
      fromServer: false,
    };
  }

  return {
    title: "Something went wrong",
    message: typeof input === "string" && input ? input : "An unexpected error occurred.",
    code: "client.unknown",
    status: null,
    docsUrl: null,
    violations: [],
    fromServer: false,
  };
}

/**
 * Rethrow an Axios error after parsing a JSON-*string* error body into an
 * object, so the envelope-aware `parseFdpError` can read `code`/`message`.
 *
 * The RDF endpoints read responses as text (`responseType: "text"`), so error
 * envelopes arrive as a JSON string rather than a parsed object. Non-Axios
 * errors and already-parsed bodies pass through untouched. Always throws
 * (`never`) — call as `return normaliseError(err)` from a `catch`.
 */
export function normaliseError(err: unknown): never {
  if (err instanceof AxiosError && typeof err.response?.data === "string") {
    try {
      err.response.data = JSON.parse(err.response.data);
    } catch {
      /* leave raw text */
    }
  }
  throw err;
}
