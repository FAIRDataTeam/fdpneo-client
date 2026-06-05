/**
 * Live parse status for the SHACL source editor (Phase 4, task 4.3).
 *
 * A pure, non-destructive read over the current Turtle: does it parse, and how
 * many shapes / properties does the editor model recognise? Drives the status
 * pill and error strip. Counts reflect the *recognised* subset (the parser is
 * lossless for that subset; full pass-through is still 4.3 work), so they are an
 * indicator, not an authority on the document's full contents.
 */

import { Parser, Writer } from "n3";
import { NAMESPACES } from "@/rdf/namespaces";
import { parseSchema } from "./parse";

/**
 * Lossless "Tidy": pretty-print the Turtle via n3 (every triple preserved),
 * not via the editor model — model reserialisation would drop SHACL features
 * the model doesn't capture. Declared prefixes are kept; the standard SHACL/
 * DASH families are ensured so terms stay compact. Rejects on invalid Turtle.
 */
export function tidyTurtle(turtle: string): Promise<string> {
  return new Promise((resolve, reject) => {
    let quads;
    try {
      quads = new Parser().parse(turtle); // synchronous; throws on invalid
    } catch (e) {
      reject(e instanceof Error ? e : new Error(String(e)));
      return;
    }
    const prefixes: Record<string, string> = {
      sh: NAMESPACES.sh, dash: NAMESPACES.dash, rdf: NAMESPACES.rdf,
      rdfs: NAMESPACES.rdfs, xsd: NAMESPACES.xsd, dcat: NAMESPACES.dcat,
      dct: NAMESPACES.dct, foaf: NAMESPACES.foaf,
    };
    const declRe = /@prefix\s+([\w-]*):\s*<([^>]*)>\s*\./g;
    for (let m = declRe.exec(turtle); m !== null; m = declRe.exec(turtle)) {
      const [, prefix, uri] = m;
      if (prefix && uri) prefixes[prefix] = uri;
    }
    const writer = new Writer({ prefixes });
    writer.addQuads(quads);
    writer.end((err, result) => (err ? reject(err) : resolve(result)));
  });
}

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
