/**
 * Shape-graph derivation for the Vue Flow overview (Phase 4, task 4.1).
 *
 * Pure model → graph: each `sh:NodeShape` becomes a node; a property links two
 * shapes when its `sh:node` points at another shape's IRI, or its `sh:class`
 * points at another shape's `sh:targetClass`. Self-references are dropped.
 *
 * Optionally seeded with the deployment's registered resource types
 * (`useResourceTypes`): a type whose class this schema has no shape for becomes
 * a **ghost** node — an "exists in the deployment, no shape here yet" hint. A
 * property's `sh:class` can also link to a ghost. Node positions live in the
 * `shaclEditor` store, keyed by `key`, so this stays a deterministic function.
 */

import type { SchemaDocument } from "./model";

/** A registered resource type, for ghost-node seeding. */
export interface ResourceTypeLike {
  classIri: string;
  label: string;
}

export interface ShapeNode {
  /** stable node id: the shape IRI, or `ghost:<classIri>` for an unshaped type */
  key: string;
  /** shape.id (real shapes); "" for ghosts */
  id: string;
  shapeIri: string;
  label: string;
  targetClass: string;
  propertyCount: number;
  /** a registered type with no shape in this schema */
  ghost: boolean;
}

export interface ShapeEdge {
  id: string;
  /** source/target are node keys */
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

const keyForShape = (id: string, shapeIri: string): string => shapeIri || `shape:${id}`;

export function buildShapeGraph(doc: SchemaDocument, types: ResourceTypeLike[] = []): ShapeGraph {
  const nodes: ShapeNode[] = doc.shapes.map((s) => ({
    key: keyForShape(s.id, s.shapeIri),
    id: s.id,
    shapeIri: s.shapeIri,
    label: s.label,
    targetClass: s.targetClass,
    propertyCount: s.groups.reduce((n, g) => n + g.fields.length, 0),
    ghost: false,
  }));

  // Ghost nodes: registered types whose class no shape in this schema targets.
  const covered = new Set(doc.shapes.map((s) => s.targetClass).filter(Boolean));
  const ghosted = new Set<string>();
  for (const t of types) {
    if (!t.classIri || covered.has(t.classIri) || ghosted.has(t.classIri)) continue;
    ghosted.add(t.classIri);
    nodes.push({
      key: `ghost:${t.classIri}`,
      id: "",
      shapeIri: "",
      label: t.label,
      targetClass: t.classIri,
      propertyCount: 0,
      ghost: true,
    });
  }

  // Resolve a link target to a node key: sh:node by shape IRI, sh:class by
  // target class (real shapes first, then ghosts). First match wins.
  const byIri = new Map<string, string>();
  const byClass = new Map<string, string>();
  for (const n of nodes) {
    if (n.shapeIri && !byIri.has(n.shapeIri)) byIri.set(n.shapeIri, n.key);
    if (n.targetClass && !byClass.has(n.targetClass)) byClass.set(n.targetClass, n.key);
  }

  const edges: ShapeEdge[] = [];
  const seen = new Set<string>();
  for (const s of doc.shapes) {
    const source = keyForShape(s.id, s.shapeIri);
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
        if (!target || target === source) continue;
        const id = `${source}->${target}:${f.id}`;
        if (seen.has(id)) continue;
        seen.add(id);
        edges.push({ id, source, target, via: f.path || f.name, kind });
      }
    }
  }

  return { nodes, edges };
}
