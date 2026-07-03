/**
 * Turtle serialization helpers shared by the hand-rolled serializers (the ODRL,
 * license, and SHACL editors each build Turtle by string concatenation rather
 * than through a writer library).
 */

/**
 * Escape a string as a Turtle double-quoted literal and wrap it in quotes.
 *
 * Escapes backslash and double-quote, plus the C0 controls newline, carriage
 * return, and tab — all three must be escaped or the value changes (or the
 * literal breaks) when the Turtle is parsed back in. Returns the quoted form,
 * e.g. `quoteLiteral('a"b')` → `"a\"b"`.
 */
export function quoteLiteral(s: string): string {
  return `"${s
    .replace(/\\/g, "\\\\")
    .replace(/"/g, '\\"')
    .replace(/\n/g, "\\n")
    .replace(/\r/g, "\\r")
    .replace(/\t/g, "\\t")}"`;
}
