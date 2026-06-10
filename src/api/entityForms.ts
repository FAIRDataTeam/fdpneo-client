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

import { Store, DataFactory, type Quad_Object, type Term } from "n3";
import {
  NS,
  addType,
  many,
  one,
  parseTurtle,
  serializeTurtle,
  setIri,
  setIris,
  setLiteral,
  setLiterals,
  shortLabel,
} from "./rdf";

/**
 * A resource type's URL prefix. Runtime-defined (ADR-0009), so this is an
 * open `string`, not a closed union. The standard DCAT prefixes
 * ("catalog" | "dataset" | "distribution" | "data-service") have static
 * fallback specs in {@link ENTITY_SPECS}; any other value is a type the
 * deployment registered at runtime, resolved from the server catalog by
 * `useResourceTypes` / `specFromDefinition`.
 */
export type EntityType = string;

export type FieldKind = "text" | "textarea" | "iri" | "keywords" | "iris" | "ref";

export interface FieldSpec {
  key: string;
  predicate: string;
  label: string;
  kind: FieldKind;
  required?: boolean;
  placeholder?: string;
  help?: string;
  /**
   * Name of a server autocomplete source (`GET /forms/autocomplete`) to suggest
   * values for this field (TASKS 10.6). The source names are admin-configured
   * (10.5); the field stays free-text, suggestions are advisory. Only applied to
   * single-value `text`/`iri` fields.
   */
  autocomplete?: string;
  /**
   * For `kind: "ref"` — the managed-document catalog to suggest IRIs from: the
   * published `/fdp-api/policies` (an `odrl:Offer` for `dct:rights`) or `/fdp-api/licenses` (for
   * `dct:license`). The field stays a free-text IRI input with a `<datalist>`.
   */
  source?: "policies" | "licenses";
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
  publisher: { key: "publisher", predicate: `${NS.dct}publisher`, label: "Publisher (IRI)", kind: "iri", placeholder: "https://example.org/org", autocomplete: "publisher" } as FieldSpec,
  license: { key: "license", predicate: `${NS.dct}license`, label: "License", kind: "ref", source: "licenses", placeholder: "a managed license IRI", help: "From Licenses; or paste any IRI." } as FieldSpec,
  rights: { key: "rights", predicate: `${NS.dct}rights`, label: "Access policy", kind: "ref", source: "policies", placeholder: "a managed policy IRI", help: "An ODRL Offer from Policies (dct:rights)." } as FieldSpec,
  keywords: { key: "keywords", predicate: `${NS.dcat}keyword`, label: "Keywords", kind: "keywords", help: "Comma-separated." } as FieldSpec,
  theme: { key: "theme", predicate: `${NS.dcat}theme`, label: "Theme (IRI)", kind: "iri", autocomplete: "theme" } as FieldSpec,
  format: { key: "format", predicate: `${NS.dct}format`, label: "Format", kind: "text", placeholder: "text/csv", autocomplete: "mime" } as FieldSpec,
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
    fields: [F.title, F.description, F.publisher, F.license, F.rights],
  },
  dataset: {
    type: "dataset",
    classIri: `${NS.dcat}Dataset`,
    label: "Dataset",
    prefix: "dataset",
    childTypes: ["distribution"],
    fields: [F.title, F.description, F.publisher, F.license, F.keywords, F.theme, F.rights],
  },
  distribution: {
    type: "distribution",
    classIri: `${NS.dcat}Distribution`,
    label: "Distribution",
    prefix: "distribution",
    childTypes: [],
    fields: [F.title, F.description, F.format, F.license, F.downloadURL, F.accessURL, F.rights],
  },
  "data-service": {
    type: "data-service",
    classIri: `${NS.dcat}DataService`,
    label: "Data service",
    prefix: "data-service",
    childTypes: [],
    fields: [F.title, F.description, F.publisher, F.endpointURL, F.rights],
  },
};

/**
 * Static fallback spec for a *known* DCAT type. Runtime types are resolved
 * from the server catalog by `useResourceTypes`; this throws for an unknown
 * prefix because the only callers are the offline fallback path and the tests,
 * both of which pass standard DCAT prefixes.
 */
export function specFor(type: EntityType): EntitySpec {
  const spec = ENTITY_SPECS[type];
  if (!spec) throw new Error(`unknown entity type: ${type}`);
  return spec;
}

/** The static fallback spec for ``type``, or ``undefined`` if not a known DCAT type. */
export function staticSpec(type: EntityType): EntitySpec | undefined {
  return ENTITY_SPECS[type];
}

/** The resource type for a path id (`dataset/ad-cohort-2024` → "dataset"), known types only. */
export function typeForId(id: string): EntityType | null {
  const prefix = id.split("/")[0] ?? "";
  return prefix in ENTITY_SPECS ? prefix : null;
}

const isMulti = (kind: FieldKind): boolean => kind === "keywords" || kind === "iris";

/** An empty model for a create form. */
export function emptyModel(spec: EntitySpec): EntityModel {
  const model: EntityModel = {};
  for (const f of spec.fields) model[f.key] = isMulti(f.kind) ? [] : "";
  return model;
}

/** Read a model out of a resource graph (for the edit form). */
export function modelFromTurtle(turtle: string, iri: string, spec: EntitySpec): EntityModel {
  const store = parseTurtle(turtle);
  const model: EntityModel = {};
  for (const f of spec.fields) {
    model[f.key] = isMulti(f.kind) ? many(store, iri, f.predicate) : (one(store, iri, f.predicate) ?? "");
  }
  return model;
}

function applyModel(store: Store, iri: string, spec: EntitySpec, model: EntityModel): void {
  for (const f of spec.fields) {
    const value = model[f.key];
    const list = Array.isArray(value) ? value : [];
    const scalar = typeof value === "string" ? value : "";
    if (f.kind === "keywords") setLiterals(store, iri, f.predicate, list);
    else if (f.kind === "iris") setIris(store, iri, f.predicate, list);
    else if (f.kind === "iri" || f.kind === "ref") setIri(store, iri, f.predicate, scalar);
    else setLiteral(store, iri, f.predicate, scalar);
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

// --- SHACL-driven fields (TASKS 7.5) --------------------------------------

const SH = "http://www.w3.org/ns/shacl#";
const sh = (local: string) => DataFactory.namedNode(`${SH}${local}`);

// Predicates the dynamic form omits: structural (set on create), server-managed
// timestamps, and access policy (its own editor).
const SHACL_EXCLUDED = new Set<string>([
  `${NS.dct}isPartOf`,
  `${NS.dct}rights`,
  `${NS.dct}issued`,
  `${NS.dct}modified`,
]);

// The bundled DCAT shapes set `sh:maxCount 1` on only some properties, so a
// strict "no maxCount ⇒ repeatable" reading would render conceptually-single
// literals (title/description/identifier) as multi-value inputs. Treat these
// well-known literals as single regardless; everything else follows maxCount.
const SHACL_SINGLE_LITERALS = new Set<string>([
  `${NS.dct}title`,
  `${NS.dct}description`,
  `${NS.dct}identifier`,
]);

/**
 * Derive form fields from a resource type's SHACL NodeShape (from
 * `GET /{type}/spec`). Maps `sh:property` constraints onto `FieldSpec`s:
 * datatype → text/textarea/keywords, `sh:nodeKind sh:IRI` → iri/iris,
 * `sh:maxCount 1` → single vs repeatable, `sh:minCount ≥ 1` → required.
 * Property shapes that aren't simple fields (no datatype and not an IRI, e.g.
 * `dcat:contactPoint`) are skipped, as are excluded predicates. Returns `[]`
 * if the shape can't be found, so callers can fall back to the static spec.
 */
export function fieldsFromShape(turtle: string, classIri: string): FieldSpec[] {
  const store = parseTurtle(turtle);
  let shape: Term | null =
    store.getSubjects(sh("targetClass"), DataFactory.namedNode(classIri), null)[0] ?? null;
  if (!shape && store.getQuads(DataFactory.namedNode(classIri), sh("property"), null, null).length) {
    shape = DataFactory.namedNode(classIri);
  }
  if (!shape) return [];

  const first = (p: Quad_Object, local: string): string | undefined =>
    store.getObjects(p, sh(local), null)[0]?.value;

  const fields: FieldSpec[] = [];
  for (const p of store.getObjects(shape, sh("property"), null)) {
    const path = store.getObjects(p, sh("path"), null)[0]?.value;
    if (!path || SHACL_EXCLUDED.has(path)) continue;
    const datatype = first(p, "datatype");
    const nodeKind = first(p, "nodeKind");
    if (!datatype && nodeKind !== `${SH}IRI`) continue; // not a simple field

    const single = first(p, "maxCount") === "1" || SHACL_SINGLE_LITERALS.has(path);
    const minCount = first(p, "minCount");
    const required = minCount !== undefined && Number(minCount) >= 1;

    let kind: FieldKind;
    if (nodeKind === `${SH}IRI`) kind = single ? "iri" : "iris";
    else if (!single) kind = "keywords";
    else kind = path === `${NS.dct}description` ? "textarea" : "text";

    const field: FieldSpec = {
      key: shortLabel(path),
      predicate: path,
      label: first(p, "name") || shortLabel(path),
      kind,
    };
    if (path === `${NS.dct}license`) {
      field.kind = "ref"; // a managed-license picker (5.5), not a bare IRI
      field.source = "licenses";
      field.label = first(p, "name") || "License";
    }
    if (required) field.required = true;
    const description = first(p, "description");
    if (description) field.help = description;
    fields.push(field);
  }

  const rank = (f: FieldSpec) =>
    f.predicate === `${NS.dct}title` ? 0 : f.predicate === `${NS.dct}description` ? 1 : 2;
  fields.sort((a, b) => rank(a) - rank(b) || a.label.localeCompare(b.label));
  // Always offer the access-policy picker — dct:rights is SHACL_EXCLUDED, so it
  // never comes from the shape, but any record can opt into a policy (5.5).
  fields.push({ ...F.rights });
  return fields;
}
