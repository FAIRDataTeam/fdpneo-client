/**
 * The boundary catches a render-time throw from a descendant and renders a
 * recovery UI. Clicking "Try again" remounts the slot subtree.
 */
import { describe, expect, it } from "vitest";
import { flushPromises, mount } from "@vue/test-utils";
import { createRouter, createMemoryHistory } from "vue-router";
import { defineComponent, h } from "vue";
import AppErrorBoundary from "./AppErrorBoundary.vue";

function makeRouter() {
  return createRouter({
    history: createMemoryHistory(),
    routes: [{ path: "/", name: "home", component: { template: "<div/>" } }],
  });
}

describe("AppErrorBoundary", () => {
  it("renders the fallback when a child throws and recovers on Try again", async () => {
    const router = makeRouter();
    await router.push("/");
    await router.isReady();

    // Module-scoped counter — survives remount so we can simulate "first
    // attempt throws, retry succeeds". The boundary exposes `remountKey`
    // as a slot prop; binding it to the child as a Vue key forces a real
    // unmount-remount on Try again.
    let mountCount = 0;
    const Crasher = defineComponent({
      setup() {
        mountCount++;
        if (mountCount === 1) throw new Error("kaboom");
        return () => h("div", { class: "recovered" }, "ok");
      },
    });

    const wrapper = mount(AppErrorBoundary, {
      global: { plugins: [router] },
      slots: {
        default: (slotProps: { remountKey: number }) =>
          h(Crasher, { key: slotProps.remountKey }),
      },
    });

    await flushPromises();

    expect(wrapper.text()).toContain("Something went wrong");
    expect(wrapper.text()).toContain("client.exception");

    const tryAgain = wrapper.findAll("button").find((b) => b.text().includes("Try again"));
    expect(tryAgain).toBeTruthy();
    await tryAgain!.trigger("click");
    await flushPromises();

    expect(wrapper.find(".recovered").exists()).toBe(true);
  });

  it("renders the slot content untouched when nothing throws", async () => {
    const router = makeRouter();
    await router.push("/");
    await router.isReady();

    const wrapper = mount(AppErrorBoundary, {
      global: { plugins: [router] },
      slots: { default: () => h("p", { class: "child" }, "all good") },
    });

    expect(wrapper.find(".child").exists()).toBe(true);
    expect(wrapper.text()).toBe("all good");
  });
});
