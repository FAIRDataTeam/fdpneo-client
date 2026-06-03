<script setup lang="ts">
/**
 * App footer.
 *
 * Left: the client brand plus the connected server's build info, read live
 * from `GET /info` via `useAppInfo`. The visible build label is the short
 * commit when the server was built from a tagged checkout, otherwise the
 * environment, otherwise "(unknown build)"; the full detail (environment,
 * commit, built-at, runtime) rides in the `title` for hover inspection.
 *
 * Right: an admin-only readiness indicator (`ReadinessStrip`) and the
 * documentation links.
 */
import { computed } from "vue";
import ReadinessStrip from "@/components/shared/ReadinessStrip.vue";
import { useAppInfo } from "@/composables/useAppInfo";
import { buildLabel } from "@/api/info";

const { data: info } = useAppInfo();

const serverLabel = computed(() =>
  info.value ? `${info.value.name} v${info.value.version} · ${buildLabel(info.value)}` : "",
);

const serverTitle = computed(() => {
  if (!info.value) return undefined;
  const parts = [`environment: ${info.value.environment}`];
  if (info.value.build.commit) parts.push(`commit: ${info.value.build.commit}`);
  if (info.value.build.built_at) parts.push(`built: ${info.value.build.built_at}`);
  parts.push(`runtime: Python ${info.value.runtime.python_version}`);
  return parts.join(" · ");
});
</script>

<template>
  <footer>
    <div class="left">
      <span>FDP Neo</span>
      <template v-if="serverLabel">
        <span aria-hidden="true">·</span>
        <span class="server" :title="serverTitle">{{ serverLabel }}</span>
      </template>
    </div>
    <div class="right">
      <ReadinessStrip />
      <a href="#">API</a>
      <a href="#">About</a>
      <a href="#">Specification</a>
    </div>
  </footer>
</template>

<style scoped>
footer {
  padding: 20px 28px;
  border-top: 1px solid var(--line);
  display: flex;
  gap: 18px;
  align-items: center;
  justify-content: space-between;
  color: var(--muted);
  font-size: 12px;
  background: var(--surface);
}
.left,
.right {
  display: flex;
  gap: 14px;
  align-items: center;
}
.server {
  cursor: default;
}
.right a {
  color: inherit;
}
</style>
