/**
 * Schema-editor (Contour) bundle integrity.
 *
 * Compile-time, `editorMessages` is typed `Record<EditorLocale, EditorMessages>`,
 * so a missing key in any locale already fails the build. This guards the rest:
 * no EXTRA keys, no empty strings, and that plural entries keep the `{one,other}`
 * shape the i18n shim resolves.
 */
import { describe, expect, it } from "vitest";
import { editorMessages, type EditorLocale } from "./index";

type Tree = { [k: string]: string | Tree };

function keyPaths(obj: Tree, prefix = ""): string[] {
  return Object.entries(obj)
    .flatMap(([k, v]) => {
      const path = prefix ? `${prefix}.${k}` : k;
      return typeof v === "string" ? [path] : keyPaths(v, path);
    })
    .sort();
}

const enKeys = keyPaths(editorMessages.en);
const others = Object.entries(editorMessages).filter(([code]) => code !== "en") as [
  EditorLocale,
  Tree,
][];

describe("schema-editor locale bundles", () => {
  it("en defines a substantial key set", () => {
    expect(enKeys.length).toBeGreaterThan(150);
  });

  for (const [code, bundle] of others) {
    it(`${code} has exactly the same keys as en`, () => {
      expect(keyPaths(bundle)).toEqual(enKeys);
    });

    it(`${code} has no empty strings`, () => {
      const empties = keyPaths(bundle).filter((path) => {
        const value = path
          .split(".")
          .reduce<unknown>((acc, seg) => (acc as Record<string, unknown>)?.[seg], bundle);
        return typeof value !== "string" || value.trim() === "";
      });
      expect(empties).toEqual([]);
    });
  }

  it("plural entries keep the { one, other } shape in every locale", () => {
    for (const [code, bundle] of Object.entries(editorMessages)) {
      const count = (bundle as unknown as { count?: Record<string, unknown> }).count ?? {};
      for (const [name, forms] of Object.entries(count)) {
        expect(forms, `${code}.count.${name}`).toHaveProperty("one");
        expect(forms, `${code}.count.${name}`).toHaveProperty("other");
      }
    }
  });
});
