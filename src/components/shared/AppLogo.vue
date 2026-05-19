<script setup lang="ts">
/**
 * FDP Neo lockup — the accented variant from the Claude Design handoff.
 *
 * Filled slate-blue square (with a paper-coloured inset notch) + a width-matched
 * `FAIR` / `DATA POINT` wordmark + italic `neo` in Instrument Serif rust.
 */
const props = withDefaults(
  defineProps<{ size?: number; showNeo?: boolean }>(),
  { size: 24, showNeo: true },
);
</script>

<template>
  <span class="logo" aria-label="FAIR Data Point neo">
    <span
      class="mark"
      :style="{
        width: `${props.size + 4}px`,
        height: `${props.size + 4}px`,
      }"
    >
      <span
        class="mark__inset"
        :style="{
          width: `${props.size * 0.36}px`,
          height: `${props.size * 0.36}px`,
        }"
      />
    </span>
    <span class="wordmark">
      <span class="wordmark__fair" :style="{ fontSize: `${props.size}px` }">FAIR</span>
      <span
        class="wordmark__sub"
        :style="{
          fontSize: `${props.size * 0.32}px`,
          marginTop: `${props.size * 0.18}px`,
        }"
        >DATA POINT</span
      >
    </span>
    <span
      v-if="showNeo"
      class="neo"
      :style="{ fontSize: `${props.size * 1.05}px` }"
      >neo</span
    >
  </span>
</template>

<style scoped>
.logo {
  display: inline-flex;
  align-items: center;
  gap: 12px;
  color: var(--accent-deep);
  text-decoration: none;
}
.mark {
  display: grid;
  place-items: center;
  flex: none;
  border-radius: 5px;
  background: var(--accent-deep);
}
.mark__inset {
  background: var(--paper);
  border-radius: 2px;
}
.wordmark {
  display: inline-flex;
  flex-direction: column;
  line-height: 1;
  color: var(--accent-deep);
}
.wordmark__fair {
  font-family: var(--font-sans);
  font-weight: 900;
  line-height: 0.95;
  letter-spacing: -0.025em;
}
.wordmark__sub {
  font-family: var(--font-sans);
  font-weight: 800;
  letter-spacing: 0.06em;
  color: var(--accent);
}
.neo {
  font-family: var(--font-serif);
  font-style: italic;
  font-weight: 400;
  line-height: 1;
  color: var(--signal);
  letter-spacing: -0.01em;
  margin-left: 2px;
  padding-bottom: 2px;
  align-self: center;
}
</style>
