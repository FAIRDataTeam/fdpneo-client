/**
 * FDP ODRL profile vocabulary (Phase 5, task 5.0).
 *
 * The closed sets from server ADR-0006 (`server/src/fdp/policy/model.py` +
 * `parser.py`), hardcoded by decision: the profile is a small, stable subset
 * and the server validates against it on write, so the client mirrors it for
 * guidance but isn't the authority. Out-of-profile constructs are simply not
 * offered by the composer.
 */

import { NAMESPACES, type PrefixDecl } from "@/rdf/namespaces";

export const ODRL_NS = "http://www.w3.org/ns/odrl/2/";
export const FDP_POL_NS = "https://specs.fairdatapoint.org/odrl-profile#";

/** Rule actions (only these four). */
export const ACTIONS = ["odrl:read", "odrl:modify", "odrl:delete", "odrl:distribute"] as const;
export const ACTION_LABELS: Record<string, string> = {
  "odrl:read": "Read",
  "odrl:modify": "Modify",
  "odrl:delete": "Delete",
  "odrl:distribute": "Distribute",
};

/** Comparison operators; membership operands (party/role/group) allow only eq/neq. */
export const OPERATORS = ["odrl:eq", "odrl:neq", "odrl:lt", "odrl:gt", "odrl:lteq", "odrl:gteq"] as const;
export const MEMBERSHIP_OPERATORS = ["odrl:eq", "odrl:neq"] as const;

export type RightKind = "iri" | "literal" | "datetime";

export interface LeftOperandDef {
  id: string;
  label: string;
  /** How the `odrl:rightOperand` is written/read. */
  rightKind: RightKind;
  /** Operators the FDP profile accepts for this operand. */
  operators: readonly string[];
}

export const LEFT_OPERANDS: LeftOperandDef[] = [
  { id: "odrl:assignee", label: "Party (assignee)", rightKind: "iri", operators: MEMBERSHIP_OPERATORS },
  { id: "fdp-pol:role", label: "Role", rightKind: "literal", operators: MEMBERSHIP_OPERATORS },
  { id: "fdp-pol:group", label: "Group / organization", rightKind: "literal", operators: MEMBERSHIP_OPERATORS },
  { id: "odrl:dateTime", label: "Time", rightKind: "datetime", operators: OPERATORS },
];

export const LEFT_OPERAND_BY_ID: Record<string, LeftOperandDef> = Object.fromEntries(
  LEFT_OPERANDS.map((l) => [l.id, l]),
);

/** Conflict strategies; `odrl:deny` (deny-wins) is the FDP default. */
export const CONFLICT_STRATEGIES = [
  { id: "odrl:deny", label: "Deny wins (default)" },
  { id: "odrl:perm", label: "Permission wins" },
  { id: "odrl:invalid", label: "Invalid on conflict" },
] as const;

/** Prefixes the serializer always declares (the profile's own vocabulary). */
export const ODRL_PREFIXES: PrefixDecl[] = [
  { prefix: "odrl", uri: ODRL_NS },
  { prefix: "fdp-pol", uri: FDP_POL_NS },
  { prefix: "xsd", uri: NAMESPACES.xsd },
];
