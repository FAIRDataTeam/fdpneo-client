/**
 * Form autocomplete: builds source/prefix/limit query params and unwraps the
 * suggestion list.
 */

import { describe, expect, it, beforeEach, vi } from "vitest";

vi.mock("@/api/http", () => ({ http: { get: vi.fn() } }));

import { http } from "@/api/http";
import { fetchAutocomplete } from "./autocomplete";

// eslint-disable-next-line @typescript-eslint/unbound-method -- mocking a method reference
const mockGet = vi.mocked(http.get);

beforeEach(() => mockGet.mockReset());

describe("fetchAutocomplete", () => {
  it("passes source, prefix and limit", async () => {
    mockGet.mockResolvedValueOnce({ data: { items: [] } });
    await fetchAutocomplete("license", "cc", 10);
    const url = mockGet.mock.calls[0][0];
    expect(url).toContain("source=license");
    expect(url).toContain("prefix=cc");
    expect(url).toContain("limit=10");
  });

  it("returns the suggestion items", async () => {
    const items = [{ iri: "https://cc/by", label: "CC BY 4.0", source: "license" }];
    mockGet.mockResolvedValueOnce({ data: { items } });
    await expect(fetchAutocomplete("license")).resolves.toEqual(items);
  });

  it("tolerates a missing items array", async () => {
    mockGet.mockResolvedValueOnce({ data: {} });
    await expect(fetchAutocomplete("license")).resolves.toEqual([]);
  });
});
