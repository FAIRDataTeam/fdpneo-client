/**
 * RDF namespaces & prefixes — the single source of base IRIs for the whole app.
 *
 * The schema editor uses the SHACL/DASH/RDFS/XSD/FOAF families; the metadata
 * surfaces use the DCAT/DCT/LDP/OWL/SKOS families. Both draw from this one map:
 * `api/rdf.ts` re-exports the relevant subset as `NS` so there is no second,
 * drifting copy. Also seeds the default `@prefix` set for a new schema.
 */

export interface PrefixDecl {
  prefix: string;
  uri: string;
}

/** Namespace base IRIs. */
export const NAMESPACES = {
  sh: "http://www.w3.org/ns/shacl#",
  dash: "http://datashapes.org/dash#",
  rdf: "http://www.w3.org/1999/02/22-rdf-syntax-ns#",
  rdfs: "http://www.w3.org/2000/01/rdf-schema#",
  xsd: "http://www.w3.org/2001/XMLSchema#",
  dcat: "http://www.w3.org/ns/dcat#",
  dct: "http://purl.org/dc/terms/",
  foaf: "http://xmlns.com/foaf/0.1/",
  ldp: "http://www.w3.org/ns/ldp#",
  owl: "http://www.w3.org/2002/07/owl#",
  skos: "http://www.w3.org/2004/02/skos/core#",
} as const;

/** The bare-colon default namespace a schema's own terms (`:DatasetShape`) live under. */
export const DEFAULT_URI = "http://fairdatapoint.org/";

/** Term builders for the families the serializer/parser reference by IRI. */
export const SH = (local: string): string => `${NAMESPACES.sh}${local}`;
export const DASH = (local: string): string => `${NAMESPACES.dash}${local}`;
export const RDFS = (local: string): string => `${NAMESPACES.rdfs}${local}`;
export const XSD = (local: string): string => `${NAMESPACES.xsd}${local}`;

/**
 * Compact a full IRI to a prefixed name (`http://…/dcat#Dataset` → `dcat:Dataset`)
 * using the given prefixes plus the standard families; longest namespace wins.
 * Non-IRIs (already prefixed/short) pass through unchanged.
 */
export function compactIri(iri: string, prefixes: PrefixDecl[] = []): string {
  if (!/^https?:\/\//.test(iri)) return iri;
  const entries: [string, string][] = [
    ["", DEFAULT_URI],
    ...prefixes.map((p) => [p.prefix, p.uri] as [string, string]),
    ...(Object.entries(NAMESPACES) as [string, string][]),
  ];
  entries.sort((a, b) => b[1].length - a[1].length);
  for (const [prefix, ns] of entries) {
    if (iri.startsWith(ns)) return `${prefix}:${iri.slice(ns.length)}`;
  }
  return iri;
}

/** Default prefix declarations seeded into a fresh schema, in stable order. */
export const PREFIXES: PrefixDecl[] = [
  { prefix: "sh", uri: NAMESPACES.sh },
  { prefix: "dash", uri: NAMESPACES.dash },
  { prefix: "rdf", uri: NAMESPACES.rdf },
  { prefix: "rdfs", uri: NAMESPACES.rdfs },
  { prefix: "xsd", uri: NAMESPACES.xsd },
  { prefix: "dcat", uri: NAMESPACES.dcat },
  { prefix: "dct", uri: NAMESPACES.dct },
  { prefix: "foaf", uri: NAMESPACES.foaf },
];
