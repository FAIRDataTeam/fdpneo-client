/**
 * Parser: Turtle → ODRL Offer model (Phase 5, task 5.0) — the inverse of
 * `serialize.ts`. n3-based. Reads the single
 * `odrl:Offer`, its assigner/conflict, and its permission/prohibition rules
 * with constraints, re-compacting IRIs to prefixed names. Lossless for the FDP
 * profile (the only shape `/policies` accepts).
 */

import { DataFactory, Parser, Store, type Term } from "n3";
import { DEFAULT_URI, type PrefixDecl } from "@/rdf/namespaces";
import type { Constraint, OfferModel, Rule } from "./model";
import { ODRL_NS, ODRL_PREFIXES } from "./vocab";

const namedNode = (iri: string) => DataFactory.namedNode(iri);
const RDF_TYPE = "http://www.w3.org/1999/02/22-rdf-syntax-ns#type";

export class OdrlParseError extends Error {}

function makeCompactor(prefixes: PrefixDecl[]): (iri: string) => string {
  const entries: [string, string][] = [
    ["", DEFAULT_URI],
    ...prefixes.map((p) => [p.prefix, p.uri] as [string, string]),
    ...ODRL_PREFIXES.map((p) => [p.prefix, p.uri] as [string, string]),
  ];
  entries.sort((a, b) => b[1].length - a[1].length);
  return (iri: string): string => {
    for (const [prefix, uri] of entries) if (iri.startsWith(uri)) return `${prefix}:${iri.slice(uri.length)}`;
    return iri;
  };
}

let counter = 0;
const nextId = (kind: string): string => `${kind}${++counter}`;

export function parseOffer(turtle: string): OfferModel {
  const store = new Store();
  try {
    store.addQuads(new Parser().parse(turtle));
  } catch (e) {
    throw new OdrlParseError(e instanceof Error ? e.message : String(e));
  }

  const prefixes: PrefixDecl[] = [];
  const declRe = /@prefix\s+([\w-]*):\s*<([^>]*)>\s*\./g;
  for (let m = declRe.exec(turtle); m !== null; m = declRe.exec(turtle)) {
    const [, prefix, uri] = m;
    if (prefix && uri && uri !== DEFAULT_URI) prefixes.push({ prefix, uri });
  }
  const compact = makeCompactor(prefixes);

  const odrl = (local: string) => namedNode(`${ODRL_NS}${local}`);
  const obj = (s: Term, p: Term): Term | undefined => store.getObjects(s, p, null)[0];

  const offerSubject = store.getSubjects(namedNode(RDF_TYPE), odrl("Offer"), null)[0];
  if (!offerSubject) {
    return { iri: "", assigner: null, conflict: null, rules: [], prefixes };
  }

  const readConstraint = (c: Term): Constraint => {
    const right = obj(c, odrl("rightOperand"));
    const isIri = right?.termType === "NamedNode";
    return {
      id: nextId("c"),
      leftOperand: compact(obj(c, odrl("leftOperand"))?.value ?? ""),
      operator: compact(obj(c, odrl("operator"))?.value ?? ""),
      rightOperand: right ? (isIri ? compact(right.value) : right.value) : "",
      rightIsIri: isIri,
    };
  };

  const readRules = (kind: Rule["kind"], pred: Term): Rule[] =>
    store.getObjects(offerSubject, pred, null).map((r) => ({
      id: nextId("r"),
      kind,
      action: compact(obj(r, odrl("action"))?.value ?? ""),
      constraints: store.getObjects(r, odrl("constraint"), null).map(readConstraint),
    }));

  const assigner = obj(offerSubject, odrl("assigner"));
  const conflict = obj(offerSubject, odrl("conflict"));

  return {
    iri: compact(offerSubject.value),
    assigner: assigner ? compact(assigner.value) : null,
    conflict: conflict ? compact(conflict.value) : null,
    rules: [...readRules("permission", odrl("permission")), ...readRules("prohibition", odrl("prohibition"))],
    prefixes,
  };
}
