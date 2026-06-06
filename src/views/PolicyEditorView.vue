<script setup lang="ts">
/**
 * Policies view — the visual ODRL editor (Phase 5).
 *
 * 5.1: the guided composer + live Turtle preview over one Offer model. The
 * composer can only emit FDP-profile constructs (ADR-0006). Save against the
 * live `PUT /policies/{id}` + dry-run validate, and the managed-policy list,
 * land in 5.2 — for now the offer is composed fresh and Copy-able.
 */
import { computed, ref } from "vue";
import OdrlComposer from "@/components/odrl-editor/OdrlComposer.vue";
import OdrlPreview from "@/components/odrl-editor/OdrlPreview.vue";
import { newOffer } from "@/components/odrl-editor/factories";
import { serializeOffer } from "@/components/odrl-editor/serialize";
import type { OfferModel } from "@/components/odrl-editor/model";

const offer = ref<OfferModel>(newOffer());

function onUpdate(next: OfferModel) {
  offer.value = next;
}

const turtle = computed(() => serializeOffer(offer.value));
async function copyTurtle() {
  try {
    await navigator.clipboard.writeText(turtle.value);
  } catch {
    /* clipboard unavailable (insecure context) — no-op */
  }
}
</script>

<template>
  <section class="page">
    <header class="head">
      <div class="eyebrow mono">FDP Neo · Admin</div>
      <h1>Policies</h1>
      <p class="lede">
        Compose an ODRL <strong>Offer</strong> — the access conditions a record opts into via
        <code class="mono">dct:rights</code>. The editor only offers constructs the FDP profile accepts.
      </p>
    </header>

    <div class="actions">
      <button class="btn sm" @click="copyTurtle">Copy Turtle</button>
    </div>

    <div class="layout">
      <OdrlComposer :offer="offer" @update:offer="onUpdate" />
      <OdrlPreview :offer="offer" />
    </div>
  </section>
</template>

<style scoped>
.page {
  flex: 1;
  padding: 36px 80px 48px;
  max-width: 1200px;
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
  max-width: 640px;
}
.actions {
  display: flex;
  gap: 10px;
  margin: 20px 0 12px;
}
.layout {
  display: grid;
  grid-template-columns: minmax(380px, 1fr) minmax(360px, 1fr);
  gap: 20px;
  align-items: start;
}
@media (max-width: 900px) {
  .page {
    padding: 28px 24px 40px;
  }
  .layout {
    grid-template-columns: 1fr;
  }
}
</style>
