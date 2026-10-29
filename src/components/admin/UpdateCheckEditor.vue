<script setup lang="ts">
/**
 * Structured editor for the `updates.check` setting (server ADR-0028):
 * `{ enabled: boolean }`. Switching it off stops the daily GitHub release
 * check without a restart; it cannot override a deployment that set
 * `FDP_UPDATES_CHECK_ENABLED=false`.
 */
import { computed } from "vue";
import { useI18n } from "vue-i18n";
import type { SettingValue } from "@/api/settings";

const { t } = useI18n();
const model = defineModel<SettingValue>({ required: true });
const props = defineProps<{ canEdit: boolean }>();

const enabled = computed({
  get: () => model.value.enabled !== false,
  set: (value: boolean) => {
    model.value = { enabled: value };
  },
});
</script>

<template>
  <label class="toggle">
    <input v-model="enabled" type="checkbox" :disabled="!props.canEdit" />
    <span>{{ t("settingsAdmin.updatesEnabled") }}</span>
  </label>
</template>

<style scoped>
.toggle {
  display: flex;
  gap: 8px;
  align-items: center;
  font-size: 14px;
}
</style>
