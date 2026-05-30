import { afterEach, describe, expect, it, vi } from "vitest";
import { AxiosError } from "axios";

vi.mock("@/api/http", () => ({ http: { get: vi.fn(), put: vi.fn(), delete: vi.fn() } }));

import { http } from "@/api/http";
import { readGraph, putGraph, deleteGraph, recordExists } from "./records";

/* eslint-disable @typescript-eslint/unbound-method -- mocking method references */
const mockGet = vi.mocked(http.get);
const mockPut = vi.mocked(http.put);
const mockDelete = vi.mocked(http.delete);
/* eslint-enable @typescript-eslint/unbound-method */

afterEach(() => {
  mockGet.mockReset();
  mockPut.mockReset();
  mockDelete.mockReset();
});

describe("readGraph", () => {
  it("returns the turtle body and the ETag", async () => {
    mockGet.mockResolvedValue({ data: "<a> <b> <c> .", headers: { etag: '"abc"' } });
    const r = await readGraph("catalog/cohort");
    expect(r).toEqual({ turtle: "<a> <b> <c> .", etag: '"abc"' });
    expect(mockGet).toHaveBeenCalledWith("/catalog/cohort", expect.objectContaining({ responseType: "text" }));
  });

  it("reads the root at the empty path", async () => {
    mockGet.mockResolvedValue({ data: "", headers: {} });
    await readGraph("");
    expect(mockGet).toHaveBeenCalledWith("/", expect.anything());
  });
});

describe("putGraph", () => {
  it("sends If-Match when an ETag is supplied and returns the new ETag", async () => {
    mockPut.mockResolvedValue({ headers: { etag: '"new"' } });
    const etag = await putGraph("catalog/cohort", "<a> <b> <c> .", '"old"');
    expect(etag).toBe('"new"');
    expect(mockPut).toHaveBeenCalledWith(
      "/catalog/cohort",
      "<a> <b> <c> .",
      expect.objectContaining({ headers: expect.objectContaining({ "If-Match": '"old"' }) }),
    );
  });

  it("omits If-Match when no ETag is known (create)", async () => {
    mockPut.mockResolvedValue({ headers: {} });
    await putGraph("catalog/new", "<a> <b> <c> .", null);
    const cfg = mockPut.mock.calls[0]?.[2] as { headers: Record<string, string> };
    expect(cfg.headers["If-Match"]).toBeUndefined();
  });

  it("normalises a string error envelope back to an object", async () => {
    const response = {
      data: JSON.stringify({ code: "fdp.validation.failed", message: "bad" }),
      status: 422,
      statusText: "",
      headers: {},
      config: {} as never,
    };
    mockPut.mockRejectedValue(new AxiosError("x", "ERR", undefined, undefined, response as never));
    await expect(putGraph("catalog/x", "ttl", '"e"')).rejects.toMatchObject({
      response: { data: { code: "fdp.validation.failed" } },
    });
  });
});

describe("deleteGraph", () => {
  it("guards with If-Match", async () => {
    mockDelete.mockResolvedValue({});
    await deleteGraph("catalog/cohort", '"e"');
    expect(mockDelete).toHaveBeenCalledWith(
      "/catalog/cohort",
      expect.objectContaining({ headers: { "If-Match": '"e"' } }),
    );
  });
});

describe("recordExists", () => {
  it("is true when the GET succeeds", async () => {
    mockGet.mockResolvedValue({ data: "<a> <b> <c> .", headers: {} });
    expect(await recordExists("catalog/cohort")).toBe(true);
  });

  it("is false (best-effort) when the GET errors", async () => {
    mockGet.mockRejectedValue(new Error("404"));
    expect(await recordExists("catalog/nope")).toBe(false);
  });
});
