import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("@/api/http", () => ({
  http: { get: vi.fn(), put: vi.fn(), delete: vi.fn(), post: vi.fn() },
}));

import { http } from "@/api/http";
import { listLicenses, putLicense, validateLicense } from "./licenses";

/* eslint-disable @typescript-eslint/unbound-method -- mocking method references */
const mockGet = vi.mocked(http.get);
const mockPut = vi.mocked(http.put);
const mockPost = vi.mocked(http.post);
/* eslint-enable @typescript-eslint/unbound-method */

afterEach(() => {
  mockGet.mockReset();
  mockPut.mockReset();
  mockPost.mockReset();
});

describe("listLicenses", () => {
  it("maps the envelope, defaulting optionals", async () => {
    mockGet.mockResolvedValue({
      data: { licenses: [{ id: "cc-by-4", iri: "http://x/licenses/cc-by-4", title: "CC BY 4.0", state: "published", version: 1 }, { id: "bare", iri: "http://x/licenses/bare" }] },
    });
    const out = await listLicenses();
    expect(out[0]).toEqual({ id: "cc-by-4", iri: "http://x/licenses/cc-by-4", title: "CC BY 4.0", state: "published", version: 1 });
    expect(out[1]).toEqual({ id: "bare", iri: "http://x/licenses/bare", title: null, state: null, version: null });
  });
});

describe("putLicense", () => {
  it("PUTs Turtle untransformed to the right path", async () => {
    mockPut.mockResolvedValue({ data: { id: "cc0", iri: "http://x/licenses/cc0", title: "CC0" } });
    const out = await putLicense("cc0", '<> dct:title "CC0" .');
    expect(mockPut.mock.calls[0]![0]).toBe("/licenses/cc0");
    expect(mockPut.mock.calls[0]![1]).toBe('<> dct:title "CC0" .');
    expect(out).toMatchObject({ id: "cc0", title: "CC0" });
  });
});

describe("validateLicense", () => {
  it("maps conforms + flattens violation detail", async () => {
    mockPost.mockResolvedValue({ data: { conforms: false, violations: [{ message: "missing dct:title", path: "dct:title" }] } });
    const out = await validateLicense("x", "<> a [] .");
    expect(mockPost.mock.calls[0]![0]).toBe("/licenses/x/validate");
    expect(out.conforms).toBe(false);
    expect(out.violations[0]?.detail).toContain("path: dct:title");
  });
});
