/**
 * useStewardRecords now reads GET /me/dashboard (TASKS 10.2): the main `rows`
 * are owned ∪ editable (deduped by IRI), `recent` is separate, and each item's
 * type_iri is mapped to a display kind/label via the type catalog.
 */

import { describe, expect, it, vi, beforeEach } from "vitest";
import { defineComponent, ref } from "vue";
import { flushPromises, mount } from "@vue/test-utils";
import { VueQueryPlugin } from "@tanstack/vue-query";

const fetchDashboard = vi.fn();
vi.mock("@/api/dashboard", () => ({ fetchDashboard: () => fetchDashboard() }));

const DATASET = "http://www.w3.org/ns/dcat#Dataset";
const CATALOG = "http://www.w3.org/ns/dcat#Catalog";

vi.mock("@/composables/useResourceTypes", () => ({
  useResourceTypes: () => ({
    defs: ref([{ urlPrefix: "catalog" }, { urlPrefix: "dataset" }]),
    specFor: (t: string) =>
      t === "catalog"
        ? { classIri: CATALOG, label: "Catalog", childTypes: [] }
        : t === "dataset"
          ? { classIri: DATASET, label: "Dataset", childTypes: [] }
          : null,
  }),
}));

vi.mock("@/stores/auth", () => ({ useAuthStore: () => ({ isAuthenticated: true }) }));

import { useStewardRecords, type DashboardRow } from "./useStewardRecords";

beforeEach(() => {
  vi.stubEnv("VITE_FDP_API_URL", "http://localhost:8000");
  fetchDashboard.mockReset();
});

async function run(): Promise<{ rows: DashboardRow[]; recent: DashboardRow[] }> {
  let out!: ReturnType<typeof useStewardRecords>;
  mount(
    defineComponent({
      setup() {
        out = useStewardRecords();
        return () => null;
      },
    }),
    { global: { plugins: [VueQueryPlugin] } },
  );
  await flushPromises();
  await new Promise((r) => setTimeout(r, 10));
  await flushPromises();
  return { rows: out.rows.value, recent: out.recent.value };
}

describe("useStewardRecords (dashboard)", () => {
  it("merges owned ∪ editable (deduped) and maps type_iri via the catalog", async () => {
    fetchDashboard.mockResolvedValue({
      owned: [
        { record_iri: "http://localhost:8000/catalog/c1", type_iri: CATALOG, title: "Cat 1", state: "PUBLISHED", last_modified: "2026-06-01T10:00:00Z" },
      ],
      editable: [
        // duplicate of owned c1 — must appear once
        { record_iri: "http://localhost:8000/catalog/c1", type_iri: CATALOG, title: "Cat 1", state: "PUBLISHED" },
        { record_iri: "http://localhost:8000/dataset/d1", type_iri: DATASET, title: "Data 1", state: "DRAFT" },
      ],
      recent: [
        { record_iri: "http://localhost:8000/dataset/d1", type_iri: DATASET, title: "Data 1", last_modified: "2026-06-02T09:00:00Z" },
      ],
    });

    const { rows, recent } = await run();

    expect(rows).toHaveLength(2); // c1 deduped
    const cat = rows.find((r) => r.id === "catalog/c1");
    expect(cat).toMatchObject({ type: "catalog", typeLabel: "Catalog", title: "Cat 1", modified: "2026-06-01", state: "PUBLISHED" });
    expect(rows.find((r) => r.id === "dataset/d1")).toMatchObject({ typeLabel: "Dataset", state: "DRAFT" });

    expect(recent).toHaveLength(1);
    expect(recent[0]).toMatchObject({ id: "dataset/d1", modified: "2026-06-02" });
  });

  it("falls back to a neutral label for an unknown type_iri", async () => {
    fetchDashboard.mockResolvedValue({
      owned: [{ record_iri: "http://localhost:8000/thing/x", type_iri: "http://example.org/Unknown", title: "X" }],
      editable: [],
      recent: [],
    });
    const { rows } = await run();
    expect(rows[0]).toMatchObject({ id: "thing/x", type: "dataset", typeLabel: "Resource" });
  });
});
