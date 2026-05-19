/**
 * Smoke test for the root shell.
 *
 * The shell wraps a header (with the FDP Neo lockup, deployment name, search,
 * theme toggle and Sign in) and a router outlet. This test verifies the basic
 * wiring is intact.
 */

import { describe, expect, it } from "vitest";
import { mount } from "@vue/test-utils";
import { createPinia } from "pinia";
import { createRouter, createMemoryHistory } from "vue-router";
import { VueQueryPlugin } from "@tanstack/vue-query";
import App from "./App.vue";

describe("App", () => {
  it("renders the brand lockup, deployment name, and a sign-in affordance", async () => {
    const router = createRouter({
      history: createMemoryHistory(),
      routes: [
        { path: "/", name: "browse", component: { template: "<div/>" } },
        { path: "/search", name: "search", component: { template: "<div/>" } },
        { path: "/dashboard", name: "dashboard", component: { template: "<div/>" } },
      ],
    });
    await router.push("/");
    await router.isReady();

    const wrapper = mount(App, {
      global: { plugins: [createPinia(), router, VueQueryPlugin] },
    });

    expect(wrapper.text()).toContain("FAIR");
    expect(wrapper.text()).toContain("DATA POINT");
    expect(wrapper.text()).toContain("neo");
    expect(wrapper.text()).toContain("Erasmus MC");
    expect(wrapper.text()).toContain("Sign in");
  });
});
