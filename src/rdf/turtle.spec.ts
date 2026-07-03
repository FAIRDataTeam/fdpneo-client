import { describe, expect, it } from "vitest";
import { quoteLiteral } from "./turtle";

describe("quoteLiteral", () => {
  it("wraps a plain string in double quotes", () => {
    expect(quoteLiteral("hello")).toBe('"hello"');
  });

  it("escapes backslash and double-quote", () => {
    expect(quoteLiteral('a"b')).toBe('"a\\"b"');
    expect(quoteLiteral("a\\b")).toBe('"a\\\\b"');
  });

  it("escapes newline, carriage return and tab so the value survives a reparse", () => {
    expect(quoteLiteral("a\nb")).toBe('"a\\nb"');
    expect(quoteLiteral("a\rb")).toBe('"a\\rb"');
    expect(quoteLiteral("a\tb")).toBe('"a\\tb"');
  });

  it("escapes backslash before the others (order matters)", () => {
    // A literal backslash-n must not become an escaped newline.
    expect(quoteLiteral("a\\nb")).toBe('"a\\\\nb"');
  });
});
