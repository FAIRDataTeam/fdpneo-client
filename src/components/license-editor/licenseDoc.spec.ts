import { describe, expect, it } from "vitest";
import { Parser } from "n3";
import { parseLicense, serializeLicense } from "./licenseDoc";

const IRI = "http://localhost:8000/licenses/cc-by-4";

describe("license document", () => {
  it("serializes title + source + description as valid Turtle", () => {
    const ttl = serializeLicense(IRI, {
      title: "CC BY 4.0",
      source: "https://creativecommons.org/licenses/by/4.0/",
      description: "Attribution.",
    });
    expect(() => new Parser().parse(ttl)).not.toThrow();
    expect(ttl).toContain('dct:title "CC BY 4.0"');
    expect(ttl).toContain("dct:source <https://creativecommons.org/licenses/by/4.0/>");
  });

  it("omits empty optional fields", () => {
    const ttl = serializeLicense(IRI, { title: "Bare", source: "", description: "" });
    expect(ttl).toContain('dct:title "Bare"');
    expect(ttl).not.toContain("dct:source");
    expect(ttl).not.toContain("dct:description");
  });

  it("round-trips through parse", () => {
    const fields = { title: "CC0", source: "https://creativecommons.org/publicdomain/zero/1.0/", description: "Public domain." };
    expect(parseLicense(serializeLicense(IRI, fields), IRI)).toEqual(fields);
  });

  it("escapes quotes in the title", () => {
    const ttl = serializeLicense(IRI, { title: 'The "Open" License', source: "", description: "" });
    expect(ttl).toContain('\\"Open\\"');
    expect(() => new Parser().parse(ttl)).not.toThrow();
  });
});
