/**
 * BackupRestoreView: the full-deployment scope (server ADR-0029) requires a
 * confirmed passphrase before a backup can start, and an encrypted archive asks
 * for its passphrase before it can be restored.
 */

import { describe, expect, it, vi, beforeEach } from "vitest";
import { flushPromises, mount } from "@vue/test-utils";

const { startDump, startRestore } = vi.hoisted(() => ({
  startDump: vi.fn(),
  startRestore: vi.fn(),
}));
vi.mock("@/stores/auth", () => ({ useAuthStore: () => ({ isAdmin: true }) }));
vi.mock("@/api/backup", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/api/backup")>();
  return { ...actual, startDump, startRestore };
});

import BackupRestoreView from "./BackupRestoreView.vue";

const job = { id: "j1", kind: "dump", state: "QUEUED", created_at: "", finished_at: null, result: null, error: null };

beforeEach(() => {
  vi.clearAllMocks();
  startDump.mockResolvedValue(job);
  startRestore.mockResolvedValue({ ...job, kind: "restore" });
});

const mountView = () => mount(BackupRestoreView, { global: { stubs: { AppIcon: true } } });

describe("BackupRestoreView", () => {
  it("starts a records-only backup without a passphrase", async () => {
    const w = mountView();
    await w.get('[data-testid="create-backup"]').trigger("click");
    expect(startDump).toHaveBeenCalledWith(false, undefined);
  });

  it("requires a matching passphrase of the minimum length for a full backup", async () => {
    const w = mountView();
    await w.get('input[value="full"]').setValue(true);
    const create = w.get('[data-testid="create-backup"]');
    expect(create.attributes("disabled")).toBeDefined();

    await w.get('[data-testid="backup-passphrase"]').setValue("short");
    expect(w.text()).toContain("at least 12 characters");
    await w.get('[data-testid="backup-passphrase"]').setValue("a long passphrase");
    await w.get('[data-testid="backup-passphrase-repeat"]').setValue("a different one!");
    expect(w.text()).toContain("do not match");
    expect(create.attributes("disabled")).toBeDefined();

    await w.get('[data-testid="backup-passphrase-repeat"]').setValue("a long passphrase");
    expect(create.attributes("disabled")).toBeUndefined();
    await create.trigger("click");
    expect(startDump).toHaveBeenCalledWith(false, { passphrase: "a long passphrase" });
    // The passphrase does not linger in the form after the job has it.
    expect((w.get('[data-testid="backup-passphrase"]').element as HTMLInputElement).value).toBe("");
  });

  it("asks for the passphrase of an encrypted archive before restoring", async () => {
    const w = mountView();
    const input = w.get('input[type="file"]');
    const sealed = new File(["FDPNEO-ENC1 sealed bytes"], "backup.fdpbk");
    Object.defineProperty(input.element, "files", { value: [sealed] });
    await input.trigger("change");
    await flushPromises();

    const passField = w.get('[data-testid="restore-passphrase"]');
    const restoreBtn = w.findAll("button").find((b) => b.text().includes("Restore"));
    expect(restoreBtn?.attributes("disabled")).toBeDefined();

    await passField.setValue("a long passphrase");
    // Dry run needs no confirmation, so the request goes straight out.
    const dryRun = w.findAll('input[type="checkbox"]').at(-1);
    await dryRun?.setValue(true);
    const previewBtn = w.findAll("button").find((b) => b.text().includes("Preview"));
    await previewBtn?.trigger("click");
    expect(startRestore).toHaveBeenCalledWith(
      sealed,
      expect.objectContaining({ dryRun: true }),
      "a long passphrase",
    );
  });

  it("does not ask for a passphrase for a plain .zip", async () => {
    const w = mountView();
    const input = w.get('input[type="file"]');
    Object.defineProperty(input.element, "files", { value: [new File(["PK\u0003\u0004"], "b.zip")] });
    await input.trigger("change");
    await flushPromises();
    expect(w.find('[data-testid="restore-passphrase"]').exists()).toBe(false);
  });
});
