/**
 * Smoke test for the root shell.
 *
 * The shell wraps a header (FDP glyph + wordmark, primary tab nav, search,
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
  it("renders the brand lockup, primary nav, and a sign-in affordance", async () => {
    const stub = { template: "<div/>" };
    const router = createRouter({
      history: createMemoryHistory(),
      routes: [
        { path: "/", name: "browse", component: stub },
        { path: "/search", name: "search", component: stub },
        { path: "/advanced-search", name: "advanced-search", component: stub },
        { path: "/schemas", name: "schemas", component: stub },
        { path: "/policies", name: "policies", component: stub },
        { path: "/metrics", name: "metrics", component: stub },
        { path: "/dashboard", name: "dashboard", component: stub },
      ],
    });
    await router.push("/");
    await router.isReady();

    const wrapper = mount(App, {
      global: { plugins: [createPinia(), router, VueQueryPlugin] },
    });

    // Wordmark (FAIR Ecosystem lockup — no more "DATA POINT" / "neo").
    expect(wrapper.text()).toContain("FAIR Data Point");
    // Primary tab navigation.
    expect(wrapper.text()).toContain("Browse");
    expect(wrapper.text()).toContain("Schemas");
    expect(wrapper.text()).toContain("Sign in");
  });
});
