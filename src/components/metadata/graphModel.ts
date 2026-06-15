/**
 * Pure model for the live RDF graph (the "Living specimen plate").
 *
 * Splits a focused record's triples into two layers — kept framework-free so the
 * classification logic is unit-testable without the canvas/force simulation:
 *
 *  • RELATIONS  — objects that are other FDP **records** (IRIs minted under the
 *    FDP base): the structure/hierarchy. Rendered as typed, refocusable nodes.
 *  • ATTRIBUTES — everything else (literals + external/vocabulary IRIs such as
 *    licence, theme, publisher, rdf:type): the record's own properties.
 *
 * The record vs. attribute test is deliberately simple and robust: an object IRI
 * under `apiBase()` is a record; any other IRI, or a literal, is an attribute.
 */

import { Parser, type Quad } from "n3";
import { apiBase, classify, iriToId, NS, parseTurtle, shortLabel } from "@/api/rdf";
import type { RecordKind } from "@/types/record";

const RDF_TYPE = `${NS.rdf}type`;

export interface GraphRecordNode {
  /** Stable node id = the record's IRI. */
  id: string;
  iri: string;
  /** Path id for routing/refetch (`dataset/x`); "" for the repository root. */
  recordId: string;
  type: RecordKind;
  label: string;
  focus: boolean;
}

export interface GraphAttr {
  id: string;
  pred: string;
  predLabel: string;
  value: string;
  isIri: boolean;
  href: string | null;
  /** "@en" / "xsd:date" annotation for literals. */
  note: string;
}

export interface GraphEdge {
  s: string;
  o: string;
  p: string;
  predLabel: string;
  kind: "rel" | "attr";
  incoming: boolean;
}

export interface Neighbourhood {
  recordNodes: GraphRecordNode[];
  attrs: GraphAttr[];
  edges: GraphEdge[];
}

// Prefix table for compact predicate labels (CURIEs). NS plus a few common vocabs
// the FDP profile uses; unknown predicates fall back to their last path segment.
const CURIE: Record<string, string> = {
  [NS.rdf]: "rdf",
  [NS.dct]: "dct",
  [NS.dcat]: "dcat",
  [NS.ldp]: "ldp",
  [NS.owl]: "owl",
  [NS.skos]: "skos",
  "http://xmlns.com/foaf/0.1/": "foaf",
  "http://www.w3.org/2001/XMLSchema#": "xsd",
  "http://www.w3.org/ns/dqv#": "dqv",
  "http://purl.org/dc/dcmitype/": "dctype",
};

/** Compact predicate label, e.g. `dct:title`, `rdf:type`; falls back to the local name. */
export function curie(iri: string): string {
  for (const [ns, prefix] of Object.entries(CURIE)) {
    if (iri.startsWith(ns)) return `${prefix}:${iri.slice(ns.length)}`;
  }
  return shortLabel(iri) || iri;
}

/** The FDP base without a trailing slash ("" when same-origin / unset). */
function base(): string {
  return apiBase();
}

/** True when an object IRI is an FDP record (minted under the base) → a relation. */
export function isRecordIri(iri: string): boolean {
  const b = base();
  if (!b) return false;
  return iri === b || iri.startsWith(`${b}/`);
}

// Record kind from a record IRI's path prefix (best-effort, for neighbour colour).
// The focus node's kind is taken from its real rdf:type instead (see neighbourhood).
const PREFIX_KIND: Record<string, RecordKind> = {
  catalog: "catalog",
  dataset: "dataset",
  distribution: "distribution",
};
function kindFromIri(iri: string): RecordKind {
  const b = base();
  if (b && iri === b) return "fdp";
  const prefix = iriToId(iri).split("/")[0] ?? "";
  return PREFIX_KIND[prefix] ?? "dataset";
}

function litNote(o: Quad["object"]): string {
  if (o.termType !== "Literal") return "";
  if (o.language) return `@${o.language}`;
  const dt = o.datatype?.value;
  if (dt && dt !== `${NS.rdf}langString` && !dt.endsWith("#string")) return curie(dt);
  return "";
}

/**
 * Build the focus record's 1-hop neighbourhood from its Turtle, split into
 * relation edges (to other records) and attribute tags (its own properties).
 * Includes incoming relations (other records that point at the focus).
 */
export function neighbourhood(turtle: string, focusIri: string): Neighbourhood {
  let quads: Quad[];
  try {
    quads = new Parser().parse(turtle);
  } catch {
    return { recordNodes: [], attrs: [], edges: [] };
  }

  const store = parseTurtle(turtle);
  const focusKind = isRecordIri(focusIri) ? classify(store, focusIri).kind : kindFromIri(focusIri);
  const focusLabel =
    quads.find((q) => q.subject.value === focusIri && q.predicate.value === `${NS.dct}title`)
      ?.object.value ?? shortLabel(focusIri);

  const records = new Map<string, GraphRecordNode>();
  records.set(focusIri, {
    id: focusIri,
    iri: focusIri,
    recordId: iriToId(focusIri),
    type: focusKind,
    label: focusLabel,
    focus: true,
  });

  const attrs: GraphAttr[] = [];
  const edges: GraphEdge[] = [];
  let seq = 0;

  const addRecord = (iri: string): void => {
    if (records.has(iri)) return;
    records.set(iri, {
      id: iri,
      iri,
      recordId: iriToId(iri),
      type: kindFromIri(iri),
      label: shortLabel(iri) || iri,
      focus: false,
    });
  };

  // type first, then a stable order so the picture doesn't reshuffle on refetch.
  const outgoing = quads
    .filter((q) => q.subject.value === focusIri)
    .sort((a, b) => {
      if (a.predicate.value === RDF_TYPE) return -1;
      if (b.predicate.value === RDF_TYPE) return 1;
      return a.predicate.value.localeCompare(b.predicate.value);
    });

  for (const q of outgoing) {
    const o = q.object;
    const p = q.predicate.value;
    if (o.termType === "NamedNode" && isRecordIri(o.value)) {
      addRecord(o.value);
      edges.push({ s: focusIri, o: o.value, p, predLabel: curie(p), kind: "rel", incoming: false });
    } else {
      const isIri = o.termType === "NamedNode";
      const id = `attr:${seq++}`;
      attrs.push({
        id,
        pred: p,
        predLabel: curie(p),
        value: isIri ? curie(o.value) : o.value,
        isIri,
        href: isIri ? o.value : null,
        note: litNote(o),
      });
      edges.push({ s: focusIri, o: id, p, predLabel: curie(p), kind: "attr", incoming: false });
    }
  }

  // Incoming relations: other records that reference the focus.
  for (const q of quads) {
    if (q.object.value !== focusIri || q.object.termType !== "NamedNode") continue;
    if (q.subject.termType !== "NamedNode" || !isRecordIri(q.subject.value)) continue;
    if (q.subject.value === focusIri) continue;
    addRecord(q.subject.value);
    edges.push({
      s: q.subject.value,
      o: focusIri,
      p: q.predicate.value,
      predLabel: curie(q.predicate.value),
      kind: "rel",
      incoming: true,
    });
  }

  return { recordNodes: [...records.values()], attrs, edges };
}
