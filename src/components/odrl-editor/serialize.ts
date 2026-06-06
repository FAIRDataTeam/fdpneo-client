/**
 * Serializer: ODRL Offer model → Turtle (Phase 5, task 5.0).
 *
 * Hand-rolled and deterministic (like `shacl-editor/serialize.ts`) so the
 * round-trip is stable. Emits the FDP ODRL profile shape: an `odrl:Offer` with
 * `odrl:permission`/`odrl:prohibition` blank nodes, each an `odrl:action` and
 * inline `odrl:constraint [ … ]` nodes. Always declares the profile prefixes so
 * every term resolves; the body is what `PUT /policies/{id}` stores.
 */

import { DEFAULT_URI } from "@/rdf/namespaces";
import type { Constraint, OfferModel, Rule } from "./model";
import { LEFT_OPERAND_BY_ID, ODRL_PREFIXES } from "./vocab";

function quote(s: string): string {
  return `"${s.replace(/\\/g, "\\\\").replace(/"/g, '\\"').replace(/\n/g, "\\n")}"`;
}

/** A subject/object IRI: full IRIs get angle brackets, prefixed names stay bare. */
function emitIri(value: string): string {
  return /^https?:\/\//.test(value) ? `<${value}>` : value;
}

function emitRight(c: Constraint): string {
  if (c.rightIsIri) return emitIri(c.rightOperand);
  // dateTime operands carry the xsd:dateTime datatype; other literals are plain.
  if (LEFT_OPERAND_BY_ID[c.leftOperand]?.rightKind === "datetime") {
    return `${quote(c.rightOperand)}^^xsd:dateTime`;
  }
  return quote(c.rightOperand);
}

function constraintLine(c: Constraint): string {
  return `odrl:constraint [ odrl:leftOperand ${c.leftOperand} ; odrl:operator ${c.operator} ; odrl:rightOperand ${emitRight(c)} ]`;
}

/** The body lines of one permission/prohibition `[ … ]` node. */
function ruleLines(rule: Rule): string[] {
  const lines = [`a odrl:${rule.kind === "permission" ? "Permission" : "Prohibition"}`, `odrl:action ${rule.action}`];
  for (const c of rule.constraints) lines.push(constraintLine(c));
  return lines;
}

export function serializeOffer(offer: OfferModel): string {
  const out: string[] = [];

  // Declared prefixes first, then the profile's own (odrl/fdp-pol/xsd), then `:`.
  const declared = new Map(offer.prefixes.map((p) => [p.prefix, p.uri]));
  for (const r of ODRL_PREFIXES) if (!declared.has(r.prefix)) declared.set(r.prefix, r.uri);
  for (const [prefix, uri] of declared) out.push(`@prefix ${prefix}: <${uri}> .`);
  out.push(`@prefix : <${DEFAULT_URI}> .`);
  out.push("");

  // Header statements (before the rules), each `;`-terminated.
  out.push(`${emitIri(offer.iri || ":Offer")}`);
  out.push(`  a odrl:Offer ;`);
  if (offer.assigner) out.push(`  odrl:assigner ${emitIri(offer.assigner)} ;`);
  if (offer.conflict) out.push(`  odrl:conflict ${offer.conflict} ;`);

  if (offer.rules.length === 0) {
    // No rules: close the last header statement with '.'.
    const last = out.length - 1;
    out[last] = (out[last] ?? "").replace(/;$/, ".");
    return out.join("\n");
  }

  offer.rules.forEach((rule, idx) => {
    const isLast = idx === offer.rules.length - 1;
    const pred = rule.kind === "permission" ? "odrl:permission" : "odrl:prohibition";
    const lines = ruleLines(rule);
    out.push(`  ${pred} [`);
    lines.forEach((line, i) => {
      out.push(`    ${line}${i === lines.length - 1 ? "" : " ;"}`);
    });
    out.push(`  ]${isLast ? " ." : " ;"}`);
  });

  return out.join("\n");
}
