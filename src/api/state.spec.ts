/**
 * Publication-state client: the allowed-transition table mirrors the server
 * state machine, transitions POST to the per-record path, and current state is
 * parsed from the meta graph (null when unreadable).
 */

import { describe, expect, it, beforeEach, vi } from "vitest";

vi.mock("@/api/http", () => ({ http: { get: vi.fn(), post: vi.fn() } }));

import { http } from "@/api/http";
import { allowedTransitions, fetchRecordState, transitionState } from "./state";

/* eslint-disable @typescript-eslint/unbound-method -- mocking method references */
const mockGet = vi.mocked(http.get);
const mockPost = vi.mocked(http.post);
/* eslint-enable @typescript-eslint/unbound-method */

beforeEach(() => {
  mockGet.mockReset();
  mockPost.mockReset();
});

describe("allowedTransitions", () => {
  it("DRAFT can only publish", () => {
    expect(allowedTransitions("DRAFT", false)).toEqual([{ to: "PUBLISHED", label: "Publish" }]);
  });
  it("PUBLISHED can unpublish or archive", () => {
    expect(allowedTransitions("PUBLISHED", false).map((t) => t.to)).toEqual(["DRAFT", "ARCHIVED"]);
  });
  it("ARCHIVED→DRAFT is admin-only", () => {
    expect(allowedTransitions("ARCHIVED", false)).toEqual([]);
    expect(allowedTransitions("ARCHIVED", true)).toEqual([{ to: "DRAFT", label: "Restore to draft" }]);
  });
});

describe("transitionState", () => {
  it("POSTs {to} to the per-record state path", async () => {
    mockPost.mockResolvedValueOnce({ data: { record: "x", from_state: "DRAFT", to_state: "PUBLISHED" } });
    await transitionState("catalog/cohort", "PUBLISHED");
    expect(mockPost).toHaveBeenCalledWith("/fdp-api/catalog/cohort/state", { to: "PUBLISHED" });
  });
  it("uses /state for the repository root", async () => {
    mockPost.mockResolvedValueOnce({ data: { record: "", from_state: "DRAFT", to_state: "PUBLISHED" } });
    await transitionState("", "PUBLISHED");
    expect(mockPost).toHaveBeenCalledWith("/fdp-api/state", { to: "PUBLISHED" });
  });
});

describe("fetchRecordState", () => {
  it("parses fdp:metadataState from the meta graph", async () => {
    mockGet.mockResolvedValueOnce({
      data: '<http://x/catalog/c> <https://w3id.org/fdp/o#metadataState> "PUBLISHED" .',
    });
    await expect(fetchRecordState("catalog/c")).resolves.toBe("PUBLISHED");
    expect(mockGet).toHaveBeenCalledWith("/catalog/c/meta", expect.anything());
  });
  it("returns null when the meta is unreadable", async () => {
    mockGet.mockRejectedValueOnce(new Error("401"));
    await expect(fetchRecordState("catalog/c")).resolves.toBeNull();
  });
  it("returns null for an unrecognised state value", async () => {
    mockGet.mockResolvedValueOnce({ data: '<http://x> <https://w3id.org/fdp/o#metadataState> "WAT" .' });
    await expect(fetchRecordState("catalog/c")).resolves.toBeNull();
  });
});
