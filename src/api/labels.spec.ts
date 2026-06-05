/**
 * Label lookup: batches IRIs into repeated `iri` params, dedupes, and skips the
 * request entirely for empty input.
 */

import { describe, expect, it, beforeEach, vi } from "vitest";

vi.mock("@/api/http", () => ({ http: { get: vi.fn() } }));

import { http } from "@/api/http";
import { fetchLabels } from "./labels";

// eslint-disable-next-line @typescript-eslint/unbound-method -- mocking a method reference
const mockGet = vi.mocked(http.get);

beforeEach(() => mockGet.mockReset());

describe("fetchLabels", () => {
  it("returns {} and makes no request for empty input", async () => {
    await expect(fetchLabels([])).resolves.toEqual({});
    await expect(fetchLabels(["", "  "])).resolves.toEqual({});
    expect(mockGet).not.toHaveBeenCalled();
  });

  it("requests one `iri` param per unique IRI plus the lang", async () => {
    mockGet.mockResolvedValueOnce({ data: { labels: { a: "Alpha" } } });
    await fetchLabels(["a", "b", "a"], "nl");
    const url = mockGet.mock.calls[0]![0];
    expect(url.match(/iri=/g)).toHaveLength(2); // a, b — deduped
    expect(url).toContain("iri=a");
    expect(url).toContain("iri=b");
    expect(url).toContain("lang=nl");
  });

  it("returns the server's label map", async () => {
    mockGet.mockResolvedValueOnce({
      data: { labels: { "https://cc/by": "CC BY 4.0" } },
    });
    await expect(fetchLabels(["https://cc/by"])).resolves.toEqual({
      "https://cc/by": "CC BY 4.0",
    });
  });
});
