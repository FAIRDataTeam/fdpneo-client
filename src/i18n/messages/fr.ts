/**
 * French UI messages.
 *
 * Machine-authored — pending native-speaker review, especially FAIR/RDF terms
 * (catalogue, schéma, SHACL, IRI, gestionnaire). Typed `: Messages` so it must
 * stay structurally in step with `en.ts`.
 */

import type { Messages } from "./en";

const fr: Messages = {
  common: {
    loading: "Chargement…",
  },
  header: {
    searchPlaceholder: "Rechercher des enregistrements, mots-clés, thèmes…",
    searchAria: "Rechercher des enregistrements, mots-clés, thèmes",
    advancedSearch: "Recherche avancée",
    signIn: "Se connecter",
    create: "Créer",
    deploymentFallback: "FAIR Data Point",
  },
  footer: {
    appearance: "Apparence",
    about: "À propos",
    api: "API",
    specification: "Spécification",
  },
  userMenu: {
    ariaLabel: "Menu utilisateur — {name}",
    signedIn: "Connecté",
    myMetadata: "Mes métadonnées",
    metrics: "Métriques",
    schemas: "Schémas",
    policies: "Politiques",
    licenses: "Licences",
    resourceTypes: "Types de ressource",
    settings: "Paramètres",
    appearance: "Apparence",
    users: "Utilisateurs",
    profile: "Profil",
    accessTokens: "Jetons d'accès",
    signOut: "Se déconnecter",
  },
  theme: {
    light: "Thème clair — cliquez pour sombre",
    dark: "Thème sombre — cliquez pour suivre le système",
    system: "Suit le système — cliquez pour clair",
  },
  language: {
    switcherLabel: "Changer de langue",
  },
  errorBoundary: {
    readDocs: "Lire la documentation pertinente",
    tryAgain: "Réessayer",
    goHome: "Aller à l'accueil",
    code: "code : {code}",
    status: "statut : {status}",
  },
  notFound: {
    eyebrow: "404 · INTROUVABLE",
    heading: "Nous n'avons pas trouvé cette page.",
    body: "La page {path} n'existe pas sur ce déploiement. Elle a peut-être été déplacée, ou le lien est peut-être obsolète.",
    goHome: "Aller à l'accueil",
    searchRecords: "Rechercher des enregistrements",
  },
  authCallback: {
    signingIn: "Connexion en cours…",
    signingInBody:
      "Finalisation de l'échange sécurisé avec votre fournisseur d'identité. Cela prend généralement moins d'une seconde.",
    failedHeading: "Cela n'a pas fonctionné.",
    failedBody: "Nous n'avons pas pu finaliser votre connexion.",
    providerReported: "Le fournisseur a signalé :",
    tryAgain: "Réessayer",
    goHome: "Aller à l'accueil",
  },
  errors: {
    generic: "Une erreur inattendue s'est produite.",
    http: {
      "400": "La requête était mal formée. Actualisez la page et réessayez.",
      "401": "Votre session a expiré. Reconnectez-vous pour continuer.",
      "403": "Vous n'avez pas la permission de faire cela.",
      "404": "Cet enregistrement n'existe pas ou a été supprimé.",
      "408": "La requête a expiré. Réessayez dans un instant.",
      "500": "Le serveur a rencontré une erreur inattendue. Nous avons été notifiés.",
      "502": "Le serveur est temporairement injoignable. Réessayez bientôt.",
      "503": "Le serveur est hors ligne pour maintenance. Réessayez plus tard.",
      "504": "Le serveur n'a pas répondu à temps. Réessayez.",
    },
    fdp: {
      access: {
        denied:
          "Vous n'avez pas accès à cet enregistrement. Si vous pensez que c'est une erreur, contactez le gestionnaire indiqué sur la page de l'enregistrement.",
        unauthenticated: "Connectez-vous pour voir cet enregistrement.",
      },
      validation: {
        failed:
          "Les données soumises n'ont pas passé la validation par rapport au schéma. Consultez les violations répertoriées.",
        profile: "La soumission sort du profil FDP que ce serveur accepte.",
      },
      ldp: {
        conflict:
          "Une autre modification de cet enregistrement a été enregistrée en premier. Rechargez et réappliquez vos modifications.",
        gone: "Cet enregistrement a été supprimé. Son identifiant est conservé pour les citations.",
      },
      schema_protected:
        "Le schéma racine du FDP ne peut pas être supprimé — il est requis par le déploiement. Vous pouvez toujours le modifier.",
      conflict:
        "Un type de ressource référence encore ce schéma. Réaffectez ou supprimez d'abord ce type, puis supprimez le schéma.",
      sparql: {
        parse:
          "La requête n'a pas pu être analysée. Vérifiez la syntaxe autour de la position surlignée.",
        timeout:
          "La requête a pris trop de temps et a été annulée. Restreignez-la avec un LIMIT ou un filtre plus sélectif.",
      },
    },
    client: {
      network: "Nous n'avons pas pu joindre le serveur FDP. Vérifiez la connexion et réessayez.",
      exception: "Une erreur inattendue s'est produite.",
      unknown: "Une erreur inattendue s'est produite.",
    },
  },
  validation: {
    minLength: "doit comporter au moins {min} caractères",
    maxLength: "doit comporter au plus {max} caractères",
    pattern: "doit correspondre au motif {pattern}",
    minInclusive: "doit être ≥ {value}",
    maxInclusive: "doit être ≤ {value}",
    minExclusive: "doit être > {value}",
    maxExclusive: "doit être < {value}",
  },
  metadata: {
    eyebrow: "FAIR Data Point",
    defaultDescription:
      "Métadonnées ouvertes pour les données de cohortes, d'imagerie, de biobanques et de registres maintenues par les chercheurs d'Erasmus MC. Parcourez les catalogues, recherchez parmi les enregistrements ou interrogez le point de terminaison SPARQL.",
    editRepository: "Modifier le dépôt",
    catalogsHeading: "Catalogues",
    newCatalog: "Nouveau catalogue",
    sortMostRecent: "Trier : plus récents",
    metaCatalogs: "Catalogues",
    metaCatalogsValue: "{catalogs} · {records} enregistrements",
    metaConformsTo: "Conforme à",
    metaLicense: "Licence",
    metaLicenseValue: "CC BY 4.0 · métadonnées ouvertes",
  },
  search: {
    queryAria: "Requête de recherche",
    placeholder: "Rechercher des enregistrements, mots-clés, thèmes…",
    searchButton: "Rechercher",
    removeFacet: "Retirer la facette",
    results: "{n} résultat | {n} résultats",
    showing: "affichage de {start}–{end}",
    noResults: "Aucun enregistrement ne correspond à votre recherche.",
    previous: "Précédent",
    next: "Suivant",
    rangeOf: "{start}–{end} sur {total}",
    savedSearches: "Recherches enregistrées",
    nameThisSearch: "Nommez cette recherche…",
    savedSearchName: "Nom de la recherche enregistrée",
    save: "Enregistrer",
    shared: "partagée",
    share: "Partager",
    unshare: "Ne plus partager",
    deleteSavedSearch: "Supprimer la recherche enregistrée",
  },
};

export default fr;
