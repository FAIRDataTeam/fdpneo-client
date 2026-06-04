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
import { useApiKeys } from "@/composables/useApiKeys";
import { parseFdpError, type ParsedError } from "@/api/errors";
import type { ApiKeyCreated } from "@/api/apiKeys";
import AppIcon from "@/components/shared/AppIcon.vue";
import AppChip from "@/components/shared/AppChip.vue";

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
      <h1>Personal access tokens</h1>
      <p class="sub">
        Tokens authenticate scripts and CI as you. Send one as
        <code>Authorization: Bearer fdpk_…</code>. Treat them like passwords.
      </p>
    </header>

    <!-- Copy-once panel: the only time the secret is shown. -->
    <section v-if="newKey" class="reveal" aria-live="polite">
      <h2>Copy your new token</h2>
      <p class="warn">This is the only time the full token is shown. Store it now — you can't see it again.</p>
      <div class="keyrow">
        <code class="key mono">{{ newKey.key }}</code>
        <button class="btn primary sm" @click="copyKey">{{ copied ? "Copied" : "Copy" }}</button>
      </div>
      <button class="btn ghost sm" @click="dismissNewKey">Done</button>
    </section>

    <section class="create">
      <h2>New token</h2>
      <form class="form" @submit.prevent="submit">
        <label class="field">
          <span class="label">Label</span>
          <input v-model="label" placeholder="e.g. CI pipeline" aria-label="Token label" required />
        </label>
        <label class="field">
          <span class="label">Expires (optional)</span>
          <input v-model="expires" type="date" aria-label="Expiry date" />
        </label>
        <button class="btn primary" type="submit" :disabled="!label.trim() || create.isPending.value">
          Generate token
        </button>
      </form>
      <p v-if="createError" class="error" role="alert">{{ createError.message }}</p>
    </section>

    <section class="list">
      <h2>Your tokens</h2>
      <p v-if="revokeError" class="error" role="alert">{{ revokeError.message }}</p>
      <div v-if="isLoading" class="state">Loading…</div>
      <div v-else-if="isError" class="state">Couldn't load your tokens.</div>
      <div v-else-if="keys.length === 0" class="state">No tokens yet.</div>
      <table v-else class="grid">
        <thead>
          <tr><th>Label</th><th>Prefix</th><th>Created</th><th>Expires</th><th>Last used</th><th>Status</th><th /></tr>
        </thead>
        <tbody>
          <tr v-for="k in keys" :key="k.id">
            <td>{{ k.label }}</td>
            <td class="mono">{{ k.display_prefix }}</td>
            <td>{{ fmt(k.created_at) }}</td>
            <td>{{ k.expires_at ? fmt(k.expires_at) : "Never" }}</td>
            <td>{{ fmt(k.last_used_at) }}</td>
            <td>
              <AppChip :variant="k.active ? 'ok' : 'default'">{{ k.active ? "Active" : "Revoked" }}</AppChip>
            </td>
            <td>
              <button
                v-if="k.active"
                class="btn ghost sm"
                :disabled="revoke.isPending.value"
                @click="revoke.mutate(k.id)"
              >
                <AppIcon name="x" :size="12" /> Revoke
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
