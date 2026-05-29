import { afterEach, describe, expect, it, vi } from "vitest";
import { AxiosError } from "axios";

vi.mock("@/api/http", () => ({ http: { post: vi.fn() } }));

import { http } from "@/api/http";
import { literal, runSparqlQuery, value, type SparqlBinding } from "./sparql";

// eslint-disable-next-line @typescript-eslint/unbound-method -- mocking a method reference
const mockPost = vi.mocked(http.post);

afterEach(() => mockPost.mockReset());

describe("sparql helpers", () => {
  it("value reads a binding or returns undefined", () => {
    const row: SparqlBinding = { title: { type: "literal", value: "Hello" } };
    expect(value(row, "title")).toBe("Hello");
    expect(value(row, "missing")).toBeUndefined();
  });

  it("literal quotes and escapes special characters", () => {
    expect(literal("plain")).toBe('"plain"');
    expect(literal('say "hi"')).toBe('"say \\"hi\\""');
    expect(literal("a\\b")).toBe('"a\\\\b"');
    expect(literal("line\nbreak")).toBe('"line\\nbreak"');
  });
});

function ok(data: unknown, contentType: string) {
  return Promise.resolve({
    data: typeof data === "string" ? data : JSON.stringify(data),
    headers: { "content-type": contentType },
  });
}

describe("runSparqlQuery", () => {
  it("maps SELECT results to a table", async () => {
    mockPost.mockReturnValue(
      ok(
        { head: { vars: ["s"] }, results: { bindings: [{ s: { type: "uri", value: "x" } }] } },
        "application/sparql-results+json",
      ),
    );
    const r = await runSparqlQuery("SELECT ?s WHERE { ?s ?p ?o }");
    expect(r).toEqual({ kind: "table", vars: ["s"], rows: [{ s: { type: "uri", value: "x" } }] });
  });

  it("maps ASK results to a boolean", async () => {
    mockPost.mockReturnValue(ok({ head: {}, boolean: true }, "application/sparql-results+json"));
    const r = await runSparqlQuery("ASK { ?s ?p ?o }");
    expect(r).toEqual({ kind: "boolean", value: true });
  });

  it("returns CONSTRUCT/DESCRIBE output as a graph body", async () => {
    mockPost.mockReturnValue(ok("<a> <b> <c> .", "text/turtle"));
    const r = await runSparqlQuery("DESCRIBE <a>");
    expect(r).toEqual({ kind: "graph", contentType: "text/turtle", body: "<a> <b> <c> ." });
  });

  it("parses the error envelope (text body) back to an object so it can be read", async () => {
    const response = {
      data: JSON.stringify({ code: "fdp.policy_violation", message: "not authorized for graph X" }),
      status: 403,
      statusText: "Forbidden",
      headers: {},
      config: {} as never,
    };
    mockPost.mockRejectedValue(new AxiosError("boom", "ERR", undefined, undefined, response as never));
    await expect(runSparqlQuery("SELECT * WHERE { ?s ?p ?o }")).rejects.toMatchObject({
      response: { data: { code: "fdp.policy_violation" } },
    });
  });
});
