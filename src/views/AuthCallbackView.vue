<script setup lang="ts">
/**
 * OIDC redirect target.
 *
 * Completes the Authorization Code + PKCE flow and routes the user to their
 * intended destination (carried through the OIDC `state` parameter, with the
 * in-memory `intendedRedirect` ref as fallback). Renders a small "signing in"
 * frame while the callback resolves and a recoverable error frame on failure.
 */
import { onMounted, ref } from "vue";
import { useRouter } from "vue-router";
import { useI18n } from "vue-i18n";
import { useAuthStore } from "@/stores/auth";
import AppLogo from "@/components/shared/AppLogo.vue";

const { t } = useI18n();
const auth = useAuthStore();
const router = useRouter();

const status = ref<"signing-in" | "error">("signing-in");

onMounted(async () => {
  try {
    const target = await auth.handleCallback();
    await router.replace(target ?? "/");
  } catch {
    status.value = "error";
  }
});

async function retry() {
  auth.clearError();
  try {
    await auth.login("/");
  } catch {
    // login() may throw synchronously when env is misconfigured; keep the
    // error frame visible so the user can read it from the store.
  }
}

async function home() {
  auth.clearError();
  await router.replace("/");
}
</script>

<template>
  <section class="callback">
    <div class="card">
      <AppLogo />
      <template v-if="status === 'signing-in'">
        <h1>{{ t("authCallback.signingIn") }}</h1>
        <p class="muted">{{ t("authCallback.signingInBody") }}</p>
        <div class="spinner" aria-hidden="true" />
      </template>
      <template v-else>
        <h1>{{ t("authCallback.failedHeading") }}</h1>
        <p class="muted">
          {{ t("authCallback.failedBody") }}<template v-if="auth.error">
            {{ t("authCallback.providerReported") }}
            <span class="mono err">{{ auth.error.message }}</span>
          </template>
        </p>
        <div class="actions">
          <button class="btn primary" @click="retry">{{ t("authCallback.tryAgain") }}</button>
          <button class="btn" @click="home">{{ t("authCallback.goHome") }}</button>
        </div>
      </template>
    </div>
  </section>
</template>

<style scoped>
.callback {
  flex: 1;
  display: grid;
  place-items: center;
  padding: 60px 20px;
  background: var(--fair-bg);
}
.card {
  max-width: 480px;
  width: 100%;
  padding: 36px 32px;
  border: 1px solid var(--fair-separator);
  border-radius: var(--fair-radius-lg);
  background: var(--fair-surface);
  display: flex;
  flex-direction: column;
  gap: 16px;
}
h1 {
  margin: 12px 0 0;
  font-family: var(--fair-font-sans);
  font-weight: 400;
  font-size: 28px;
  line-height: 1.2;
  color: var(--fair-text-strong);
}
.muted {
  margin: 0;
  color: var(--fair-text);
  font-size: 14px;
  line-height: 1.55;
}
.err {
  color: var(--fair-warning);
}
.spinner {
  width: 18px;
  height: 18px;
  border-radius: 999px;
  border: 2px solid var(--fair-node-soft);
  border-top-color: var(--tool-accent);
  animation: spin 0.9s linear infinite;
}
@keyframes spin {
  to {
    transform: rotate(1turn);
  }
}
.actions {
  display: flex;
  gap: 8px;
  margin-top: 8px;
}
</style>
