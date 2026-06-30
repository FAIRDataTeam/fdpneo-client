<script setup lang="ts">
/**
 * Catch-all route view.
 *
 * Lands on a friendly empty state with a home link. Kept visually consistent
 * with the error boundary so the two states feel like a family.
 */
import { useRoute } from "vue-router";
import { useI18n } from "vue-i18n";

const { t } = useI18n();
const route = useRoute();
</script>

<template>
  <section class="notfound">
    <div class="card">
      <div class="eyebrow mono">{{ t("notFound.eyebrow") }}</div>
      <h1>{{ t("notFound.heading") }}</h1>
      <i18n-t keypath="notFound.body" tag="p" scope="global">
        <template #path>
          <span class="mono path">{{ route.fullPath }}</span>
        </template>
      </i18n-t>
      <div class="actions">
        <RouterLink to="/" class="btn primary">{{ t("notFound.goHome") }}</RouterLink>
        <RouterLink to="/search" class="btn">{{ t("notFound.searchRecords") }}</RouterLink>
      </div>
    </div>
  </section>
</template>

<style scoped>
.notfound {
  flex: 1;
  display: grid;
  place-items: center;
  padding: 80px 20px;
  background: var(--paper);
}
.card {
  max-width: 560px;
  width: 100%;
  padding: 36px;
  border: 1px solid var(--line);
  border-radius: var(--r-3);
  background: var(--surface);
  display: flex;
  flex-direction: column;
  gap: 14px;
}
.eyebrow {
  font-size: 11px;
  color: var(--muted);
  text-transform: uppercase;
  letter-spacing: 0.1em;
}
h1 {
  margin: 0;
  font-family: var(--font-serif);
  font-weight: 400;
  font-size: 32px;
  line-height: 1.15;
  color: var(--ink);
}
p {
  margin: 0;
  font-family: var(--font-sans);
  font-weight: 400;
  font-size: 15px;
  line-height: 1.55;
  color: var(--ink-2);
}
.path {
  font-size: 13px;
  color: var(--signal);
}
.actions {
  display: flex;
  gap: 8px;
  margin-top: 8px;
}
.actions .btn {
  text-decoration: none;
}
</style>
