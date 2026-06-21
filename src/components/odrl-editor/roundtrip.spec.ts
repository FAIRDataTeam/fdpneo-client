import { describe, expect, it } from "vitest";
import { Parser } from "n3";
import { serializeOffer } from "./serialize";
import { parseOffer } from "./parse";
import type { OfferModel } from "./model";

// The real bundled system-default Offer (server/profiles/default/offers/…).
const BUNDLED = `@prefix odrl:    <http://www.w3.org/ns/odrl/2/> .
@prefix fdp-pol: <https://specs.fairdatapoint.org/odrl-profile#> .

<https://w3id.org/fdp/profiles/default/offers/public-read-steward-modify>
    a odrl:Offer ;
    odrl:permission [ a odrl:Permission ; odrl:action odrl:read ] ;
    odrl:permission [
        a odrl:Permission ; odrl:action odrl:modify ;
        odrl:constraint [ odrl:leftOperand fdp-pol:role ; odrl:operator odrl:eq ; odrl:rightOperand "steward" ]
    ] ;
    odrl:permission [
        a odrl:Permission ; odrl:action odrl:delete ;
        odrl:constraint [ odrl:leftOperand fdp-pol:role ; odrl:operator odrl:eq ; odrl:rightOperand "steward" ]
    ] ;
    odrl:permission [
        a odrl:Permission ; odrl:action odrl:distribute ;
        odrl:constraint [ odrl:leftOperand fdp-pol:role ; odrl:operator odrl:eq ; odrl:rightOperand "steward" ]
    ] .`;

const triples = (t: string) => new Parser().parse(t).length;
/** Strip client ids + prefixes so two structurally-equal offers compare equal. */
function norm(o: OfferModel): unknown {
  return {
    iri: o.iri,
    assigner: o.assigner,
    conflict: o.conflict,
    rules: o.rules.map((r) => ({
      kind: r.kind,
      action: r.action,
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      constraints: r.constraints.map(({ id, ...c }) => c),
    })),
  };
}

describe("parseOffer (bundled system-default offer)", () => {
  const m = parseOffer(BUNDLED);

  it("reads the Offer IRI and rule counts", () => {
    expect(m.iri).toBe("https://w3id.org/fdp/profiles/default/offers/public-read-steward-modify");
    expect(m.assigner).toBeNull();
    expect(m.conflict).toBeNull();
    expect(m.rules).toHaveLength(4);
    expect(m.rules.every((r) => r.kind === "permission")).toBe(true);
    expect(m.rules.map((r) => r.action)).toEqual(["odrl:read", "odrl:modify", "odrl:delete", "odrl:distribute"]);
  });

  it("reads the steward role constraints", () => {
    const modify = m.rules.find((r) => r.action === "odrl:modify");
    expect(modify?.constraints).toHaveLength(1);
    expect(modify?.constraints[0]).toMatchObject({
      leftOperand: "fdp-pol:role",
      operator: "odrl:eq",
      rightOperand: "steward",
      rightIsIri: false,
    });
    expect(m.rules.find((r) => r.action === "odrl:read")?.constraints).toHaveLength(0);
  });
});

describe("Offer round-trip", () => {
  it("serializes to valid Turtle that n3 parses", () => {
    expect(() => new Parser().parse(serializeOffer(parseOffer(BUNDLED)))).not.toThrow();
  });

  it("drops no triples and is idempotent (bundled offer)", () => {
    const once = serializeOffer(parseOffer(BUNDLED));
    expect(triples(once)).toBe(triples(BUNDLED));
    expect(serializeOffer(parseOffer(once))).toBe(once);
  });

  it("parse(serialize(model)) ≡ model, ignoring ids", () => {
    const m = parseOffer(BUNDLED);
    expect(norm(parseOffer(serializeOffer(m)))).toEqual(norm(m));
  });

  it("round-trips a rich offer (assigner, conflict, prohibition, IRI + dateTime constraints)", () => {
    const offer: OfferModel = {
      iri: ":dataset-policy",
      assigner: ":catalog-x",
      conflict: "odrl:deny",
      prefixes: [],
      rules: [
        {
          id: "r1",
          kind: "permission",
          action: "odrl:read",
          constraints: [
            { id: "c1", leftOperand: "odrl:assignee", operator: "odrl:eq", rightOperand: ":alice", rightIsIri: true },
            { id: "c2", leftOperand: "odrl:dateTime", operator: "odrl:lt", rightOperand: "2030-01-01T00:00:00", rightIsIri: false },
          ],
        },
        { id: "r2", kind: "prohibition", action: "odrl:delete", constraints: [] },
      ],
    };
    const back = parseOffer(serializeOffer(offer));
    expect(norm(back)).toEqual(norm(offer));
    // the dateTime literal kept its datatype across the trip
    expect(serializeOffer(offer)).toContain('"2030-01-01T00:00:00"^^xsd:dateTime');
  });

  it("brackets non-http(s) IRIs (urn:/did:) so they are not reparsed as CURIEs", () => {
    const offer: OfferModel = {
      iri: ":offer",
      assigner: "urn:example:party-1",
      conflict: null,
      prefixes: [],
      rules: [
        {
          id: "r1",
          kind: "permission",
          action: "odrl:read",
          constraints: [
            { id: "c1", leftOperand: "odrl:assignee", operator: "odrl:eq", rightOperand: "did:example:abc", rightIsIri: true },
          ],
        },
      ],
    };
    const ttl = serializeOffer(offer);
    // Full IRIs with non-http schemes must be angle-bracketed...
    expect(ttl).toContain("<urn:example:party-1>");
    expect(ttl).toContain("<did:example:abc>");
    // ...so they survive the round-trip unchanged (not corrupted to prefix:local).
    const back = parseOffer(ttl);
    expect(back.assigner).toBe("urn:example:party-1");
    expect(back.rules[0]?.constraints[0]?.rightOperand).toBe("did:example:abc");
  });
});
