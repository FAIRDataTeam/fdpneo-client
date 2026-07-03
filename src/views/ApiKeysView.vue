<script setup lang="ts">
/**
 * Personal access tokens (TASKS 10.4).
 *
 * Any signed-in user manages their own `fdpk_…` tokens for scripts/CI. Create
 * returns the plaintext key **once** — shown in a copy-once panel that can't be
 * re-opened; the list thereafter shows only metadata (`display_prefix`, dates,
 * status). Revoke is per-key (the server lets admins revoke any).
 */
import { ref, computed } from "vue";
import { useI18n } from "vue-i18n";
import { useApiKeys } from "@/composables/useApiKeys";
import { parseFdpError, type ParsedError } from "@/api/errors";
import type { ApiKeyCreated } from "@/api/apiKeys";
import AppIcon from "@/components/shared/AppIcon.vue";
import AppChip from "@/components/shared/AppChip.vue";

const { t } = useI18n();
const { keys, isLoading, isError, create, revoke } = useApiKeys();

const label = ref("");
const expires = ref(""); // YYYY-MM-DD
const newKey = ref<ApiKeyCreated | null>(null);
const copied = ref(false);

const createError = computed<ParsedError | null>(() =>
  create.error.value ? parseFdpError(create.error.value) : null,
);
const revokeError = computed<ParsedError | null>(() =>
  revoke.error.value ? parseFdpError(revoke.error.value) : null,
);

function submit() {
  const name = label.value.trim();
  if (!name) return;
  create.mutate(
    { label: name, expires_at: expires.value ? `${expires.value}T23:59:59Z` : null },
    {
      onSuccess: (created) => {
        newKey.value = created;
        copied.value = false;
        label.value = "";
        expires.value = "";
      },
    },
  );
}

async function copyKey() {
  if (!newKey.value) return;
  try {
    await navigator.clipboard.writeText(newKey.value.key);
    copied.value = true;
  } catch {
    copied.value = false;
  }
}

function dismissNewKey() {
  newKey.value = null;
}

const fmt = (d: string | null) => (d ? d.slice(0, 10) : "—");
</script>

<template>
  <main class="tokens">
    <header class="hero">
      <h1>{{ t("apiKeys.heading") }}</h1>
      <i18n-t keypath="apiKeys.sub" tag="p" class="sub" scope="global">
        <template #bearer><code>{{ t("apiKeys.subBearer") }}</code></template>
      </i18n-t>
    </header>

    <!-- Copy-once panel: the only time the secret is shown. -->
    <section v-if="newKey" class="reveal" aria-live="polite">
      <h2>{{ t("apiKeys.revealHeading") }}</h2>
      <p class="warn">{{ t("apiKeys.revealWarn") }}</p>
      <div class="keyrow">
        <code class="key mono">{{ newKey.key }}</code>
        <button class="btn primary sm" @click="copyKey">{{ copied ? t("apiKeys.copied") : t("apiKeys.copy") }}</button>
      </div>
      <button class="btn ghost sm" @click="dismissNewKey">{{ t("apiKeys.done") }}</button>
    </section>

    <section class="create">
      <h2>{{ t("apiKeys.newTokenHeading") }}</h2>
      <form class="form" @submit.prevent="submit">
        <label class="field">
          <span class="label">{{ t("apiKeys.labelLabel") }}</span>
          <input v-model="label" :placeholder="t('apiKeys.labelPlaceholder')" :aria-label="t('apiKeys.labelAria')" required />
        </label>
        <label class="field">
          <span class="label">{{ t("apiKeys.expiresLabel") }}</span>
          <input v-model="expires" type="date" :aria-label="t('apiKeys.expiryAria')" />
        </label>
        <button class="btn primary" type="submit" :disabled="!label.trim() || create.isPending.value">
          {{ t("apiKeys.generate") }}
        </button>
      </form>
      <p v-if="createError" class="error" role="alert">{{ createError.message }}</p>
    </section>

    <section class="list">
      <h2>{{ t("apiKeys.yourTokensHeading") }}</h2>
      <p v-if="revokeError" class="error" role="alert">{{ revokeError.message }}</p>
      <div v-if="isLoading" class="state">{{ t("apiKeys.loading") }}</div>
      <div v-else-if="isError" class="state">{{ t("apiKeys.loadError") }}</div>
      <div v-else-if="keys.length === 0" class="state">{{ t("apiKeys.noTokens") }}</div>
      <table v-else class="grid">
        <thead>
          <tr><th>{{ t("apiKeys.thLabel") }}</th><th>{{ t("apiKeys.thPrefix") }}</th><th>{{ t("apiKeys.thCreated") }}</th><th>{{ t("apiKeys.thExpires") }}</th><th>{{ t("apiKeys.thLastUsed") }}</th><th>{{ t("apiKeys.thStatus") }}</th><th /></tr>
        </thead>
        <tbody>
          <tr v-for="k in keys" :key="k.id">
            <td>{{ k.label }}</td>
            <td class="mono">{{ k.display_prefix }}</td>
            <td>{{ fmt(k.created_at) }}</td>
            <td>{{ k.expires_at ? fmt(k.expires_at) : t("apiKeys.never") }}</td>
            <td>{{ fmt(k.last_used_at) }}</td>
            <td>
              <AppChip :variant="k.active ? 'ok' : 'default'">{{ k.active ? t("apiKeys.active") : t("apiKeys.revoked") }}</AppChip>
            </td>
            <td>
              <button
                v-if="k.active"
                class="btn ghost sm"
                :disabled="revoke.isPending.value"
                @click="revoke.mutate(k.id)"
              >
                <AppIcon name="x" :size="12" /> {{ t("apiKeys.revoke") }}
              </button>
            </td>
          </tr>
        </tbody>
      </table>
    </section>
  </main>
</template>

<style scoped>
.tokens {
  max-width: 880px;
  margin: 0 auto;
  padding: 32px 28px 64px;
  width: 100%;
  box-sizing: border-box;
}
.hero {
  margin-bottom: 24px;
}
.hero h1 {
  margin: 0 0 6px;
}
.sub {
  color: var(--muted);
  margin: 0;
}
.sub code {
  font-size: 12px;
}
section {
  margin-bottom: 28px;
}
section h2 {
  font-size: 14px;
  margin: 0 0 12px;
}
.reveal {
  border: 1px solid var(--ok);
  background: var(--ok-soft);
  border-radius: var(--r-3);
  padding: 18px;
}
.warn {
  color: var(--signal);
  font-size: 13px;
  margin: 0 0 12px;
}
.keyrow {
  display: flex;
  gap: 10px;
  align-items: center;
  margin-bottom: 12px;
}
.key {
  flex: 1;
  min-width: 0;
  overflow-x: auto;
  background: var(--paper);
  border: 1px solid var(--line-strong);
  border-radius: var(--r-2);
  padding: 10px 12px;
  font-size: 13px;
  white-space: nowrap;
}
.form {
  display: flex;
  gap: 12px;
  align-items: flex-end;
  flex-wrap: wrap;
}
.field {
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.label {
  font-size: 12px;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: var(--muted);
}
.field input {
  border: 1px solid var(--line-strong);
  border-radius: var(--r-2);
  background: var(--paper);
  color: var(--ink);
  font-family: var(--font-sans);
  font-size: 14px;
  padding: 9px 12px;
}
.error {
  color: var(--signal);
  font-size: 13px;
  margin: 10px 0 0;
}
.state {
  color: var(--muted);
  padding: 20px 0;
}
.grid {
  width: 100%;
  border-collapse: collapse;
  font-size: 13px;
}
.grid th,
.grid td {
  text-align: left;
  padding: 10px 8px;
  border-bottom: 1px solid var(--line);
}
.grid th {
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: var(--muted);
  font-weight: 500;
}
.grid .btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
}
</style>
