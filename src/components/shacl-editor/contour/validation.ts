// Adapted from Contour (sibling repo) @ 4117ff2 — SHACL engine ported into the FDP client.
// First-class client code (held to the full strict config); Contour remains a separate project.
// Live schema linter — pure model analysis surfaced in the editor so a steward
// can't silently produce broken or invalid SHACL. Returns issues with enough
// targeting info for the UI to focus the offending element.
import type { Field, Schema } from './types';

export type IssueSeverity = 'error' | 'warning';

export interface Issue {
  severity: IssueSeverity;
  message: string;
  kind: 'schema' | 'field' | 'group' | 'nested-shape' | 'nested-field';
  id: string | null; // field / group / shape id (null → schema)
  nestedShapeId?: string | null;
}

// The prefix part of a CURIE, or null when the term is absent, an absolute IRI,
// or a non-CURIE token (e.g. `a`). The empty prefix (`:local`) returns ''.
function curiePrefix(term: string | null | undefined): string | null {
  if (!term) return null;
  if (term.startsWith('<')) return null; // absolute IRI
  const c = term.indexOf(':');
  if (c < 0) return null;
  return term.slice(0, c);
}

const groupIri = (g: Schema['groups'][number]) =>
  g.iri || `:${(g.label || 'group').replace(/\s+/g, '')}Group`;

export function validateSchema(schema: Schema): Issue[] {
  const issues: Issue[] = [];
  const declared = new Set((schema.prefixes || []).map((p) => p.prefix));

  const checkPrefix = (
    term: string | null | undefined,
    label: string,
    base: Omit<Issue, 'severity' | 'message'>,
  ) => {
    const pfx = curiePrefix(term);
    if (pfx !== null && !declared.has(pfx)) {
      issues.push({
        severity: 'warning',
        message: `${label} uses undeclared prefix "${pfx}:" — add it under Vocabularies.`,
        ...base,
      });
    }
  };

  // ── Schema-level ──────────────────────────────────────────────────────────
  if (!schema.schemaName.trim()) {
    issues.push({ severity: 'warning', message: 'Schema has no name (rdfs:label).', kind: 'schema', id: null });
  }
  if (!schema.targetClass.trim()) {
    issues.push({ severity: 'warning', message: 'Schema has no target class (sh:targetClass).', kind: 'schema', id: null });
  } else {
    checkPrefix(schema.targetClass, 'Target class', { kind: 'schema', id: null });
  }

  // Group-IRI collisions (IRI is derived from the label).
  const groupIris = new Map<string, number>();
  for (const g of schema.groups) {
    const iri = groupIri(g);
    groupIris.set(iri, (groupIris.get(iri) ?? 0) + 1);
  }
  for (const g of schema.groups) {
    if ((groupIris.get(groupIri(g)) ?? 0) > 1) {
      issues.push({
        severity: 'warning',
        message: `Group label "${g.label}" collides with another group (same generated IRI).`,
        kind: 'group',
        id: g.id,
      });
    }
  }

  const nestedIris = new Set((schema.nestedShapes || []).map((ns) => ns.iri));

  // ── Field checks (shared by main + nested) ─────────────────────────────────
  const checkField = (
    f: Field,
    base: Omit<Issue, 'severity' | 'message'>,
  ) => {
    if (!f.path.trim()) {
      issues.push({ severity: 'error', message: `Property "${f.name || '(unnamed)'}" has no path (sh:path).`, ...base });
    } else {
      checkPrefix(f.path, 'Property path', base);
    }
    if (f.class) checkPrefix(f.class, 'Class', base);
    if (f.datatype) checkPrefix(f.datatype, 'Datatype', base);
    if (f.widgetId === 'DetailsEditor') {
      if (!f.node) {
        issues.push({ severity: 'error', message: `"${f.name || '(unnamed)'}" (Details) references no nested shape (sh:node).`, ...base });
      } else if (!nestedIris.has(f.node)) {
        issues.push({ severity: 'error', message: `"${f.name || '(unnamed)'}" references missing nested shape ${f.node}.`, ...base });
      }
    }
  };

  for (const g of schema.groups) {
    const seenPaths = new Map<string, number>();
    for (const f of g.fields) {
      if (f.path.trim()) seenPaths.set(f.path, (seenPaths.get(f.path) ?? 0) + 1);
    }
    for (const f of g.fields) {
      checkField(f, { kind: 'field', id: f.id });
      if (f.path.trim() && (seenPaths.get(f.path) ?? 0) > 1) {
        issues.push({
          severity: 'warning',
          message: `Duplicate path ${f.path} in group "${g.label}".`,
          kind: 'field',
          id: f.id,
        });
      }
    }
  }

  // ── Nested shapes ───────────────────────────────────────────────────────────
  const seenNs = new Map<string, number>();
  for (const ns of schema.nestedShapes || []) {
    if (ns.iri.trim()) seenNs.set(ns.iri, (seenNs.get(ns.iri) ?? 0) + 1);
  }
  for (const ns of schema.nestedShapes || []) {
    if (!ns.iri.trim()) {
      issues.push({ severity: 'error', message: 'Nested shape has no IRI.', kind: 'nested-shape', id: ns.id, nestedShapeId: ns.id });
    } else if ((seenNs.get(ns.iri) ?? 0) > 1) {
      issues.push({ severity: 'warning', message: `Duplicate nested shape IRI ${ns.iri}.`, kind: 'nested-shape', id: ns.id, nestedShapeId: ns.id });
    }
    if (ns.targetClass) checkPrefix(ns.targetClass, 'Nested target class', { kind: 'nested-shape', id: ns.id, nestedShapeId: ns.id });
    for (const f of ns.fields) {
      checkField(f, { kind: 'nested-field', id: f.id, nestedShapeId: ns.id });
    }
  }

  // Errors first, then warnings — most actionable at the top.
  return issues.sort((a, b) => (a.severity === b.severity ? 0 : a.severity === 'error' ? -1 : 1));
}