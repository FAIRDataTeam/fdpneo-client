import { describe, expect, it } from "vitest";
import { safeHref } from "./safeUrl";

const TAB = String.fromCharCode(9);
const NEWLINE = String.fromCharCode(10);
const NUL = String.fromCharCode(0);

describe("safeHref", () => {
  it("passes through http, https, and mailto URLs", () => {
    expect(safeHref("http://example.org/pub")).toBe("http://example.org/pub");
    expect(safeHref("https://example.org/license/cc-by")).toBe(
      "https://example.org/license/cc-by",
    );
    expect(safeHref("mailto:steward@example.org")).toBe("mailto:steward@example.org");
  });

  it("rejects javascript:, data:, and vbscript: schemes", () => {
    expect(safeHref("javascript:alert(document.cookie)")).toBeUndefined();
    expect(safeHref("JavaScript:alert(1)")).toBeUndefined();
    expect(safeHref("data:text/html,<script>alert(1)</script>")).toBeUndefined();
    expect(safeHref("vbscript:msgbox(1)")).toBeUndefined();
  });

  it("rejects schemes hidden behind control characters or whitespace", () => {
    // Browsers strip these when resolving the scheme; we must too.
    expect(safeHref(`java${TAB}script:alert(1)`)).toBeUndefined();
    expect(safeHref(`java${NEWLINE}script:alert(1)`)).toBeUndefined();
    expect(safeHref(`${NUL}javascript:alert(1)`)).toBeUndefined();
    expect(safeHref("  javascript:alert(1)")).toBeUndefined();
  });

  it("rejects relative, opaque, and unparseable values", () => {
    expect(safeHref("/relative/path")).toBeUndefined();
    expect(safeHref("not a url")).toBeUndefined();
    expect(safeHref("")).toBeUndefined();
  });

  it("returns undefined for null/undefined input", () => {
    expect(safeHref(null)).toBeUndefined();
    expect(safeHref(undefined)).toBeUndefined();
  });
});
