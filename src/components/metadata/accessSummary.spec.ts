/**
 * summariseOffer: OfferModel → plain-language access summary for the
 * "Access — in effect" card. Parses a real profile Offer and checks the derived
 * permit/prohibit lines, conditions, conflict strategy, and the open case.
 */
import { describe, expect, it } from "vitest";
import { parseOffer } from "@/components/odrl-editor/parse";
import { summariseOffer } from "./accessSummary";

const OFFER = `
@prefix odrl: <http://www.w3.org/ns/odrl/2/> .
@prefix fdp-pol: <https://specs.fairdatapoint.org/odrl-profile#> .
<x> a odrl:Offer ;
  odrl:permission [ a odrl:Permission ; odrl:action odrl:read ] ;
  odrl:permission [ a odrl:Permission ; odrl:action odrl:modify ;
    odrl:constraint [ odrl:leftOperand fdp-pol:role ; odrl:operator odrl:eq ; odrl:rightOperand "steward" ] ] ;
  odrl:prohibition [ a odrl:Prohibition ; odrl:action odrl:delete ] .
`;

describe("summariseOffer", () => {
  it("derives permit/prohibit lines with conditions and deny-wins default", () => {
    const s = summariseOffer(parseOffer(OFFER));
    expect(s.open).toBe(false);
    expect(s.denyWins).toBe(true); // no explicit odrl:conflict → profile default

    const read = s.lines.find((l) => l.action === "read");
    expect(read).toMatchObject({ kind: "permission", actionLabel: "Read", conditions: [] });

    const modify = s.lines.find((l) => l.action === "modify");
    expect(modify?.kind).toBe("permission");
    expect(modify?.conditions).toEqual(["Role is steward"]);

    const del = s.lines.find((l) => l.action === "delete");
    expect(del).toMatchObject({ kind: "prohibition", actionLabel: "Delete" });
  });

  it("flags an empty offer as open", () => {
    const s = summariseOffer(parseOffer(`@prefix odrl: <http://www.w3.org/ns/odrl/2/> .\n<x> a odrl:Offer .`));
    expect(s.open).toBe(true);
    expect(s.lines).toHaveLength(0);
  });
});
