/**
 * LDP read-extension endpoints (TASKS 10.9): `/page/{childPrefix}` and
 * `/expanded` (plus their `/{prefix}/{id}/…` instance variants).
 *
 * Both return a **negotiated RDF graph** (we request Turtle), not JSON — the
 * OpenAPI advertises `application/json` but the handlers serialize RDF. So we
 * read raw text and parse with `rdf.ts`, the same as the LDP record reads in
 * `records.ts`. These endpoints are policy- and publication-state-gated
 * server-side and remove the named-graph-name coupling the SPARQL workarounds
 * had:
 *
 *  - `/page/{childPrefix}` lists a parent's children of one type, each carrying
 *    its `dct:title` + `rdf:type`, with `X-FDP-Page-*` headers for paging.
 *  - `/expanded` returns a record merged with every ancestor reachable through
 *    `dct:isPartOf` — the breadcrumb trail in one call.
 *
 * `parentId`/`path` is the record's path id (`catalog/ad-cohort`), or `""` for
 * the repository root.
 */

import { AxiosError } from "axios";
import { http } from "./http";
import { iriToId, one, parseTurtle, shortLabel, typedSubjects, NS } from "./rdf";

/** One child row from a `/page` listing. */
export interface ChildRow {
  /** Path id, doubling as a `/records/:id` target. */
  id: string;
  label: string;
  /** rdf:type IRI the server echoed for the child. */
  typeIri: string;
}

export interface ChildPage {
  children: ChildRow[];
  /** Total children of this type before paging (from `X-FDP-Page-Total`). */
  total: number;
}

const TURTLE = { Accept: "text/turtle" } as const;

function readTotal(headers: unknown, fallback: number): number {
  if (headers && typeof headers === "object") {
    const raw = (headers as Record<string, unknown>)["x-fdp-page-total"];
    const n = Number(raw);
    if (Number.isFinite(n)) return n;
  }
  return fallback;
}

function normaliseError(err: unknown): never {
  // Error bodies arrive as a JSON string (responseType: text); parse so the
  // envelope-aware error mapper can read it (mirrors records.ts).
  if (err instanceof AxiosError && typeof err.response?.data === "string") {
    try {
      err.response.data = JSON.parse(err.response.data);
    } catch {
      /* leave raw text */
    }
  }
  throw err;
}

/** `GET …/expanded` — record + ancestors as Turtle. `path` is `""` for root. */
export async function fetchExpanded(path: string): Promise<string> {
  const url = path ? `/${path}/expanded` : `/expanded`;
  try {
    const res = await http.get<string>(url, {
      headers: TURTLE,
      responseType: "text",
      transformResponse: (d: unknown) => d,
    });
    return res.data;
  } catch (err) {
    return normaliseError(err);
  }
}

/**
 * `GET …/page/{childPrefix}` — one page of a parent's children of a type.
 * `parentId` is `""` for the repository root.
 */
export async function fetchChildrenPage(
  parentId: string,
  childPrefix: string,
  opts: { limit?: number; offset?: number } = {},
): Promise<ChildPage> {
  const base = parentId ? `/${parentId}/page/${childPrefix}` : `/page/${childPrefix}`;
  const params = new URLSearchParams();
  if (opts.limit != null) params.set("limit", String(opts.limit));
  if (opts.offset != null) params.set("offset", String(opts.offset));
  const url = params.toString() ? `${base}?${params.toString()}` : base;

  try {
    const res = await http.get<string>(url, {
      headers: TURTLE,
      responseType: "text",
      transformResponse: (d: unknown) => d,
    });
    const store = parseTurtle(res.data);
    const children: ChildRow[] = typedSubjects(store).map((iri) => ({
      id: iriToId(iri),
      label: one(store, iri, `${NS.dct}title`) ?? shortLabel(iri),
      typeIri: one(store, iri, `${NS.rdf}type`) ?? "",
    }));
    return { children, total: readTotal(res.headers, children.length) };
  } catch (err) {
    return normaliseError(err);
  }
}
