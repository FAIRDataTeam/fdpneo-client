/**
 * Tiny serialize/parse for a managed license document (Phase 5, task 5.4).
 *
 * A license is descriptive, not an ODRL policy: `dct:title` (required) plus an
 * optional canonical IRI `dct:source` and `dct:description`. No `rdf:type` — the
 * server injects `fdp:ManagedLicense` at validation time. Far simpler than the
 * Offer model, so this stays a couple of pure functions.
 */

import { one, parseTurtle } from "@/api/rdf";
import { quoteLiteral as quote } from "@/rdf/turtle";

const DCT = "http://purl.org/dc/terms/";

export interface LicenseFields {
  title: string;
  source: string;
  description: string;
}

const subject = (iri: string): string => (/^https?:\/\//.test(iri) ? `<${iri}>` : iri || "<>");

export function serializeLicense(iri: string, f: LicenseFields): string {
  const stmts = [`dct:title ${quote(f.title)}`];
  if (f.source.trim()) stmts.push(`dct:source <${f.source.trim()}>`);
  if (f.description.trim()) stmts.push(`dct:description ${quote(f.description)}`);
  const lines = [`@prefix dct: <${DCT}> .`, "", subject(iri)];
  stmts.forEach((s, i) => lines.push(`  ${s}${i === stmts.length - 1 ? " ." : " ;"}`));
  return lines.join("\n");
}

export function parseLicense(turtle: string, iri: string): LicenseFields {
  const store = parseTurtle(turtle);
  return {
    title: one(store, iri, `${DCT}title`) ?? "",
    source: one(store, iri, `${DCT}source`) ?? "",
    description: one(store, iri, `${DCT}description`) ?? "",
  };
}
