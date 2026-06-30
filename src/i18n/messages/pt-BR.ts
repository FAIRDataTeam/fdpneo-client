/**
 * Brazilian Portuguese UI messages.
 *
 * Term policy: traduz os termos correntes (esquema, catálogo, repositório,
 * registro, metadados, licença) e mantém os anglicismos consagrados na área
 * (token, endpoint, steward); siglas ficam como estão (API, SPARQL, IRI, SHACL,
 * RDF).
 *
 * Machine-authored — pending native-speaker review. Typed `: Messages` so it
 * must stay structurally in step with `en.ts`.
 */

import type { Messages } from "./en";

const ptBR: Messages = {
  common: {
    loading: "Carregando…",
  },
  header: {
    searchPlaceholder: "Buscar registros, palavras-chave, temas…",
    searchAria: "Buscar registros, palavras-chave, temas",
    advancedSearch: "Busca avançada",
    signIn: "Entrar",
    create: "Criar",
    deploymentFallback: "FAIR Data Point",
  },
  footer: {
    appearance: "Aparência",
    about: "Sobre",
    api: "API",
    specification: "Especificação",
  },
  userMenu: {
    ariaLabel: "Menu do usuário — {name}",
    signedIn: "Conectado",
    myMetadata: "Meus metadados",
    metrics: "Métricas",
    schemas: "Esquemas",
    policies: "Políticas",
    licenses: "Licenças",
    resourceTypes: "Tipos de recurso",
    settings: "Configurações",
    appearance: "Aparência",
    users: "Usuários",
    profile: "Perfil",
    accessTokens: "Tokens de acesso",
    signOut: "Sair",
  },
  theme: {
    light: "Tema claro — clique para escuro",
    dark: "Tema escuro — clique para seguir o sistema",
    system: "Segue o sistema — clique para claro",
  },
  language: {
    switcherLabel: "Alterar idioma",
  },
  errorBoundary: {
    readDocs: "Leia a documentação relevante",
    tryAgain: "Tentar novamente",
    goHome: "Ir para o início",
    code: "código: {code}",
    status: "status: {status}",
  },
  notFound: {
    eyebrow: "404 · NÃO ENCONTRADO",
    heading: "Não encontramos isso.",
    body: "A página {path} não existe nesta implantação. Ela pode ter sido movida, ou o link pode estar desatualizado.",
    goHome: "Ir para o início",
    searchRecords: "Buscar registros",
  },
  authCallback: {
    signingIn: "Conectando você…",
    signingInBody:
      "Concluindo a negociação segura com seu provedor de identidade. Isso normalmente leva menos de um segundo.",
    failedHeading: "Isso não funcionou.",
    failedBody: "Não conseguimos concluir seu login.",
    providerReported: "O provedor informou:",
    tryAgain: "Tentar novamente",
    goHome: "Ir para o início",
  },
  errors: {
    generic: "Ocorreu um erro inesperado.",
    http: {
      "400": "A requisição estava malformada. Atualize a página e tente novamente.",
      "401": "Sua sessão expirou. Entre novamente para continuar.",
      "403": "Você não tem permissão para fazer isso.",
      "404": "Esse registro não existe ou foi removido.",
      "408": "A requisição expirou. Tente novamente em instantes.",
      "500": "O servidor encontrou um erro inesperado. Já fomos notificados.",
      "502": "O servidor está temporariamente inacessível. Tente novamente em breve.",
      "503": "O servidor está fora do ar para manutenção. Tente novamente mais tarde.",
      "504": "O servidor não respondeu a tempo. Tente novamente.",
    },
    fdp: {
      access: {
        denied:
          "Você não tem acesso a este registro. Se achar que isto está errado, fale com o steward indicado na página do registro.",
        unauthenticated: "Entre para ver este registro.",
      },
      validation: {
        failed:
          "Os dados enviados não passaram na validação contra o esquema. Veja as violações listadas.",
        profile: "O envio está fora do perfil FDP que este servidor aceita.",
      },
      ldp: {
        conflict:
          "Outra alteração neste registro foi salva primeiro. Recarregue e reaplique suas edições.",
        gone: "Este registro foi excluído. Seu identificador é preservado para citações.",
      },
      schema_protected:
        "O esquema raiz do FDP não pode ser excluído — ele é exigido pela implantação. Você ainda pode editá-lo.",
      conflict:
        "Um tipo de recurso ainda referencia este esquema. Reaponte ou remova esse tipo primeiro e depois exclua o esquema.",
      sparql: {
        parse:
          "Não foi possível analisar a consulta. Verifique a sintaxe ao redor da posição destacada.",
        timeout:
          "A consulta demorou demais e foi cancelada. Restrinja-a com um LIMIT ou um filtro mais seletivo.",
      },
    },
    client: {
      network: "Não conseguimos acessar o servidor FDP. Verifique a conexão e tente novamente.",
      exception: "Ocorreu um erro inesperado.",
      unknown: "Ocorreu um erro inesperado.",
    },
  },
  validation: {
    minLength: "deve ter pelo menos {min} caracteres",
    maxLength: "deve ter no máximo {max} caracteres",
    pattern: "deve corresponder ao padrão {pattern}",
    minInclusive: "deve ser ≥ {value}",
    maxInclusive: "deve ser ≤ {value}",
    minExclusive: "deve ser > {value}",
    maxExclusive: "deve ser < {value}",
  },
  metadata: {
    eyebrow: "FAIR Data Point",
    defaultDescription:
      "Metadados abertos de dados de coorte, imagem, biobanco e registro mantidos por pesquisadores do Erasmus MC. Navegue pelos catálogos, busque entre os registros ou consulte o endpoint SPARQL.",
    editRepository: "Editar repositório",
    catalogsHeading: "Catálogos",
    newCatalog: "Novo catálogo",
    sortMostRecent: "Ordenar: mais recentes",
    metaCatalogs: "Catálogos",
    metaCatalogsValue: "{catalogs} · {records} registros",
    metaConformsTo: "Conforme a",
    metaLicense: "Licença",
    metaLicenseValue: "CC BY 4.0 · metadados abertos",
  },
  search: {
    queryAria: "Consulta de busca",
    placeholder: "Buscar registros, palavras-chave, temas…",
    searchButton: "Buscar",
    removeFacet: "Remover faceta",
    results: "{n} resultado | {n} resultados",
    showing: "exibindo {start}–{end}",
    noResults: "Nenhum registro corresponde à sua busca.",
    previous: "Anterior",
    next: "Próximo",
    rangeOf: "{start}–{end} de {total}",
    savedSearches: "Buscas salvas",
    nameThisSearch: "Nomeie esta busca…",
    savedSearchName: "Nome da busca salva",
    save: "Salvar",
    shared: "compartilhada",
    share: "Compartilhar",
    unshare: "Descompartilhar",
    deleteSavedSearch: "Excluir busca salva",
  },
};

export default ptBR;
