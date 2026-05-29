/**
 * Thin SPARQL client over the FDP server's `/sparql` endpoint.
 *
 * The FDP server has no REST listing endpoints (`/page`, `/expanded` are
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
  const res = await http.get<SparqlResultsJson>("/sparql", {
    params: { query },
    headers: { Accept: "application/sparql-results+json" },
  });
  return res.data?.results?.bindings ?? [];
}

/** Read a binding's string value, or `undefined` when absent. */
export function value(row: SparqlBinding, name: string): string | undefined {
  return row[name]?.value;
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
