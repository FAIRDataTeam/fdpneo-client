// Adapted from Contour (sibling repo) @ 4117ff2 — SHACL engine ported into the FDP client.
// First-class client code (held to the full strict config); Contour remains a separate project.
// Optional props are declared `?: T | undefined` so construction may set them
// explicitly to `undefined` under the client's `exactOptionalPropertyTypes`.
export type NodeKind =
  | 'sh:Literal'
  | 'sh:IRI'
  | 'sh:BlankNode'
  | 'sh:BlankNodeOrIRI'
  | 'sh:BlankNodeOrLiteral'
  | 'sh:IRIOrLiteral';

// A single member of an sh:in enumeration. Kept as a tagged value so IRIs
// (controlled-vocabulary terms) round-trip as IRIs, not string literals.
export interface InValue {
  value: string;            // literal text, or the CURIE / <iri> for IRIs
  kind: 'literal' | 'iri';
}

// A language-tagged string (rdf:langString). `lang` is a BCP-47 tag (e.g. 'en',
// 'pt-BR'); '' is never stored here — untagged primary values use the field's
// plain value + its *Lang property.
export interface LangValue {
  value: string;
  lang: string;
}

// One branch of an sh:or value-type alternative. Each is a type-only shape
// ([ sh:datatype … ] / [ sh:nodeKind … ] / [ sh:class … ]). Anything richer
// stays in the residual graph rather than being modeled here.
export interface OrType {
  nodeKind?: string | undefined;
  datatype?: string | undefined;
  class?: string | undefined;
}

export interface WidgetDefaults {
  nodeKind?: NodeKind | undefined;
  datatype?: string | undefined;
  class?: string | undefined;
  inValues?: InValue[] | undefined;
}

export interface Widget {
  id: string;
  name: string;
  desc: string;
  category: string;
  editor: string;
  icon: string;
  defaults: WidgetDefaults;
}

export interface Field {
  id: string;
  widgetId: string;
  name: string;
  description: string;
  // Optional language tags for the primary name/description (sh:name/sh:description
  // as rdf:langString), plus any additional translations. Empty/unset → untagged.
  nameLang?: string | undefined;
  descriptionLang?: string | undefined;
  nameI18n?: LangValue[] | undefined;
  descriptionI18n?: LangValue[] | undefined;
  path: string;
  order: number;
  nodeKind: NodeKind | null;
  datatype: string | null;
  class: string | null;  // sh:class — constrains the IRI to instances of this RDF class
  node: string | null;   // sh:node — references another NodeShape for nested validation
  inversePath?: boolean | undefined; // sh:path is an inverse path: [ sh:inversePath <path> ]
  // Alternative value types (sh:or of type-only shapes), e.g. "literal or IRI".
  orTypes?: OrType[] | undefined;
  minCount: number | null;
  maxCount: number | null;
  minLength: number | null;
  maxLength: number | null;
  // Value-range bounds (sh:minInclusive / maxInclusive / minExclusive /
  // maxExclusive). Stored as raw lexical text ('' = unset) so they cover both
  // numbers ("1900") and dates ("2020-01-01"). Optional — only set on
  // numeric/date fields.
  minInclusive?: string | undefined;
  maxInclusive?: string | undefined;
  minExclusive?: string | undefined;
  maxExclusive?: string | undefined;
  pattern: string;
  defaultValue: string;
  inValues: InValue[] | null;
  // Custom validation feedback (sh:message) and its level (sh:severity —
  // sh:Violation default, sh:Warning, sh:Info). Both optional.
  message?: string | undefined;
  severity?: string | undefined;
  // Stable blank-node label, set only when this property carries SHACL the
  // visual editor doesn't model (e.g. sh:or, sh:message). Those triples live in
  // Schema.residual keyed by this label; the generator emits the property as a
  // labeled node so they re-link losslessly. Unset → emitted inline as `[ … ]`.
  bnode?: string | undefined;
}

export interface Group {
  id: string;
  // Stable IRI, minted once and unchanged on rename (avoids collisions and
  // broken sh:group references). Falls back to a label-derived IRI when unset.
  iri?: string | undefined;
  label: string;
  order: number;
  fields: Field[];
}

export interface Prefix {
  prefix: string;
  uri: string;
}

export interface NestedShape {
  id: string;
  iri: string;
  targetClass: string;
  fields: Field[];
}

export interface Schema {
  schemaName: string;
  schemaDescription: string;
  shapeIri: string;
  targetClass: string;
  prefixes: Prefix[];
  groups: Group[];
  nestedShapes: NestedShape[];
  // SHACL/RDF the editor doesn't model, preserved verbatim as N-Triples and
  // re-emitted in a commented tail so open → edit → save is lossless.
  residual?: string | undefined;
}

// ── F4 peer-shapes model (foundation; not yet the store's source of truth) ──
// Every NodeShape is a first-class peer with its own groups. The current
// Schema's primary shape + flat nestedShapes collapse into this in F4.2.
export interface NodeShape {
  id: string;
  iri: string;
  targetClass: string;
  name: string;        // rdfs:label
  description: string; // dct:description
  groups: Group[];
}

export interface ShapesDoc {
  prefixes: Prefix[];
  shapes: NodeShape[];
  residual?: string | undefined;
}

export type SelectedKind = 'schema' | 'field' | 'group' | 'nested-shape' | 'nested-field';

export type Mutator = (draft: Schema) => void;
