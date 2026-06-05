/**
 * Pure model mutations for the form designer (Phase 4, task 4.2).
 *
 * Each function takes a `SchemaDocument` and returns a NEW one (via
 * `structuredClone`) with one edit applied — the handoff's `mutate(fn)` clone
 * approach. The view replaces its model with the result and re-serialises to
 * Turtle, so undo/redo (4.5) can just keep the returned snapshots. `sh:order`
 * is renumbered within any group whose membership changed. Unknown ids are
 * no-ops (return the input unchanged).
 */

import type { PrefixDecl } from "@/rdf/namespaces";
import { genId, newField, newGroup } from "./factories";
import type { Field, Group, SchemaDocument, ShapeModel } from "./model";

type ShapePatch = Partial<Pick<ShapeModel, "label" | "comment" | "targetClass" | "shapeIri">>;
type GroupPatch = Partial<Pick<Group, "label" | "order">>;
/** Any field property except its identity/widget binding. */
type FieldPatch = Partial<Omit<Field, "id">>;

// JSON deep-clone (not `structuredClone`): the doc is fully JSON-safe
// (strings/numbers/null/arrays only), and callers pass a Vue reactive proxy,
// which `structuredClone` refuses to clone. Reading via JSON yields a plain object.
function deepClone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function clone(doc: SchemaDocument): SchemaDocument {
  return deepClone(doc);
}

function renumber(group: Group): void {
  group.fields.forEach((f, i) => {
    f.order = i;
  });
}

/** Apply `fn` to the named shape on a fresh clone; return input unchanged if not found. */
function onShape(
  doc: SchemaDocument,
  shapeId: string,
  fn: (shape: ShapeModel) => void,
): SchemaDocument {
  const next = clone(doc);
  const shape = next.shapes.find((s) => s.id === shapeId);
  if (!shape) return doc;
  fn(shape);
  return next;
}

export function updateShape(doc: SchemaDocument, shapeId: string, patch: ShapePatch): SchemaDocument {
  return onShape(doc, shapeId, (s) => Object.assign(s, patch));
}

/** Replace the document's `@prefix` table (the Vocabularies editor). */
export function setPrefixes(doc: SchemaDocument, prefixes: PrefixDecl[]): SchemaDocument {
  const next = clone(doc);
  next.prefixes = prefixes.map((p) => ({ prefix: p.prefix, uri: p.uri }));
  return next;
}

export function addGroup(doc: SchemaDocument, shapeId: string, label = "New group"): SchemaDocument {
  return onShape(doc, shapeId, (s) => {
    s.groups.push(newGroup(label, s.groups.length));
  });
}

export function updateGroup(
  doc: SchemaDocument,
  shapeId: string,
  groupId: string,
  patch: GroupPatch,
): SchemaDocument {
  return onShape(doc, shapeId, (s) => {
    const g = s.groups.find((x) => x.id === groupId);
    if (g) Object.assign(g, patch);
  });
}

export function deleteGroup(doc: SchemaDocument, shapeId: string, groupId: string): SchemaDocument {
  return onShape(doc, shapeId, (s) => {
    s.groups = s.groups.filter((g) => g.id !== groupId);
    s.groups.forEach((g, i) => (g.order = i));
  });
}

export function addField(
  doc: SchemaDocument,
  shapeId: string,
  groupId: string,
  widgetId: string,
  index?: number,
): SchemaDocument {
  return onShape(doc, shapeId, (s) => {
    const g = s.groups.find((x) => x.id === groupId);
    if (!g) return;
    const at = index ?? g.fields.length;
    g.fields.splice(at, 0, newField(widgetId));
    renumber(g);
  });
}

export function updateField(
  doc: SchemaDocument,
  shapeId: string,
  fieldId: string,
  patch: FieldPatch,
): SchemaDocument {
  return onShape(doc, shapeId, (s) => {
    for (const g of s.groups) {
      const f = g.fields.find((x) => x.id === fieldId);
      if (f) {
        Object.assign(f, patch);
        return;
      }
    }
  });
}

export function deleteField(doc: SchemaDocument, shapeId: string, fieldId: string): SchemaDocument {
  return onShape(doc, shapeId, (s) => {
    for (const g of s.groups) {
      const before = g.fields.length;
      g.fields = g.fields.filter((f) => f.id !== fieldId);
      if (g.fields.length !== before) {
        renumber(g);
        return;
      }
    }
  });
}

export function duplicateField(doc: SchemaDocument, shapeId: string, fieldId: string): SchemaDocument {
  return onShape(doc, shapeId, (s) => {
    for (const g of s.groups) {
      const i = g.fields.findIndex((f) => f.id === fieldId);
      if (i === -1) continue;
      const src = g.fields[i];
      if (!src) return;
      const copy: Field = { ...deepClone(src), id: genId("f"), name: `${src.name} copy` };
      g.fields.splice(i + 1, 0, copy);
      renumber(g);
      return;
    }
  });
}

/**
 * Move a field to `toGroupId` at `index` (within the same shape), reordering or
 * crossing groups. Renumbers both the origin and destination groups.
 */
export function moveField(
  doc: SchemaDocument,
  shapeId: string,
  fieldId: string,
  toGroupId: string,
  index: number,
): SchemaDocument {
  return onShape(doc, shapeId, (s) => {
    const from = s.groups.find((g) => g.fields.some((f) => f.id === fieldId));
    const to = s.groups.find((g) => g.id === toGroupId);
    if (!from || !to) return;
    const i = from.fields.findIndex((f) => f.id === fieldId);
    const [field] = from.fields.splice(i, 1);
    if (!field) return;
    const at = Math.max(0, Math.min(index, to.fields.length));
    to.fields.splice(at, 0, field);
    renumber(from);
    if (to !== from) renumber(to);
  });
}
