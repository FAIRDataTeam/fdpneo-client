/**
 * Live parse status for the SHACL source editor (Phase 4, task 4.3).
 *
 * A pure, non-destructive read over the current Turtle: does it parse, and how
 * many shapes / properties does the editor model recognise? Drives the status
 * pill and error strip. Counts reflect the *recognised* subset (the parser is
 * lossless for that subset; full pass-through is still 4.3 work), so they are an
 * indicator, not an authority on the document's full contents.
 */

import { parseSchema } from "./parse";

export interface ShaclStatus {
  ok: boolean;
  shapes: number;
  properties: number;
  error: string | null;
}

export function shaclStatus(turtle: string): ShaclStatus {
  if (!turtle.trim()) return { ok: true, shapes: 0, properties: 0, error: null };
  try {
    const doc = parseSchema(turtle);
    const properties = doc.shapes.reduce(
      (n, s) => n + s.groups.reduce((m, g) => m + g.fields.length, 0),
      0,
    );
    return { ok: true, shapes: doc.shapes.length, properties, error: null };
  } catch (e) {
    return { ok: false, shapes: 0, properties: 0, error: e instanceof Error ? e.message : String(e) };
  }
}
