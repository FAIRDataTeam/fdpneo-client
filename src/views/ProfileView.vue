<script setup lang="ts">
/**
 * User profile (Phase 9, task 9.10) — a read-only view of the signed-in
 * identity, sourced entirely from the OIDC token claims (the auth store). The
 * IdP owns identity, so editing is a deep link to the Keycloak account console
 * (`{iss}/account`), not an in-app form. No server endpoint involved.
 */
import { computed } from "vue";
import { useI18n } from "vue-i18n";
import { useAuthStore } from "@/stores/auth";
import { safeHref } from "@/composables/safeUrl";

const { t } = useI18n();
const auth = useAuthStore();

const profile = computed<Record<string, unknown>>(() => auth.user?.profile ?? {});
function claim(key: string): string {
  const v = profile.value[key];
  return typeof v === "string" ? v : "";
}

const displayName = computed(() => claim("name") || claim("preferred_username") || claim("email") || "—");
const rows = computed(() => [
  { label: t("profile.rowName"), value: claim("name") },
  { label: t("profile.rowUsername"), value: claim("preferred_username") },
  { label: t("profile.rowEmail"), value: claim("email") },
  { label: t("profile.rowSubject"), value: claim("sub"), mono: true },
]);
/** Keycloak account console lives at `{issuer}/account`. The issuer comes from
 * the ID-token `iss` claim — sanitized through `safeHref` before it reaches a
 * `:href` (returns undefined for a non-http(s) issuer, hiding the link). */
const accountUrl = computed(() => safeHref(claim("iss") ? `${claim("iss")}/account` : undefined));
</script>

<template>
  <section class="page">
    <header class="head">
      <div class="eyebrow mono">{{ t("profile.eyebrow") }}</div>
      <h1>{{ t("profile.heading") }}</h1>
      <p class="lede">
        {{ t("profile.lede") }}
      </p>
    </header>

    <div class="card">
      <div class="ident">
        <div class="avatar" aria-hidden="true">{{ displayName.slice(0, 1).toUpperCase() }}</div>
        <div class="who">
          <div class="name">{{ displayName }}</div>
          <div class="roles">
            <span v-for="r in auth.roles" :key="r" class="chip">{{ r }}</span>
            <span v-if="!auth.roles.length" class="muted">{{ t("profile.noRoles") }}</span>
          </div>
        </div>
      </div>

      <dl class="rows">
        <template v-for="row in rows" :key="row.label">
          <dt>{{ row.label }}</dt>
          <dd :class="{ mono: row.mono }">{{ row.value || "—" }}</dd>
        </template>
      </dl>

      <div class="actions">
        <a v-if="accountUrl" :href="accountUrl" target="_blank" rel="noopener noreferrer" class="btn primary">
          {{ t("profile.manageAccount") }}
        </a>
        <span class="help">{{ t("profile.manageAccountHelp") }}</span>
      </div>
    </div>
  </section>
</template>

<style scoped>
.page {
  flex: 1;
  padding: 36px 64px 48px;
  max-width: 720px;
  margin: 0 auto;
  width: 100%;
}
.eyebrow {
  font-size: 11px;
  color: var(--muted);
  text-transform: uppercase;
  letter-spacing: 0.1em;
  margin-bottom: 8px;
}
h1 {
  margin: 0;
  font-family: var(--font-serif);
  font-weight: 400;
  font-size: 32px;
  color: var(--ink);
}
.lede {
  margin: 8px 0 0;
  font-size: 14px;
  line-height: 1.5;
  color: var(--ink-2);
}
.card {
  margin-top: 24px;
  border: 1px solid var(--line);
  border-radius: var(--r-2);
  background: var(--surface);
  padding: 20px;
  display: flex;
  flex-direction: column;
  gap: 20px;
}
.ident {
  display: flex;
  align-items: center;
  gap: 14px;
}
.avatar {
  width: 48px;
  height: 48px;
  border-radius: 50%;
  display: grid;
  place-items: center;
  background: var(--accent-soft);
  color: var(--accent, var(--ink));
  font-weight: 600;
  font-size: 20px;
}
.name {
  font-size: 18px;
  font-weight: 600;
  color: var(--ink);
}
.roles {
  display: flex;
  gap: 6px;
  margin-top: 4px;
  flex-wrap: wrap;
}
.chip {
  font-size: 11px;
  padding: 2px 8px;
  border-radius: 999px;
  background: var(--surface-2);
  color: var(--muted);
  text-transform: uppercase;
  letter-spacing: 0.04em;
}
.rows {
  display: grid;
  grid-template-columns: 140px 1fr;
  gap: 8px 16px;
  margin: 0;
}
dt {
  font-size: 12px;
  color: var(--muted);
  text-transform: uppercase;
  letter-spacing: 0.06em;
}
dd {
  margin: 0;
  font-size: 14px;
  color: var(--ink);
  word-break: break-all;
}
.actions {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
}
.help {
  font-size: 12px;
  color: var(--muted);
}
.muted {
  color: var(--muted);
  font-size: 12px;
}
.mono {
  font-family: var(--font-mono);
}
</style>
