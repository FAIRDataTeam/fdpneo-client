/**
 * AboutSidecar — the dual-identifier display block (ADR-0014).
 *
 * The "Identifiers" section appears only when the record carries any of
 * dct:identifier / owl:sameAs / skos:exactMatch, and renders the foreign IRIs
 * as external links (they're not FDP-routable). owl:sameAs can be present
 * without the user entering it (server-recorded), so this is a display surface.
 */

import { describe, expect, it } from "vitest";
import { mount } from "@vue/test-utils";
import AboutSidecar from "./AboutSidecar.vue";
import type { FdpRecord } from "@/data/sampleRecord";

function record(over: Partial<FdpRecord> = {}): FdpRecord {
  return {
    id: "dataset/x",
    type: "dataset",
    typeLabel: "Dataset",
    title: "X",
    description: "",
    publisher: "",
    publisherUri: "",
    version: "",
    versionDate: "",
    language: "",
    license: "",
    licenseUri: "",
    conformsTo: "",
    identifier: "",
    sameAs: [],
    exactMatch: [],
    issued: "2026-01-01",
    modified: "2026-01-02",
    keywords: [],
    themes: [],
    spatial: "",
    temporal: "",
    participants: 0,
    visits: 0,
    distributions: [],
    access: { summary: "", permitted: [], restricted: [] },
    related: [],
    ...over,
  };
}

function render(rec: FdpRecord) {
  return mount(AboutSidecar, {
    props: { record: rec, recordId: rec.id },
    // Child components pull in http/routing we don't exercise here.
    global: { stubs: { RdfPreviewPanel: true, RelatedList: true } },
  });
}

describe("AboutSidecar identifiers", () => {
  it("hides the Identifiers section when none are present", () => {
    const w = render(record());
    expect(w.text()).not.toContain("Identifiers");
  });

  it("shows identifier, owl:sameAs and skos:exactMatch as links", () => {
    const w = render(
      record({
        identifier: "https://doi.org/10.5072/x",
        sameAs: ["https://w3id.org/example/x"],
        exactMatch: ["https://registry.example.org/x"],
      }),
    );
    expect(w.text()).toContain("Identifiers");

    const hrefs = w.findAll("a").map((a) => a.attributes("href"));
    expect(hrefs).toContain("https://doi.org/10.5072/x");
    expect(hrefs).toContain("https://w3id.org/example/x");
    expect(hrefs).toContain("https://registry.example.org/x");
    // Foreign IRIs open in a new tab (not FDP-routable).
    expect(w.find('a[target="_blank"]').exists()).toBe(true);
  });

  it("renders a non-URL identifier as plain text, not a link", () => {
    const w = render(record({ identifier: "10.5072/plain-doi" }));
    expect(w.text()).toContain("10.5072/plain-doi");
    expect(w.findAll("a").length).toBe(0);
  });
});
