/**
 * Shared editor model for the visual SHACL editor (Phase 4, task 4.0).
 *
 * The single source of truth behind all three tabs (SHACL / Visual Editor /
 * Form Preview). Lifted to **multi-shape** per the recorded scope decision:
 * one `SchemaDocument` carries the prefix set plus every `sh:NodeShape` in the
 * Turtle, so the Vue Flow graph (4.1) and the per-shape form designer (4.2)
 * operate on the same structure.
 *
 * `id` fields are client-only (for selection/keying) and are NOT serialized.
 * Serialization order and term mapping live in `serialize.ts`; the parser
 * (Turtle → model, still to build) is its inverse.
 */

import type { PrefixDecl } from "@/rdf/namespaces";

export interface SchemaDocument {
  prefixes: PrefixDecl[];
  shapes: ShapeModel[];
  /**
   * Triples the editor model doesn't represent, captured at parse time as a
   * Turtle block and re-emitted verbatim on serialize so editing never silently
   * drops them (task 4.0 losslessness). Document-level = whole other subjects;
   * per-shape/group/field residual lives on those elements.
   */
  residual?: string;
}

export interface ShapeModel {
  /** client-only id */
  id: string;
  /** the shape's own IRI, e.g. ":DatasetShape" */
  shapeIri: string;
  /** rdfs:label on the NodeShape */
  label: string;
  /** rdfs:comment on the NodeShape (omitted when empty) */
  comment: string;
  /** sh:targetClass, e.g. "dcat:Dataset" */
  targetClass: string;
  groups: Group[];
  /** Unmodeled predicates on this shape (e.g. `sh:closed`), as Turtle fragments. */
  residual?: string[];
}

export interface Group {
  /** client-only id */
  id: string;
  /** rdfs:label on the sh:PropertyGroup */
  label: string;
  /** sh:order */
  order: number;
  fields: Field[];
  /**
   * `"or"` makes this an "Either/or" group: its fields serialize as normal
   * properties (so they render and order inline), **plus** the shape emits a
   * node-level `sh:or ( [ sh:property [ sh:path P ; sh:minCount 1 ] ] … )` over
   * the group's field paths — the record must satisfy at least one of them.
   * Undefined = a normal (AND) group.
   */
  kind?: "or";
  /** Unmodeled predicates on this group, as Turtle fragments. */
  residual?: string[];
}

export interface Field {
  /** client-only id */
  id: string;
  /** palette widget key (UI only; the serialized form is `editor`) */
  widgetId: string;
  /** dash:editor IRI, e.g. "dash:TextFieldEditor" (null = omit) */
  editor: string | null;
  /** sh:name */
  name: string;
  /** sh:description */
  description: string;
  /** sh:path (prefixed, e.g. "dct:title") */
  path: string;
  /** sh:nodeKind */
  nodeKind: string | null;
  /** sh:datatype */
  datatype: string | null;
  /** sh:class */
  class: string | null;
  /** sh:node — links to another NodeShape (the basis for shape-graph edges) */
  node: string | null;
  /** sh:minCount */
  minCount: number | null;
  /** sh:maxCount (null = unbounded → omit) */
  maxCount: number | null;
  /** sh:minLength */
  minLength: number | null;
  /** sh:maxLength */
  maxLength: number | null;
  /** Numeric value range: sh:minInclusive / sh:minExclusive / sh:maxInclusive / sh:maxExclusive */
  minInclusive?: number | null;
  minExclusive?: number | null;
  maxInclusive?: number | null;
  maxExclusive?: number | null;
  /** sh:pattern (regex; omitted when empty) */
  pattern: string;
  /** sh:defaultValue (omitted when empty) */
  defaultValue: string;
  /** sh:in ( … ) — list of literal options (null/empty = omit) */
  inValues: string[] | null;
  /** sh:order — null when the property carried none (so round-trip stays exact) */
  order: number | null;
  /**
   * Unmodeled predicates on this property shape (e.g. `sh:or`, `sh:hasValue`),
   * as Turtle fragments re-emitted inside the `sh:property [ … ]` block.
   */
  residual?: string[];
}
