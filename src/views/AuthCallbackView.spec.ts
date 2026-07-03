/**
 * AuthCallbackView is the OIDC redirect target — it completes the Authorization
 * Code + PKCE flow on mount and routes to the intended destination, or shows a
 * recoverable error frame on failure. Previously untested despite sitting on the
 * critical login path.
 */

import { describe, expect, it, vi, beforeEach } from "vitest";
import { flushPromises, mount } from "@vue/test-utils";

const handleCallback = vi.fn();
const login = vi.fn();
const clearError = vi.fn();
const replace = vi.fn();
const auth = { handleCallback, login, clearError, error: null as Error | null };

vi.mock("@/stores/auth", () => ({ useAuthStore: () => auth }));
vi.mock("vue-router", () => ({ useRouter: () => ({ replace }) }));

import AuthCallbackView from "./AuthCallbackView.vue";

const mountView = () => mount(AuthCallbackView, { global: { stubs: { AppLogo: true } } });

beforeEach(() => {
  vi.clearAllMocks();
  auth.error = null;
});

describe("AuthCallbackView", () => {
  it("completes the callback and routes to the intended target", async () => {
    handleCallback.mockResolvedValue("/dashboard");
    const w = mountView();
    await flushPromises();
    expect(handleCallback).toHaveBeenCalledOnce();
    expect(replace).toHaveBeenCalledWith("/dashboard");
    expect(w.text()).toContain("Signing you in");
  });

  it("falls back to '/' when the callback yields no target", async () => {
    handleCallback.mockResolvedValue(undefined);
    mountView();
    await flushPromises();
    expect(replace).toHaveBeenCalledWith("/");
  });

  it("shows the error frame with the provider message when the callback fails", async () => {
    handleCallback.mockRejectedValue(new Error("callback failed"));
    auth.error = new Error("state mismatch");
    const w = mountView();
    await flushPromises();
    expect(w.text()).toContain("That didn't work");
    expect(w.text()).toContain("state mismatch");
    expect(replace).not.toHaveBeenCalled();
  });

  it("retry clears the error and starts a fresh login", async () => {
    handleCallback.mockRejectedValue(new Error("callback failed"));
    const w = mountView();
    await flushPromises();
    await w.get("button.primary").trigger("click");
    expect(clearError).toHaveBeenCalled();
    expect(login).toHaveBeenCalledWith("/");
  });

  it("'Go to home' clears the error and routes to '/'", async () => {
    handleCallback.mockRejectedValue(new Error("callback failed"));
    const w = mountView();
    await flushPromises();
    const buttons = w.findAll("button");
    await buttons[buttons.length - 1]!.trigger("click"); // "Go to home"
    expect(clearError).toHaveBeenCalled();
    expect(replace).toHaveBeenCalledWith("/");
  });
});
