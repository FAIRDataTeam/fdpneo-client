/**
 * Settings API: `GET /settings` unwraps the values map; `PUT`/`DELETE` target the
 * per-key path and send the value object as the body.
 */

import { describe, expect, it, beforeEach, vi } from "vitest";

vi.mock("@/api/http", () => ({ http: { get: vi.fn(), put: vi.fn(), delete: vi.fn() } }));

import { http } from "@/api/http";
import { fetchSettings, putSetting, resetSetting } from "./settings";

/* eslint-disable @typescript-eslint/unbound-method -- mocking method references */
const mockGet = vi.mocked(http.get);
const mockPut = vi.mocked(http.put);
const mockDelete = vi.mocked(http.delete);
/* eslint-enable @typescript-eslint/unbound-method */

beforeEach(() => {
  mockGet.mockReset();
  mockPut.mockReset();
  mockDelete.mockReset();
});

describe("fetchSettings", () => {
  it("unwraps the values map", async () => {
    mockGet.mockResolvedValueOnce({ data: { values: { "search.filters": { filters: [] } } } });
    await expect(fetchSettings()).resolves.toEqual({ "search.filters": { filters: [] } });
    expect(mockGet).toHaveBeenCalledWith("/settings");
  });

  it("tolerates a missing values map", async () => {
    mockGet.mockResolvedValueOnce({ data: {} });
    await expect(fetchSettings()).resolves.toEqual({});
  });
});

describe("putSetting", () => {
  it("PUTs the value object to the per-key path and returns the stored value", async () => {
    const value = { filters: [{ field: "type" }] };
    mockPut.mockResolvedValueOnce({ data: { key: "search.filters", value } });
    await expect(putSetting("search.filters", value)).resolves.toEqual(value);
    expect(mockPut).toHaveBeenCalledWith("/settings/search.filters", value);
  });
});

describe("resetSetting", () => {
  it("DELETEs the per-key path", async () => {
    mockDelete.mockResolvedValueOnce({});
    await resetSetting("forms.autocomplete-sources");
    expect(mockDelete).toHaveBeenCalledWith("/settings/forms.autocomplete-sources");
  });
});
