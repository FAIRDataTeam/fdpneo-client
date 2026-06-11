/**
 * Resource-definition catalog client (server ADR-0009).
 *
 * The server exposes the deployment's metadata *types* at
 * `GET /resource-definitions` — runtime-mutable, so the set is not known at
 * build time. This module fetches that catalog and maps it onto the
 * client-side `EntitySpec` shape used by the authoring forms and browse tree.
 *
 * Pairs with `useResourceTypes`, which caches the catalog (TanStack Query) and
 * exposes the dynamic `specFor` / `typeForId` resolvers. The static
 * `ENTITY_SPECS` in `entityForms.ts` remains the offline fallback for the
 * standard DCAT types when this endpoint is unavailable.
 */

import { http } from "./http";
import { ENTITY_SPECS, type EntitySpec } from "./entityForms";

/** One typed child link of a resource definition (resolved by the server). */
export interface ResourceTypeChild {
  relationUri: string;
  /** URL prefix of the target type. */
  target: string;
  targetName: string;
  title: string;
}

/** One metadata type the deployment exposes. */
export interface ResourceTypeDef {
  slug: string;
  urlPrefix: string;
  name: string;
  /** SHACL shape IRI; doubles as the rdf:type for instances (FDP convention). */
  schemaIri: string;
  isRoot: boolean;
  children: ResourceTypeChild[];
}

interface RawChild {
  relationUri?: string;
  target?: string;
  targetName?: string;
  title?: string;
}

interface RawDefinition {
  slug?: string;
  urlPrefix?: string;
  name?: string;
  schema?: string;
  isRoot?: boolean;
  children?: RawChild[];
}

function toDef(raw: RawDefinition): ResourceTypeDef {
  return {
    slug: raw.slug ?? raw.urlPrefix ?? "",
    urlPrefix: raw.urlPrefix ?? "",
    name: raw.name ?? raw.urlPrefix ?? "",
    schemaIri: raw.schema ?? "",
    isRoot: raw.isRoot ?? raw.urlPrefix === "",
    children: (raw.children ?? []).map((c) => ({
      relationUri: c.relationUri ?? "",
      target: c.target ?? "",
      targetName: c.targetName ?? c.target ?? "",
      title: c.title ?? "",
    })),
  };
}

/** Fetch the deployment's resource-definition catalog. */
export async function fetchResourceTypes(): Promise<ResourceTypeDef[]> {
  const res = await http.get<{ definitions?: RawDefinition[] }>("/fdp-api/resource-definitions");
  return (res.data.definitions ?? []).map(toDef);
}

// --- admin mutations (admin role; ADR-0009) -------------------------------

/** A child link in a create/replace request (server `ChildLinkInput`). */
export interface ResourceTypeChildInput {
  relationUri: string;
  /** URL prefix of the target type. */
  target: string;
  title?: string;
}

/** Create/replace request body (server `ResourceDefinitionInput`). */
export interface ResourceTypeInput {
  urlPrefix: string;
  name: string;
  /** SHACL shape IRI the type's instances are validated against. */
  schema: string;
  children: ResourceTypeChildInput[];
}

/** Register a new type. Server requires the schema to be a published SHACL shape. */
export async function createResourceType(input: ResourceTypeInput): Promise<ResourceTypeDef> {
  const res = await http.post<RawDefinition>("/fdp-api/resource-definitions", input);
  return toDef(res.data);
}

/** Replace a type (incl. its child links — how a child is added to an existing type). */
export async function replaceResourceType(
  slug: string,
  input: ResourceTypeInput,
): Promise<ResourceTypeDef> {
  const res = await http.put<RawDefinition>(
    `/fdp-api/resource-definitions/${encodeURIComponent(slug)}`,
    input,
  );
  return toDef(res.data);
}

/** Delete a type (the server rejects deleting the root Repository). */
export async function deleteResourceType(slug: string): Promise<void> {
  await http.delete(`/fdp-api/resource-definitions/${encodeURIComponent(slug)}`);
}

/**
 * Build an `EntitySpec` from a server resource definition.
 *
 * `classIri` is the **rdf:type stamped on instances** — the SHACL shape's
 * `sh:targetClass` (e.g. `dcat:Catalog`). Pass it via `targetClass`, resolved
 * from the schema list (`SchemaSummary.targetClass`). It is NOT the schema IRI:
 * since shapes are stored under the managed namespace
 * (`{base}/fdp-api/schemas/{slug}`), the schema IRI and the class IRI are
 * distinct. We fall back to the static DCAT class for a known prefix, and only
 * as a last resort to the schema IRI (legacy deployments where the two coincide).
 *
 * `childTypes` are the target URL prefixes of the definition's child links, so a
 * type that gains a child at runtime (e.g. Catalog → a new Ontology type)
 * immediately offers it in the "new child" actions. Static `fields` for a known
 * DCAT type are reused as the offline fallback; runtime types rely on the SHACL
 * `/spec` endpoint (`useEntityShape`) for their fields.
 */
export function specFromDefinition(def: ResourceTypeDef, targetClass?: string | null): EntitySpec {
  const fallback = ENTITY_SPECS[def.urlPrefix];
  return {
    type: def.urlPrefix,
    classIri: targetClass || fallback?.classIri || def.schemaIri || def.urlPrefix,
    label: def.name || fallback?.label || def.urlPrefix,
    prefix: def.urlPrefix,
    childTypes: def.children.map((c) => c.target).filter(Boolean),
    fields: fallback?.fields ?? [],
  };
}
