/**
 * Search + saved-query API clients: correct verbs/paths and response unwrapping.
 */

import { describe, expect, it, beforeEach, vi } from "vitest";

vi.mock("@/api/http", () => ({
  http: { get: vi.fn(), post: vi.fn(), put: vi.fn(), delete: vi.fn() },
}));

import { http } from "@/api/http";
import { fromSearchRequest, runSearch, toSearchRequest } from "./search";
import {
  createSavedQuery,
  deleteSavedQuery,
  listSavedQueries,
  updateSavedQuery,
} from "./savedQueries";

/* eslint-disable @typescript-eslint/unbound-method -- mocking method references */
const mockGet = vi.mocked(http.get);
const mockPost = vi.mocked(http.post);
const mockPut = vi.mocked(http.put);
const mockDelete = vi.mocked(http.delete);
/* eslint-enable @typescript-eslint/unbound-method */

beforeEach(() => {
  mockGet.mockReset();
  mockPost.mockReset();
  mockPut.mockReset();
  mockDelete.mockReset();
});

describe("runSearch", () => {
  it("POSTs the request body to /search and returns the response", async () => {
    const body = { query: "x", types: ["dataset"], offset: 0, limit: 20 };
    const resp = { items: [], total: 0, facets: {} };
    mockPost.mockResolvedValueOnce({ data: resp });
    await expect(runSearch(body)).resolves.toEqual(resp);
    expect(mockPost).toHaveBeenCalledWith("/fdp-api/search", body);
  });
});

describe("saved queries", () => {
  it("lists, unwrapping the queries array", async () => {
    mockGet.mockResolvedValueOnce({ data: { queries: [{ id: "1", name: "A" }] } });
    await expect(listSavedQueries()).resolves.toEqual([{ id: "1", name: "A" }]);
    expect(mockGet).toHaveBeenCalledWith("/fdp-api/me/saved-queries");
  });

  it("creates with name + query object", async () => {
    const input = { name: "Mine", query: { q: "cancer" } };
    mockPost.mockResolvedValueOnce({ data: { id: "1", ...input } });
    await createSavedQuery(input);
    expect(mockPost).toHaveBeenCalledWith("/fdp-api/me/saved-queries", input);
  });

  it("updates and deletes by id", async () => {
    mockPut.mockResolvedValueOnce({ data: {} });
    mockDelete.mockResolvedValueOnce({});
    await updateSavedQuery("abc", { shared: true });
    await deleteSavedQuery("abc");
    expect(mockPut).toHaveBeenCalledWith("/fdp-api/me/saved-queries/abc", { shared: true });
    expect(mockDelete).toHaveBeenCalledWith("/fdp-api/me/saved-queries/abc");
  });
});

describe("saved-search mapping", () => {
  it("builds the request the server validates (query, types, license)", () => {
    expect(
      toSearchRequest("  river temperature ", {
        type: ["dcat:Dataset"],
        license: ["cc-by"],
        theme: ["x"],
      }),
    ).toEqual({
      query: "river temperature",
      types: ["dcat:Dataset"],
      license: "cc-by",
    });
    expect(toSearchRequest("   ", {})).toEqual({
      query: null,
      types: [],
      license: null,
    });
  });

  it("restores text and facets from a stored request", () => {
    const stored = {
      query: "temperature",
      types: ["dcat:Dataset"],
      license: "cc-by",
      offset: 0,
      limit: null,
    };
    expect(fromSearchRequest(stored)).toEqual({
      text: "temperature",
      facets: { type: ["dcat:Dataset"], license: ["cc-by"] },
    });
  });

  it("round-trips", () => {
    const facets = { type: ["dcat:Catalog"], license: ["cc0"] };
    expect(fromSearchRequest(toSearchRequest("soil", facets))).toEqual({
      text: "soil",
      facets,
    });
  });

  it("reads the { q, facets } shape older clients sent", () => {
    expect(
      fromSearchRequest({ q: "river", facets: { type: ["dcat:Dataset"] } }),
    ).toEqual({
      text: "river",
      facets: { type: ["dcat:Dataset"] },
    });
  });

  it("treats a stored request with nothing in it as an empty search", () => {
    const emptied = {
      to: null,
      from: null,
      limit: null,
      query: null,
      types: [],
      offset: 0,
      license: null,
      language: null,
    };
    expect(fromSearchRequest(emptied)).toEqual({ text: "", facets: {} });
  });
});
