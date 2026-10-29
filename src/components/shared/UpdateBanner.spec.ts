/** UpdateBanner: admin-only, one notice per component that is behind, session dismissal. */

import { beforeEach, describe, expect, it, vi } from "vitest";
import { flushPromises, mount } from "@vue/test-utils";
import { VueQueryPlugin } from "@tanstack/vue-query";
import type { UpdatesView } from "@/api/updates";

const auth = { isAdmin: true };
vi.mock("@/stores/auth", () => ({ useAuthStore: () => auth }));

const fetchUpdates = vi.fn<() => Promise<UpdatesView>>();
vi.mock("@/api/updates", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/api/updates")>()),
  fetchUpdates: () => fetchUpdates(),
}));

import UpdateBanner from "./UpdateBanner.vue";
import { resetUpdateDismissals } from "@/composables/useUpdates";

const baseView: UpdatesView = {
  enabled: true,
  env_enabled: true,
  checked_at: "2026-10-29T12:00:00Z",
  error: null,
  server_version: "0.19.0",
  latest_server: "0.20.0",
  latest_client: null,
  server_releases: [
    {
      version: "0.20.0",
      url: "https://example.org/v0.20.0",
      metadata_present: true,
      security: true,
      manual_steps: true,
      upgrade_notes: "https://example.org/upgrading",
    },
  ],
  client_releases: [],
};

const mountBanner = () =>
  mount(UpdateBanner, { global: { plugins: [VueQueryPlugin], stubs: { RouterLink: true } } });

beforeEach(() => {
  auth.isAdmin = true;
  fetchUpdates.mockReset();
  resetUpdateDismissals();
});

describe("UpdateBanner", () => {
  it("shows a security notice with manual steps for admins", async () => {
    fetchUpdates.mockResolvedValue(baseView);
    const w = mountBanner();
    await flushPromises();
    expect(w.text()).toContain("FDPneo server 0.20.0 is available. You are running 0.19.0.");
    expect(w.find(".tag").text()).toBe("Security release");
    expect(w.text()).toContain("This upgrade needs manual steps.");
    expect(w.find('a[href="https://example.org/upgrading"]').exists()).toBe(true);
  });

  it("disappears when dismissed", async () => {
    fetchUpdates.mockResolvedValue(baseView);
    const w = mountBanner();
    await flushPromises();
    await w.find("button.dismiss").trigger("click");
    expect(w.find(".notice").exists()).toBe(false);
  });

  it("renders nothing when up to date", async () => {
    fetchUpdates.mockResolvedValue({ ...baseView, server_releases: [], latest_server: "0.19.0" });
    const w = mountBanner();
    await flushPromises();
    expect(w.find(".updates").exists()).toBe(false);
  });

  it("never asks the server for non-admins", async () => {
    auth.isAdmin = false;
    const w = mountBanner();
    await flushPromises();
    expect(fetchUpdates).not.toHaveBeenCalled();
    expect(w.find(".updates").exists()).toBe(false);
  });
});
