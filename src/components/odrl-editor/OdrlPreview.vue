<script setup lang="ts">
/**
 * Live Turtle preview for the composed Offer (Phase 5, task 5.1): re-serializes
 * the model and shows it read-only (Monaco), with a client-side validation
 * banner. This is exactly the body `PUT /policies/{id}` will store (5.2).
 */
import { computed } from "vue";
import { useI18n } from "vue-i18n";
import TurtleEditor from "@/components/shacl-editor/TurtleEditor.vue";
import type { OfferModel } from "./model";
import { serializeOffer } from "./serialize";
import { validateOffer } from "./validate";

const props = defineProps<{ offer: OfferModel }>();
const { t } = useI18n();

const turtle = computed(() => serializeOffer(props.offer));
const issues = computed(() => validateOffer(props.offer));
const errors = computed(() => issues.value.filter((i) => i.level === "error"));
const warnings = computed(() => issues.value.filter((i) => i.level === "warning"));
</script>

<template>
  <div class="preview">
    <div v-if="errors.length" class="banner bad" role="status">
      ✕ {{ t("odrl.problems", errors.length) }}: {{ errors.map((e) => e.message).join(" · ") }}
    </div>
    <div v-else class="banner ok" role="status">
      ✓ {{ t("odrl.validProfile") }}<span v-if="warnings.length"> · {{ warnings[0]?.message }}</span>
    </div>
    <TurtleEditor :model-value="turtle" readonly :aria-label="t('odrl.previewAria')" class="ed" />
  </div>
</template>

<style scoped>
.preview {
  display: flex;
  flex-direction: column;
  gap: 10px;
  height: 100%;
}
.banner {
  font-size: 12px;
  padding: 8px 10px;
  border-radius: var(--r-2);
}
.banner.ok {
  color: var(--ok);
  background: var(--ok-soft);
}
.banner.bad {
  color: var(--signal);
  background: var(--signal-soft);
}
.ed {
  flex: 1;
  min-height: 420px;
}
</style>
