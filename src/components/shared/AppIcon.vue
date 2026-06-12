<script setup lang="ts">
import type { IconName } from "@/types/record";

const props = withDefaults(defineProps<{ name: IconName; size?: number; color?: string }>(), {
  size: 16,
  color: "currentColor",
});
</script>

<template>
  <svg
    :width="props.size"
    :height="props.size"
    :style="{ color: props.color, flex: 'none' }"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="1.6"
    stroke-linecap="round"
    stroke-linejoin="round"
    aria-hidden="true"
  >
    <template v-if="name === 'search'">
      <circle cx="11" cy="11" r="6.5" />
      <path d="m20 20-3.5-3.5" />
    </template>
    <path v-else-if="name === 'chevron-r'" d="m9 6 6 6-6 6" />
    <path v-else-if="name === 'chevron-d'" d="m6 9 6 6 6-6" />
    <path v-else-if="name === 'chevron-l'" d="m15 6-6 6 6 6" />
    <path v-else-if="name === 'tree'" d="M4 5h8M4 12h12M4 19h8" />
    <path v-else-if="name === 'download'" d="M12 4v11m0 0-4-4m4 4 4-4M5 20h14" />
    <path v-else-if="name === 'code'" d="m8 8-4 4 4 4M16 8l4 4-4 4M14 5l-4 14" />
    <path
      v-else-if="name === 'link'"
      d="M10 14a3.5 3.5 0 0 1 0-5l3-3a3.5 3.5 0 1 1 5 5l-1.5 1.5M14 10a3.5 3.5 0 0 1 0 5l-3 3a3.5 3.5 0 1 1-5-5l1.5-1.5"
    />
    <path
      v-else-if="name === 'shield'"
      d="M12 3 4 6v6c0 4.5 3.5 8 8 9 4.5-1 8-4.5 8-9V6l-8-3z"
    />
    <template v-else-if="name === 'calendar'">
      <rect x="4" y="5" width="16" height="15" rx="2" />
      <path d="M4 10h16M9 3v4M15 3v4" />
    </template>
    <template v-else-if="name === 'user'">
      <circle cx="12" cy="8" r="3.5" />
      <path d="M5 20a7 7 0 0 1 14 0" />
    </template>
    <path v-else-if="name === 'plus'" d="M12 5v14M5 12h14" />
    <path v-else-if="name === 'edit'" d="m4 20 4-1 11-11-3-3L5 16l-1 4z" />
    <path v-else-if="name === 'filter'" d="M4 5h16l-6 8v6l-4-2v-4L4 5z" />
    <path v-else-if="name === 'x'" d="M6 6l12 12M18 6 6 18" />
    <template v-else-if="name === 'dots'">
      <circle cx="5" cy="12" r="1.5" fill="currentColor" />
      <circle cx="12" cy="12" r="1.5" fill="currentColor" />
      <circle cx="19" cy="12" r="1.5" fill="currentColor" />
    </template>
    <path v-else-if="name === 'arrow-r'" d="M5 12h14m-5-5 5 5-5 5" />
    <path v-else-if="name === 'arrow-up'" d="M7 14l5-5 5 5" />
    <template v-else-if="name === 'globe'">
      <circle cx="12" cy="12" r="8.5" />
      <path d="M3.5 12h17M12 3.5c3 3 3 14 0 17M12 3.5c-3 3-3 14 0 17" />
    </template>
    <path v-else-if="name === 'check'" d="m5 12 5 5 9-10" />
    <template v-else-if="name === 'eye'">
      <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7z" />
      <circle cx="12" cy="12" r="3" />
    </template>
    <template v-else-if="name === 'graph'">
      <circle cx="6" cy="6" r="2.4" />
      <circle cx="18" cy="9" r="2.4" />
      <circle cx="8" cy="18" r="2.4" />
      <path d="M8.2 6.8 15.8 8.4M7.2 8.1 7 15.4" />
    </template>
    <template v-else-if="name === 'grip'">
      <circle cx="9" cy="6" r="1.3" fill="currentColor" />
      <circle cx="15" cy="6" r="1.3" fill="currentColor" />
      <circle cx="9" cy="12" r="1.3" fill="currentColor" />
      <circle cx="15" cy="12" r="1.3" fill="currentColor" />
      <circle cx="9" cy="18" r="1.3" fill="currentColor" />
      <circle cx="15" cy="18" r="1.3" fill="currentColor" />
    </template>
    <template v-else-if="name === 'lock'">
      <rect x="5" y="11" width="14" height="9" rx="2" />
      <path d="M8 11V8a4 4 0 0 1 8 0v3" />
    </template>
    <path
      v-else-if="name === 'book'"
      d="M5 5v14M5 5c2 0 5 .5 7 2v14c-2-1.5-5-2-7-2M19 5v14M19 5c-2 0-5 .5-7 2M19 19c-2 0-5 .5-7 2"
    />
    <template v-else-if="name === 'sun'">
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" />
    </template>
    <path
      v-else-if="name === 'moon'"
      d="M21 12.79A9 9 0 1 1 11.21 3a7 7 0 0 0 9.79 9.79z"
    />
    <template v-else-if="name === 'monitor'">
      <rect x="3" y="4" width="18" height="12" rx="2" />
      <path d="M8 20h8M12 16v4" />
    </template>
    <template v-else-if="name === 'cog'">
      <circle cx="12" cy="12" r="3" />
      <path d="M12 2v3M12 19v3M2 12h3M19 12h3M5 5l2 2M17 17l2 2M19 5l-2 2M7 17l-2 2" />
    </template>
  </svg>
</template>
