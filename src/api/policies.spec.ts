import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("@/api/http", () => ({
  http: { get: vi.fn(), put: vi.fn(), delete: vi.fn(), post: vi.fn() },
}));

import { http } from "@/api/http";
import { listPolicies, putPolicy, validatePolicy } from "./policies";

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

describe("listPolicies", () => {
  it("maps the envelope to summaries, defaulting optionals", async () => {
    mockGet.mockResolvedValue({
      data: {
        policies: [
          { id: "p1", iri: "http://x/policies/p1", title: "Open", assigner: "http://x/cat", permissions: 2, prohibitions: 1, state: "published", version: 3 },
          { id: "p2", iri: "http://x/policies/p2" },
        ],
      },
    });
    const out = await listPolicies();
    expect(out[0]).toEqual({
      id: "p1", iri: "http://x/policies/p1", title: "Open", assigner: "http://x/cat",
      permissions: 2, prohibitions: 1, state: "published", version: 3,
    });
    expect(out[1]).toEqual({
      id: "p2", iri: "http://x/policies/p2", title: null, assigner: null,
      permissions: 0, prohibitions: 0, state: null, version: null,
    });
  });
});

describe("putPolicy", () => {
  it("PUTs Turtle (untransformed) and maps the result", async () => {
    mockPut.mockResolvedValue({ data: { id: "p1", iri: "http://x/policies/p1", permissions: 1, prohibitions: 0 } });
    const out = await putPolicy("p1", "<> a odrl:Offer .");
    expect(mockPut.mock.calls[0]![0]).toBe("/policies/p1");
    expect(mockPut.mock.calls[0]![1]).toBe("<> a odrl:Offer .");
    expect(out.id).toBe("p1");
    expect(out.permissions).toBe(1);
  });
});

describe("validatePolicy", () => {
  it("maps conforms + flattens violation detail", async () => {
    mockPost.mockResolvedValue({
      data: {
        conforms: false,
        violations: [{ message: "unsupported odrl:action", offer: "http://x/policies/p1", action: "odrl:archive" }],
      },
    });
    const out = await validatePolicy("p1", "<> a odrl:Offer .");
    expect(mockPost.mock.calls[0]![0]).toBe("/policies/p1/validate");
    expect(out.conforms).toBe(false);
    expect(out.violations[0]?.message).toBe("unsupported odrl:action");
    expect(out.violations[0]?.detail).toContain("action: odrl:archive");
  });

  it("reports conformance with no violations", async () => {
    mockPost.mockResolvedValue({ data: { conforms: true, violations: [] } });
    expect((await validatePolicy("p1", "x")).conforms).toBe(true);
  });
});
