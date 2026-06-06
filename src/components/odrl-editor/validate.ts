/**
 * Client-side FDP ODRL profile checks (Phase 5, task 5.1).
 *
 * Fast inline guidance mirroring the server `policy/parser.py`. The composer is
 * structurally unable to emit most out-of-profile constructs; this catches the
 * gaps (missing values, operand/operator mismatches). The server `validate`
 * endpoint remains the authority — surface its violations too.
 */

import type { OfferModel } from "./model";
import { ACTIONS, LEFT_OPERAND_BY_ID } from "./vocab";

export interface OfferIssue {
  level: "error" | "warning";
  message: string;
  ruleId?: string;
  constraintId?: string;
}

const ACTION_SET = new Set<string>(ACTIONS);

export function validateOffer(offer: OfferModel): OfferIssue[] {
  const issues: OfferIssue[] = [];

  if (!offer.iri.trim()) issues.push({ level: "error", message: "The policy needs an id." });
  if (offer.rules.length === 0) {
    issues.push({ level: "warning", message: "This offer grants nothing — add a permission or prohibition." });
  }

  for (const rule of offer.rules) {
    if (!ACTION_SET.has(rule.action)) {
      issues.push({ level: "error", message: `Unsupported action ${rule.action || "(none)"}.`, ruleId: rule.id });
    }
    for (const c of rule.constraints) {
      const def = LEFT_OPERAND_BY_ID[c.leftOperand];
      if (!def) {
        issues.push({ level: "error", message: `Unsupported left operand ${c.leftOperand || "(none)"}.`, ruleId: rule.id, constraintId: c.id });
        continue;
      }
      if (!def.operators.includes(c.operator)) {
        issues.push({
          level: "error",
          message: `${def.label} supports only ${def.operators.map((o) => o.replace("odrl:", "")).join("/")}.`,
          ruleId: rule.id,
          constraintId: c.id,
        });
      }
      if (!c.rightOperand.trim()) {
        issues.push({ level: "error", message: `${def.label} needs a value.`, ruleId: rule.id, constraintId: c.id });
      } else if (def.rightKind === "iri" && !c.rightIsIri) {
        issues.push({ level: "error", message: `${def.label} must be an IRI.`, ruleId: rule.id, constraintId: c.id });
      }
    }
  }
  return issues;
}

/** True when there are no error-level issues (warnings are allowed). */
export function offerIsValid(offer: OfferModel): boolean {
  return !validateOffer(offer).some((i) => i.level === "error");
}
