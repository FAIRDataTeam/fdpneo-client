/**
 * The attributions page is where the DB-IP credit (CC BY 4.0) lives as a
 * canonical, persistent obligation — separate from the inline credit on the
 * metrics geo panel. These tests guard that the credit and its links stay
 * present and correct.
 */
import { describe, expect, it } from "vitest";
import { mount } from "@vue/test-utils";
import { VueQueryPlugin } from "@tanstack/vue-query";
import AttributionsView from "./AttributionsView.vue";

function mountView() {
  return mount(AttributionsView, {
    global: {
      plugins: [VueQueryPlugin],
      stubs: { RouterLink: true },
    },
  });
}

describe("AttributionsView", () => {
  it("credits DB-IP, linking to both the source and the CC BY 4.0 license", () => {
    const w = mountView();
    const text = w.text();
    expect(text).toContain("DB-IP IP-to-City Lite");
    expect(text).toContain("CC BY 4.0");

    const hrefs = w.findAll("a").map((a) => a.attributes("href"));
    expect(hrefs).toContain("https://db-ip.com");
    expect(hrefs).toContain("https://creativecommons.org/licenses/by/4.0/");
  });

  it("opens external attribution links safely in a new tab", () => {
    const w = mountView();
    const dbip = w.findAll("a").find((a) => a.attributes("href") === "https://db-ip.com");
    expect(dbip).toBeDefined();
    expect(dbip!.attributes("target")).toBe("_blank");
    expect(dbip!.attributes("rel")).toContain("noopener");
  });

  it("shows the client build version", () => {
    const w = mountView();
    expect(w.text()).toMatch(/Client/);
    expect(w.text()).toMatch(/v\d+\.\d+\.\d+/);
  });
});
