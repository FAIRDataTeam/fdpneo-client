/**
 * Index-targets client: list unwrapping + correct verbs/paths/body.
 */

import { describe, expect, it, beforeEach, vi } from "vitest";

vi.mock("@/api/http", () => ({ http: { get: vi.fn(), post: vi.fn(), delete: vi.fn() } }));

import { http } from "@/api/http";
import {
  addIndexTarget,
  listIndexTargets,
  pingIndexes,
  removeIndexTarget,
} from "./indexTargets";

/* eslint-disable @typescript-eslint/unbound-method -- mocking method references */
const mockGet = vi.mocked(http.get);
const mockPost = vi.mocked(http.post);
const mockDelete = vi.mocked(http.delete);
/* eslint-enable @typescript-eslint/unbound-method */

beforeEach(() => {
  mockGet.mockReset();
  mockPost.mockReset();
  mockDelete.mockReset();
});

describe("indexTargets", () => {
  it("lists, unwrapping the targets array", async () => {
    const target = { id: "t1", url: "https://idx.example", source: "runtime" };
    mockGet.mockResolvedValueOnce({ data: { targets: [target] } });
    await expect(listIndexTargets()).resolves.toEqual([target]);
    expect(mockGet).toHaveBeenCalledWith("/fdp-api/index/targets");
  });

  it("adds with url + note", async () => {
    const created = { id: "t1", url: "https://idx.example", source: "runtime" };
    mockPost.mockResolvedValueOnce({ data: created });
    const input = { url: "https://idx.example/", note: "home index" };
    await expect(addIndexTarget(input)).resolves.toEqual(created);
    expect(mockPost).toHaveBeenCalledWith("/fdp-api/index/targets", input);
  });

  it("removes by id", async () => {
    mockDelete.mockResolvedValueOnce({});
    await removeIndexTarget("t1");
    expect(mockDelete).toHaveBeenCalledWith("/fdp-api/index/targets/t1");
  });

  it("pings now, unwrapping per-target results", async () => {
    const results = [{ target: "https://idx.example", status: 204, ok: true, detail: null }];
    mockPost.mockResolvedValueOnce({ data: { results } });
    await expect(pingIndexes()).resolves.toEqual(results);
    expect(mockPost).toHaveBeenCalledWith("/fdp-api/index/ping");
  });
});
