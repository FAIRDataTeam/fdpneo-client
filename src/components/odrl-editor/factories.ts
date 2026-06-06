/**
 * Model factories for the ODRL composer (Phase 5, task 5.1): fresh offers,
 * rules, and constraints with profile-valid defaults and client-only ids.
 */

import type { Constraint, OfferModel, Rule } from "./model";
import { LEFT_OPERAND_BY_ID } from "./vocab";

let counter = 0;
export const genId = (kind: string): string => `${kind}-${++counter}`;

/** A constraint seeded for a left-operand: its first allowed operator + right-kind. */
export function newConstraint(leftOperand = "fdp-pol:role"): Constraint {
  const def = LEFT_OPERAND_BY_ID[leftOperand];
  return {
    id: genId("c"),
    leftOperand,
    operator: def?.operators[0] ?? "odrl:eq",
    rightOperand: "",
    rightIsIri: def?.rightKind === "iri",
  };
}

export function newRule(kind: Rule["kind"], action = "odrl:read"): Rule {
  return { id: genId("r"), kind, action, constraints: [] };
}

export function newOffer(): OfferModel {
  return { iri: ":NewPolicy", assigner: null, conflict: null, rules: [], prefixes: [] };
}
