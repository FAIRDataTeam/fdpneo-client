/**
 * Form autocomplete — `GET /forms/autocomplete?source=…&prefix=…&limit=…`.
 *
 * The server exposes named suggestion sources (license, publisher, MIME type,
 * …) configured by admins (TASKS 10.5). Forms use them to suggest IRIs/values
 * as the user types. Suggestions are advisory: the field stays free-text, so a
 * failed lookup just yields no suggestions rather than blocking input.
 */

import { http } from "./http";
import type { components } from "./schema";

export type AutocompleteItem = components["schemas"]["AutocompleteResultItem"];

/** Fetch suggestions for a source filtered by a case-insensitive prefix. */
export async function fetchAutocomplete(
  source: string,
  prefix = "",
  limit = 25,
): Promise<AutocompleteItem[]> {
  const params = new URLSearchParams({ source, prefix, limit: String(limit) });
  const res = await http.get<components["schemas"]["AutocompleteResponse"]>(
    `/forms/autocomplete?${params.toString()}`,
  );
  return res.data.items ?? [];
}
