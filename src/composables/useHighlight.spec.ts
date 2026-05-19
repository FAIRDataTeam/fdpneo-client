import { describe, expect, it } from "vitest";
import { useHighlight } from "./useHighlight";

describe("useHighlight", () => {
  it("returns the original text as a single non-match segment when query is empty", () => {
    const segs = useHighlight("Alzheimer MRI", "");
    expect(segs).toHaveLength(1);
    expect(segs.at(0)?.match).toBe(false);
  });

  it("splits and flags case-insensitive matches", () => {
    const segs = useHighlight("Alzheimer MRI longitudinal", "mri");
    const matches = segs.filter((s) => s.match);
    expect(matches.length).toBe(1);
    expect(matches.at(0)?.text).toBe("MRI");
  });

  it("escapes regex metacharacters in the query", () => {
    const segs = useHighlight("a.b.c", ".");
    expect(segs.filter((s) => s.match)).toHaveLength(2);
  });
});
