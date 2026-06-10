/**
 * Thin SPARQL client over the FDP server's `/fdp-api/sparql` endpoint.
 *
 * The FDP server has no REST listing endpoints (`/fdp-api/page`, `/fdp-api/expanded` are
 * documented but unimplemented), so catalog/dataset enumeration and search
 * go through SPARQL. The endpoint:
 *
 *   - returns standard `application/sparql-results+json`,
 *   - stores every record in a *named graph* keyed by its IRI — list queries
 *     must wrap patterns in `GRAPH ?g { … }`; the default graph is empty,
 *   - rejects queries that begin with a `PREFIX` declaration ("unrecognized
 *     SPARQL operation"), so callers write queries that start with the verb
 *     (SELECT/ASK/CONSTRUCT) and use full IRIs inline,
 *   - applies the access policy and hides `/meta` graphs, so anonymous callers
 *     already get the public-readable view.
 *
 * Requests ride the shared `http` instance, so the bearer token is attached
 * automatically when the user is signed in.
 */

import { AxiosError } from "axios";
import { http } from "./http";

/** A single value in a SPARQL result row. */
export interface SparqlValue {
  type: "uri" | "literal" | "bnode" | "typed-literal";
  value: string;
  datatype?: string;
  "xml:lang"?: string;
}

export type SparqlBinding = Record<string, SparqlValue | undefined>;

interface SparqlResultsJson {
  head: { vars: string[] };
  results: { bindings: SparqlBinding[] };
}

/** Run a SELECT and return its rows. */
export async function sparqlSelect(query: string): Promise<SparqlBinding[]> {
  const res = await http.get<SparqlResultsJson>("/fdp-api/sparql", {
    params: { query },
    headers: { Accept: "application/sparql-results+json" },
  });
  return res.data?.results?.bindings ?? [];
}

/** Read a binding's string value, or `undefined` when absent. */
export function value(row: SparqlBinding, name: string): string | undefined {
  return row[name]?.value;
}

/**
 * Result of an arbitrary playground query. SELECT → a table, ASK → a boolean,
 * CONSTRUCT/DESCRIBE → an RDF graph serialization (Turtle). The server chooses
 * the response media type from the query form; we discriminate on it.
 */
export type SparqlQueryResult =
  | { kind: "table"; vars: string[]; rows: SparqlBinding[] }
  | { kind: "boolean"; value: boolean }
  | { kind: "graph"; contentType: string; body: string };

interface SparqlBooleanJson {
  head: Record<string, unknown>;
  boolean: boolean;
}

/**
 * Run an arbitrary SPARQL read query for the playground.
 *
 * Sent verbatim as `application/sparql-query` (POST avoids URL-length limits
 * and form-encoding). We ask for both JSON results and Turtle and key off the
 * response content type. On error we normalise the envelope (which arrives as
 * a text body because we read text) back to an object so `parseFdpError` can
 * read its `code`/`message`.
 */
export async function runSparqlQuery(query: string): Promise<SparqlQueryResult> {
  try {
    const res = await http.post<string>("/fdp-api/sparql", query, {
      headers: {
        "Content-Type": "application/sparql-query",
        Accept: "application/sparql-results+json, text/turtle;q=0.9",
      },
      responseType: "text",
      transformResponse: (d: unknown) => d,
    });
    const ctRaw: unknown = res.headers["content-type"];
    const contentType = typeof ctRaw === "string" ? ctRaw : "";
    if (contentType.includes("json")) {
      const parsed = JSON.parse(res.data) as SparqlResultsJson | SparqlBooleanJson;
      if ("boolean" in parsed) return { kind: "boolean", value: parsed.boolean };
      return {
        kind: "table",
        vars: parsed.head?.vars ?? [],
        rows: parsed.results?.bindings ?? [],
      };
    }
    return { kind: "graph", contentType, body: res.data };
  } catch (err) {
    // Error bodies come back as a JSON *string* (responseType: text); parse it
    // so the envelope-aware error handler sees an object.
    if (err instanceof AxiosError && typeof err.response?.data === "string") {
      try {
        err.response.data = JSON.parse(err.response.data);
      } catch {
        /* leave the raw text in place */
      }
    }
    throw err;
  }
}

/** A SPARQL string literal, escaped for safe interpolation into a query. */
export function literal(raw: string): string {
  const escaped = raw
    .replace(/\\/g, "\\\\")
    .replace(/"/g, '\\"')
    .replace(/\n/g, "\\n")
    .replace(/\r/g, "\\r")
    .replace(/\t/g, "\\t");
  return `"${escaped}"`;
}
