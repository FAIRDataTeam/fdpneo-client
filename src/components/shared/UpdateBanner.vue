<script setup lang="ts">
/**
 * Admin-only notice that a newer FDPneo server or client release exists
 * (server ADR-0028). One line per component that is behind, flagged when the
 * range includes a security release or needs manual upgrade steps, and when a
 * client release needs a newer server first. Dismissal lasts for the session.
 */
import { RouterLink } from "vue-router";
import { useI18n } from "vue-i18n";
import { useAuthStore } from "@/stores/auth";
import { useUpdates } from "@/composables/useUpdates";

const { t } = useI18n();
const auth = useAuthStore();
const { visibleNotices, dismiss } = useUpdates();
</script>

<template>
  <div v-if="auth.isAdmin && visibleNotices.length" class="updates" role="region" :aria-label="t('updates.bannerRegion')">
    <div
      v-for="n in visibleNotices"
      :key="n.component"
      class="notice"
      :class="{ security: n.security }"
      role="status"
    >
      <p class="line">
        <span v-if="n.security" class="tag">{{ t("updates.securityTag") }}</span>
        {{
          t(n.component === "server" ? "updates.bannerServer" : "updates.bannerClient", {
            latest: n.latest.version,
            current: n.current,
          })
        }}
        <a :href="n.latest.url" target="_blank" rel="noopener noreferrer">{{ t("updates.releaseNotes") }}</a>
        <RouterLink to="/admin/settings">{{ t("updates.details") }}</RouterLink>
      </p>
      <p v-if="n.needsServer" class="line warn">
        {{ t("updates.needsServer", { requirement: n.needsServer }) }}
      </p>
      <p v-if="n.manualSteps" class="line warn">
        {{ t("updates.manualSteps") }}
        <a v-if="n.latest.upgrade_notes" :href="n.latest.upgrade_notes" target="_blank" rel="noopener noreferrer">{{
          t("updates.upgradeNotes")
        }}</a>
      </p>
      <p v-else-if="n.metadataMissing" class="line muted">{{ t("updates.notesUnknown") }}</p>
      <button type="button" class="dismiss" :aria-label="t('updates.dismiss')" @click="dismiss(n)">×</button>
    </div>
  </div>
</template>

<style scoped>
.updates {
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 8px 28px 0;
}
.notice {
  position: relative;
  border: 1px solid var(--fair-separator);
  border-radius: var(--fair-radius-md);
  background: var(--fair-highlight);
  padding: 8px 40px 8px 14px;
  font-size: 13px;
}
.notice.security {
  border-color: var(--fair-danger, #c62828);
}
.line {
  margin: 0;
  display: flex;
  flex-wrap: wrap;
  gap: 4px 10px;
  align-items: baseline;
}
.line + .line {
  margin-top: 4px;
}
.warn {
  color: var(--fair-text-strong);
  font-weight: 500;
}
.muted {
  color: var(--fair-text-muted);
}
.tag {
  padding: 1px 8px;
  border-radius: 999px;
  font-size: 12px;
  font-weight: 600;
  color: #fff;
  background: var(--fair-danger, #c62828);
}
.dismiss {
  position: absolute;
  top: 4px;
  right: 8px;
  border: 0;
  background: none;
  font-size: 18px;
  line-height: 1;
  cursor: pointer;
  color: var(--fair-text-muted);
}
@media (max-width: 600px) {
  .updates {
    padding: 8px 16px 0;
  }
}
</style>
