import { describe, expect, it } from "vitest";
import { slugify } from "./slug";

describe("slugify", () => {
  it("lowercases and hyphenates spaces", () => {
    expect(slugify("My Schema")).toBe("my-schema");
  });

  it("collapses runs of non-alphanumeric characters to a single hyphen", () => {
    expect(slugify("foo / bar __ baz!!")).toBe("foo-bar-baz");
  });

  it("trims leading and trailing hyphens", () => {
    expect(slugify("  Hello World  ")).toBe("hello-world");
    expect(slugify("!!edge!!")).toBe("edge");
  });

  it("leaves an already-valid slug unchanged (idempotent)", () => {
    expect(slugify("cohort-2024")).toBe("cohort-2024");
    expect(slugify(slugify("Düsseldorf Data"))).toBe(slugify("Düsseldorf Data"));
  });

  it("returns an empty string when there is nothing slug-worthy", () => {
    expect(slugify("   ")).toBe("");
    expect(slugify("!!!")).toBe("");
  });
});
