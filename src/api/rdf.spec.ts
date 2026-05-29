/**
 * Unit tests for the RDF → view-model mapping.
 *
 * The Turtle fixtures mirror what the FDP server returns for a record
 * (DCAT vocabulary, absolute IRIs). `mapRecord` takes the resource IRI
 * explicitly, so these tests don't depend on the API-base env var.
 */

import { describe, expect, it } from "vitest";
import {
  iriToId,
  licenseLabel,
  mapRecord,
  shortLabel,
  distributionIris,
  parseTurtle,
  one,
  setLiteral,
  setIri,
  serializeTurtle,
} from "./rdf";

const DATASET_TTL = `
@prefix dcat: <http://www.w3.org/ns/dcat#> .
@prefix dcterms: <http://purl.org/dc/terms/> .
@prefix xsd: <http://www.w3.org/2001/XMLSchema#> .
<http://localhost:8000/dataset/ad-cohort-2024> a dcat:Dataset ;
  dcterms:title "AD Cohort 2024" ;
  dcterms:description "Longitudinal MRI data." ;
  dcterms:identifier "https://doi.org/10.5072/fdp/ad" ;
  dcterms:publisher <https://www.erasmusmc.nl> ;
  dcterms:license <https://creativecommons.org/licenses/by/4.0/> ;
  dcterms:isPartOf <http://localhost:8000/catalog/cohort> ;
  dcat:keyword "alzheimer", "mri" ;
  dcat:theme <http://example.org/theme/neurology> ;
  dcat:distribution <http://localhost:8000/distribution/ad-csv> ;
  dcterms:issued "2024-09-08T00:00:00+00:00"^^xsd:dateTime ;
  dcterms:modified "2026-04-12T00:00:00+00:00"^^xsd:dateTime .
`;

const IRI = "http://localhost:8000/dataset/ad-cohort-2024";

describe("mapRecord", () => {
  const rec = mapRecord(DATASET_TTL, IRI);

  it("derives the path id and type from the graph", () => {
    expect(rec.id).toBe("dataset/ad-cohort-2024");
    expect(rec.type).toBe("dataset");
    expect(rec.typeLabel).toBe("Dataset");
  });

  it("maps the DCAT literals", () => {
    expect(rec.title).toBe("AD Cohort 2024");
    expect(rec.description).toBe("Longitudinal MRI data.");
    expect(rec.identifier).toBe("https://doi.org/10.5072/fdp/ad");
    expect(rec.keywords).toEqual(["alzheimer", "mri"]);
  });

  it("formats dateTimes as ISO dates", () => {
    expect(rec.issued).toBe("2024-09-08");
    expect(rec.modified).toBe("2026-04-12");
  });

  it("resolves the license to a friendly label and keeps the IRI", () => {
    expect(rec.license).toBe("CC BY 4.0");
    expect(rec.licenseUri).toBe("https://creativecommons.org/licenses/by/4.0/");
  });

  it("shortens theme and publisher IRIs", () => {
    expect(rec.themes).toEqual(["neurology"]);
    expect(rec.publisher).toBe("www.erasmusmc.nl");
    expect(rec.publisherUri).toBe("https://www.erasmusmc.nl");
  });

  it("falls back to linked distribution IRIs when no details are supplied", () => {
    expect(rec.distributions).toHaveLength(1);
    expect(rec.distributions[0]?.id).toBe("distribution/ad-csv");
  });

  it("prefers supplied distribution details", () => {
    const withDetail = mapRecord(DATASET_TTL, IRI, [
      { id: "distribution/ad-csv", title: "Scores CSV", format: "text/csv", size: null, access: "Open download" },
    ]);
    expect(withDetail.distributions[0]?.title).toBe("Scores CSV");
    expect(withDetail.distributions[0]?.format).toBe("text/csv");
  });

  it("leaves server-absent fields empty rather than inventing them", () => {
    expect(rec.participants).toBe(0);
    expect(rec.visits).toBe(0);
    expect(rec.related).toEqual([]);
    expect(rec.version).toBe("");
  });
});

describe("rdf helpers", () => {
  it("iriToId returns the IRI unchanged when it is not under the base", () => {
    expect(iriToId("http://other.example/x")).toContain("other.example");
  });

  it("licenseLabel maps Creative Commons URIs", () => {
    expect(licenseLabel("https://creativecommons.org/licenses/by-nc/4.0/")).toBe("CC BY-NC 4.0");
    expect(licenseLabel("https://creativecommons.org/publicdomain/zero/1.0/")).toBe("CC0");
    expect(licenseLabel(undefined)).toBe("");
    expect(licenseLabel("https://example.org/custom")).toBe("https://example.org/custom");
  });

  it("shortLabel takes the last meaningful segment", () => {
    expect(shortLabel("http://www.w3.org/ns/dcat#Dataset")).toBe("Dataset");
    expect(shortLabel("https://example.org/theme/neurology")).toBe("neurology");
  });

  it("distributionIris reads dcat:distribution links", () => {
    expect(distributionIris(DATASET_TTL, IRI)).toEqual([
      "http://localhost:8000/distribution/ad-csv",
    ]);
  });
});

describe("graph mutation + serialization (read-modify-write)", () => {
  const ROOT = "http://localhost:8000";
  const REPO_TTL = `
@prefix dcterms: <http://purl.org/dc/terms/> .
<http://localhost:8000> a <http://www.w3.org/ns/ldp#BasicContainer>, <https://w3id.org/fdp/o#Repository> ;
  dcterms:rights <https://w3id.org/fdp/profiles/default/offers/public-read-steward-modify> ;
  dcterms:title "default" .
`;

  it("setLiteral replaces a value while preserving other triples", async () => {
    const store = parseTurtle(REPO_TTL);
    setLiteral(store, ROOT, "http://purl.org/dc/terms/title", "Erasmus MC FDP");
    setLiteral(store, ROOT, "http://purl.org/dc/terms/description", "Open research metadata");
    setIri(store, ROOT, "http://purl.org/dc/terms/publisher", "https://erasmusmc.nl");

    expect(one(store, ROOT, "http://purl.org/dc/terms/title")).toBe("Erasmus MC FDP");
    // unrelated triples survive
    expect(one(store, ROOT, "http://purl.org/dc/terms/rights")).toBe(
      "https://w3id.org/fdp/profiles/default/offers/public-read-steward-modify",
    );

    const ttl = await serializeTurtle(store);
    const round = parseTurtle(ttl);
    expect(one(round, ROOT, "http://purl.org/dc/terms/title")).toBe("Erasmus MC FDP");
    expect(one(round, ROOT, "http://purl.org/dc/terms/description")).toBe("Open research metadata");
    expect(one(round, ROOT, "http://purl.org/dc/terms/publisher")).toBe("https://erasmusmc.nl");
    expect(one(round, ROOT, "http://purl.org/dc/terms/rights")).toBe(
      "https://w3id.org/fdp/profiles/default/offers/public-read-steward-modify",
    );
  });

  it("setLiteral with an empty value removes the predicate", () => {
    const store = parseTurtle(REPO_TTL);
    setLiteral(store, ROOT, "http://purl.org/dc/terms/title", "   ");
    expect(one(store, ROOT, "http://purl.org/dc/terms/title")).toBeUndefined();
  });
});
