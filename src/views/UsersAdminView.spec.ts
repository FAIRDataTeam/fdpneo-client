/**
 * UsersAdminView: "+ New user" opens the create form (regression for
 * fdpneo-client 0.9.2, where the form crashed the page while compiling its
 * email placeholder, "jdoe@org.example", as a linked message).
 */

import { describe, expect, it, vi } from "vitest";
import { computed } from "vue";
import { flushPromises, mount } from "@vue/test-utils";
import { VueQueryPlugin } from "@tanstack/vue-query";

vi.mock("@/stores/auth", () => ({
  useAuthStore: () => ({ isAdmin: true, user: { profile: { sub: "admin-id" } } }),
}));
vi.mock("@/composables/useUsers", () => ({
  useUsers: () => ({
    users: computed(() => [
      {
        id: "u1",
        username: "alice",
        email: "alice@fdp.local",
        first_name: "Alice",
        last_name: "Steward",
        roles: ["steward"],
        enabled: true,
      },
    ]),
    total: computed(() => 1),
    isLoading: computed(() => false),
    isError: computed(() => false),
    error: computed(() => null),
  }),
  useAssignableRoles: () => computed(() => ["admin", "steward"]),
  useInvalidateUsers: () => () => Promise.resolve(),
}));

import UsersAdminView from "./UsersAdminView.vue";

describe("UsersAdminView", () => {
  it("opens the create form with a literal email placeholder", async () => {
    const w = mount(UsersAdminView, { global: { plugins: [VueQueryPlugin] } });
    const open = w.findAll("button").find((b) => b.text().includes("New user"));
    expect(open).toBeDefined();
    await open?.trigger("click");
    await flushPromises();
    const form = w.find("form.create");
    expect(form.exists()).toBe(true);
    expect(form.find('input[type="email"]').attributes("placeholder")).toBe("jdoe@org.example");
  });
});
