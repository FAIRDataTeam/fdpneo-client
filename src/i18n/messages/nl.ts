/**
 * Dutch UI messages.
 *
 * Term policy: Dutch IT borrows English heavily, so we KEEP record, metadata,
 * repository, endpoint, token, schema (schema's) and steward in English; we
 * translate the rest (catalogus, licentie, instellingen, statistieken). Acronyms
 * (API, SPARQL, IRI, SHACL, RDF) stay as-is.
 *
 * Machine-authored — pending native-speaker review. Typed `: Messages` so it
 * must stay structurally in step with `en.ts`.
 */

import type { Messages } from "./en";

const nl: Messages = {
  common: {
    loading: "Laden…",
  },
  header: {
    searchPlaceholder: "Zoek records, trefwoorden, thema's…",
    searchAria: "Zoek records, trefwoorden, thema's",
    advancedSearch: "Geavanceerd zoeken",
    signIn: "Inloggen",
    create: "Aanmaken",
    deploymentFallback: "FAIR Data Point",
  },
  footer: {
    appearance: "Weergave",
    about: "Over",
    api: "API",
    specification: "Specificatie",
  },
  userMenu: {
    ariaLabel: "Gebruikersmenu — {name}",
    signedIn: "Ingelogd",
    myMetadata: "Mijn metadata",
    metrics: "Statistieken",
    schemas: "Schema's",
    policies: "Beleid",
    licenses: "Licenties",
    resourceTypes: "Resourcetypen",
    settings: "Instellingen",
    appearance: "Weergave",
    users: "Gebruikers",
    profile: "Profiel",
    accessTokens: "Toegangstokens",
    signOut: "Uitloggen",
  },
  theme: {
    light: "Licht thema — klik voor donker",
    dark: "Donker thema — klik om systeem te volgen",
    system: "Volgt systeem — klik voor licht",
  },
  language: {
    switcherLabel: "Taal wijzigen",
  },
  errorBoundary: {
    readDocs: "Lees de relevante documentatie",
    tryAgain: "Opnieuw proberen",
    goHome: "Naar startpagina",
    code: "code: {code}",
    status: "status: {status}",
  },
  notFound: {
    eyebrow: "404 · NIET GEVONDEN",
    heading: "We konden dat niet vinden.",
    body: "De pagina {path} bestaat niet op deze omgeving. Mogelijk is deze verplaatst of is de link verouderd.",
    goHome: "Naar startpagina",
    searchRecords: "Records zoeken",
  },
  authCallback: {
    signingIn: "Je wordt ingelogd…",
    signingInBody:
      "Bezig met de beveiligde handshake met je identiteitsprovider. Dit duurt meestal minder dan een seconde.",
    failedHeading: "Dat ging niet goed.",
    failedBody: "We konden je inloggen niet voltooien.",
    providerReported: "De provider meldde:",
    tryAgain: "Opnieuw proberen",
    goHome: "Naar startpagina",
  },
  errors: {
    generic: "Er is een onverwachte fout opgetreden.",
    http: {
      "400": "Het verzoek was onjuist. Vernieuw de pagina en probeer het opnieuw.",
      "401": "Je sessie is verlopen. Log opnieuw in om door te gaan.",
      "403": "Je hebt geen toestemming om dat te doen.",
      "404": "Dat record bestaat niet of is verwijderd.",
      "408": "Het verzoek is verlopen. Probeer het zo meteen opnieuw.",
      "500": "De server liep tegen een onverwachte fout aan. We zijn op de hoogte gesteld.",
      "502": "De server is tijdelijk onbereikbaar. Probeer het binnenkort opnieuw.",
      "503": "De server is offline voor onderhoud. Probeer het later opnieuw.",
      "504": "De server reageerde niet op tijd. Probeer het opnieuw.",
    },
    fdp: {
      access: {
        denied:
          "Je hebt geen toegang tot dit record. Als je denkt dat dit onjuist is, neem dan contact op met de steward die op de recordpagina staat.",
        unauthenticated: "Log in om dit record te bekijken.",
      },
      validation: {
        failed:
          "De ingediende gegevens zijn niet door de validatie tegen het schema gekomen. Zie de vermelde overtredingen.",
        profile: "De inzending valt buiten het FDP-profiel dat deze server accepteert.",
      },
      ldp: {
        conflict:
          "Een andere wijziging aan dit record is eerder opgeslagen. Herlaad en pas je wijzigingen opnieuw toe.",
        gone: "Dit record is verwijderd. De identifier blijft behouden voor citaties.",
      },
      schema_protected:
        "Het FDP-rootschema kan niet worden verwijderd — het is vereist door de omgeving. Je kunt het wel bewerken.",
      conflict:
        "Een resourcetype verwijst nog naar dit schema. Verwijs dat type om of verwijder het eerst, en verwijder daarna het schema.",
      sparql: {
        parse:
          "De query kon niet worden geparseerd. Controleer de syntaxis rond de gemarkeerde positie.",
        timeout:
          "De query duurde te lang en is geannuleerd. Beperk deze met een LIMIT of een selectiever filter.",
      },
    },
    client: {
      network: "We konden de FDP-server niet bereiken. Controleer de verbinding en probeer het opnieuw.",
      exception: "Er is een onverwachte fout opgetreden.",
      unknown: "Er is een onverwachte fout opgetreden.",
    },
  },
  validation: {
    minLength: "moet minimaal {min} tekens bevatten",
    maxLength: "mag maximaal {max} tekens bevatten",
    pattern: "moet overeenkomen met het patroon {pattern}",
    minInclusive: "moet ≥ {value} zijn",
    maxInclusive: "moet ≤ {value} zijn",
    minExclusive: "moet > {value} zijn",
    maxExclusive: "moet < {value} zijn",
  },
  metadata: {
    eyebrow: "FAIR Data Point",
    defaultDescription:
      "Open metadata voor cohort-, beeld-, biobank- en registergegevens beheerd door onderzoekers van Erasmus MC. Blader door de catalogi, zoek door records of bevraag het SPARQL-endpoint.",
    editRepository: "Repository bewerken",
    catalogsHeading: "Catalogi",
    newCatalog: "Nieuwe catalogus",
    sortMostRecent: "Sorteren: meest recent",
    metaCatalogs: "Catalogi",
    metaCatalogsValue: "{catalogs} · {records} records",
    metaConformsTo: "Voldoet aan",
    metaLicense: "Licentie",
    metaLicenseValue: "CC BY 4.0 · open metadata",
  },
  search: {
    queryAria: "Zoekopdracht",
    placeholder: "Zoek records, trefwoorden, thema's…",
    searchButton: "Zoeken",
    removeFacet: "Facet verwijderen",
    results: "{n} resultaat | {n} resultaten",
    showing: "{start}–{end} weergegeven",
    noResults: "Geen records komen overeen met je zoekopdracht.",
    previous: "Vorige",
    next: "Volgende",
    rangeOf: "{start}–{end} van {total}",
    savedSearches: "Opgeslagen zoekopdrachten",
    nameThisSearch: "Geef deze zoekopdracht een naam…",
    savedSearchName: "Naam opgeslagen zoekopdracht",
    save: "Opslaan",
    shared: "gedeeld",
    share: "Delen",
    unshare: "Delen opheffen",
    deleteSavedSearch: "Opgeslagen zoekopdracht verwijderen",
  },
  schemaAdmin: {
    eyebrow: "FDP Neo · Beheer",
    heading: "Schema's",
    lede: "Publiceer de SHACL-shapes die records valideren. Sla hier een shape op en verwijs er vanuit {resourceTypes} een resourcetype naar.",
    ledeResourceTypes: "resourcetypen",
    adminOnlyNotice: "Bekijken staat open; publiceren of verwijderen van schema's vereist de beheerdersrol.",
    published: "Gepubliceerd",
    new: "Nieuw",
    loading: "Laden…",
    protectedShort: "Beschermd — kan niet worden verwijderd",
    noSchemas: "Nog geen schema's.",
    idLabel: "Schema-ID (naam)",
    saving: "Opslaan…",
    saveNewVersion: "Nieuwe versie opslaan",
    publish: "Schema publiceren",
    delete: "Verwijderen",
    protectedNote: "Beschermd — het FDP-rootschema kan niet worden verwijderd (bewerken mag wel).",
    testHeading: "Een voorbeeldrecord testen",
    testHelp: "Valideer een voorbeeld (Turtle) tegen de {saved} shape.",
    testHelpSaved: "opgeslagen",
    validating: "Valideren…",
    validateSample: "Voorbeeld valideren",
    saveFirst: "Sla de shape eerst op.",
    conforms: "Voldoet ✓",
    doesNotConform: "Voldoet niet",
    errMissingIdTitle: "ID ontbreekt",
    errMissingIdMsg: "Geef het schema een ID (naam).",
    errEmptyTitle: "Lege shape",
    errEmptyMsg: "De body van de shape mag niet leeg zijn.",
    errParseTitle: "Shape kon niet worden geparseerd",
    deleteConfirm: 'Schema "{id}" verwijderen?',
  },
};

export default nl;
