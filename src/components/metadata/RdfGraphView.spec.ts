/**
 * RdfGraphView — one-hop node graph of a record's RDF (interface note #28).
 *
 * Verifies the things that are easy to get subtly wrong: centering on the
 * resource (and falling back when the hinted IRI is absent), drawing only the
 * resource's own triples, routing internal object IRIs vs. linking external
 * ones, and annotating literals with their language / datatype.
 */

import { afterEach, describe, expect, it } from "vitest";
import { mount } from "@vue/test-utils";
import { createRouter, createMemoryHistory } from "vue-router";
import RdfGraphView from "./RdfGraphView.vue";

const ROUTES = [
  { path: "/", name: "browse", component: { template: "<div/>" } },
  { path: "/records/:id+", name: "record-detail", component: { template: "<div/>" } },
];

async function render(turtle: string, subjectIri: string) {
  const router = createRouter({ history: createMemoryHistory(), routes: ROUTES });
  const wrapper = mount(RdfGraphView, {
    props: { turtle, subjectIri },
    global: { plugins: [router] },
  });
  await router.isReady();
  return wrapper;
}

afterEach(() => {
  delete window.__FDP_CONFIG__;
});

const PREFIX = `
@prefix dct: <http://purl.org/dc/terms/> .
@prefix dcat: <http://www.w3.org/ns/dcat#> .
@prefix rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#> .
@prefix xsd: <http://www.w3.org/2001/XMLSchema#> .
`;

describe("RdfGraphView", () => {
  it("centers on the resource and draws one branch per statement", async () => {
    const ttl = `${PREFIX}
      <http://x/dataset/a> a dcat:Dataset ;
        dct:title "BMI" ;
        dct:issued "2026-01-01"^^xsd:date .
      <http://x/other> dct:title "Not mine" .`;
    const w = await render(ttl, "http://x/dataset/a");

    expect(w.find(".root").text()).toBe("a");
    const branches = w.findAll(".branch");
    // type + title + issued — and nothing from <http://x/other>.
    expect(branches).toHaveLength(3);
    expect(w.text()).not.toContain("Not mine");
  });

  it("falls back to the best-connected subject when the hint is absent", async () => {
    // The root repository's IRI doesn't match its request path.
    const ttl = `${PREFIX}
      <http://fdp/> a dcat:Catalog ;
        dct:title "My FDP" ;
        dct:publisher <http://pub/x> .`;
    const w = await render(ttl, "http://does-not-exist/");

    expect(w.find(".root").text()).toBe("fdp"); // shortLabel of "http://fdp/"
    expect(w.findAll(".branch").length).toBe(3);
  });

  it("centers on the richest subject when the hint matches a sparse one", async () => {
    // The FDP root negotiates a sparse trailing-slash LDP container alongside the
    // real FAIRDataPoint; the hint matches the container, but we want the resource.
    const ttl = `${PREFIX}
      @prefix ldp: <http://www.w3.org/ns/ldp#> .
      <http://fdp> a dcat:Catalog ;
        dct:title "Root" ;
        dct:description "desc" ;
        dct:publisher <http://pub> .
      <http://fdp/> a ldp:DirectContainer ;
        ldp:membershipResource <http://fdp/> .`;
    const w = await render(ttl, "http://fdp/"); // hint = the sparse container

    // Centered on <http://fdp> (4 triples), not <http://fdp/> (2).
    expect(w.findAll(".branch").length).toBe(4);
    expect(w.text()).toContain("Root");
  });

  it("routes internal object IRIs and links external ones", async () => {
    // Internal detection keys off the configured API base.
    window.__FDP_CONFIG__ = { apiUrl: "http://x" };
    const ttl = `${PREFIX}
      <http://x/catalog/c> a dcat:Catalog ;
        dcat:dataset <http://x/dataset/d> ;
        dct:license <http://creativecommons.org/publicdomain/zero/1.0/> .`;
    const w = await render(ttl, "http://x/catalog/c");

    // Internal IRI (under the API base) becomes a RouterLink to the record.
    const routerLink = w.findComponent({ name: "RouterLink" });
    expect(routerLink.exists()).toBe(true);
    expect(routerLink.props("to")).toMatchObject({
      name: "record-detail",
      params: { id: "dataset/d" },
    });
    // External IRI opens in a new tab.
    const ext = w.findAll("a.iri").find((a) => a.attributes("target") === "_blank");
    expect(ext).toBeTruthy();
  });

  it("annotates literals with language tag and datatype", async () => {
    const ttl = `${PREFIX}
      <http://x/d> dct:title "Bonjour"@fr ;
        dct:issued "2026-01-01"^^xsd:date .`;
    const w = await render(ttl, "http://x/d");

    const notes = w.findAll(".note").map((n) => n.text());
    expect(notes).toContain("@fr");
    expect(notes).toContain("date");
  });

  it("reports a parse failure rather than throwing", async () => {
    const w = await render("this is not turtle <<<", "http://x/d");
    expect(w.find(".empty").text()).toContain("parse");
  });
});
