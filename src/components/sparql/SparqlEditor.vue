<script setup lang="ts">
/**
 * Monaco-backed SPARQL editor.
 *
 * Monaco doesn't ship a SPARQL grammar, so we register a small Monarch
 * tokenizer (keywords, IRIs, prefixed names, variables, strings, comments)
 * and two themes that track the app's light/dark mode.
 *
 * This component is only imported by the (lazily-routed) SPARQL playground,
 * so Monaco stays out of the initial bundle. The editor worker is configured
 * here; we don't load the TS/JSON/CSS language workers since we only need
 * plain text editing plus our custom language.
 */
import { onBeforeUnmount, onMounted, ref, watch } from "vue";
// Import the slim editor API only — pulling in `monaco-editor` directly would
// bundle every built-in language mode and the JSON/CSS/HTML/TS language
// services (megabytes we don't use). We register just our SPARQL grammar.
import * as monaco from "monaco-editor/esm/vs/editor/editor.api";
import EditorWorker from "monaco-editor/esm/vs/editor/editor.worker?worker";
import { useThemeStore } from "@/stores/theme";

const props = withDefaults(
  defineProps<{ modelValue: string; readonly?: boolean; ariaLabel?: string }>(),
  { readonly: false, ariaLabel: "SPARQL query editor" },
);
const emit = defineEmits<{ (e: "update:modelValue", v: string): void; (e: "run"): void }>();

const theme = useThemeStore();
const host = ref<HTMLElement | null>(null);
let editor: monaco.editor.IStandaloneCodeEditor | null = null;

// One-time global setup, guarded so repeated mounts don't re-register.
let initialised = false;
function setupMonacoOnce() {
  if (initialised) return;
  initialised = true;

  self.MonacoEnvironment = { getWorker: () => new EditorWorker() };

  monaco.languages.register({ id: "sparql" });
  monaco.languages.setMonarchTokensProvider("sparql", {
    ignoreCase: true,
    keywords: [
      "SELECT", "CONSTRUCT", "DESCRIBE", "ASK", "WHERE", "FROM", "NAMED",
      "PREFIX", "BASE", "OPTIONAL", "GRAPH", "FILTER", "BIND", "VALUES",
      "SERVICE", "UNION", "MINUS", "DISTINCT", "REDUCED", "ORDER", "BY",
      "ASC", "DESC", "LIMIT", "OFFSET", "GROUP", "HAVING", "AS", "INSERT",
      "DELETE", "DATA", "WITH", "USING", "LOAD", "CLEAR", "DROP", "CREATE",
      "ADD", "MOVE", "COPY", "SILENT", "INTO", "TO", "DEFAULT", "ALL", "A",
      "TRUE", "FALSE", "COUNT", "SUM", "AVG", "MIN", "MAX", "SAMPLE",
      "GROUP_CONCAT", "SEPARATOR", "STR", "LANG", "LANGMATCHES", "DATATYPE",
      "BOUND", "IRI", "URI", "BNODE", "REGEX", "CONTAINS", "STRSTARTS",
      "STRENDS", "COALESCE", "IF", "EXISTS", "NOT", "IN",
    ],
    tokenizer: {
      root: [
        [/#.*$/, "comment"],
        [/<[^>\s]*>/, "type.identifier"], // IRI
        [/[?$][A-Za-z_][\w]*/, "variable"], // ?var / $var
        [/[A-Za-z_][\w-]*:[A-Za-z_][\w-]*/, "attribute.name"], // prefixed name
        [/[A-Za-z_][\w-]*:/, "attribute.name"], // prefix decl
        [/"""/, { token: "string", next: "@tripleString" }],
        [/"/, { token: "string", next: "@string" }],
        [/\b\d+(\.\d+)?\b/, "number"],
        [
          /[A-Za-z_]\w*/,
          { cases: { "@keywords": "keyword", "@default": "identifier" } },
        ],
        [/[{}()[\].;,]/, "delimiter"],
      ],
      string: [
        [/[^"\\]+/, "string"],
        [/\\./, "string.escape"],
        [/"/, { token: "string", next: "@pop" }],
      ],
      tripleString: [
        [/[^"]+/, "string"],
        [/"""/, { token: "string", next: "@pop" }],
        [/"/, "string"],
      ],
    },
  });

  // Monaco can't read CSS custom properties (canvas-rendered), so these mirror
  // the FAIR code-surface tokens as literals (teal keywords/IRIs, gold strings).
  monaco.editor.defineTheme("sparql-light", {
    base: "vs",
    inherit: true,
    rules: [
      { token: "keyword", foreground: "0e857f" },
      { token: "type.identifier", foreground: "0a5f5b" },
      { token: "string", foreground: "8a6d00" },
      { token: "comment", foreground: "9aa4b2" },
    ],
    colors: { "editor.background": "#f4f6f9" },
  });
  monaco.editor.defineTheme("sparql-dark", {
    base: "vs-dark",
    inherit: true,
    rules: [
      { token: "keyword", foreground: "5fc2bc" },
      { token: "type.identifier", foreground: "8fd8d3" },
      { token: "string", foreground: "c9a23a" },
      { token: "comment", foreground: "5f6a78" },
    ],
    colors: { "editor.background": "#131a23" },
  });
}

function monacoTheme(): string {
  return theme.resolvedTheme === "dark" ? "sparql-dark" : "sparql-light";
}

onMounted(() => {
  setupMonacoOnce();
  if (!host.value) return;
  editor = monaco.editor.create(host.value, {
    value: props.modelValue,
    language: "sparql",
    theme: monacoTheme(),
    readOnly: props.readonly,
    automaticLayout: true,
    minimap: { enabled: false },
    fontSize: 13,
    lineNumbers: "on",
    scrollBeyondLastLine: false,
    padding: { top: 10, bottom: 10 },
    ariaLabel: props.ariaLabel,
    tabSize: 2,
  });

  editor.onDidChangeModelContent(() => {
    const v = editor?.getValue() ?? "";
    if (v !== props.modelValue) emit("update:modelValue", v);
  });

  // Cmd/Ctrl+Enter runs the query.
  editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter, () => emit("run"));
});

// Keep the editor in sync when the model is changed from outside (history recall).
watch(
  () => props.modelValue,
  (v) => {
    if (editor && v !== editor.getValue()) editor.setValue(v);
  },
);

watch(
  () => theme.resolvedTheme,
  () => monaco.editor.setTheme(monacoTheme()),
);

onBeforeUnmount(() => {
  editor?.dispose();
  editor = null;
});
</script>

<template>
  <div ref="host" class="editor" :aria-label="ariaLabel" role="textbox" />
</template>

<style scoped>
.editor {
  height: 100%;
  width: 100%;
  border: 1px solid var(--fair-separator);
  border-radius: var(--fair-radius-md);
  overflow: hidden;
}
</style>
