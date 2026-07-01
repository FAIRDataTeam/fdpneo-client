<script setup lang="ts">
interface Props {
  name: string;
  size?: number;
}
const props = withDefaults(defineProps<Props>(), { size: 16 });
</script>

<template>
  <svg
    :width="props.size"
    :height="props.size"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="2"
    stroke-linecap="round"
    stroke-linejoin="round"
  >
    <template v-if="name === 'search'">
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-3.5-3.5" />
    </template>
    <template v-else-if="name === 'plus'">
      <path d="M12 5v14M5 12h14" />
    </template>
    <template v-else-if="name === 'grip'">
      <g stroke-width="1.8">
        <circle cx="9" cy="6" r="0.6" fill="currentColor" />
        <circle cx="15" cy="6" r="0.6" fill="currentColor" />
        <circle cx="9" cy="12" r="0.6" fill="currentColor" />
        <circle cx="15" cy="12" r="0.6" fill="currentColor" />
        <circle cx="9" cy="18" r="0.6" fill="currentColor" />
        <circle cx="15" cy="18" r="0.6" fill="currentColor" />
      </g>
    </template>
    <template v-else-if="name === 'trash'">
      <path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M6 6l1 14a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-14" />
    </template>
    <template v-else-if="name === 'duplicate'">
      <rect x="9" y="9" width="11" height="11" rx="2" />
      <path d="M5 15V5a2 2 0 0 1 2-2h10" />
    </template>
    <template v-else-if="name === 'gear'">
      <circle cx="12" cy="12" r="3" />
      <path
        d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1A1.7 1.7 0 0 0 9 19.4a1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1A1.7 1.7 0 0 0 4.6 9a1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1A1.7 1.7 0 0 0 15 4.6a1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1Z"
      />
    </template>
    <template v-else-if="name === 'code'">
      <path d="m16 18 6-6-6-6M8 6l-6 6 6 6" />
    </template>
    <template v-else-if="name === 'eye'">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8" />
      <circle cx="12" cy="12" r="3" />
    </template>
    <template v-else-if="name === 'wand'">
      <path
        d="M15 4V2M15 16v-2M8 9h2M20 9h2M17.8 11.8 19 13M15 9h0M17.8 6.2 19 5M3 21l9-9M12.2 6.2 11 5"
      />
    </template>
    <template v-else-if="name === 'document'">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <path d="M14 2v6h6M16 13H8M16 17H8M10 9H8" />
    </template>
    <template v-else-if="name === 'sparkle'">
      <path d="M12 3v3M12 18v3M3 12h3M18 12h3M5.6 5.6l2 2M16.4 16.4l2 2M5.6 18.4l2-2M16.4 7.6l2-2" />
    </template>
    <template v-else-if="name === 'check'">
      <path d="M20 6 9 17l-5-5" />
    </template>
    <template v-else-if="name === 'chevron'">
      <path d="m9 18 6-6-6-6" />
    </template>
    <template v-else-if="name === 'x'">
      <path d="M18 6 6 18M6 6l12 12" />
    </template>
    <template v-else-if="name === 'layers'">
      <path d="m12 2 9 5-9 5-9-5 9-5zM3 17l9 5 9-5M3 12l9 5 9-5" />
    </template>
    <template v-else-if="name === 'home'">
      <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2h-4v-7H9v7H5a2 2 0 0 1-2-2z" />
    </template>
    <template v-else-if="name === 'folder'">
      <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
    </template>
    <template v-else-if="name === 'info'">
      <circle cx="12" cy="12" r="10" />
      <path d="M12 16v-4" />
      <path d="M12 8h.01" stroke-width="2.5" />
    </template>
    <template v-else-if="name === 'undo'">
      <path d="M9 14 4 9l5-5" />
      <path d="M4 9h11a5 5 0 0 1 5 5 5 5 0 0 1-5 5h-3" />
    </template>
    <template v-else-if="name === 'redo'">
      <path d="m15 14 5-5-5-5" />
      <path d="M20 9H9a5 5 0 0 0-5 5 5 5 0 0 0 5 5h3" />
    </template>
    <template v-else-if="name === 'share'">
      <circle cx="6" cy="12" r="2.6" />
      <circle cx="18" cy="5" r="2.6" />
      <circle cx="18" cy="19" r="2.6" />
      <path d="M8.3 10.8 15.7 6.2M8.3 13.2 15.7 17.8" />
    </template>
    <template v-else-if="name === 'warning'">
      <path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z" />
      <path d="M12 9v4" />
      <path d="M12 17h.01" stroke-width="2.5" />
    </template>
  </svg>
</template>
