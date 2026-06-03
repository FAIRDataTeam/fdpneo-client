/**
 * LDP read-extensions: `/page` parses the children graph (title + type) and the
 * `X-FDP-Page-Total` header; `/expanded` returns raw Turtle. URL shape differs
 * for the root vs an instance.
 */

import { describe, expect, it, beforeEach, vi } from "vitest";

vi.mock("@/api/http", () => ({ http: { get: vi.fn() } }));

import { http } from "@/api/http";
import { fetchChildrenPage, fetchExpanded } from "./extensions";

// eslint-disable-next-line @typescript-eslint/unbound-method -- mocking a method reference
const mockGet = vi.mocked(http.get);

const PAGE_TTL = `
@prefix dct: <http://purl.org/dc/terms/> .
@prefix rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#> .
@prefix dcat: <http://www.w3.org/ns/dcat#> .
<http://localhost:8000/> dcat:dataset <http://localhost:8000/dataset/a> , <http://localhost:8000/dataset/b> .
<http://localhost:8000/dataset/a> rdf:type dcat:Dataset ; dct:title "Dataset A" .
<http://localhost:8000/dataset/b> rdf:type dcat:Dataset .
`;

beforeEach(() => {
  vi.stubEnv("VITE_FDP_API_URL", "http://localhost:8000");
  mockGet.mockReset();
});

describe("fetchChildrenPage", () => {
  it("parses children (title + type) and the total header", async () => {
    mockGet.mockResolvedValueOnce({ data: PAGE_TTL, headers: { "x-fdp-page-total": "7" } });
    const page = await fetchChildrenPage("", "dataset", { limit: 50 });

    expect(page.total).toBe(7);
    const a = page.children.find((c) => c.id === "dataset/a");
    const b = page.children.find((c) => c.id === "dataset/b");
    expect(a?.label).toBe("Dataset A");
    expect(a?.typeIri).toBe("http://www.w3.org/ns/dcat#Dataset");
    // No title → label falls back to the IRI's short segment.
    expect(b?.label).toBe("b");
  });

  it("uses the root URL with paging params", async () => {
    mockGet.mockResolvedValueOnce({ data: "", headers: {} });
    await fetchChildrenPage("", "catalog", { limit: 10, offset: 20 });
    const url = mockGet.mock.calls[0][0];
    expect(url).toBe("/page/catalog?limit=10&offset=20");
  });

  it("uses the instance URL for a non-root parent", async () => {
    mockGet.mockResolvedValueOnce({ data: "", headers: {} });
    await fetchChildrenPage("catalog/x", "dataset");
    expect(mockGet.mock.calls[0][0]).toBe("/catalog/x/page/dataset");
  });

  it("falls back to child count when the total header is absent", async () => {
    mockGet.mockResolvedValueOnce({ data: PAGE_TTL, headers: {} });
    const page = await fetchChildrenPage("", "dataset");
    expect(page.total).toBe(2);
  });
});

describe("fetchExpanded", () => {
  it("requests the root /expanded and returns Turtle", async () => {
    mockGet.mockResolvedValueOnce({ data: "<a> <b> <c> .", headers: {} });
    await expect(fetchExpanded("")).resolves.toBe("<a> <b> <c> .");
    expect(mockGet.mock.calls[0][0]).toBe("/expanded");
  });

  it("requests an instance /expanded", async () => {
    mockGet.mockResolvedValueOnce({ data: "", headers: {} });
    await fetchExpanded("catalog/x");
    expect(mockGet.mock.calls[0][0]).toBe("/catalog/x/expanded");
  });
});
