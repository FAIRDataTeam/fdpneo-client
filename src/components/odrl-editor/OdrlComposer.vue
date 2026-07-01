<script setup lang="ts">
/**
 * Guided ODRL Offer composer (Phase 5, task 5.1).
 *
 * Typed forms that can only produce FDP-profile constructs (ADR-0006): offer
 * id/assigner/conflict, permission/prohibition rules with a fixed action set,
 * and constraints whose operator + value input are driven by the chosen left
 * operand. Emits `update:offer` (a new model) per edit, run through the pure
 * `mutations`. Inline errors come from `validate.ts`; the server is the authority.
 */
import { computed } from "vue";
import { useI18n } from "vue-i18n";
import AppIcon from "@/components/shared/AppIcon.vue";
import type { OfferModel } from "./model";
import {
  ACTIONS, ACTION_LABELS, CONFLICT_STRATEGIES, LEFT_OPERANDS, LEFT_OPERAND_BY_ID,
} from "./vocab";
import {
  addConstraint, addRule, deleteConstraint, deleteRule, updateConstraint, updateOffer, updateRule,
} from "./mutations";
import { validateOffer } from "./validate";

const props = withDefaults(defineProps<{ offer: OfferModel; showId?: boolean }>(), { showId: true });
const emit = defineEmits<{ (e: "update:offer", offer: OfferModel): void }>();
const { t } = useI18n();

const issues = computed(() => validateOffer(props.offer));
const constraintError = (cid: string) =>
  issues.value.find((i) => i.constraintId === cid && i.level === "error")?.message;

function apply(fn: (o: OfferModel) => OfferModel) {
  emit("update:offer", fn(props.offer));
}
const val = (e: Event) => (e.target as HTMLInputElement | HTMLSelectElement).value;

function onLeftOperand(ruleId: string, cid: string, lo: string) {
  const def = LEFT_OPERAND_BY_ID[lo];
  apply((o) =>
    updateConstraint(o, ruleId, cid, {
      leftOperand: lo,
      operator: def?.operators[0] ?? "odrl:eq",
      rightIsIri: def?.rightKind === "iri",
      rightOperand: "",
    }),
  );
}
const valueType = (lo: string) => (LEFT_OPERAND_BY_ID[lo]?.rightKind === "datetime" ? "datetime-local" : "text");
const valuePlaceholder = (lo: string) =>
  LEFT_OPERAND_BY_ID[lo]?.rightKind === "iri"
    ? t("odrl.valueIriPlaceholder")
    : t("odrl.valuePlaceholder");
</script>

<template>
  <div class="composer">
    <section class="panel">
      <h3>{{ t("odrl.composerPolicy") }}</h3>
      <label v-if="showId" class="f">
        <span>{{ t("odrl.id") }} <em>{{ t("odrl.idHint") }}</em></span>
        <input class="mono" :value="offer.iri" @input="apply((o) => updateOffer(o, { iri: val($event) }))" />
      </label>
      <label class="f">
        <span>{{ t("odrl.assigner") }} <em>odrl:assigner</em> {{ t("odrl.optional") }}</span>
        <input
          class="mono"
          :value="offer.assigner ?? ''"
          :placeholder="t('odrl.assignerPlaceholder')"
          @input="apply((o) => updateOffer(o, { assigner: val($event) || null }))"
        />
      </label>
      <label class="f">
        <span>{{ t("odrl.conflictStrategy") }} <em>odrl:conflict</em></span>
        <select :value="offer.conflict ?? ''" @change="apply((o) => updateOffer(o, { conflict: val($event) || null }))">
          <option value="">{{ t("odrl.profileDefault") }}</option>
          <option v-for="cs in CONFLICT_STRATEGIES" :key="cs.id" :value="cs.id">{{ cs.label }}</option>
        </select>
      </label>
    </section>

    <section class="panel">
      <div class="panel__head">
        <h3>{{ t("odrl.rules") }}</h3>
        <div class="addrules">
          <button class="btn sm" @click="apply((o) => addRule(o, 'permission'))">{{ t("odrl.addPermission") }}</button>
          <button class="btn sm" @click="apply((o) => addRule(o, 'prohibition'))">{{ t("odrl.addProhibition") }}</button>
        </div>
      </div>

      <p v-if="!offer.rules.length" class="hint">{{ t("odrl.noRules") }}</p>

      <div v-for="rule in offer.rules" :key="rule.id" class="rule" :class="rule.kind">
        <div class="rule__head">
          <span class="kind">{{ rule.kind === "permission" ? t("odrl.permit") : t("odrl.prohibit") }}</span>
          <select
            class="action"
            :value="rule.action"
            @change="apply((o) => updateRule(o, rule.id, { action: val($event) }))"
          >
            <option v-for="a in ACTIONS" :key="a" :value="a">{{ ACTION_LABELS[a] }}</option>
          </select>
          <button class="icon" :title="t('odrl.deleteRule')" @click="apply((o) => deleteRule(o, rule.id))">
            <AppIcon name="x" :size="13" />
          </button>
        </div>

        <div class="constraints">
          <div v-for="c in rule.constraints" :key="c.id" class="constraint">
            <div class="crow">
              <select :value="c.leftOperand" @change="onLeftOperand(rule.id, c.id, val($event))">
                <option v-for="lo in LEFT_OPERANDS" :key="lo.id" :value="lo.id">{{ lo.label }}</option>
              </select>
              <select
                :value="c.operator"
                @change="apply((o) => updateConstraint(o, rule.id, c.id, { operator: val($event) }))"
              >
                <option v-for="op in LEFT_OPERAND_BY_ID[c.leftOperand]?.operators ?? []" :key="op" :value="op">
                  {{ op.replace("odrl:", "") }}
                </option>
              </select>
              <input
                :type="valueType(c.leftOperand)"
                :value="c.rightOperand"
                :placeholder="valuePlaceholder(c.leftOperand)"
                @input="apply((o) => updateConstraint(o, rule.id, c.id, { rightOperand: val($event) }))"
              />
              <button class="icon" :title="t('odrl.deleteConstraint')" @click="apply((o) => deleteConstraint(o, rule.id, c.id))">
                <AppIcon name="x" :size="12" />
              </button>
            </div>
            <span v-if="constraintError(c.id)" class="cerror">{{ constraintError(c.id) }}</span>
          </div>
          <button class="btn sm ghost addc" @click="apply((o) => addConstraint(o, rule.id))">{{ t("odrl.addConstraint") }}</button>
        </div>
      </div>
    </section>
  </div>
</template>

<style scoped>
.composer {
  display: flex;
  flex-direction: column;
  gap: 16px;
}
.panel {
  border: 1px solid var(--line);
  border-radius: var(--r-2);
  background: var(--surface);
  padding: 14px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.panel__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
}
h3 {
  margin: 0;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--muted-2);
}
.addrules {
  display: flex;
  gap: 6px;
}
.f {
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.f span {
  font-size: 11px;
  color: var(--muted);
}
.f em {
  font-style: normal;
  font-family: var(--font-mono);
  color: var(--muted-2);
}
input,
select {
  font-family: var(--font-sans);
  font-size: 13px;
  padding: 7px 9px;
  border: 1px solid var(--line-strong);
  border-radius: var(--r-2);
  background: var(--paper);
  color: var(--ink);
  box-sizing: border-box;
}
.mono {
  font-family: var(--font-mono);
}
.hint {
  font-size: 12px;
  color: var(--muted);
  margin: 0;
}
.rule {
  border: 1px solid var(--line);
  border-radius: var(--r-2);
  border-left: 3px solid var(--ok);
}
.rule.prohibition {
  border-left-color: var(--signal);
}
.rule__head {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 10px;
  background: var(--surface-2);
}
.kind {
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: var(--muted);
}
.action {
  flex: 1;
}
.constraints {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 10px;
}
.constraint {
  display: flex;
  flex-direction: column;
  gap: 3px;
}
.crow {
  display: grid;
  grid-template-columns: 1.3fr 0.8fr 1.6fr auto;
  gap: 6px;
  align-items: center;
}
.crow input {
  width: 100%;
}
.cerror {
  font-size: 11px;
  color: var(--signal);
}
.addc {
  align-self: flex-start;
}
.icon {
  display: grid;
  place-items: center;
  width: 26px;
  height: 26px;
  border: none;
  background: none;
  border-radius: var(--r-1);
  color: var(--muted);
  cursor: pointer;
}
.icon:hover {
  background: var(--surface-2);
  color: var(--signal);
}
</style>
