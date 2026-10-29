/** UpdatesPanel: versions table, disabled states, and "Check now". */

import { beforeEach, describe, expect, it, vi } from "vitest";
import { flushPromises, mount } from "@vue/test-utils";
import { VueQueryPlugin } from "@tanstack/vue-query";
import type { UpdateRequestList, UpdatesView } from "@/api/updates";

vi.mock("@/stores/auth", () => ({ useAuthStore: () => ({ isAdmin: true }) }));

const fetchUpdates = vi.fn<() => Promise<UpdatesView>>();
const checkUpdatesNow = vi.fn<() => Promise<UpdatesView>>();
const fetchUpdateRequests = vi.fn<() => Promise<UpdateRequestList>>();
const requestUpdate = vi.fn();
const cancelUpdateRequest = vi.fn();
vi.mock("@/api/updates", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/api/updates")>()),
  fetchUpdates: () => fetchUpdates(),
  checkUpdatesNow: () => checkUpdatesNow(),
  fetchUpdateRequests: () => fetchUpdateRequests(),
  requestUpdate: (body: unknown) => requestUpdate(body),
  cancelUpdateRequest: (id: string) => cancelUpdateRequest(id),
}));

const noAgent: UpdateRequestList = {
  agent_connected: false,
  agent_last_seen: null,
  agent_version: null,
  requests: [],
};

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
  fetchUpdateRequests.mockReset();
  fetchUpdateRequests.mockResolvedValue(noAgent);
  requestUpdate.mockReset();
  cancelUpdateRequest.mockReset();
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

  it("says when no updater agent is connected and offers no update button", async () => {
    fetchUpdates.mockResolvedValue({
      ...current,
      latest_server: "0.20.0",
      server_releases: [
        { version: "0.20.0", url: "https://example.org/s", metadata_present: true, manual_steps: false },
      ],
    });
    const w = mountPanel();
    await flushPromises();
    expect(w.text()).toContain("No updater agent is connected");
    expect(w.text()).not.toContain("Update to 0.20.0");
  });

  it("requests an update after a confirmation step when an agent is connected", async () => {
    fetchUpdates.mockResolvedValue({
      ...current,
      latest_server: "0.20.0",
      server_releases: [
        {
          version: "0.20.0",
          url: "https://example.org/s",
          metadata_present: true,
          manual_steps: false,
          min_upgrade_from: "0.17.0",
        },
      ],
    });
    fetchUpdateRequests.mockResolvedValue({
      ...noAgent,
      agent_connected: true,
      agent_version: "1.0.0",
      agent_last_seen: "2026-10-29T12:00:00Z",
    });
    requestUpdate.mockResolvedValue({});
    const w = mountPanel();
    await flushPromises();
    const button = () => w.findAll("button").find((b) => b.text().includes("0.20.0"));
    expect(button()?.text()).toBe("Update to 0.20.0");
    await button()?.trigger("click");
    expect(requestUpdate).not.toHaveBeenCalled();
    expect(button()?.text()).toBe("Confirm: update to 0.20.0");
    await button()?.trigger("click");
    await flushPromises();
    expect(requestUpdate).toHaveBeenCalledWith({ component: "server", version: "0.20.0", from_version: null });
  });

  it("explains why a release must be applied by hand", async () => {
    fetchUpdates.mockResolvedValue({
      ...current,
      latest_server: "0.20.0",
      server_releases: [
        { version: "0.20.0", url: "https://example.org/s", metadata_present: true, manual_steps: true },
      ],
    });
    fetchUpdateRequests.mockResolvedValue({ ...noAgent, agent_connected: true });
    const w = mountPanel();
    await flushPromises();
    expect(w.find(".blocker").text()).toContain("needs manual upgrade steps");
  });

  it("lists requests and cancels a pending one", async () => {
    fetchUpdates.mockResolvedValue(current);
    fetchUpdateRequests.mockResolvedValue({
      ...noAgent,
      agent_connected: true,
      requests: [
        {
          id: "r1",
          component: "server",
          target_version: "0.20.0",
          from_version: "0.19.0",
          status: "pending",
          requested_by: "kc#admin",
          requested_at: "2026-10-29T12:00:00Z",
          claimed_at: null,
          finished_at: null,
          message: null,
          backup_location: null,
        },
      ],
    });
    cancelUpdateRequest.mockResolvedValue({});
    const w = mountPanel();
    await flushPromises();
    expect(w.find(".history").text()).toContain("0.19.0 → 0.20.0");
    expect(w.find(".history").text()).toContain("Waiting for the updater");
    await w.find(".history button").trigger("click");
    await flushPromises();
    expect(cancelUpdateRequest).toHaveBeenCalledWith("r1");
  });
});
