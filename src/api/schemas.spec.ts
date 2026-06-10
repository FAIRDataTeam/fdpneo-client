import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("@/api/http", () => ({
  http: { get: vi.fn(), put: vi.fn(), delete: vi.fn(), post: vi.fn() },
}));

import { http } from "@/api/http";
import { listSchemas, putSchema, validateSample } from "./schemas";

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

describe("listSchemas", () => {
  it("maps the snake_case envelope to camelCase summaries", async () => {
    mockGet.mockResolvedValue({
      data: {
        schemas: [
          { id: "ontology", iri: "http://x/schemas/ontology", target_class: "http://x/Ontology", version: 3, deletable: true },
          { id: "thing", iri: "http://x/schemas/thing" },
          { id: "repository", iri: "http://x/schemas/repository", deletable: false },
        ],
      },
    });
    const out = await listSchemas();
    expect(out[0]).toEqual({
      id: "ontology",
      iri: "http://x/schemas/ontology",
      targetClass: "http://x/Ontology",
      version: 3,
      deletable: true,
    });
    // Missing optionals default to null; missing `deletable` defaults to true.
    expect(out[1]).toEqual({
      id: "thing",
      iri: "http://x/schemas/thing",
      targetClass: null,
      version: null,
      deletable: true,
    });
    // Protected shapes report deletable: false.
    expect(out[2]?.deletable).toBe(false);
  });

  it("tolerates an empty/absent list", async () => {
    mockGet.mockResolvedValue({ data: {} });
    expect(await listSchemas()).toEqual([]);
  });
});

describe("putSchema", () => {
  it("PUTs raw Turtle to /schemas/{id} and returns the summary", async () => {
    mockPut.mockResolvedValue({ data: { id: "ontology", iri: "http://x/schemas/ontology", version: 1 } });
    const info = await putSchema("ontology", "@prefix sh: <…> .");
    expect(info.iri).toBe("http://x/schemas/ontology");
    expect(mockPut).toHaveBeenCalledWith(
      "/fdp-api/schemas/ontology",
      "@prefix sh: <…> .",
      expect.objectContaining({ headers: { "Content-Type": "text/turtle" } }),
    );
  });
});

describe("validateSample", () => {
  it("maps snake_case violation keys to camelCase", async () => {
    mockPost.mockResolvedValue({
      data: {
        conforms: false,
        violations: [
          { focus_node: "urn:o", result_path: "http://purl.org/dc/terms/title", message: "missing", value: null },
        ],
      },
    });
    const r = await validateSample("ontology", "<urn:o> a <http://x/Ontology> .");
    expect(r.conforms).toBe(false);
    expect(r.violations[0]).toEqual({
      focusNode: "urn:o",
      resultPath: "http://purl.org/dc/terms/title",
      message: "missing",
      value: null,
    });
  });
});
