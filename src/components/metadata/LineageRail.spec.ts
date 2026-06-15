/**
 * LineageRail: one type-colored node per crumb, the current (link-less) hop
 * emphasized, node color bound from the crumb's record kind.
 */

import { describe, expect, it } from "vitest";
import { mount, RouterLinkStub } from "@vue/test-utils";
import LineageRail from "./LineageRail.vue";
import type { Crumb } from "@/composables/useAncestors";

const crumbs: Crumb[] = [
  { label: "Repo", to: "/", type: "fdp" },
  { label: "Imaging", to: "/records/catalog/c1", type: "catalog" },
  { label: "Brain MRI", to: null, type: "dataset" },
];

function render() {
  return mount(LineageRail, {
    props: { crumbs },
    global: { stubs: { RouterLink: RouterLinkStub } },
  });
}

describe("LineageRail", () => {
  it("renders one hop and one node per crumb", () => {
    const w = render();
    expect(w.findAll(".hop")).toHaveLength(3);
    expect(w.findAll(".node")).toHaveLength(3);
  });

  it("links the ancestor hops and marks the current record", () => {
    const w = render();
    // Two hops have a route target; the current (to: null) is a non-link span.
    expect(w.findAllComponents(RouterLinkStub)).toHaveLength(2);
    const current = w.find(".hop.current");
    expect(current.exists()).toBe(true);
    expect(current.text()).toBe("Brain MRI");
    expect(current.attributes("aria-current")).toBe("page");
  });

  it("binds the node color from the crumb kind", () => {
    const w = render();
    const current = w.find(".hop.current");
    expect(current.attributes("style")).toContain("var(--t-dataset)");
    expect(current.attributes("title")).toBe("dataset");
  });
});
