<script setup lang="ts">
/**
 * "Access — in effect" — a plain-language read of the ODRL Offer governing this
 * record, for the record-detail working sidecar. Permissions and prohibitions
 * are shown as green/red lines (colour paired with an "Allow"/"Forbid" word so
 * colour is never the sole signal), with the conflict strategy and whether the
 * policy is set here or inherited from the containment hierarchy.
 */
import { computed, toRef } from "vue";
import { useI18n } from "vue-i18n";
import { shortLabel } from "@/api/rdf";
import { useEffectiveAccess } from "@/composables/useEffectiveAccess";
import type { FdpRecord } from "@/data/sampleRecord";

const props = defineProps<{ record: FdpRecord }>();
const { t } = useI18n();

const { source, policyIri, summary, isLoading, isError } = useEffectiveAccess(
  toRef(props, "record"),
);

const policyName = computed(() => (policyIri.value ? shortLabel(policyIri.value) : ""));
</script>

<template>
  <aside class="access" :aria-label="t('access.title')">
    <div class="eyebrow">{{ t("access.title") }}</div>

    <p v-if="isLoading" class="hint">{{ t("common.loading") }}</p>
    <p v-else-if="isError || source === 'none' || !summary" class="hint">
      {{ t("access.unavailable") }}
    </p>
    <template v-else>
      <p v-if="summary.open" class="hint">{{ t("access.openBody") }}</p>
      <ul v-else class="rules">
        <li v-for="(line, i) in summary.lines" :key="i" class="rule">
          <span class="dot" :class="line.kind" aria-hidden="true" />
          <span class="text">
            <strong>{{
              line.kind === "permission" ? t("access.allow") : t("access.forbid")
            }}</strong>
            {{ line.actionLabel.toLowerCase()
            }}<span v-if="line.conditions.length" class="cond"
              >&nbsp;— {{ line.conditions.join(", ") }}</span
            >
          </span>
        </li>
      </ul>

      <p v-if="summary.denyWins && !summary.open" class="note">{{ t("access.denyWins") }}</p>

      <p class="source">
        <span>{{ source === "self" ? t("access.definedHere") : t("access.inherited") }}</span>
        <a v-if="policyIri" class="policy-link" :href="policyIri" target="_blank" rel="noopener">{{
          policyName
        }}</a>
      </p>
    </template>
  </aside>
</template>

<style scoped>
.access {
  padding: 18px;
  border: 1px solid var(--fair-border);
  border-radius: var(--fair-radius-lg);
  background: var(--fair-surface);
}
.eyebrow {
  font-family: var(--fair-font-sans);
  font-weight: var(--fair-weight-medium);
  font-size: var(--fair-text-xs);
  line-height: 1;
  text-transform: uppercase;
  letter-spacing: var(--fair-tracking-eyebrow);
  color: var(--fair-text-muted);
  margin-bottom: 14px;
}
.hint {
  margin: 0;
  font-size: var(--fair-text-base);
  color: var(--fair-text-muted);
}
.rules {
  list-style: none;
  margin: 0;
  padding: 0;
  display: grid;
  gap: 10px;
}
.rule {
  display: flex;
  align-items: baseline;
  gap: 9px;
}
.dot {
  flex: none;
  width: 8px;
  height: 8px;
  border-radius: var(--fair-radius-pill);
  transform: translateY(1px);
}
.dot.permission {
  background: var(--fair-success);
}
.dot.prohibition {
  background: var(--fair-danger);
}
.text {
  font-family: var(--fair-font-sans);
  font-size: var(--fair-text-base);
  line-height: var(--fair-leading-snug);
  color: var(--fair-text);
}
.text strong {
  font-weight: var(--fair-weight-semibold);
  color: var(--fair-text-strong);
}
.cond {
  color: var(--fair-text-muted);
}
.note {
  margin: 12px 0 0;
  font-size: var(--fair-text-sm);
  color: var(--fair-text-muted);
}
.source {
  margin: 12px 0 0;
  padding-top: 12px;
  border-top: 1px solid var(--fair-separator);
  font-size: var(--fair-text-sm);
  color: var(--fair-text-muted);
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  align-items: baseline;
}
.policy-link {
  font-family: var(--fair-font-mono);
  color: var(--tool-accent);
  text-decoration: none;
  overflow-wrap: anywhere;
}
.policy-link:hover {
  text-decoration: underline;
}
</style>
