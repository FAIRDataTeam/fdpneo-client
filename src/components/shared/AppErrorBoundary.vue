<script setup lang="ts">
/**
 * Global error boundary.
 *
 * Catches errors from descendants via `onErrorCaptured` and renders a
 * recoverable fallback in place of the failed subtree. When the route
 * changes, the error clears automatically so the next view gets a fresh
 * surface.
 *
 * Errors are parsed through `parseFdpError`, so an FDP envelope with a known
 * code shows friendly copy (and an optional docs link); plain exceptions get
 * a generic surface; network failures get their own copy.
 *
 * Note: Vue 3's onErrorCaptured catches render/setup/lifecycle errors. It
 * does NOT catch errors thrown inside async event handlers — those need to
 * be reported explicitly. The boundary's `Try again` increments a key on the
 * slot's wrapper, forcing the failed subtree to remount.
 */
import { onErrorCaptured, ref, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import { useI18n } from "vue-i18n";
import { parseFdpError, type ParsedError } from "@/api/errors";
import { safeHref } from "@/composables/safeUrl";
import AppIcon from "./AppIcon.vue";

const { t } = useI18n();
const route = useRoute();
const router = useRouter();

const parsed = ref<ParsedError | null>(null);
const remountKey = ref(0);

onErrorCaptured((err) => {
  parsed.value = parseFdpError(err);
  // Let Vue stop propagation; we own the recovery UI.
  return false;
});

watch(
  () => route.fullPath,
  () => {
    if (parsed.value) parsed.value = null;
  },
);

function tryAgain() {
  parsed.value = null;
  remountKey.value++;
}

function goHome() {
  parsed.value = null;
  void router.push("/");
}
</script>

<template>
  <template v-if="parsed">
    <section class="boundary" role="alert" aria-live="assertive">
      <div class="card">
        <div class="badge">
          <AppIcon name="shield" :size="20" />
        </div>
        <h1>{{ parsed.title }}</h1>
        <p class="message">{{ parsed.message }}</p>

        <ul v-if="parsed.violations.length" class="violations">
          <li v-for="(v, i) in parsed.violations" :key="i">
            <span v-if="v.path" class="mono path">{{ v.path }}</span>
            <span>{{ v.message }}</span>
          </li>
        </ul>

        <p v-if="safeHref(parsed.docsUrl)" class="docs">
          <a :href="safeHref(parsed.docsUrl)" target="_blank" rel="noopener noreferrer">
            {{ t("errorBoundary.readDocs") }} <AppIcon name="arrow-r" :size="12" />
          </a>
        </p>

        <div class="actions">
          <button class="btn primary" @click="tryAgain">{{ t("errorBoundary.tryAgain") }}</button>
          <button class="btn" @click="goHome">{{ t("errorBoundary.goHome") }}</button>
        </div>

        <p class="meta mono">
          <span>{{ t("errorBoundary.code", { code: parsed.code }) }}</span>
          <span v-if="parsed.status !== null">
            · {{ t("errorBoundary.status", { status: parsed.status }) }}</span
          >
        </p>
      </div>
    </section>
  </template>
  <template v-else>
    <slot :remount-key="remountKey" />
  </template>
</template>

<style scoped>
.boundary {
  flex: 1;
  display: grid;
  place-items: center;
  padding: 60px 20px;
  background: var(--fair-bg);
}
.card {
  max-width: 560px;
  width: 100%;
  padding: 32px;
  border: 1px solid var(--fair-separator);
  border-radius: var(--fair-radius-lg);
  background: var(--fair-surface);
  display: flex;
  flex-direction: column;
  gap: 14px;
}
.badge {
  width: 40px;
  height: 40px;
  border-radius: 999px;
  background: var(--fair-warning-tint);
  color: var(--fair-warning);
  display: grid;
  place-items: center;
}
h1 {
  margin: 6px 0 0;
  font-family: var(--fair-font-sans);
  font-weight: 400;
  font-size: 28px;
  line-height: 1.2;
  color: var(--fair-text-strong);
}
.message {
  margin: 0;
  font-family: var(--fair-font-sans);
  font-weight: 400;
  font-size: 15px;
  line-height: 1.55;
  color: var(--fair-text);
}
.violations {
  margin: 6px 0 0;
  padding: 12px 14px;
  list-style: none;
  border: 1px solid var(--fair-separator);
  border-radius: var(--fair-radius-md);
  background: var(--fair-highlight);
  display: grid;
  gap: 8px;
}
.violations li {
  display: flex;
  flex-direction: column;
  gap: 2px;
  font-family: var(--fair-font-sans);
  font-weight: 400;
  font-size: 13px;
  line-height: 1.45;
  color: var(--fair-text);
}
.path {
  font-size: 11px;
  color: var(--fair-text-muted);
}
.docs {
  margin: 0;
  font-size: 13px;
}
.docs a {
  color: var(--tool-accent);
  display: inline-flex;
  align-items: center;
  gap: 4px;
}
.actions {
  display: flex;
  gap: 8px;
  margin-top: 8px;
}
.meta {
  margin: 4px 0 0;
  font-size: 11px;
  color: var(--fair-text-light);
  display: flex;
  gap: 4px;
}
</style>
