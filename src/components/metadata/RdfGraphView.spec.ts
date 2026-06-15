/**
 * RdfGraphView — the live, instance-focused RDF graph. The pure record/attribute
 * split is covered in graphModel.spec.ts; here we verify the component wiring:
 * it renders one node per record + one tag per attribute, the Relations/Attributes
 * toggles hide the right layer, and clicking a record node refocuses.
 *
 * The record turtle fetch is mocked so no network is involved.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ref } from "vue";
import { flushPromises, mount } from "@vue/test-utils";

const BASE = "http://localhost:8000";
const FOCUS = `${BASE}/dataset/brain`;
const TURTLE = `
@prefix dcat: <http://www.w3.org/ns/dcat#> .
@prefix dct: <http://purl.org/dc/terms/> .
<${BASE}/dataset/brain> a dcat:Dataset ;
  dct:title "Brain MRI" ;
  dct:license <https://creativecommons.org/licenses/by/4.0/> ;
  dct:isPartOf <${BASE}/catalog/imaging> ;
  dcat:distribution <${BASE}/distribution/tabular> .
`;

// Static turtle regardless of focus path — enough to exercise the layers.
vi.mock("@/composables/useRecord", () => ({
  useRecordTurtle: () => ({ data: ref(TURTLE), isFetching: ref(false), isError: ref(false) }),
}));

import RdfGraphView from "./RdfGraphView.vue";

beforeEach(() => {
  window.__FDP_CONFIG__ = { apiUrl: BASE };
});
afterEach(() => {
  delete window.__FDP_CONFIG__;
});

async function render() {
  const w = mount(RdfGraphView, { props: { recordId: "dataset/brain", subjectIri: FOCUS } });
  await flushPromises();
  return w;
}

describe("RdfGraphView", () => {
  it("renders one node per record and one tag per attribute", async () => {
    const w = await render();
    // records: focus dataset + catalog (isPartOf) + distribution
    expect(w.findAll(".node")).toHaveLength(3);
    // attributes: rdf:type + dct:title + dct:license
    expect(w.findAll(".attrtag")).toHaveLength(3);
    expect(w.find(".node.focus .nlabel").text()).toBe("Brain MRI");
  });

  it("hides attributes when the Attributes layer is toggled off", async () => {
    const w = await render();
    await w.get('[aria-pressed][class*="attr"]').trigger("click");
    expect(w.findAll(".attrtag")).toHaveLength(0);
    expect(w.findAll(".node")).toHaveLength(3); // records untouched
  });

  it("collapses to the focus node when Relations is toggled off", async () => {
    const w = await render();
    await w.get('.toggle.rel').trigger("click");
    expect(w.findAll(".node")).toHaveLength(1);
    expect(w.find(".node.focus").exists()).toBe(true);
  });

  it("refocuses onto a clicked record node", async () => {
    const w = await render();
    const catalog = w.findAll(".node").find((n) => n.text().includes("imaging"));
    expect(catalog).toBeTruthy();
    await catalog!.trigger("click");
    await flushPromises();
    expect(w.find(".firi").text()).toBe(`${BASE}/catalog/imaging`);
  });

  it("emits close from the toolbar close button", async () => {
    const w = await render();
    await w.get('[aria-label="Close graph"]').trigger("click");
    expect(w.emitted("close")).toBeTruthy();
  });
});
