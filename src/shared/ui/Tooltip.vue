<script setup lang="ts">
defineProps<{ text: string }>();
</script>
<template>
  <span class="tooltip-host" tabindex="0" :aria-label="text"
    ><slot /><span class="tooltip" role="tooltip">{{ text }}</span></span
  >
</template>
<style scoped>
.tooltip-host {
  position: relative;
  display: inline-flex;
}
.tooltip {
  display: none;
  position: absolute;
  bottom: 100%;
  left: 0;
  z-index: 20;
  background: var(--text);
  color: var(--surface);
  padding: var(--space-2) var(--space-3);
  border-radius: var(--radius-sm);
  min-width: 180px;
  font-size: var(--text-small);
}
.tooltip-host:hover .tooltip,
.tooltip-host:focus .tooltip,
.tooltip-host:focus-within .tooltip {
  display: block;
}
</style>
