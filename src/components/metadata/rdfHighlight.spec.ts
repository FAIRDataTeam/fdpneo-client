/**
 * rdfHighlight: approximate Turtle tokenizer for display. Verifies token classes
 * and — critically — that round-tripping the segments reproduces the input exactly
 * (no characters dropped or duplicated), and that tricky cases (`#` inside an IRI,
 * quotes inside a literal) don't trip the comment/string rules.
 */

import { describe, expect, it } from "vitest";
import { highlightTurtle, type Segment } from "./rdfHighlight";

const join = (segs: Segment[]) => segs.map((s) => s.text).join("");
const classed = (segs: Segment[], cls: string) =>
  segs.filter((s) => s.cls === cls).map((s) => s.text);

describe("highlightTurtle", () => {
  it("classifies directives, IRIs, prefixed names, literals and comments", () => {
    const src = `@prefix dct: <http://purl.org/dc/terms/> . # trail
<http://x/d1> a dcat:Dataset ;
  dct:title "Brain MRI" .`;
    const segs = highlightTurtle(src);

    expect(classed(segs, "kw")).toContain("@prefix");
    expect(classed(segs, "iri")).toContain("<http://purl.org/dc/terms/>");
    expect(classed(segs, "pname")).toEqual(
      expect.arrayContaining(["dct:", "a", "dcat:Dataset", "dct:title"]),
    );
    expect(classed(segs, "str")).toEqual(['"Brain MRI"']);
    expect(classed(segs, "cmt")).toEqual(["# trail"]);
  });

  it("round-trips the exact input text", () => {
    const src = `<http://x#Frag> dct:note "has # and \\" inside" .`;
    expect(join(highlightTurtle(src))).toBe(src);
  });

  it("does not treat '#' inside an IRI as a comment", () => {
    const segs = highlightTurtle(`<http://x#Frag> a foo:Bar .`);
    expect(classed(segs, "iri")).toEqual(["<http://x#Frag>"]);
    expect(classed(segs, "cmt")).toEqual([]);
  });

  it("does not treat punctuation inside a literal as tokens", () => {
    const segs = highlightTurtle(`dct:title "a; b. <c>" .`);
    expect(classed(segs, "str")).toEqual(['"a; b. <c>"']);
    expect(classed(segs, "iri")).toEqual([]);
  });

  it("returns a single plain segment for empty / token-free input", () => {
    expect(highlightTurtle("")).toEqual([]);
    expect(highlightTurtle("   ")).toEqual([{ text: "   " }]);
  });
});
