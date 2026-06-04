/**
 * ApiKeysView: submitting the form mints a key and reveals the one-time secret;
 * the secret only appears after a successful create (copy-once panel).
 */

import { describe, expect, it, vi, beforeEach } from "vitest";
import { ref } from "vue";
import { flushPromises, mount } from "@vue/test-utils";

const create = { mutate: vi.fn(), error: ref<unknown>(null), isPending: ref(false) };
const revoke = { mutate: vi.fn(), error: ref<unknown>(null), isPending: ref(false) };
vi.mock("@/composables/useApiKeys", () => ({
  useApiKeys: () => ({
    keys: ref([]),
    isLoading: ref(false),
    isError: ref(false),
    create,
    revoke,
  }),
}));

import ApiKeysView from "./ApiKeysView.vue";

beforeEach(() => {
  create.mutate.mockReset();
  create.error.value = null;
});

describe("ApiKeysView", () => {
  it("doesn't reveal a secret before any token is created", () => {
    const w = mount(ApiKeysView);
    expect(w.find(".reveal").exists()).toBe(false);
  });

  it("submits {label, expires_at} and reveals the one-time key on success", async () => {
    // mutate(input, { onSuccess }) → invoke the success callback with a created key.
    create.mutate.mockImplementation((input, opts) => opts?.onSuccess?.({ id: "1", label: input.label, key: "fdpk_topsecret" }));

    const w = mount(ApiKeysView);
    await w.find('input[aria-label="Token label"]').setValue("CI pipeline");
    await w.find("form").trigger("submit");
    await flushPromises();

    expect(create.mutate).toHaveBeenCalledWith(
      { label: "CI pipeline", expires_at: null },
      expect.objectContaining({ onSuccess: expect.any(Function) }),
    );
    const reveal = w.find(".reveal");
    expect(reveal.exists()).toBe(true);
    expect(reveal.text()).toContain("fdpk_topsecret");
  });
});
