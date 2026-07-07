/**
 * Temporary fixture data.
 *
 * Ported from the Claude Design hand-off bundle (data.jsx). Replace with
 * OpenAPI-generated types and real fetches via `src/api/http.ts` once Task 0.2
 * from TASKS.md (`npm run generate-api`) has been completed.
 *
 * The interfaces below are hand-written stand-ins that match the shape of the
 * fixture. When the generated `src/api/schema.ts` exists, swap these to
 * `components["schemas"]["…"]`.
 */

import type { RecordKind } from "@/types/record";

export interface Deployment {
  name: string;
  host: string;
  tagline: string;
}

export interface TreeNode {
  id: string;
  label: string;
  count?: number;
  children?: TreeNode[];
}

export interface Distribution {
  id: string;
  title: string;
  format: string;
  size: string | null;
  access: string;
}

export interface Related {
  id: string;
  typeLabel: string;
  title: string;
}

export interface RecordAccess {
  summary: string;
  permitted: string[];
  restricted: string[];
}

export interface FdpRecord {
  id: string;
  type: RecordKind;
  typeLabel: string;
  title: string;
  description: string;
  publisher: string;
  publisherUri: string;
  /** `dct:creator` short label + raw IRI (resolved to human text via `/labels`). */
  creator?: string;
  creatorUri?: string;
  version: string;
  versionDate: string;
  language: string;
  /** Raw `dct:language` IRI (for `/labels`); `language` is the fallback label. */
  languageUri?: string;
  license: string;
  licenseUri: string;
  conformsTo: string;
  /** `dct:rights` — the ODRL Offer IRI governing access, when set on this record
   * itself (absent ⇒ access is inherited from an ancestor container). */
  rightsUri: string;
  identifier: string;
  /** Equivalent foreign persistent identifiers (`owl:sameAs`) — ADR-0014. */
  sameAs: string[];
  /** Equivalent IRIs in another registry (`skos:exactMatch`). */
  exactMatch: string[];
  issued: string;
  modified: string;
  keywords: string[];
  themes: string[];
  /** Raw theme IRIs (for label resolution via `/labels`); `themes` are the fallback labels. */
  themeUris?: string[];
  spatial: string;
  /** Raw `dct:spatial` IRI (for `/labels`); `spatial` is the fallback label. */
  spatialUri?: string;
  temporal: string;
  participants: number;
  visits: number;
  distributions: Distribution[];
  access: RecordAccess;
  related: Related[];
}

export interface CatalogSummary {
  id: string;
  type: RecordKind;
  typeLabel: string;
  title: string;
  description: string;
  keywords: string[];
  modified: string;
  distributions: number;
}

export interface SearchResult {
  id: string;
  type: RecordKind;
  typeLabel: string;
  title: string;
  description: string;
  keywords: string[];
  match?: string;
  modified: string;
  distributions?: number | Distribution[];
  license?: string;
  restricted?: boolean;
  /** Publication state (PUBLISHED | DRAFT | ARCHIVED) when the search index reports it. */
  state?: string | null;
}

export const sampleDeployment: Deployment = {
  name: "Erasmus MC · Research data",
  host: "fdp.erasmusmc.nl",
  tagline: "Open metadata for cohort and registry data",
};

export const sampleTree: TreeNode = {
  id: "fdp",
  label: "Erasmus MC FDP",
  count: 142,
  children: [
    {
      id: "cohort",
      label: "Cohort studies",
      count: 38,
      children: [
        { id: "ad", label: "Alzheimer's Disease", count: 6 },
        { id: "park", label: "Parkinson Cohort", count: 4 },
        { id: "rotterdam", label: "Rotterdam Study", count: 12 },
      ],
    },
    {
      id: "imaging",
      label: "Imaging data",
      count: 24,
      children: [
        { id: "mri", label: "MRI", count: 14 },
        { id: "pet", label: "PET", count: 6 },
      ],
    },
    { id: "biobank", label: "Biobanks", count: 17 },
    { id: "registries", label: "Patient registries", count: 41 },
    { id: "publications", label: "Linked publications", count: 22 },
  ],
};

export const sampleRecord: FdpRecord = {
  id: "ad-cohort-2024",
  type: "dataset",
  typeLabel: "Dataset",
  title: "Alzheimer's Disease Cohort 2024 — Longitudinal MRI",
  description:
    "Longitudinal magnetic-resonance imaging and cognitive assessment data from 412 participants across three follow-up visits (baseline, 18 months, 36 months). Includes T1, T2-FLAIR, DTI sequences alongside MMSE, MoCA, and ADAS-Cog scores.",
  publisher: "Erasmus MC · Department of Neurology",
  publisherUri: "https://www.erasmusmc.nl/en/research/departments/neurology",
  creator: "Erasmus MC · Department of Neurology",
  creatorUri: "https://www.erasmusmc.nl/en/research/departments/neurology",
  version: "2024.2",
  versionDate: "2026-04-12",
  language: "English",
  license: "CC BY 4.0",
  licenseUri: "https://creativecommons.org/licenses/by/4.0/",
  conformsTo: "DCAT-AP 3.0 · FDP DatasetShape 1.2",
  rightsUri: "",
  identifier: "https://doi.org/10.5072/fdp/ad-cohort-2024",
  sameAs: ["https://w3id.org/example/ad-cohort-2024"],
  exactMatch: ["https://registry.example.org/datasets/ad-cohort-2024"],
  issued: "2024-09-08",
  modified: "2026-04-12",
  keywords: ["alzheimer", "longitudinal", "mri", "cognitive-assessment", "neurology"],
  themes: ["Neurology", "Dementia", "Neuroimaging"],
  spatial: "Netherlands · Rotterdam metropolitan area",
  temporal: "2021-03 → ongoing",
  participants: 412,
  visits: 3,
  distributions: [
    {
      id: "ttl",
      title: "Imaging archive · NIfTI",
      format: "application/zip",
      size: "84.2 GB",
      access: "Application required",
    },
    {
      id: "csv",
      title: "Cognitive scores · tabular",
      format: "text/csv",
      size: "2.4 MB",
      access: "Open download",
    },
    {
      id: "sparql",
      title: "SPARQL endpoint",
      format: "application/sparql-query",
      size: null,
      access: "Open query",
    },
  ],
  access: {
    summary: "Open for metadata. Imaging files require a signed data-use agreement.",
    permitted: ["Read metadata (anyone)", "Query SPARQL endpoint (anyone)"],
    restricted: ["Download imaging archive (requires DUA)"],
  },
  related: [
    { id: "park-2024", typeLabel: "Dataset", title: "Parkinson Cohort 2024 — MRI follow-up" },
    {
      id: "ad-pub-2025",
      typeLabel: "Publication",
      title: "Subcortical atrophy patterns in early AD",
    },
    { id: "imaging-vocab", typeLabel: "Schema", title: "Neuroimaging metadata profile v3" },
  ],
};

export const sampleCatalogs: CatalogSummary[] = [
  {
    id: "cohort",
    type: "catalog",
    typeLabel: "Catalog",
    title: "Cohort Studies",
    description:
      "Longitudinal observational cohorts maintained by Erasmus MC across neurology, cardiology, and oncology.",
    keywords: ["cohort", "longitudinal", "observational"],
    modified: "Apr 12 2026",
    distributions: 38,
  },
  {
    id: "imaging",
    type: "catalog",
    typeLabel: "Catalog",
    title: "Imaging",
    description: "MRI, PET, and CT collections with harmonised DICOM and NIfTI metadata.",
    keywords: ["mri", "pet", "dicom"],
    modified: "Mar 28 2026",
    distributions: 24,
  },
  {
    id: "biobank",
    type: "catalog",
    typeLabel: "Catalog",
    title: "Biobanks",
    description: "Sample-level metadata for blood, tissue, and CSF biobanks at Erasmus MC.",
    keywords: ["biobank", "biosamples", "csf"],
    modified: "Apr 02 2026",
    distributions: 17,
  },
  {
    id: "registries",
    type: "catalog",
    typeLabel: "Catalog",
    title: "Patient registries",
    description:
      "Disease-specific registries with consented and pseudonymised participant metadata.",
    keywords: ["registry", "rare-disease", "consent"],
    modified: "Apr 10 2026",
    distributions: 41,
  },
];

export const sampleSearchResults: SearchResult[] = [
  {
    id: sampleRecord.id,
    type: sampleRecord.type,
    typeLabel: sampleRecord.typeLabel,
    title: sampleRecord.title,
    description: sampleRecord.description,
    keywords: sampleRecord.keywords,
    match: "title, description, keywords",
    modified: "Apr 12 2026",
    distributions: sampleRecord.distributions,
    license: sampleRecord.license,
  },
  {
    id: "rot-mri-2023",
    type: "dataset",
    typeLabel: "Dataset",
    title: "Rotterdam Study — Cardiac MRI 2023 release",
    description:
      "Cardiac MRI scans from the Rotterdam Study with derived volumetric and strain measurements. Linked to cardiovascular endpoints.",
    keywords: ["mri", "cardiac", "rotterdam", "longitudinal"],
    match: "title, keywords",
    modified: "Mar 22 2026",
    distributions: 2,
    license: "CC BY-NC 4.0",
  },
  {
    id: "park-mri",
    type: "dataset",
    typeLabel: "Dataset",
    title: "Parkinson Cohort — MRI follow-up 2024",
    description:
      "Structural and functional MRI follow-up data from 206 Parkinson's participants over a 24-month interval.",
    keywords: ["mri", "parkinson", "longitudinal"],
    match: "keywords",
    modified: "Feb 10 2026",
    distributions: 2,
    license: "CC BY 4.0",
    restricted: true,
  },
  {
    id: "ad-biobank",
    type: "biobank",
    typeLabel: "Biobank",
    title: "AD Biobank — CSF samples 2018–2024",
    description:
      "Cerebrospinal-fluid samples from 612 donors with concurrent imaging and cognitive data.",
    keywords: ["alzheimer", "csf", "biosamples"],
    match: "title, description",
    modified: "Jan 30 2026",
    distributions: 1,
  },
  {
    id: "ad-pub-2025",
    type: "publication",
    typeLabel: "Publication",
    title: "Subcortical atrophy patterns in early Alzheimer's disease",
    description:
      "Peer-reviewed publication describing analysis pipelines for the AD Cohort 2024 longitudinal release.",
    keywords: ["alzheimer", "publication", "atrophy"],
    match: "description",
    modified: "Dec 04 2025",
  },
];
