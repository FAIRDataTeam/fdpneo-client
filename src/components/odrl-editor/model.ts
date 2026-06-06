/**
 * Shared editor model for the ODRL Offer composer (Phase 5, task 5.0).
 *
 * One `OfferModel` is the source of truth behind the composer and the live
 * Turtle preview. Mirrors the FDP ODRL profile (ADR-0006): an `odrl:Offer` with
 * permission/prohibition rules, each an action plus optional constraints.
 * `id` fields are client-only (selection/keying) and are NOT serialized.
 */

import type { PrefixDecl } from "@/rdf/namespaces";

export interface OfferModel {
  /** the Offer's IRI — prefixed (":myPolicy") or full ("<https://…>") */
  iri: string;
  /** odrl:assigner (the granting party), or null */
  assigner: string | null;
  /** odrl:conflict strategy ("odrl:deny" | "odrl:perm" | "odrl:invalid"); null = profile default */
  conflict: string | null;
  rules: Rule[];
  /** declared `@prefix` set, for round-tripping custom prefixes */
  prefixes: PrefixDecl[];
}

export interface Rule {
  /** client-only id */
  id: string;
  kind: "permission" | "prohibition";
  /** odrl:action, e.g. "odrl:read" */
  action: string;
  constraints: Constraint[];
}

export interface Constraint {
  /** client-only id */
  id: string;
  /** odrl:leftOperand — "odrl:assignee" | "fdp-pol:role" | "fdp-pol:group" | "odrl:dateTime" */
  leftOperand: string;
  /** odrl:operator, e.g. "odrl:eq" */
  operator: string;
  /** odrl:rightOperand value — an IRI (prefixed/full) or a literal lexical form */
  rightOperand: string;
  /** whether `rightOperand` is an IRI (vs a literal); set the serialized form */
  rightIsIri: boolean;
}
