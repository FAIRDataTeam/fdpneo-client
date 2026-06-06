import { describe, expect, it } from "vitest";
import { newConstraint, newOffer } from "./factories";
import {
  addConstraint,
  addRule,
  deleteConstraint,
  deleteRule,
  updateConstraint,
  updateOffer,
  updateRule,
} from "./mutations";
import { offerIsValid, validateOffer } from "./validate";
import { serializeOffer } from "./serialize";
import { parseOffer } from "./parse";

describe("factories", () => {
  it("seeds a constraint with the operand's first operator + right-kind", () => {
    expect(newConstraint("fdp-pol:role")).toMatchObject({ operator: "odrl:eq", rightIsIri: false });
    expect(newConstraint("odrl:assignee")).toMatchObject({ operator: "odrl:eq", rightIsIri: true });
  });
});

describe("mutations (immutable, JSON-cloned)", () => {
  it("add/update/delete rules and constraints return new offers", () => {
    const o0 = newOffer();
    const o1 = addRule(o0, "permission");
    expect(o0.rules).toHaveLength(0); // input untouched
    expect(o1.rules).toHaveLength(1);

    const rid = o1.rules[0]!.id;
    const o2 = updateRule(o1, rid, { action: "odrl:modify" });
    expect(o2.rules[0]?.action).toBe("odrl:modify");

    const o3 = addConstraint(o2, rid, "fdp-pol:role");
    expect(o3.rules[0]?.constraints).toHaveLength(1);
    const cid = o3.rules[0]!.constraints[0]!.id;
    const o4 = updateConstraint(o3, rid, cid, { rightOperand: "steward" });
    expect(o4.rules[0]?.constraints[0]?.rightOperand).toBe("steward");

    const o5 = deleteConstraint(o4, rid, cid);
    expect(o5.rules[0]?.constraints).toHaveLength(0);
    expect(deleteRule(o5, rid).rules).toHaveLength(0);
  });

  it("updateOffer patches offer-level fields", () => {
    const o = updateOffer(newOffer(), { conflict: "odrl:deny", assigner: ":cat" });
    expect(o).toMatchObject({ conflict: "odrl:deny", assigner: ":cat" });
  });
});

describe("validateOffer", () => {
  it("flags a missing constraint value and accepts a complete one", () => {
    let o = addRule(newOffer(), "permission");
    const rid = o.rules[0]!.id;
    o = addConstraint(o, rid, "fdp-pol:role");
    const cid = o.rules[0]!.constraints[0]!.id;
    expect(validateOffer(o).some((i) => i.constraintId === cid && i.level === "error")).toBe(true); // empty value
    o = updateConstraint(o, rid, cid, { rightOperand: "steward" });
    expect(offerIsValid(o)).toBe(true);
  });

  it("rejects a comparison operator on a membership operand", () => {
    let o = addRule(newOffer(), "permission");
    const rid = o.rules[0]!.id;
    o = addConstraint(o, rid, "fdp-pol:role");
    const cid = o.rules[0]!.constraints[0]!.id;
    o = updateConstraint(o, rid, cid, { operator: "odrl:lt", rightOperand: "x" });
    expect(validateOffer(o).some((i) => i.level === "error" && /only eq\/neq/.test(i.message))).toBe(true);
  });

  it("requires an IRI for an assignee operand", () => {
    let o = addRule(newOffer(), "permission");
    const rid = o.rules[0]!.id;
    o = addConstraint(o, rid, "odrl:assignee");
    const cid = o.rules[0]!.constraints[0]!.id;
    o = updateConstraint(o, rid, cid, { rightOperand: "alice", rightIsIri: false });
    expect(validateOffer(o).some((i) => /must be an IRI/.test(i.message))).toBe(true);
  });

  it("warns on an empty offer", () => {
    expect(validateOffer(newOffer()).some((i) => i.level === "warning")).toBe(true);
  });
});

describe("composer output serialises + round-trips", () => {
  it("a composed offer serialises and parses back equal", () => {
    let o = updateOffer(newOffer(), { iri: ":p", conflict: "odrl:deny" });
    o = addRule(o, "permission");
    const rid = o.rules[0]!.id;
    o = updateRule(o, rid, { action: "odrl:modify" });
    o = addConstraint(o, rid, "fdp-pol:role");
    const cid = o.rules[0]!.constraints[0]!.id;
    o = updateConstraint(o, rid, cid, { rightOperand: "steward" });

    const back = parseOffer(serializeOffer(o));
    expect(back.conflict).toBe("odrl:deny");
    expect(back.rules[0]?.action).toBe("odrl:modify");
    expect(back.rules[0]?.constraints[0]).toMatchObject({ leftOperand: "fdp-pol:role", rightOperand: "steward" });
  });
});
