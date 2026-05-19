/**
 * Splits `text` into ordered segments where matches of `query` are flagged.
 *
 * Used by RecordCard to render `<mark>` spans around matching substrings
 * without resorting to `v-html`.
 */

export interface HighlightSegment {
  text: string;
  match: boolean;
}

export function useHighlight(text: string, query: string): HighlightSegment[] {
  if (!query.trim()) return [{ text, match: false }];
  const re = new RegExp(`(${escape(query)})`, "ig");
  const parts = text.split(re);
  return parts.map((part) => ({
    text: part,
    match: part.toLowerCase() === query.toLowerCase(),
  }));
}

function escape(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
