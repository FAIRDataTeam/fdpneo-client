/**
 * Model factories for the visual editor (Phase 4, task 4.0 → 4.2).
 *
 * Build fresh model nodes with stable client-only ids: a `Field` from a palette
 * widget's defaults (auto name + `:lowercasename` path, per the handoff
 * drag-and-drop spec), an empty `Group`, and an empty single-shape document.
 * These back the palette-drop, "Add group", and "new schema" actions.
 */

import { PREFIXES } from "@/rdf/namespaces";
import type { Field, Group, SchemaDocument, ShapeModel } from "./model";
import { WIDGET_BY_ID } from "./widgets";

let counter = 0;
const nextId = (kind: string): string => `${kind}-${++counter}`;

/** A `:`-prefixed path derived from a label, e.g. "Text field" → ":textfield". */
export function autoPath(name: string): string {
  const slug = name.replace(/[^A-Za-z0-9]+/g, "").toLowerCase();
  return `:${slug || "field"}`;
}

/** A new field seeded from a palette widget's defaults. */
export function newField(widgetId: string, order = 0): Field {
  const widget = WIDGET_BY_ID[widgetId];
  const name = widget?.name ?? "Field";
  return {
    id: nextId("f"),
    widgetId,
    editor: widget?.editor ?? null,
    name,
    description: "",
    path: autoPath(name),
    nodeKind: widget?.defaults.nodeKind ?? null,
    datatype: widget?.defaults.datatype ?? null,
    class: widget?.defaults.class ?? null,
    node: null,
    minCount: null,
    maxCount: null,
    minLength: null,
    maxLength: null,
    pattern: "",
    defaultValue: "",
    inValues: widget?.defaults.inValues ? [...widget.defaults.inValues] : null,
    order,
  };
}

/** A new, empty property group. */
export function newGroup(label = "New group", order = 0): Group {
  return { id: nextId("g"), label, order, fields: [] };
}

/** A new single-shape schema with the default prefix set and one empty group. */
export function emptyDocument(): SchemaDocument {
  const shape: ShapeModel = {
    id: nextId("s"),
    shapeIri: ":NewShape",
    label: "New schema",
    comment: "",
    targetClass: "",
    groups: [newGroup("General information", 0)],
  };
  return { prefixes: PREFIXES.map((p) => ({ ...p })), shapes: [shape] };
}
