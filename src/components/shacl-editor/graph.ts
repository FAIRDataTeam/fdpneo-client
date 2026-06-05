/**
 * Shape-graph derivation for the Vue Flow overview (Phase 4, task 4.1).
 *
 * Pure model → graph: each `sh:NodeShape` becomes a node; a property links two
 * shapes when its `sh:node` points at another shape's IRI, or its `sh:class`
 * points at another shape's `sh:targetClass`. Self-references are dropped.
 * Node positions are deliberately NOT here — they are UI-only state owned by
 * the `shaclEditor` store, so this stays a deterministic, testable function.
 */

import type { SchemaDocument } from "./model";

export interface ShapeNode {
  /** shape.id — stable key shared with the model */
  id: string;
  shapeIri: string;
  label: string;
  targetClass: string;
  propertyCount: number;
}

export interface ShapeEdge {
  id: string;
  /** source/target are shape ids */
  source: string;
  target: string;
  /** the property (path or name) that creates the link */
  via: string;
  /** which term produced the edge */
  kind: "node" | "class";
}

export interface ShapeGraph {
  nodes: ShapeNode[];
  edges: ShapeEdge[];
}

export function buildShapeGraph(doc: SchemaDocument): ShapeGraph {
  const nodes: ShapeNode[] = doc.shapes.map((s) => ({
    id: s.id,
    shapeIri: s.shapeIri,
    label: s.label,
    targetClass: s.targetClass,
    propertyCount: s.groups.reduce((n, g) => n + g.fields.length, 0),
  }));

  // Resolve a shape link target to a shape id, preferring sh:node (by IRI),
  // falling back to sh:class (by target class). First match wins.
  const byIri = new Map<string, string>();
  const byClass = new Map<string, string>();
  for (const s of doc.shapes) {
    if (s.shapeIri && !byIri.has(s.shapeIri)) byIri.set(s.shapeIri, s.id);
    if (s.targetClass && !byClass.has(s.targetClass)) byClass.set(s.targetClass, s.id);
  }

  const edges: ShapeEdge[] = [];
  const seen = new Set<string>();
  for (const s of doc.shapes) {
    for (const g of s.groups) {
      for (const f of g.fields) {
        let target: string | undefined;
        let kind: ShapeEdge["kind"] = "node";
        if (f.node && byIri.has(f.node)) {
          target = byIri.get(f.node);
          kind = "node";
        } else if (f.class && byClass.has(f.class)) {
          target = byClass.get(f.class);
          kind = "class";
        }
        if (!target || target === s.id) continue;
        const id = `${s.id}->${target}:${f.id}`;
        if (seen.has(id)) continue;
        seen.add(id);
        edges.push({ id, source: s.id, target, via: f.path || f.name, kind });
      }
    }
  }

  return { nodes, edges };
}
