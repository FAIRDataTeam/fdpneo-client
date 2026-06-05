<script setup lang="ts">
/**
 * Monaco-backed Turtle editor for the SHACL source tab (Phase 4, task 4.3).
 *
 * Mirrors `sparql/SparqlEditor.vue`: Monaco ships no Turtle grammar, so we
 * register a small Monarch tokenizer (prefixes, IRIs, prefixed names, strings,
 * numbers, comments, `a`/booleans) and two themes that track the app's
 * light/dark mode. Imports the slim editor API only, so Monaco stays out of the
 * initial bundle (this component is reached only from the lazily-routed schema
 * editor). Plain text in/out — no reserialise — so swapping it in for a
 * textarea is safe.
 */
import { onBeforeUnmount, onMounted, ref, watch } from "vue";
import * as monaco from "monaco-editor/esm/vs/editor/editor.api";
import EditorWorker from "monaco-editor/esm/vs/editor/editor.worker?worker";
import { useThemeStore } from "@/stores/theme";

const props = withDefaults(
  defineProps<{ modelValue: string; readonly?: boolean; ariaLabel?: string }>(),
  { readonly: false, ariaLabel: "Turtle editor" },
);
const emit = defineEmits<{ (e: "update:modelValue", v: string): void }>();

const theme = useThemeStore();
const host = ref<HTMLElement | null>(null);
let editor: monaco.editor.IStandaloneCodeEditor | null = null;

let initialised = false;
function setupMonacoOnce() {
  if (initialised) return;
  initialised = true;

  self.MonacoEnvironment = { getWorker: () => new EditorWorker() };

  monaco.languages.register({ id: "turtle" });
  monaco.languages.setMonarchTokensProvider("turtle", {
    tokenizer: {
      root: [
        [/#.*$/, "comment"],
        [/@(prefix|base)\b/, "keyword"],
        [/<[^>\s]*>/, "type.identifier"], // IRI ref
        [/[A-Za-z_][\w.-]*:[A-Za-z_][\w.-]*/, "attribute.name"], // prefixed name
        [/[A-Za-z_][\w.-]*:/, "attribute.name"], // prefix label
        [/:[A-Za-z_][\w.-]*/, "attribute.name"], // default-prefixed name (:Foo)
        [/\ba\b/, "keyword"], // rdf:type shorthand
        [/\b(true|false)\b/, "keyword"],
        [/"""/, { token: "string", next: "@tripleString" }],
        [/"/, { token: "string", next: "@string" }],
        [/[+-]?\d+(\.\d+)?([eE][+-]?\d+)?/, "number"],
        [/\^\^/, "operator"],
        [/[[\](){};,.]/, "delimiter"],
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

  monaco.editor.defineTheme("turtle-light", {
    base: "vs",
    inherit: true,
    rules: [{ token: "type.identifier", foreground: "2D5B89" }],
    colors: { "editor.background": "#ffffff" },
  });
  monaco.editor.defineTheme("turtle-dark", {
    base: "vs-dark",
    inherit: true,
    rules: [{ token: "type.identifier", foreground: "7CA9D6" }],
    colors: { "editor.background": "#0f1115" },
  });
}

function monacoTheme(): string {
  return theme.resolvedTheme === "dark" ? "turtle-dark" : "turtle-light";
}

onMounted(() => {
  setupMonacoOnce();
  if (!host.value) return;
  editor = monaco.editor.create(host.value, {
    value: props.modelValue,
    language: "turtle",
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
});

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
  border: 1px solid var(--line);
  border-radius: var(--r-2);
  overflow: hidden;
}
</style>
