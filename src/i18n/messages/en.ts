/**
 * English UI messages — the source of truth and vue-i18n fallback locale.
 *
 * `Messages` (this file's shape) is the contract every other locale bundle must
 * satisfy structurally (see the sibling files, typed `: Messages`) and at
 * runtime (see `src/i18n/i18n.spec.ts`, which asserts key parity).
 *
 * Keys are namespaced by feature/surface. Interpolation uses named placeholders
 * (`{name}`); pluralization uses the `a | b` form selected by a count.
 */

const en = {
  common: {
    loading: "Loading…",
  },
  header: {
    searchPlaceholder: "Search records, keywords, themes…",
    searchAria: "Search records, keywords, themes",
    advancedSearch: "Advanced search",
    signIn: "Sign in",
    create: "Create",
    deploymentFallback: "FAIR Data Point",
  },
  footer: {
    appearance: "Appearance",
    about: "About",
    api: "API",
    specification: "Specification",
  },
  userMenu: {
    ariaLabel: "User menu — {name}",
    signedIn: "Signed in",
    myMetadata: "My metadata",
    metrics: "Metrics",
    schemas: "Schemas",
    policies: "Policies",
    licenses: "Licenses",
    resourceTypes: "Resource types",
    settings: "Settings",
    appearance: "Appearance",
    users: "Users",
    profile: "Profile",
    accessTokens: "Access tokens",
    signOut: "Sign out",
  },
  theme: {
    light: "Light theme — click for dark",
    dark: "Dark theme — click to follow system",
    system: "Follows system — click for light",
  },
  language: {
    switcherLabel: "Change language",
  },
  errorBoundary: {
    readDocs: "Read the relevant docs",
    tryAgain: "Try again",
    goHome: "Go to home",
    code: "code: {code}",
    status: "status: {status}",
  },
  notFound: {
    eyebrow: "404 · NOT FOUND",
    heading: "We couldn't find that.",
    body: "The page {path} doesn't exist on this deployment. It may have been moved, or the link may be stale.",
    goHome: "Go to home",
    searchRecords: "Search records",
  },
  authCallback: {
    signingIn: "Signing you in…",
    signingInBody:
      "Completing the secure handshake with your identity provider. This usually takes less than a second.",
    failedHeading: "That didn't work.",
    failedBody: "We couldn't finish signing you in.",
    providerReported: "The provider reported:",
    tryAgain: "Try again",
    goHome: "Go to home",
  },
  errors: {
    generic: "An unexpected error occurred.",
    http: {
      "400": "The request was malformed. Refresh the page and try again.",
      "401": "Your session has expired. Sign back in to continue.",
      "403": "You don't have permission to do that.",
      "404": "That record doesn't exist, or it was removed.",
      "408": "The request timed out. Try again in a moment.",
      "500": "The server hit an unexpected error. We've been notified.",
      "502": "The server is temporarily unreachable. Try again shortly.",
      "503": "The server is offline for maintenance. Try again later.",
      "504": "The server didn't respond in time. Try again.",
    },
    fdp: {
      access: {
        denied:
          "You don't have access to this record. If you think this is wrong, ask the steward listed on the record page.",
        unauthenticated: "Sign in to see this record.",
      },
      validation: {
        failed:
          "The submitted data didn't pass validation against the schema. See the listed violations.",
        profile: "The submission falls outside the FDP profile this server accepts.",
      },
      ldp: {
        conflict: "Another change to this record landed first. Reload and re-apply your edits.",
        gone: "This record was deleted. Its identifier is preserved for citations.",
      },
      schema_protected:
        "The FDP root schema can't be deleted — it's required by the deployment. You can still edit it.",
      conflict:
        "A resource type still references this schema. Repoint or remove that type first, then delete the schema.",
      sparql: {
        parse: "The query couldn't be parsed. Check the syntax around the highlighted position.",
        timeout:
          "The query took too long and was cancelled. Narrow it with a LIMIT or a more selective filter.",
      },
    },
    client: {
      network: "We couldn't reach the FDP server. Check the connection and try again.",
      exception: "An unexpected error occurred.",
      unknown: "An unexpected error occurred.",
    },
  },
  validation: {
    minLength: "must be at least {min} characters",
    maxLength: "must be at most {max} characters",
    pattern: "must match the pattern {pattern}",
    minInclusive: "must be ≥ {value}",
    maxInclusive: "must be ≤ {value}",
    minExclusive: "must be > {value}",
    maxExclusive: "must be < {value}",
  },
  metadata: {
    eyebrow: "FAIR Data Point",
    defaultDescription:
      "Open metadata for cohort, imaging, biobank and registry data maintained by Erasmus MC researchers. Browse the catalogs, search across records, or query the SPARQL endpoint.",
    editRepository: "Edit repository",
    catalogsHeading: "Catalogs",
    newCatalog: "New catalog",
    sortMostRecent: "Sort: most recent",
    metaCatalogs: "Catalogs",
    metaCatalogsValue: "{catalogs} · {records} records",
    metaConformsTo: "Conforms to",
    metaLicense: "License",
    metaLicenseValue: "CC BY 4.0 · open metadata",
  },
  search: {
    queryAria: "Search query",
    placeholder: "Search records, keywords, themes…",
    searchButton: "Search",
    removeFacet: "Remove facet",
    results: "{n} result | {n} results",
    showing: "showing {start}–{end}",
    noResults: "No records match your search.",
    previous: "Previous",
    next: "Next",
    rangeOf: "{start}–{end} of {total}",
    savedSearches: "Saved searches",
    nameThisSearch: "Name this search…",
    savedSearchName: "Saved search name",
    save: "Save",
    shared: "shared",
    share: "Share",
    unshare: "Unshare",
    deleteSavedSearch: "Delete saved search",
  },
};

export default en;

/** The structural contract every locale bundle must satisfy. */
export type Messages = typeof en;
