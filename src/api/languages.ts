/**
 * ISO 639-1 language tags for the language-tagged literal editor (note #26).
 *
 * `orderedLanguages()` puts the browser's current language first, then English
 * (when the browser isn't English), then the rest — so the common pick is at the
 * top. A curated subset of the most common languages; the value stays a free
 * BCP47 tag, so any code already on a record is preserved (see EntityForm).
 */

export interface LanguageOption {
  code: string;
  name: string;
}

/** ISO 639-1 codes + English names (common subset, alphabetical by name). */
export const LANGUAGES: LanguageOption[] = [
  { code: "ar", name: "Arabic" },
  { code: "bn", name: "Bengali" },
  { code: "bg", name: "Bulgarian" },
  { code: "ca", name: "Catalan" },
  { code: "zh", name: "Chinese" },
  { code: "hr", name: "Croatian" },
  { code: "cs", name: "Czech" },
  { code: "da", name: "Danish" },
  { code: "nl", name: "Dutch" },
  { code: "en", name: "English" },
  { code: "et", name: "Estonian" },
  { code: "fi", name: "Finnish" },
  { code: "fr", name: "French" },
  { code: "de", name: "German" },
  { code: "el", name: "Greek" },
  { code: "he", name: "Hebrew" },
  { code: "hi", name: "Hindi" },
  { code: "hu", name: "Hungarian" },
  { code: "id", name: "Indonesian" },
  { code: "it", name: "Italian" },
  { code: "ja", name: "Japanese" },
  { code: "ko", name: "Korean" },
  { code: "lv", name: "Latvian" },
  { code: "lt", name: "Lithuanian" },
  { code: "ms", name: "Malay" },
  { code: "no", name: "Norwegian" },
  { code: "fa", name: "Persian" },
  { code: "pl", name: "Polish" },
  { code: "pt", name: "Portuguese" },
  { code: "ro", name: "Romanian" },
  { code: "ru", name: "Russian" },
  { code: "sr", name: "Serbian" },
  { code: "sk", name: "Slovak" },
  { code: "sl", name: "Slovenian" },
  { code: "es", name: "Spanish" },
  { code: "sv", name: "Swedish" },
  { code: "th", name: "Thai" },
  { code: "tr", name: "Turkish" },
  { code: "uk", name: "Ukrainian" },
  { code: "vi", name: "Vietnamese" },
];

/** The browser's primary language subtag (e.g. "en-US" → "en"), lower-cased. */
export function browserLanguage(): string {
  const lang = typeof navigator !== "undefined" ? navigator.language : "en";
  return (lang || "en").split("-")[0]!.toLowerCase();
}

/** Languages ordered: browser language first, then English, then the rest. */
export function orderedLanguages(): LanguageOption[] {
  const browser = browserLanguage();
  const byCode = new Map(LANGUAGES.map((l) => [l.code, l]));
  const head: LanguageOption[] = [];
  const browserOpt = byCode.get(browser);
  if (browserOpt) head.push(browserOpt);
  if (browser !== "en") {
    const en = byCode.get("en");
    if (en) head.push(en);
  }
  const headCodes = new Set(head.map((l) => l.code));
  return [...head, ...LANGUAGES.filter((l) => !headCodes.has(l.code))];
}
