/**
 * Normalise free-text into a URL-safe slug: lowercased, non-alphanumeric runs
 * collapsed to single hyphens, leading/trailing hyphens trimmed.
 *
 * Used for the client-chosen id of created resources (schemas, records) so the
 * stored id is consistent no matter how the user types it — e.g.
 * `slugify("My Schema!")` → `"my-schema"`.
 */
export function slugify(input: string): string {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}
