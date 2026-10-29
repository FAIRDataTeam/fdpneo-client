/** UpdatesPanel: versions table, disabled states, and "Check now". */

import { beforeEach, describe, expect, it, vi } from "vitest";
import { flushPromises, mount } from "@vue/test-utils";
import { VueQueryPlugin } from "@tanstack/vue-query";
import type { UpdatesView } from "@/api/updates";

vi.mock("@/stores/auth", () => ({ useAuthStore: () => ({ isAdmin: true }) }));

const fetchUpdates = vi.fn<() => Promise<UpdatesView>>();
const checkUpdatesNow = vi.fn<() => Promise<UpdatesView>>();
vi.mock("@/api/updates", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/api/updates")>()),
  fetchUpdates: () => fetchUpdates(),
  checkUpdatesNow: () => checkUpdatesNow(),
}));

import UpdatesPanel from "./UpdatesPanel.vue";

const current: UpdatesView = {
  enabled: true,
  env_enabled: true,
  checked_at: "2026-10-29T12:00:00Z",
  error: null,
  server_version: "0.19.0",
  latest_server: "0.19.0",
  latest_client: "0.1.0",
  server_releases: [],
  client_releases: [{ version: "0.1.0", url: "https://example.org/c", metadata_present: false }],
};

const mountPanel = () => mount(UpdatesPanel, { global: { plugins: [VueQueryPlugin] } });

beforeEach(() => {
  fetchUpdates.mockReset();
  checkUpdatesNow.mockReset();
});

describe("UpdatesPanel", () => {
  it("shows both components and the last check", async () => {
    fetchUpdates.mockResolvedValue(current);
    const w = mountPanel();
    await flushPromises();
    const rows = w.findAll("tbody tr");
    expect(rows).toHaveLength(2);
    expect(rows[0]?.text()).toContain("0.19.0");
    expect(rows[0]?.text()).toContain("Up to date");
    expect(w.text()).toContain("Last checked: 2026-10-29 12:00 (UTC)");
  });

  it("lists newer server releases with their flags", async () => {
    fetchUpdates.mockResolvedValue({
      ...current,
      latest_server: "0.20.0",
      server_releases: [
        { version: "0.20.0", url: "https://example.org/s", metadata_present: true, security: true, manual_steps: true },
      ],
    });
    const w = mountPanel();
    await flushPromises();
    expect(w.find(".badge.security").exists()).toBe(true);
    expect(w.text()).toContain("Manual steps");
  });

  it("explains a deployment-level switch-off and disables the button", async () => {
    fetchUpdates.mockResolvedValue({ ...current, enabled: false, env_enabled: false });
    const w = mountPanel();
    await flushPromises();
    expect(w.text()).toContain("FDP_UPDATES_CHECK_ENABLED=false");
    expect(w.find("button").attributes("disabled")).toBeDefined();
  });

  it("refreshes the view on Check now", async () => {
    fetchUpdates.mockResolvedValue(current);
    checkUpdatesNow.mockResolvedValue({ ...current, checked_at: "2026-10-29T13:30:00Z" });
    const w = mountPanel();
    await flushPromises();
    await w.find("button").trigger("click");
    await flushPromises();
    expect(checkUpdatesNow).toHaveBeenCalledOnce();
    expect(w.text()).toContain("Last checked: 2026-10-29 13:30 (UTC)");
  });
});
