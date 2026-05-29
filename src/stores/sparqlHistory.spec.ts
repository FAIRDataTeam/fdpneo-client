import { beforeEach, describe, expect, it } from "vitest";
import { setActivePinia, createPinia } from "pinia";
import { useSparqlHistoryStore } from "./sparqlHistory";

describe("sparqlHistory store", () => {
  beforeEach(() => setActivePinia(createPinia()));

  it("adds entries most-recent-first and trims whitespace", () => {
    const h = useSparqlHistoryStore();
    h.add("  SELECT 1  ");
    h.add("SELECT 2");
    expect(h.entries.map((e) => e.query)).toEqual(["SELECT 2", "SELECT 1"]);
  });

  it("ignores empty queries and collapses consecutive duplicates", () => {
    const h = useSparqlHistoryStore();
    h.add("   ");
    h.add("SELECT 1");
    h.add("SELECT 1");
    expect(h.entries).toHaveLength(1);
  });

  it("caps the history at 50 entries", () => {
    const h = useSparqlHistoryStore();
    for (let i = 0; i < 60; i++) h.add(`SELECT ${i}`);
    expect(h.entries).toHaveLength(50);
    expect(h.entries[0]?.query).toBe("SELECT 59");
  });

  it("clears", () => {
    const h = useSparqlHistoryStore();
    h.add("SELECT 1");
    h.clear();
    expect(h.entries).toHaveLength(0);
  });
});
