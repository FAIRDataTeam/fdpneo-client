/**
 * Search + saved-query API clients: correct verbs/paths and response unwrapping.
 */

import { describe, expect, it, beforeEach, vi } from "vitest";

vi.mock("@/api/http", () => ({
  http: { get: vi.fn(), post: vi.fn(), put: vi.fn(), delete: vi.fn() },
}));

import { http } from "@/api/http";
import { runSearch } from "./search";
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
