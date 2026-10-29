/**
 * Backup client: dump/restore verbs, full-scope body, sealed-archive detection.
 */

import { describe, expect, it, beforeEach, vi } from "vitest";

vi.mock("@/api/http", () => ({ http: { get: vi.fn(), post: vi.fn() } }));

import { http } from "@/api/http";
import { isSealedArchive, startDump, startRestore } from "./backup";

/* eslint-disable @typescript-eslint/unbound-method -- mocking method references */
const mockPost = vi.mocked(http.post);
/* eslint-enable @typescript-eslint/unbound-method */

const options = { merge: false, overwrite: false, noAudit: false, dryRun: true };

beforeEach(() => {
  mockPost.mockReset();
  mockPost.mockResolvedValue({ data: { id: "j1", kind: "dump", state: "QUEUED" } });
});

describe("backup client", () => {
  it("starts a store dump without a body", async () => {
    await startDump(true);
    expect(mockPost).toHaveBeenCalledWith("/fdp-api/admin/backup/dump", null, {
      params: { no_audit: true },
    });
  });

  it("starts a full dump with the passphrase in the body", async () => {
    await startDump(false, { passphrase: "a long passphrase" });
    expect(mockPost).toHaveBeenCalledWith(
      "/fdp-api/admin/backup/dump",
      { passphrase: "a long passphrase" },
      { params: { no_audit: false, scope: "full" } },
    );
  });

  it("sends the passphrase as a form field when restoring a sealed archive", async () => {
    const file = new File(["FDPNEO-ENC1..."], "b.fdpbk");
    await startRestore(file, options, "a long passphrase");
    const form = mockPost.mock.calls[0]?.[1] as FormData;
    expect(form.get("passphrase")).toBe("a long passphrase");
    expect(form.get("archive")).toBeInstanceOf(File);
  });

  it("omits the passphrase for a plain archive", async () => {
    await startRestore(new File(["PK"], "b.zip"), options);
    const form = mockPost.mock.calls[0]?.[1] as FormData;
    expect(form.has("passphrase")).toBe(false);
  });

  it("detects sealed archives by their header", async () => {
    await expect(isSealedArchive(new Blob(["FDPNEO-ENC1\u0011rest"]))).resolves.toBe(true);
    await expect(isSealedArchive(new Blob(["PK\u0003\u0004zip"]))).resolves.toBe(false);
    await expect(isSealedArchive(new Blob(["FDP"]))).resolves.toBe(false);
  });
});
