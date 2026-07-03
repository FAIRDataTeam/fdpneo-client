/**
 * Plain-language summary of an ODRL Offer — the data behind the record detail's
 * "Access — in effect" card.
 *
 * Pure and framework-free (unit-testable). Reuses the ODRL editor's vocabulary
 * (`ACTION_LABELS`, `LEFT_OPERANDS`) so the wording tracks the profile the
 * composer authors against. The card renders the structured result; only the
 * surrounding chrome ("Allow"/"Forbid", "Deny wins", …) is translated — action
 * and operand terms come from the ODRL vocab, matching the composer surfaces.
 */

import { shortLabel } from "@/api/rdf";
import type { OfferModel, Constraint } from "@/components/odrl-editor/model";
import { ACTION_LABELS, LEFT_OPERAND_BY_ID } from "@/components/odrl-editor/vocab";

export interface AccessLine {
  kind: "permission" | "prohibition";
  /** bare action, e.g. "read" */
  action: string;
  /** display label, e.g. "Read" */
  actionLabel: string;
  /** plain-language conditions, e.g. ["Role is steward"] */
  conditions: string[];
}

export interface AccessSummary {
  lines: AccessLine[];
  /** conflict resolution is deny-wins (the profile default, or explicit odrl:deny) */
  denyWins: boolean;
  /** the offer grants/forbids nothing (no rules) */
  open: boolean;
}

// Operator → human phrasing. Membership operands only use eq/neq; dateTime uses
// the comparisons.
const OP_PHRASE: Record<string, string> = {
  "odrl:eq": "is",
  "odrl:neq": "is not",
  "odrl:lt": "before",
  "odrl:lteq": "on or before",
  "odrl:gt": "after",
  "odrl:gteq": "on or after",
};

function conditionText(c: Constraint): string {
  const operand = LEFT_OPERAND_BY_ID[c.leftOperand];
  // Drop the parenthetical qualifier ("Party (assignee)" → "Party").
  const label = (operand?.label ?? c.leftOperand).replace(/\s*\(.*\)\s*/, "");
  const op = OP_PHRASE[c.operator] ?? c.operator;
  const raw = c.rightOperand.replace(/^<|>$/g, "");
  const value = c.rightIsIri ? shortLabel(raw) : raw;
  return `${label} ${op} ${value}`.trim();
}

export function summariseOffer(model: OfferModel): AccessSummary {
  const lines: AccessLine[] = model.rules.map((r) => ({
    kind: r.kind,
    action: r.action.replace(/^odrl:/, ""),
    actionLabel: ACTION_LABELS[r.action] ?? r.action.replace(/^odrl:/, ""),
    conditions: r.constraints.map(conditionText),
  }));
  return {
    lines,
    denyWins: model.conflict === null || model.conflict === "odrl:deny",
    open: lines.length === 0,
  };
}
