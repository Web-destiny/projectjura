<script setup lang="ts">
withDefaults(
  defineProps<{
    name:
      | 'arrow-right'
      | 'arrow-left'
      | 'arrow-up-right'
      | 'chevron-down'
      | 'upload'
      | 'document'
      | 'replace'
      | 'guide'
      | 'copy'
      | 'close';
    size?: number;
  }>(),
  { size: 20 },
);
</script>
<template>
  <svg
    :width="size"
    :height="size"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="1.8"
    stroke-linecap="round"
    stroke-linejoin="round"
    aria-hidden="true"
    focusable="false"
  >
    <template v-if="name === 'arrow-right'"><path d="M4 12h15m-6-6 6 6-6 6" /></template>
    <template v-else-if="name === 'arrow-left'"><path d="M20 12H5m6-6-6 6 6 6" /></template>
    <template v-else-if="name === 'arrow-up-right'"><path d="M5 19 19 5M8 5h11v11" /></template>
    <template v-else-if="name === 'chevron-down'"><path d="m5 9 7 7 7-7" /></template>
    <template v-else-if="name === 'upload'">
      <path d="M12 16V4m-4 4 4-4 4 4M4 16v3a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-3" />
    </template>
    <template v-else-if="name === 'document'">
      <path d="M7 3h7l4 4v14H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2Zm7 0v5h4M9 13h6m-6 4h6" />
    </template>
    <template v-else-if="name === 'replace'"><path d="M4 8h15m-4-4 4 4-4 4M20 16H5m4-4-4 4 4 4" /></template>
    <template v-else-if="name === 'guide'">
      <path
        d="M4 5.5A2.5 2.5 0 0 1 6.5 3H12v17H6.5A2.5 2.5 0 0 0 4 22V5.5ZM20 5.5A2.5 2.5 0 0 0 17.5 3H12v17h5.5A2.5 2.5 0 0 1 20 22V5.5Z"
      />
    </template>
    <template v-else-if="name === 'copy'">
      <rect x="8" y="8" width="12" height="12" rx="2" />
      <path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2" />
    </template>
    <template v-else-if="name === 'close'"><path d="M5 5 19 19M19 5 5 19" /></template>
  </svg>
</template>
