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
  oneLang,
  parseTurtle,
  serializeTurtle,
  setIri,
  setIris,
  setLangLiteral,
  setLiteral,
  setLiterals,
  shortLabel,
} from "./rdf";
import { translate } from "@/i18n";

/**
 * A resource type's URL prefix. Runtime-defined (ADR-0009), so this is an
 * open `string`, not a closed union. The standard DCAT prefixes
 * ("catalog" | "dataset" | "distribution" | "data-service") have static
 * fallback specs in {@link ENTITY_SPECS}; any other value is a type the
 * deployment registered at runtime, resolved from the server catalog by
 * `useResourceTypes` / `specFromDefinition`.
 */
export type EntityType = string;

export type FieldKind =
  | "text"
  | "textarea"
  | "iri"
  | "keywords"
  | "iris"
  | "ref"
  | "enum"
  | "boolean"
  | "date"
  | "datetime"
  | "number"
  | "details";

export interface FieldSpec {
  key: string;
  predicate: string;
  label: string;
  kind: FieldKind;
  required?: boolean;
  placeholder?: string;
  help?: string;
  /** Allowed values for `kind: "enum"` (from the shape's `sh:in`). */
  options?: string[];
  /** Datatype IRI for typed literals (date/number/boolean/enum); xsd:string left bare. */
  datatype?: string;
  /** True for rdf:langString / dash:*WithLangEditor — value carries a language tag. */
  lang?: boolean;
  /** For `kind: "details"` — the nested shape's (scalar) fields, edited inline. */
  nested?: FieldSpec[];
  /** rdf:type stamped on the nested blank node (from the property's sh:class). */
  nestedClass?: string;
  /** Cardinality (from sh:minCount/sh:maxCount) — drives the repeatable editor's
   * add/remove gating for multi-value (`keywords`/`iris`) fields. */
  minCount?: number;
  maxCount?: number;
  /** DASH reference editor: the value is an IRI picked from a class lookup. */
  refWidget?: "autocomplete" | "instances" | "subclass";
  /** The class (sh:class) whose instances/subclasses the reference picker offers. */
  refClass?: string;
  /** String constraints (for hints + client pre-validation): sh:pattern / sh:minLength / sh:maxLength. */
  pattern?: string;
  minLength?: number;
  maxLength?: number;
  /** Numeric range (for hints + client pre-validation): sh:min/maxInclusive / sh:min/maxExclusive. */
  minInclusive?: number;
  maxInclusive?: number;
  minExclusive?: number;
  maxExclusive?: number;
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
  /**
   * `rdfs:label` of the SHACL shape this field originated from, when the field
   * was inherited through the shape closure (`sh:node`/`sh:and`) — e.g.
   * "DCAT Resource" / "DCAT Dataset". Lets the form group fields by source so the
   * schema composition is visible. Absent when the originating shape is unlabelled.
   */
  origin?: string;
}

/**
 * An "at least one of these" requirement, from a node-level `sh:or` over
 * single-property branches (SHACL spec §4.6.2). The record must give a value to
 * at least one of `keys` (each a `FieldSpec.key`). Both is fine; neither is not.
 */
export interface OrConstraint {
  keys: string[];
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
  /** "At least one of" groups from the shape's `sh:or` (empty/absent = none). */
  orGroups?: OrConstraint[];
}

/** Model is a flat record: scalar fields are strings, `keywords` is a string[]. */
export type EntityModel = Record<string, string | string[]>;

const F = {
  title: {
    key: "title",
    predicate: `${NS.dct}title`,
    label: "Title",
    kind: "text",
    required: true,
  } as FieldSpec,
  description: {
    key: "description",
    predicate: `${NS.dct}description`,
    label: "Description",
    kind: "textarea",
  } as FieldSpec,
  publisher: {
    key: "publisher",
    predicate: `${NS.dct}publisher`,
    label: "Publisher (IRI)",
    kind: "iri",
    placeholder: "https://example.org/org",
    autocomplete: "publisher",
  } as FieldSpec,
  license: {
    key: "license",
    predicate: `${NS.dct}license`,
    label: "License",
    kind: "ref",
    source: "licenses",
    placeholder: "a managed license IRI",
    help: "From Licenses; or paste any IRI.",
  } as FieldSpec,
  rights: {
    key: "rights",
    predicate: `${NS.dct}rights`,
    label: "Access policy",
    kind: "ref",
    source: "policies",
    placeholder: "a managed policy IRI",
    help: "An ODRL Offer from Policies (dct:rights).",
  } as FieldSpec,
  keywords: {
    key: "keywords",
    predicate: `${NS.dcat}keyword`,
    label: "Keywords",
    kind: "keywords",
    help: "Add one value per row.",
  } as FieldSpec,
  theme: {
    key: "theme",
    predicate: `${NS.dcat}theme`,
    label: "Theme (IRI)",
    kind: "iri",
    autocomplete: "theme",
  } as FieldSpec,
  format: {
    key: "format",
    predicate: `${NS.dct}format`,
    label: "Format",
    kind: "text",
    placeholder: "text/csv",
    autocomplete: "mime",
  } as FieldSpec,
  downloadURL: {
    key: "downloadURL",
    predicate: `${NS.dcat}downloadURL`,
    label: "Download URL",
    kind: "iri",
  } as FieldSpec,
  accessURL: {
    key: "accessURL",
    predicate: `${NS.dcat}accessURL`,
    label: "Access URL",
    kind: "iri",
  } as FieldSpec,
  endpointURL: {
    key: "endpointURL",
    predicate: `${NS.dcat}endpointURL`,
    label: "Endpoint URL",
    kind: "iri",
  } as FieldSpec,
  // Dual-identifier properties (ADR-0014). Optional and additive: the record's
  // canonical IRI is the FDP-minted subject; these point at equivalent
  // identifiers elsewhere. The server may also add `owl:sameAs` itself when a
  // record is created under a foreign subject IRI.
  identifier: {
    key: "identifier",
    predicate: `${NS.dct}identifier`,
    label: "Identifier",
    kind: "text",
    placeholder: "e.g. a DOI string",
    help: "An external identifier string (literal), e.g. a DOI.",
  } as FieldSpec,
  sameAs: {
    key: "sameAs",
    predicate: `${NS.owl}sameAs`,
    label: "Same as (IRI)",
    kind: "iris",
    help: "Equivalent foreign persistent identifier(s). Add one IRI per row.",
  } as FieldSpec,
  exactMatch: {
    key: "exactMatch",
    predicate: `${NS.skos}exactMatch`,
    label: "Exact match (IRI)",
    kind: "iris",
    help: "Equivalent IRI(s) in another registry. Add one IRI per row.",
  } as FieldSpec,
};

// The optional dual-identifier block, appended to every resource type's fields.
const IDENTIFIER_FIELDS: FieldSpec[] = [F.identifier, F.sameAs, F.exactMatch];

export const ENTITY_SPECS: Record<EntityType, EntitySpec> = {
  catalog: {
    type: "catalog",
    classIri: `${NS.dcat}Catalog`,
    label: "Catalog",
    prefix: "catalog",
    childTypes: ["dataset", "data-service"],
    fields: [
      F.title,
      F.description,
      F.publisher,
      F.license,
      F.rights,
      ...IDENTIFIER_FIELDS,
    ],
  },
  dataset: {
    type: "dataset",
    classIri: `${NS.dcat}Dataset`,
    label: "Dataset",
    prefix: "dataset",
    childTypes: ["distribution"],
    fields: [
      F.title,
      F.description,
      F.publisher,
      F.license,
      F.keywords,
      F.theme,
      F.rights,
      ...IDENTIFIER_FIELDS,
    ],
  },
  distribution: {
    type: "distribution",
    classIri: `${NS.dcat}Distribution`,
    label: "Distribution",
    prefix: "distribution",
    childTypes: [],
    fields: [
      F.title,
      F.description,
      F.format,
      F.license,
      F.downloadURL,
      F.accessURL,
      F.rights,
      ...IDENTIFIER_FIELDS,
    ],
  },
  "data-service": {
    type: "data-service",
    classIri: `${NS.dcat}DataService`,
    label: "Data service",
    prefix: "data-service",
    childTypes: [],
    fields: [
      F.title,
      F.description,
      F.publisher,
      F.endpointURL,
      F.rights,
      ...IDENTIFIER_FIELDS,
    ],
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

const isMulti = (kind: FieldKind): boolean =>
  kind === "keywords" || kind === "iris";

/** The model key holding a lang-tagged field's language (sibling to its value). */
export const langKey = (key: string): string => `${key}__lang`;

/** The flat model key for a nested field of a `kind: "details"` field. */
export const detailKey = (parentKey: string, nestedKey: string): string =>
  `${parentKey}.${nestedKey}`;

/** An empty model for a create form. */
export function emptyModel(spec: EntitySpec): EntityModel {
  const model: EntityModel = {};
  for (const f of spec.fields) {
    if (f.kind === "details" && f.nested) {
      for (const nf of f.nested)
        model[detailKey(f.key, nf.key)] = isMulti(nf.kind) ? [] : "";
      continue;
    }
    model[f.key] = isMulti(f.kind) ? [] : "";
    if (f.lang) model[langKey(f.key)] = "";
  }
  return model;
}

/** Read a model out of a resource graph (for the edit form). */
export function modelFromTurtle(
  turtle: string,
  iri: string,
  spec: EntitySpec,
): EntityModel {
  const store = parseTurtle(turtle);
  const model: EntityModel = {};
  for (const f of spec.fields) {
    if (f.kind === "details" && f.nested) {
      const [obj] = store.getObjects(
        DataFactory.namedNode(iri),
        DataFactory.namedNode(f.predicate),
        null,
      );
      for (const nf of f.nested) {
        model[detailKey(f.key, nf.key)] = obj
          ? (store.getObjects(obj, DataFactory.namedNode(nf.predicate), null)[0]
              ?.value ?? "")
          : "";
      }
      continue;
    }
    model[f.key] = isMulti(f.kind)
      ? many(store, iri, f.predicate)
      : (one(store, iri, f.predicate) ?? "");
    if (f.lang) model[langKey(f.key)] = oneLang(store, iri, f.predicate);
  }
  return model;
}

/** Write a `kind: "details"` field as a nested blank node with its scalar props. */
function applyDetails(
  store: Store,
  iri: string,
  f: FieldSpec,
  model: EntityModel,
): void {
  store.removeQuads(
    store.getQuads(
      DataFactory.namedNode(iri),
      DataFactory.namedNode(f.predicate),
      null,
      null,
    ),
  );
  const nested = f.nested ?? [];
  const vals = nested.map((nf) => ({ nf, v: model[detailKey(f.key, nf.key)] }));
  const hasAny = vals.some(({ v }) =>
    typeof v === "string" ? v.trim() !== "" : Array.isArray(v) && v.length > 0,
  );
  if (!hasAny) return; // omit the whole nested node when empty
  const bn = DataFactory.blankNode();
  store.addQuad(
    DataFactory.quad(
      DataFactory.namedNode(iri),
      DataFactory.namedNode(f.predicate),
      bn,
    ),
  );
  if (f.nestedClass) {
    store.addQuad(
      DataFactory.quad(
        bn,
        DataFactory.namedNode(`${NS.rdf}type`),
        DataFactory.namedNode(f.nestedClass),
      ),
    );
  }
  for (const { nf, v } of vals) {
    const s = typeof v === "string" ? v.trim() : "";
    if (!s) continue;
    const obj =
      nf.kind === "iri" || nf.kind === "ref"
        ? DataFactory.namedNode(s)
        : nf.datatype
          ? DataFactory.literal(s, DataFactory.namedNode(nf.datatype))
          : DataFactory.literal(s);
    store.addQuad(
      DataFactory.quad(bn, DataFactory.namedNode(nf.predicate), obj),
    );
  }
}

function applyModel(
  store: Store,
  iri: string,
  spec: EntitySpec,
  model: EntityModel,
): void {
  for (const f of spec.fields) {
    if (f.kind === "details" && f.nested) {
      applyDetails(store, iri, f, model);
      continue;
    }
    const value = model[f.key];
    const list = Array.isArray(value) ? value : [];
    const scalar = typeof value === "string" ? value : "";
    if (f.kind === "keywords") setLiterals(store, iri, f.predicate, list);
    else if (f.kind === "iris") setIris(store, iri, f.predicate, list);
    else if (f.kind === "iri" || f.kind === "ref")
      setIri(store, iri, f.predicate, scalar);
    else if (f.lang) {
      const lang =
        typeof model[langKey(f.key)] === "string"
          ? (model[langKey(f.key)] as string)
          : "";
      setLangLiteral(store, iri, f.predicate, scalar, lang);
    }
    // Typed literals (date/number/boolean/enum) carry their datatype; bare text
    // serializes as a plain literal (xsd:string).
    else setLiteral(store, iri, f.predicate, scalar, f.datatype);
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

const DASH = "http://datashapes.org/dash#";
/**
 * Explicit DASH editor (single-literal widgets only) → record-form kind, so a
 * steward's `dash:editor` choice drives the control. Reference/nested widgets
 * (AutoComplete/InstancesSelect/SubClass/Details/BlankNode) need a class-instance
 * lookup the client doesn't have, and the *WithLang editors need rdf:langString
 * support — both degrade to the datatype/nodeKind default (TASKS 12.25).
 */
const DASH_EDITOR_KIND: Record<string, FieldKind> = {
  TextFieldEditor: "text",
  TextAreaEditor: "textarea",
  RichTextEditor: "textarea",
  TextFieldWithLangEditor: "text",
  TextAreaWithLangEditor: "textarea",
  BooleanSelectEditor: "boolean",
  DatePickerEditor: "date",
  DateTimePickerEditor: "datetime",
};

/** DASH reference editors → the lookup widget (the value stays a single IRI). */
const DASH_REF_WIDGET: Record<
  string,
  "autocomplete" | "instances" | "subclass"
> = {
  AutoCompleteEditor: "autocomplete",
  InstancesSelectEditor: "instances",
  SubClassEditor: "subclass",
};

const XSD = "http://www.w3.org/2001/XMLSchema#";
/** xsd numeric datatypes → the Number input. */
const NUMERIC_XSD = new Set<string>(
  [
    "integer",
    "decimal",
    "float",
    "double",
    "long",
    "int",
    "short",
    "byte",
    "nonNegativeInteger",
    "positiveInteger",
    "nonPositiveInteger",
    "negativeInteger",
    "unsignedLong",
    "unsignedInt",
    "unsignedShort",
    "unsignedByte",
  ].map((t) => `${XSD}${t}`),
);

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

const RDFS_LABEL = DataFactory.namedNode(
  "http://www.w3.org/2000/01/rdf-schema#label",
);

/**
 * The shape closure: the starting NodeShape plus every shape it composes through
 * **shape-level** `sh:node` / `sh:and` list members, transitively. Ordered
 * target-first (BFS), so a caller deduping by `sh:path` keeps the most-derived
 * constraint. Cycle-guarded by a visited set.
 *
 * This is distinct from *property-level* `sh:node` (a nested sub-form for one
 * property) — that is handled separately and is not followed here.
 */
function shapeClosure(store: Store, target: Term): Term[] {
  const RDF_FIRST = DataFactory.namedNode(`${NS.rdf}first`);
  const RDF_REST = DataFactory.namedNode(`${NS.rdf}rest`);
  const RDF_NIL = `${NS.rdf}nil`;
  const listMembers = (head: Term): Term[] => {
    const out: Term[] = [];
    const seen = new Set<string>();
    let node: Term | undefined = head;
    while (node && node.value !== RDF_NIL && !seen.has(node.value)) {
      seen.add(node.value);
      const m = store.getObjects(node, RDF_FIRST, null)[0];
      if (m) out.push(m);
      node = store.getObjects(node, RDF_REST, null)[0];
    }
    return out;
  };

  const ordered: Term[] = [];
  const visited = new Set<string>();
  const queue: Term[] = [target];
  while (queue.length) {
    const s = queue.shift() as Term;
    if (visited.has(s.value)) continue;
    visited.add(s.value);
    ordered.push(s);
    for (const n of store.getObjects(s, sh("node"), null)) {
      if (!visited.has(n.value)) queue.push(n);
    }
    for (const andHead of store.getObjects(s, sh("and"), null)) {
      for (const m of listMembers(andHead))
        if (!visited.has(m.value)) queue.push(m);
    }
  }
  return ordered;
}

/**
 * Derive form fields from a resource type's SHACL NodeShape (from
 * `GET /{type}/spec`). Maps `sh:property` constraints onto `FieldSpec`s:
 * datatype → text/textarea/keywords, `sh:nodeKind sh:IRI` → iri/iris,
 * `sh:maxCount 1` → single vs repeatable, `sh:minCount ≥ 1` → required.
 * Property shapes that aren't simple fields (no datatype and not an IRI, e.g.
 * `dcat:contactPoint`) are skipped, as are excluded predicates. Returns `[]`
 * if the shape can't be found, so callers can fall back to the static spec.
 */
export function fieldsFromShape(
  turtle: string,
  classIri: string,
  depth = 0,
): FieldSpec[] {
  const store = parseTurtle(turtle);
  let shape: Term | null =
    store.getSubjects(
      sh("targetClass"),
      DataFactory.namedNode(classIri),
      null,
    )[0] ?? null;
  if (
    !shape &&
    store.getQuads(DataFactory.namedNode(classIri), sh("property"), null, null)
      .length
  ) {
    shape = DataFactory.namedNode(classIri);
  }
  if (!shape) return [];

  const first = (p: Quad_Object, local: string): string | undefined =>
    store.getObjects(p, sh(local), null)[0]?.value;

  const RDF_FIRST = `${NS.rdf}first`;
  const RDF_REST = `${NS.rdf}rest`;
  const RDF_NIL = `${NS.rdf}nil`;
  // sh:in ( … ) → the list of allowed values (for enum dropdowns).
  const readIn = (p: Quad_Object): string[] | null => {
    const headHead = store.getObjects(p, sh("in"), null)[0];
    if (!headHead) return null;
    const out: string[] = [];
    const seen = new Set<string>();
    let node: Term | undefined = headHead;
    while (node && node.value !== RDF_NIL && !seen.has(node.value)) {
      seen.add(node.value);
      const v = store.getObjects(
        node,
        DataFactory.namedNode(RDF_FIRST),
        null,
      )[0];
      if (v) out.push(v.value);
      node = store.getObjects(node, DataFactory.namedNode(RDF_REST), null)[0];
    }
    return out.length ? out : null;
  };

  // Union property shapes across the shape closure (target + inherited shapes),
  // deduping by sh:path with the most-derived (target-first) shape winning.
  const fields: FieldSpec[] = [];
  const seenPaths = new Set<string>();
  for (const src of shapeClosure(store, shape)) {
    const origin = store.getObjects(src, RDFS_LABEL, null)[0]?.value;
    for (const p of store.getObjects(src, sh("property"), null)) {
      const path = store.getObjects(p, sh("path"), null)[0]?.value;
      if (!path || SHACL_EXCLUDED.has(path) || seenPaths.has(path)) continue;
      const datatype = first(p, "datatype");
      const nodeKind = first(p, "nodeKind");
      const options = readIn(p);
      const editorIri = store.getObjects(
        p,
        DataFactory.namedNode(`${DASH}editor`),
        null,
      )[0]?.value;
      const editorKind = editorIri
        ? DASH_EDITOR_KIND[editorIri.replace(DASH, "")]
        : undefined;
      // A nested-shape reference (sh:node) → an inline "details" sub-form. Only one
      // level deep (depth 0) to avoid unbounded / cyclic recursion.
      const nodeShape = depth === 0 ? first(p, "node") : undefined;
      if (
        !datatype &&
        !options &&
        nodeKind !== `${SH}IRI` &&
        !editorKind &&
        !nodeShape
      )
        continue; // not a simple field

      const single =
        first(p, "maxCount") === "1" || SHACL_SINGLE_LITERALS.has(path);
      const minCount = first(p, "minCount");
      const required = minCount !== undefined && Number(minCount) >= 1;

      // Pick the input control: details (sh:node) → enum (sh:in) → IRI → repeatable
      // literals → explicit dash:editor → typed literal by datatype → textarea/text.
      let kind: FieldKind;
      if (nodeShape) kind = "details";
      else if (options) kind = "enum";
      else if (nodeKind === `${SH}IRI`) kind = single ? "iri" : "iris";
      else if (!single) kind = "keywords";
      else if (editorKind) kind = editorKind;
      else if (datatype === `${XSD}boolean`) kind = "boolean";
      else if (datatype === `${XSD}date`) kind = "date";
      else if (datatype === `${XSD}dateTime` || datatype === `${XSD}time`)
        kind = "datetime";
      else if (datatype && NUMERIC_XSD.has(datatype)) kind = "number";
      else kind = path === `${NS.dct}description` ? "textarea" : "text";

      const field: FieldSpec = {
        key: shortLabel(path),
        predicate: path,
        label: first(p, "name") || shortLabel(path),
        kind,
      };
      if (options) field.options = options;
      if (nodeShape) {
        field.nested = fieldsFromShape(turtle, nodeShape, depth + 1);
        const cls = first(p, "class");
        if (cls) field.nestedClass = cls;
      }
      // Carry the datatype for typed literals so values serialize correctly.
      if (
        datatype &&
        (kind === "enum" ||
          kind === "boolean" ||
          kind === "date" ||
          kind === "datetime" ||
          kind === "number")
      ) {
        field.datatype = datatype;
      }
      // Language-tagged literal: rdf:langString or a dash:*WithLangEditor.
      if (
        datatype === `${NS.rdf}langString` ||
        editorIri?.endsWith("WithLangEditor")
      ) {
        field.lang = true;
      }
      // Reference editor: a single-IRI value picked from a class lookup (needs sh:class).
      const refWidget = editorIri
        ? DASH_REF_WIDGET[editorIri.replace(DASH, "")]
        : undefined;
      if (refWidget && kind === "iri") {
        const cls = first(p, "class");
        if (cls) {
          field.refWidget = refWidget;
          field.refClass = cls;
        }
      }
      if (path === `${NS.dct}license`) {
        field.kind = "ref"; // a managed-license picker (5.5), not a bare IRI
        field.source = "licenses";
        field.label = first(p, "name") || "License";
      }
      if (required) field.required = true;
      // Carry raw cardinality for the repeatable editor's add/remove gating.
      if (minCount !== undefined && Number.isFinite(Number(minCount)))
        field.minCount = Number(minCount);
      const maxCount = first(p, "maxCount");
      if (maxCount !== undefined && Number.isFinite(Number(maxCount)))
        field.maxCount = Number(maxCount);
      const description = first(p, "description");
      if (description) field.help = description;

      // String + numeric constraints (for hints + client pre-validation).
      const numOf = (local: string): number | undefined => {
        const v = first(p, local);
        return v !== undefined && Number.isFinite(Number(v))
          ? Number(v)
          : undefined;
      };
      const pattern = first(p, "pattern");
      if (pattern) field.pattern = pattern;
      for (const c of [
        "minLength",
        "maxLength",
        "minInclusive",
        "maxInclusive",
        "minExclusive",
        "maxExclusive",
      ] as const) {
        const v = numOf(c);
        if (v !== undefined) field[c] = v;
      }

      if (origin) field.origin = origin;
      fields.push(field);
      seenPaths.add(path);
    }
  }

  const rank = (f: FieldSpec) =>
    f.predicate === `${NS.dct}title`
      ? 0
      : f.predicate === `${NS.dct}description`
        ? 1
        : 2;
  fields.sort((a, b) => rank(a) - rank(b) || a.label.localeCompare(b.label));
  // Always offer the access-policy picker — dct:rights is SHACL_EXCLUDED, so it
  // never comes from the shape, but any record can opt into a policy (5.5).
  // Only at the top level; nested sub-forms don't get their own policy picker.
  if (depth === 0) fields.push({ ...F.rights });
  return fields;
}

/**
 * "At least one of" groups derived from the shape's node-level `sh:or`
 * (SHACL spec §4.6.2). Each `sh:or` over single-property branches becomes one
 * `OrConstraint` whose `keys` are the form keys of the branch paths. Supports
 * both the canonical property-shape branch (`[ sh:path P ; … ]`) and the
 * node-shape branch (`[ sh:property [ sh:path P … ] ]`).
 */
export function orGroupsFromShape(
  turtle: string,
  classIri: string,
): OrConstraint[] {
  const store = parseTurtle(turtle);
  let shape: Term | null =
    store.getSubjects(
      sh("targetClass"),
      DataFactory.namedNode(classIri),
      null,
    )[0] ?? null;
  if (
    !shape &&
    store.getQuads(DataFactory.namedNode(classIri), sh("or"), null, null).length
  ) {
    shape = DataFactory.namedNode(classIri);
  }
  if (!shape) return [];

  const rdf = (local: string) =>
    DataFactory.namedNode(
      `http://www.w3.org/1999/02/22-rdf-syntax-ns#${local}`,
    );
  const RDF_NIL = "http://www.w3.org/1999/02/22-rdf-syntax-ns#nil";

  const branchPath = (member: Term): string | undefined => {
    const direct = store.getObjects(member, sh("path"), null)[0]?.value;
    if (direct) return direct;
    const prop = store.getObjects(member, sh("property"), null)[0];
    return prop
      ? store.getObjects(prop, sh("path"), null)[0]?.value
      : undefined;
  };

  // Walk the shape closure so inherited `sh:or` groups are honoured too, deduping
  // identical groups (same key set) contributed by more than one shape.
  const groups: OrConstraint[] = [];
  const seenGroups = new Set<string>();
  for (const src of shapeClosure(store, shape)) {
    for (const head of store.getObjects(src, sh("or"), null)) {
      const keys: string[] = [];
      let node: Term | undefined = head;
      let ok = true;
      const seen = new Set<string>();
      while (node && node.value !== RDF_NIL && !seen.has(node.value)) {
        seen.add(node.value);
        const member = store.getObjects(node, rdf("first"), null)[0];
        const path = member ? branchPath(member) : undefined;
        if (!path || SHACL_EXCLUDED.has(path)) {
          ok = false;
          break;
        }
        keys.push(shortLabel(path));
        node = store.getObjects(node, rdf("rest"), null)[0];
      }
      if (!ok || keys.length < 2) continue;
      const sig = [...keys].sort().join("\u0000");
      if (seenGroups.has(sig)) continue;
      seenGroups.add(sig);
      groups.push({ keys });
    }
  }
  return groups;
}

/** The "at least one of" groups in `spec` where the model fills none of them. */
export function missingOrGroups(
  spec: EntitySpec,
  model: EntityModel,
): OrConstraint[] {
  const filled = (key: string): boolean => {
    const v = model[key];
    if (Array.isArray(v)) return v.length > 0;
    return typeof v === "string" && v.trim() !== "";
  };
  return (spec.orGroups ?? []).filter((g) => !g.keys.some(filled));
}

export interface ConstraintViolation {
  key: string;
  label: string;
  message: string;
}

/**
 * Client-side pre-validation of string/numeric constraints (sh:pattern,
 * sh:minLength/maxLength, value range) — a courtesy so the user doesn't round-
 * trip to the server to learn of a simple violation. Returns the first failure,
 * or null. The server remains the validation authority.
 */
export function validateConstraints(
  spec: EntitySpec,
  model: EntityModel,
): ConstraintViolation | null {
  for (const f of spec.fields) {
    const v = model[f.key];
    if (typeof v !== "string") continue; // multi-value / unset handled elsewhere
    const s = v.trim();
    if (!s) continue; // emptiness is the required check's job
    const fail = (message: string): ConstraintViolation => ({
      key: f.key,
      label: f.label,
      message,
    });

    if (f.minLength != null && s.length < f.minLength)
      return fail(translate("validation.minLength", { min: f.minLength }));
    if (f.maxLength != null && s.length > f.maxLength)
      return fail(translate("validation.maxLength", { max: f.maxLength }));
    if (f.pattern) {
      let re: RegExp | null = null;
      try {
        re = new RegExp(f.pattern);
      } catch {
        re = null; // an un-compilable pattern is left to the server
      }
      if (re && !re.test(s))
        return fail(translate("validation.pattern", { pattern: f.pattern }));
    }
    if (f.kind === "number") {
      const n = Number(s);
      if (Number.isFinite(n)) {
        if (f.minInclusive != null && n < f.minInclusive)
          return fail(translate("validation.minInclusive", { value: f.minInclusive }));
        if (f.maxInclusive != null && n > f.maxInclusive)
          return fail(translate("validation.maxInclusive", { value: f.maxInclusive }));
        if (f.minExclusive != null && n <= f.minExclusive)
          return fail(translate("validation.minExclusive", { value: f.minExclusive }));
        if (f.maxExclusive != null && n >= f.maxExclusive)
          return fail(translate("validation.maxExclusive", { value: f.maxExclusive }));
      }
    }
  }
  return null;
}

/** A short human hint summarising a field's constraints (for the form help line). */
export function constraintHint(f: FieldSpec): string {
  const parts: string[] = [];
  if (f.minLength != null || f.maxLength != null) {
    if (f.minLength != null && f.maxLength != null)
      parts.push(`${f.minLength}–${f.maxLength} chars`);
    else if (f.minLength != null) parts.push(`min ${f.minLength} chars`);
    else parts.push(`max ${f.maxLength} chars`);
  }
  if (f.minInclusive != null) parts.push(`≥ ${f.minInclusive}`);
  if (f.maxInclusive != null) parts.push(`≤ ${f.maxInclusive}`);
  if (f.minExclusive != null) parts.push(`> ${f.minExclusive}`);
  if (f.maxExclusive != null) parts.push(`< ${f.maxExclusive}`);
  if (f.pattern) parts.push(`pattern ${f.pattern}`);
  return parts.join(" · ");
}
