/**
 * Config-driven entity forms for metadata authoring (Phase 7).
 *
 * The server's SHACL shapes aren't reliably served (the `/spec` endpoint is
 * unimplemented), so until 7.5 we describe each resource type's editable
 * fields here, mirroring the bundled DCAT profile shapes
 * (`fdp-server/profiles/default/schemas/*.ttl`). This module is the single
 * source of truth for: the rdf:type, the URL prefix, the parent/child
 * relationships, the form fields, and the RDF ↔ model mapping.
 */

import { Store } from "n3";
import {
  NS,
  addType,
  many,
  one,
  parseTurtle,
  serializeTurtle,
  setIri,
  setLiteral,
  setLiterals,
} from "./rdf";

export type EntityType = "catalog" | "dataset" | "distribution" | "data-service";

export type FieldKind = "text" | "textarea" | "iri" | "keywords";

export interface FieldSpec {
  key: string;
  predicate: string;
  label: string;
  kind: FieldKind;
  required?: boolean;
  placeholder?: string;
  help?: string;
}

export interface EntitySpec {
  type: EntityType;
  classIri: string;
  label: string;
  /** URL/path prefix and the segment under which members live. */
  prefix: EntityType;
  /** Types that can be created as children of this one. */
  childTypes: EntityType[];
  fields: FieldSpec[];
}

/** Model is a flat record: scalar fields are strings, `keywords` is a string[]. */
export type EntityModel = Record<string, string | string[]>;

const F = {
  title: { key: "title", predicate: `${NS.dct}title`, label: "Title", kind: "text", required: true } as FieldSpec,
  description: { key: "description", predicate: `${NS.dct}description`, label: "Description", kind: "textarea" } as FieldSpec,
  publisher: { key: "publisher", predicate: `${NS.dct}publisher`, label: "Publisher (IRI)", kind: "iri", placeholder: "https://example.org/org" } as FieldSpec,
  license: { key: "license", predicate: `${NS.dct}license`, label: "License (IRI)", kind: "iri", placeholder: "https://creativecommons.org/licenses/by/4.0/" } as FieldSpec,
  keywords: { key: "keywords", predicate: `${NS.dcat}keyword`, label: "Keywords", kind: "keywords", help: "Comma-separated." } as FieldSpec,
  theme: { key: "theme", predicate: `${NS.dcat}theme`, label: "Theme (IRI)", kind: "iri" } as FieldSpec,
  format: { key: "format", predicate: `${NS.dct}format`, label: "Format", kind: "text", placeholder: "text/csv" } as FieldSpec,
  downloadURL: { key: "downloadURL", predicate: `${NS.dcat}downloadURL`, label: "Download URL", kind: "iri" } as FieldSpec,
  accessURL: { key: "accessURL", predicate: `${NS.dcat}accessURL`, label: "Access URL", kind: "iri" } as FieldSpec,
  endpointURL: { key: "endpointURL", predicate: `${NS.dcat}endpointURL`, label: "Endpoint URL", kind: "iri" } as FieldSpec,
};

export const ENTITY_SPECS: Record<EntityType, EntitySpec> = {
  catalog: {
    type: "catalog",
    classIri: `${NS.dcat}Catalog`,
    label: "Catalog",
    prefix: "catalog",
    childTypes: ["dataset", "data-service"],
    fields: [F.title, F.description, F.publisher, F.license],
  },
  dataset: {
    type: "dataset",
    classIri: `${NS.dcat}Dataset`,
    label: "Dataset",
    prefix: "dataset",
    childTypes: ["distribution"],
    fields: [F.title, F.description, F.publisher, F.license, F.keywords, F.theme],
  },
  distribution: {
    type: "distribution",
    classIri: `${NS.dcat}Distribution`,
    label: "Distribution",
    prefix: "distribution",
    childTypes: [],
    fields: [F.title, F.description, F.format, F.license, F.downloadURL, F.accessURL],
  },
  "data-service": {
    type: "data-service",
    classIri: `${NS.dcat}DataService`,
    label: "Data service",
    prefix: "data-service",
    childTypes: [],
    fields: [F.title, F.description, F.publisher, F.endpointURL],
  },
};

export function specFor(type: EntityType): EntitySpec {
  return ENTITY_SPECS[type];
}

/** The resource type for a path id (`dataset/ad-cohort-2024` → "dataset"). */
export function typeForId(id: string): EntityType | null {
  const prefix = id.split("/")[0] ?? "";
  return prefix in ENTITY_SPECS ? (prefix as EntityType) : null;
}

/** An empty model for a create form. */
export function emptyModel(spec: EntitySpec): EntityModel {
  const model: EntityModel = {};
  for (const f of spec.fields) model[f.key] = f.kind === "keywords" ? [] : "";
  return model;
}

/** Read a model out of a resource graph (for the edit form). */
export function modelFromTurtle(turtle: string, iri: string, spec: EntitySpec): EntityModel {
  const store = parseTurtle(turtle);
  const model: EntityModel = {};
  for (const f of spec.fields) {
    model[f.key] = f.kind === "keywords" ? many(store, iri, f.predicate) : (one(store, iri, f.predicate) ?? "");
  }
  return model;
}

function applyModel(store: Store, iri: string, spec: EntitySpec, model: EntityModel): void {
  for (const f of spec.fields) {
    const value = model[f.key];
    if (f.kind === "keywords") {
      setLiterals(store, iri, f.predicate, Array.isArray(value) ? value : []);
    } else if (f.kind === "iri") {
      setIri(store, iri, f.predicate, typeof value === "string" ? value : "");
    } else {
      setLiteral(store, iri, f.predicate, typeof value === "string" ? value : "");
    }
  }
}

/** Build the Turtle for a brand-new resource (subject = its IRI). */
export function buildCreateTurtle(
  iri: string,
  spec: EntitySpec,
  model: EntityModel,
  parentIri: string | null,
): Promise<string> {
  const store = new Store();
  addType(store, iri, spec.classIri);
  applyModel(store, iri, spec, model);
  if (parentIri) setIri(store, iri, `${NS.dct}isPartOf`, parentIri);
  return serializeTurtle(store);
}

/**
 * Apply a model onto an existing resource graph (read-modify-write) and
 * serialize, preserving triples the form doesn't manage (rdf:type, isPartOf, …).
 */
export function applyEditTurtle(
  existingTurtle: string,
  iri: string,
  spec: EntitySpec,
  model: EntityModel,
): Promise<string> {
  const store = parseTurtle(existingTurtle);
  applyModel(store, iri, spec, model);
  return serializeTurtle(store);
}

/** Parse comma-separated keyword input into a clean string[]. */
export function parseKeywords(input: string): string[] {
  return input
    .split(",")
    .map((k) => k.trim())
    .filter(Boolean);
}
