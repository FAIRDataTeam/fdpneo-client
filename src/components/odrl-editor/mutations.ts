/**
 * Pure model mutations for the ODRL composer (Phase 5, task 5.1).
 *
 * Each returns a NEW `OfferModel` (JSON deep-clone — callers pass a Vue reactive
 * proxy, which `structuredClone` refuses; the offer is fully JSON-safe). The
 * composer emits the result and the view re-serialises to the live preview.
 */

import { genId, newConstraint, newRule } from "./factories";
import type { Constraint, OfferModel, Rule } from "./model";

function clone(o: OfferModel): OfferModel {
  return JSON.parse(JSON.stringify(o)) as OfferModel;
}

export function updateOffer(
  o: OfferModel,
  patch: Partial<Pick<OfferModel, "iri" | "assigner" | "conflict">>,
): OfferModel {
  return Object.assign(clone(o), patch);
}

export function addRule(o: OfferModel, kind: Rule["kind"]): OfferModel {
  const next = clone(o);
  next.rules.push(newRule(kind));
  return next;
}

export function deleteRule(o: OfferModel, ruleId: string): OfferModel {
  const next = clone(o);
  next.rules = next.rules.filter((r) => r.id !== ruleId);
  return next;
}

export function updateRule(o: OfferModel, ruleId: string, patch: Partial<Pick<Rule, "kind" | "action">>): OfferModel {
  const next = clone(o);
  const r = next.rules.find((x) => x.id === ruleId);
  if (r) Object.assign(r, patch);
  return next;
}

export function addConstraint(o: OfferModel, ruleId: string, leftOperand?: string): OfferModel {
  const next = clone(o);
  next.rules.find((r) => r.id === ruleId)?.constraints.push(newConstraint(leftOperand));
  return next;
}

export function deleteConstraint(o: OfferModel, ruleId: string, constraintId: string): OfferModel {
  const next = clone(o);
  const r = next.rules.find((x) => x.id === ruleId);
  if (r) r.constraints = r.constraints.filter((c) => c.id !== constraintId);
  return next;
}

export function updateConstraint(
  o: OfferModel,
  ruleId: string,
  constraintId: string,
  patch: Partial<Omit<Constraint, "id">>,
): OfferModel {
  const next = clone(o);
  const c = next.rules.find((r) => r.id === ruleId)?.constraints.find((x) => x.id === constraintId);
  if (c) Object.assign(c, patch);
  return next;
}

/** A fresh client id (re-exported so the composer can mint without importing factories). */
export { genId };
