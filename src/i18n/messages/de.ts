/**
 * German UI messages.
 *
 * Machine-authored — pending native-speaker review, especially FAIR/RDF terms
 * (Katalog, Schema, SHACL, IRI, Verwalter). Typed `: Messages` so it must stay
 * structurally in step with `en.ts`.
 */

import type { Messages } from "./en";

const de: Messages = {
  common: {
    loading: "Wird geladen…",
  },
  header: {
    searchPlaceholder: "Datensätze, Schlagwörter, Themen suchen…",
    searchAria: "Datensätze, Schlagwörter, Themen suchen",
    advancedSearch: "Erweiterte Suche",
    signIn: "Anmelden",
    create: "Erstellen",
    deploymentFallback: "FAIR Data Point",
  },
  footer: {
    appearance: "Darstellung",
    about: "Über",
    api: "API",
    specification: "Spezifikation",
  },
  userMenu: {
    ariaLabel: "Benutzermenü — {name}",
    signedIn: "Angemeldet",
    myMetadata: "Meine Metadaten",
    metrics: "Metriken",
    schemas: "Schemata",
    policies: "Richtlinien",
    licenses: "Lizenzen",
    resourceTypes: "Ressourcentypen",
    settings: "Einstellungen",
    appearance: "Darstellung",
    users: "Benutzer",
    profile: "Profil",
    accessTokens: "Zugriffstoken",
    signOut: "Abmelden",
  },
  theme: {
    light: "Helles Design — klicken für dunkel",
    dark: "Dunkles Design — klicken, um dem System zu folgen",
    system: "Folgt dem System — klicken für hell",
  },
  language: {
    switcherLabel: "Sprache ändern",
  },
  errorBoundary: {
    readDocs: "Relevante Dokumentation lesen",
    tryAgain: "Erneut versuchen",
    goHome: "Zur Startseite",
    code: "Code: {code}",
    status: "Status: {status}",
  },
  notFound: {
    eyebrow: "404 · NICHT GEFUNDEN",
    heading: "Das konnten wir nicht finden.",
    body: "Die Seite {path} existiert in dieser Installation nicht. Sie wurde möglicherweise verschoben oder der Link ist veraltet.",
    goHome: "Zur Startseite",
    searchRecords: "Datensätze suchen",
  },
  authCallback: {
    signingIn: "Sie werden angemeldet…",
    signingInBody:
      "Der sichere Handshake mit Ihrem Identitätsanbieter wird abgeschlossen. Das dauert in der Regel weniger als eine Sekunde.",
    failedHeading: "Das hat nicht funktioniert.",
    failedBody: "Wir konnten Ihre Anmeldung nicht abschließen.",
    providerReported: "Der Anbieter meldete:",
    tryAgain: "Erneut versuchen",
    goHome: "Zur Startseite",
  },
  errors: {
    generic: "Ein unerwarteter Fehler ist aufgetreten.",
    http: {
      "400": "Die Anfrage war fehlerhaft. Aktualisieren Sie die Seite und versuchen Sie es erneut.",
      "401": "Ihre Sitzung ist abgelaufen. Melden Sie sich erneut an, um fortzufahren.",
      "403": "Sie haben keine Berechtigung dazu.",
      "404": "Dieser Datensatz existiert nicht oder wurde entfernt.",
      "408": "Die Anfrage ist abgelaufen. Versuchen Sie es gleich erneut.",
      "500": "Auf dem Server ist ein unerwarteter Fehler aufgetreten. Wir wurden benachrichtigt.",
      "502": "Der Server ist vorübergehend nicht erreichbar. Versuchen Sie es bald erneut.",
      "503": "Der Server ist wegen Wartung offline. Versuchen Sie es später erneut.",
      "504": "Der Server hat nicht rechtzeitig geantwortet. Versuchen Sie es erneut.",
    },
    fdp: {
      access: {
        denied:
          "Sie haben keinen Zugriff auf diesen Datensatz. Wenn Sie meinen, dass das falsch ist, wenden Sie sich an den auf der Datensatzseite genannten Verwalter.",
        unauthenticated: "Melden Sie sich an, um diesen Datensatz zu sehen.",
      },
      validation: {
        failed:
          "Die übermittelten Daten haben die Validierung gegen das Schema nicht bestanden. Siehe die aufgeführten Verstöße.",
        profile: "Die Übermittlung liegt außerhalb des FDP-Profils, das dieser Server akzeptiert.",
      },
      ldp: {
        conflict:
          "Eine andere Änderung an diesem Datensatz wurde zuerst gespeichert. Laden Sie neu und wenden Sie Ihre Änderungen erneut an.",
        gone: "Dieser Datensatz wurde gelöscht. Sein Bezeichner bleibt für Zitate erhalten.",
      },
      schema_protected:
        "Das FDP-Wurzelschema kann nicht gelöscht werden — es wird von der Installation benötigt. Sie können es weiterhin bearbeiten.",
      conflict:
        "Ein Ressourcentyp verweist noch auf dieses Schema. Verweisen Sie diesen Typ zuerst um oder entfernen Sie ihn, und löschen Sie dann das Schema.",
      sparql: {
        parse:
          "Die Abfrage konnte nicht geparst werden. Prüfen Sie die Syntax rund um die hervorgehobene Position.",
        timeout:
          "Die Abfrage hat zu lange gedauert und wurde abgebrochen. Schränken Sie sie mit einem LIMIT oder einem selektiveren Filter ein.",
      },
    },
    client: {
      network: "Wir konnten den FDP-Server nicht erreichen. Prüfen Sie die Verbindung und versuchen Sie es erneut.",
      exception: "Ein unerwarteter Fehler ist aufgetreten.",
      unknown: "Ein unerwarteter Fehler ist aufgetreten.",
    },
  },
  validation: {
    minLength: "muss mindestens {min} Zeichen lang sein",
    maxLength: "darf höchstens {max} Zeichen lang sein",
    pattern: "muss dem Muster {pattern} entsprechen",
    minInclusive: "muss ≥ {value} sein",
    maxInclusive: "muss ≤ {value} sein",
    minExclusive: "muss > {value} sein",
    maxExclusive: "muss < {value} sein",
  },
  metadata: {
    eyebrow: "FAIR Data Point",
    defaultDescription:
      "Offene Metadaten zu Kohorten-, Bildgebungs-, Biobank- und Registerdaten, die von Forschenden des Erasmus MC gepflegt werden. Durchstöbern Sie die Kataloge, suchen Sie über Datensätze hinweg oder fragen Sie den SPARQL-Endpunkt ab.",
    editRepository: "Repository bearbeiten",
    catalogsHeading: "Kataloge",
    newCatalog: "Neuer Katalog",
    sortMostRecent: "Sortieren: neueste zuerst",
    metaCatalogs: "Kataloge",
    metaCatalogsValue: "{catalogs} · {records} Datensätze",
    metaConformsTo: "Entspricht",
    metaLicense: "Lizenz",
    metaLicenseValue: "CC BY 4.0 · offene Metadaten",
  },
  search: {
    queryAria: "Suchanfrage",
    placeholder: "Datensätze, Schlagwörter, Themen suchen…",
    searchButton: "Suchen",
    removeFacet: "Facette entfernen",
    results: "{n} Ergebnis | {n} Ergebnisse",
    showing: "{start}–{end} werden angezeigt",
    noResults: "Keine Datensätze entsprechen Ihrer Suche.",
    previous: "Zurück",
    next: "Weiter",
    rangeOf: "{start}–{end} von {total}",
    savedSearches: "Gespeicherte Suchen",
    nameThisSearch: "Diese Suche benennen…",
    savedSearchName: "Name der gespeicherten Suche",
    save: "Speichern",
    shared: "geteilt",
    share: "Teilen",
    unshare: "Teilen aufheben",
    deleteSavedSearch: "Gespeicherte Suche löschen",
  },
};

export default de;
