/**
 * RDF helpers for the metadata surfaces.
 *
 * The FDP server serves records as RDF (we request Turtle). These helpers
 * parse a record graph with n3 and map it onto the view models the metadata
 * components consume. Fields the bundled DCAT profile doesn't carry
 * (participant counts, visit counts, access prose, …) are left empty rather
 * than invented — the components already treat them as optional.
 */

import { Parser, Store, Writer, DataFactory } from "n3";
import type { Distribution, FdpRecord } from "@/data/sampleRecord";
import type { RecordKind } from "@/types/record";
import { runtimeApiUrl } from "@/runtimeConfig";

// Wrap rather than destructure: pulling the bare method off DataFactory trips
// @typescript-eslint/unbound-method (n3's factory functions don't use `this`).
const namedNode = (iri: string) => DataFactory.namedNode(iri);

export const NS = {
  rdf: "http://www.w3.org/1999/02/22-rdf-syntax-ns#",
  dct: "http://purl.org/dc/terms/",
  dcat: "http://www.w3.org/ns/dcat#",
  ldp: "http://www.w3.org/ns/ldp#",
} as const;

const RDF_TYPE = `${NS.rdf}type`;

/** Absolute base of the FDP API, without a trailing slash. */
export const apiBase = (): string => {
  const url = runtimeApiUrl();
  // "/" (same origin) carries no base prefix; otherwise strip a trailing slash.
  return url === "/" ? "" : url.replace(/\/$/, "");
};

/** IRI → the path id the client routes on (`catalog/cohort`); IRI unchanged if it isn't under the base. */
export function iriToId(iri: string): string {
  const base = apiBase();
  if (base && iri.startsWith(`${base}/`)) return iri.slice(base.length + 1);
  return iri;
}

/** Parse a Turtle document into an in-memory store. */
export function parseTurtle(turtle: string): Store {
  const store = new Store();
  store.addQuads(new Parser().parse(turtle));
  return store;
}

/** First object of `subject predicate` as a string, or `undefined`. */
export function one(store: Store, subject: string, predicate: string): string | undefined {
  const [first] = store.getObjects(namedNode(subject), namedNode(predicate), null);
  return first?.value;
}

/** All objects of `subject predicate` as strings. */
export function many(store: Store, subject: string, predicate: string): string[] {
  return store.getObjects(namedNode(subject), namedNode(predicate), null).map((o) => o.value);
}

/** First object value for any triple with this predicate, regardless of subject. */
export function anyObject(store: Store, predicate: string): string | undefined {
  const [q] = store.getQuads(null, namedNode(predicate), null, null);
  return q?.object.value;
}

/** Distinct subjects in the store that carry an `rdf:type` (e.g. the children in a `/fdp-api/page` graph). */
export function typedSubjects(store: Store): string[] {
  const out = new Set<string>();
  for (const q of store.getQuads(null, namedNode(RDF_TYPE), null, null)) {
    out.add(q.subject.value);
  }
  return [...out];
}

/** Replace all `subject predicate` triples with a single string literal (or remove if empty). */
export function setLiteral(
  store: Store,
  subject: string,
  predicate: string,
  value: string,
  datatype?: string,
): void {
  store.removeQuads(store.getQuads(namedNode(subject), namedNode(predicate), null, null));
  const v = value.trim();
  if (!v) return;
  // Tag the literal with its datatype (e.g. xsd:date) so it satisfies the
  // shape's sh:datatype; a plain literal (no datatype) is xsd:string by RDF 1.1.
  const lit = datatype ? DataFactory.literal(v, namedNode(datatype)) : DataFactory.literal(v);
  store.addQuad(DataFactory.quad(namedNode(subject), namedNode(predicate), lit));
}

/** Replace all `subject predicate` triples with a single IRI object (or remove if empty). */
export function setIri(store: Store, subject: string, predicate: string, iri: string): void {
  store.removeQuads(store.getQuads(namedNode(subject), namedNode(predicate), null, null));
  const v = iri.trim();
  if (v) store.addQuad(DataFactory.quad(namedNode(subject), namedNode(predicate), namedNode(v)));
}

/** Replace all `subject predicate` triples with one string literal per non-empty value. */
export function setLiterals(store: Store, subject: string, predicate: string, values: string[]): void {
  store.removeQuads(store.getQuads(namedNode(subject), namedNode(predicate), null, null));
  for (const raw of values) {
    const v = raw.trim();
    if (v) store.addQuad(DataFactory.quad(namedNode(subject), namedNode(predicate), DataFactory.literal(v)));
  }
}

/** Replace all `subject predicate` triples with one IRI object per non-empty value. */
export function setIris(store: Store, subject: string, predicate: string, iris: string[]): void {
  store.removeQuads(store.getQuads(namedNode(subject), namedNode(predicate), null, null));
  for (const raw of iris) {
    const v = raw.trim();
    if (v) store.addQuad(DataFactory.quad(namedNode(subject), namedNode(predicate), namedNode(v)));
  }
}

/** Set the rdf:type of a subject (additive — does not remove existing types). */
export function addType(store: Store, subject: string, classIri: string): void {
  store.addQuad(DataFactory.quad(namedNode(subject), namedNode(`${NS.rdf}type`), namedNode(classIri)));
}

/** Serialize a store to Turtle, preserving every triple (used for read-modify-write). */
export function serializeTurtle(store: Store): Promise<string> {
  return new Promise((resolve, reject) => {
    const writer = new Writer({
      prefixes: { dcterms: NS.dct, dcat: NS.dcat, rdf: NS.rdf, ldp: "http://www.w3.org/ns/ldp#" },
    });
    writer.addQuads(store.getQuads(null, null, null, null));
    writer.end((err, result) => (err ? reject(err) : resolve(result)));
  });
}

const TYPE_MAP: Record<string, { kind: RecordKind; label: string }> = {
  [`${NS.dcat}Catalog`]: { kind: "catalog", label: "Catalog" },
  [`${NS.dcat}Dataset`]: { kind: "dataset", label: "Dataset" },
  [`${NS.dcat}Distribution`]: { kind: "distribution", label: "Distribution" },
};

function classify(store: Store, subject: string): { kind: RecordKind; label: string } {
  for (const t of many(store, subject, RDF_TYPE)) {
    if (TYPE_MAP[t]) return TYPE_MAP[t];
  }
  return { kind: "dataset", label: "Resource" };
}

/** A short, human label for a license IRI; falls back to the IRI itself. */
export function licenseLabel(iri: string | undefined): string {
  if (!iri) return "";
  const cc = /creativecommons\.org\/licenses\/([a-z-]+)\/(\d\.\d)/i.exec(iri);
  if (cc) return `CC ${(cc[1] ?? "").toUpperCase()} ${cc[2] ?? ""}`.trim();
  if (/creativecommons\.org\/publicdomain\/zero/i.test(iri)) return "CC0";
  return iri;
}

/** Last meaningful segment of an IRI, for terse labels (themes, publishers). */
export function shortLabel(iri: string): string {
  const trimmed = iri.replace(/[#/]$/, "");
  const seg = trimmed.split(/[#/]/).pop() ?? trimmed;
  return seg || trimmed;
}

/** Turtle `xsd:dateTime`/`date` literal → `YYYY-MM-DD` (best effort). */
export function isoDate(value: string | undefined): string {
  if (!value) return "";
  return value.slice(0, 10);
}

/**
 * Map a record graph (Turtle) onto an `FdpRecord`. `resourceIri` is the
 * record's absolute IRI (the request URL). Distributions are populated
 * separately (their detail lives in their own graphs).
 */
export function mapRecord(
  turtle: string,
  resourceIri: string,
  distributions: Distribution[] = [],
): FdpRecord {
  const store = parseTurtle(turtle);
  const s = resourceIri;
  const { kind, label } = classify(store, s);

  const publisherUri = one(store, s, `${NS.dct}publisher`) ?? "";
  const licenseUri = one(store, s, `${NS.dct}license`) ?? "";
  const distributionIris = many(store, s, `${NS.dcat}distribution`);

  return {
    id: iriToId(s),
    type: kind,
    typeLabel: label,
    title: one(store, s, `${NS.dct}title`) ?? iriToId(s),
    description: one(store, s, `${NS.dct}description`) ?? "",
    publisher: publisherUri ? shortLabel(publisherUri) : "",
    publisherUri,
    version: one(store, s, `${NS.dct}hasVersion`) ?? "",
    versionDate: isoDate(one(store, s, `${NS.dct}modified`)),
    language: shortLabel(one(store, s, `${NS.dct}language`) ?? ""),
    license: licenseLabel(licenseUri),
    licenseUri,
    conformsTo: one(store, s, `${NS.dct}conformsTo`) ?? "",
    identifier: one(store, s, `${NS.dct}identifier`) ?? "",
    issued: isoDate(one(store, s, `${NS.dct}issued`)),
    modified: isoDate(one(store, s, `${NS.dct}modified`)),
    keywords: many(store, s, `${NS.dcat}keyword`),
    themes: many(store, s, `${NS.dcat}theme`).map(shortLabel),
    themeUris: many(store, s, `${NS.dcat}theme`),
    spatial: shortLabel(one(store, s, `${NS.dct}spatial`) ?? ""),
    temporal: one(store, s, `${NS.dct}temporal`) ?? "",
    participants: 0,
    visits: 0,
    distributions: distributions.length
      ? distributions
      : distributionIris.map((iri) => ({
          id: iriToId(iri),
          title: shortLabel(iri),
          format: "",
          size: null,
          access: "",
        })),
    access: { summary: "", permitted: [], restricted: [] },
    related: [],
  };
}

/** Distribution IRIs a record links to via `dcat:distribution`. */
export function distributionIris(turtle: string, resourceIri: string): string[] {
  return many(parseTurtle(turtle), resourceIri, `${NS.dcat}distribution`);
}
