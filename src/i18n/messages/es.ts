/**
 * Spanish UI messages.
 *
 * Machine-authored — pending native-speaker review, especially FAIR/RDF terms
 * (catálogo, esquema, SHACL, IRI, responsable). Typed `: Messages` so it must
 * stay structurally in step with `en.ts`.
 */

import type { Messages } from "./en";

const es: Messages = {
  common: {
    loading: "Cargando…",
  },
  header: {
    searchPlaceholder: "Buscar registros, palabras clave, temas…",
    searchAria: "Buscar registros, palabras clave, temas",
    advancedSearch: "Búsqueda avanzada",
    signIn: "Iniciar sesión",
    create: "Crear",
    deploymentFallback: "FAIR Data Point",
  },
  footer: {
    appearance: "Apariencia",
    about: "Acerca de",
    api: "API",
    specification: "Especificación",
  },
  userMenu: {
    ariaLabel: "Menú de usuario — {name}",
    signedIn: "Sesión iniciada",
    myMetadata: "Mis metadatos",
    metrics: "Métricas",
    schemas: "Esquemas",
    policies: "Políticas",
    licenses: "Licencias",
    resourceTypes: "Tipos de recurso",
    settings: "Configuración",
    appearance: "Apariencia",
    users: "Usuarios",
    profile: "Perfil",
    accessTokens: "Tokens de acceso",
    signOut: "Cerrar sesión",
  },
  theme: {
    light: "Tema claro — haz clic para oscuro",
    dark: "Tema oscuro — haz clic para seguir el sistema",
    system: "Sigue el sistema — haz clic para claro",
  },
  language: {
    switcherLabel: "Cambiar idioma",
  },
  errorBoundary: {
    readDocs: "Lee la documentación relevante",
    tryAgain: "Intentar de nuevo",
    goHome: "Ir al inicio",
    code: "código: {code}",
    status: "estado: {status}",
  },
  notFound: {
    eyebrow: "404 · NO ENCONTRADO",
    heading: "No pudimos encontrar eso.",
    body: "La página {path} no existe en esta implementación. Es posible que se haya movido o que el enlace esté obsoleto.",
    goHome: "Ir al inicio",
    searchRecords: "Buscar registros",
  },
  authCallback: {
    signingIn: "Iniciando tu sesión…",
    signingInBody:
      "Completando el intercambio seguro con tu proveedor de identidad. Esto suele tardar menos de un segundo.",
    failedHeading: "Eso no funcionó.",
    failedBody: "No pudimos completar el inicio de sesión.",
    providerReported: "El proveedor informó:",
    tryAgain: "Intentar de nuevo",
    goHome: "Ir al inicio",
  },
  errors: {
    generic: "Ocurrió un error inesperado.",
    http: {
      "400": "La solicitud estaba mal formada. Actualiza la página e inténtalo de nuevo.",
      "401": "Tu sesión ha caducado. Vuelve a iniciar sesión para continuar.",
      "403": "No tienes permiso para hacer eso.",
      "404": "Ese registro no existe o fue eliminado.",
      "408": "La solicitud agotó el tiempo de espera. Inténtalo de nuevo en un momento.",
      "500": "El servidor sufrió un error inesperado. Se nos ha notificado.",
      "502": "El servidor está temporalmente inaccesible. Inténtalo de nuevo en breve.",
      "503": "El servidor está fuera de servicio por mantenimiento. Inténtalo más tarde.",
      "504": "El servidor no respondió a tiempo. Inténtalo de nuevo.",
    },
    fdp: {
      access: {
        denied:
          "No tienes acceso a este registro. Si crees que esto es un error, contacta con el responsable indicado en la página del registro.",
        unauthenticated: "Inicia sesión para ver este registro.",
      },
      validation: {
        failed:
          "Los datos enviados no superaron la validación contra el esquema. Consulta las infracciones listadas.",
        profile: "El envío queda fuera del perfil FDP que acepta este servidor.",
      },
      ldp: {
        conflict:
          "Otro cambio en este registro se guardó primero. Recarga y vuelve a aplicar tus ediciones.",
        gone: "Este registro fue eliminado. Su identificador se conserva para las citas.",
      },
      schema_protected:
        "El esquema raíz del FDP no se puede eliminar — la implementación lo requiere. Aún puedes editarlo.",
      conflict:
        "Un tipo de recurso aún hace referencia a este esquema. Reasigna o elimina ese tipo primero y luego elimina el esquema.",
      sparql: {
        parse:
          "No se pudo analizar la consulta. Revisa la sintaxis alrededor de la posición resaltada.",
        timeout:
          "La consulta tardó demasiado y se canceló. Acótala con un LIMIT o un filtro más selectivo.",
      },
    },
    client: {
      network: "No pudimos conectar con el servidor FDP. Comprueba la conexión e inténtalo de nuevo.",
      exception: "Ocurrió un error inesperado.",
      unknown: "Ocurrió un error inesperado.",
    },
  },
  validation: {
    minLength: "debe tener al menos {min} caracteres",
    maxLength: "debe tener como máximo {max} caracteres",
    pattern: "debe coincidir con el patrón {pattern}",
    minInclusive: "debe ser ≥ {value}",
    maxInclusive: "debe ser ≤ {value}",
    minExclusive: "debe ser > {value}",
    maxExclusive: "debe ser < {value}",
  },
  metadata: {
    eyebrow: "FAIR Data Point",
    defaultDescription:
      "Metadatos abiertos de datos de cohortes, imágenes, biobancos y registros mantenidos por investigadores de Erasmus MC. Explora los catálogos, busca entre los registros o consulta el endpoint SPARQL.",
    editRepository: "Editar repositorio",
    catalogsHeading: "Catálogos",
    newCatalog: "Nuevo catálogo",
    sortMostRecent: "Ordenar: más recientes",
    metaCatalogs: "Catálogos",
    metaCatalogsValue: "{catalogs} · {records} registros",
    metaConformsTo: "Conforme a",
    metaLicense: "Licencia",
    metaLicenseValue: "CC BY 4.0 · metadatos abiertos",
  },
  search: {
    queryAria: "Consulta de búsqueda",
    placeholder: "Buscar registros, palabras clave, temas…",
    searchButton: "Buscar",
    removeFacet: "Quitar faceta",
    results: "{n} resultado | {n} resultados",
    showing: "mostrando {start}–{end}",
    noResults: "Ningún registro coincide con tu búsqueda.",
    previous: "Anterior",
    next: "Siguiente",
    rangeOf: "{start}–{end} de {total}",
    savedSearches: "Búsquedas guardadas",
    nameThisSearch: "Nombra esta búsqueda…",
    savedSearchName: "Nombre de la búsqueda guardada",
    save: "Guardar",
    shared: "compartida",
    share: "Compartir",
    unshare: "Dejar de compartir",
    deleteSavedSearch: "Eliminar búsqueda guardada",
  },
};

export default es;
