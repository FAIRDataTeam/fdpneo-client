import { describe, expect, it } from "vitest";
import { literal, value, type SparqlBinding } from "./sparql";

describe("sparql helpers", () => {
  it("value reads a binding or returns undefined", () => {
    const row: SparqlBinding = { title: { type: "literal", value: "Hello" } };
    expect(value(row, "title")).toBe("Hello");
    expect(value(row, "missing")).toBeUndefined();
  });

  it("literal quotes and escapes special characters", () => {
    expect(literal("plain")).toBe('"plain"');
    expect(literal('say "hi"')).toBe('"say \\"hi\\""');
    expect(literal("a\\b")).toBe('"a\\\\b"');
    expect(literal("line\nbreak")).toBe('"line\\nbreak"');
  });
});
