/**
 * Locale-bundle integrity.
 *
 * Compile-time, every non-en bundle is typed `: Messages`, but a runtime check
 * guards against drift the types can miss (e.g. a key present but empty) and
 * confirms the error/validation keys the non-component code paths look up by
 * string actually resolve.
 */
import { describe, expect, it } from "vitest";
import en from "./messages/en";
import ptBR from "./messages/pt-BR";
import nl from "./messages/nl";
import es from "./messages/es";
import de from "./messages/de";
import fr from "./messages/fr";

type Tree = { [k: string]: string | Tree };

/** All dotted leaf paths in a message tree, sorted. */
function keyPaths(obj: Tree, prefix = ""): string[] {
  return Object.entries(obj)
    .flatMap(([k, v]) => {
      const path = prefix ? `${prefix}.${k}` : k;
      return typeof v === "string" ? [path] : keyPaths(v, path);
    })
    .sort();
}

const bundles = { "pt-BR": ptBR, nl, es, de, fr } as Record<string, Tree>;
const enKeys = keyPaths(en);

describe("locale bundles", () => {
  it("en defines a non-trivial set of keys", () => {
    expect(enKeys.length).toBeGreaterThan(50);
  });

  for (const [code, bundle] of Object.entries(bundles)) {
    it(`${code} has exactly the same keys as en`, () => {
      expect(keyPaths(bundle)).toEqual(enKeys);
    });

    it(`${code} has no empty translations`, () => {
      const empties = keyPaths(bundle).filter((path) => {
        const value = path
          .split(".")
          .reduce<unknown>((acc, seg) => (acc as Record<string, unknown>)?.[seg], bundle);
        return typeof value !== "string" || value.trim() === "";
      });
      expect(empties).toEqual([]);
    });
  }

  it("defines an errors.* key for every code friendlyMessage resolves", () => {
    // Mirrors the codes mapped in api/errorMessages (now keyed by code under errors.*).
    const codes = [
      "http.400",
      "http.401",
      "http.403",
      "http.404",
      "http.408",
      "http.500",
      "http.502",
      "http.503",
      "http.504",
      "fdp.access.denied",
      "fdp.access.unauthenticated",
      "fdp.validation.failed",
      "fdp.validation.profile",
      "fdp.ldp.conflict",
      "fdp.ldp.gone",
      "fdp.schema_protected",
      "fdp.conflict",
      "fdp.sparql.parse",
      "fdp.sparql.timeout",
      "client.network",
      "client.exception",
      "client.unknown",
    ];
    for (const code of codes) {
      expect(enKeys, code).toContain(`errors.${code}`);
    }
  });
});
