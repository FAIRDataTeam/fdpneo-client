/**
 * Minimal, dependency-free syntax tokenizer for Turtle / N-Triples — purely for
 * display in the RDF preview panel (Phase 13.7). It returns plain-data segments
 * that the component renders as Vue-escaped <span>s, so it is XSS-safe even though
 * the input is server RDF (no `v-html`).
 *
 * It is deliberately approximate, not a parser: it recognizes comments, IRI refs,
 * string literals, `@prefix`/`@base`/`PREFIX`/`BASE` directives, and prefixed
 * names (incl. the keyword `a`). Anything else is left unclassed. Because string
 * and IRI tokens are matched whole, a `#` inside `<…#Frag>` or a quote inside a
 * literal never trips the comment/string rules.
 */

export type TokenClass = "cmt" | "iri" | "str" | "kw" | "pname";

export interface Segment {
  text: string;
  cls?: TokenClass;
}

// Group order = precedence at a given index: comment, IRI, string, directive
// keyword, prefixed-name-or-`a`.
const TOKEN =
  /(#[^\n]*)|(<[^>\s]*>)|("""[\s\S]*?"""|'''[\s\S]*?'''|"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*')|(@(?:prefix|base)\b|\b(?:PREFIX|BASE)\b)|([A-Za-z][\w.-]*:[\w.\-%]*|\ba\b)/g;

const CLASS_BY_GROUP: TokenClass[] = ["cmt", "iri", "str", "kw", "pname"];

/** Tokenize Turtle/N-Triples into classed segments (plain text between tokens). */
export function highlightTurtle(src: string): Segment[] {
  const out: Segment[] = [];
  let last = 0;
  TOKEN.lastIndex = 0;
  let m: RegExpExecArray | null;
  while ((m = TOKEN.exec(src))) {
    if (m.index > last) out.push({ text: src.slice(last, m.index) });
    // Find which capture group matched (1-based) → its class.
    const groupIndex = m.findIndex((g, i) => i > 0 && g !== undefined);
    const cls = CLASS_BY_GROUP[groupIndex - 1];
    out.push(cls ? { text: m[0], cls } : { text: m[0] });
    last = m.index + m[0].length;
    // Guard against zero-width matches (shouldn't happen, but be safe).
    if (m[0].length === 0) TOKEN.lastIndex++;
  }
  if (last < src.length) out.push({ text: src.slice(last) });
  return out;
}
