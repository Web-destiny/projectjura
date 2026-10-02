<script setup lang="ts">
defineProps<{ label: string; value: number; max: number }>();
</script>
<template>
  <label>{{ label }}<progress :value="value" :max="Math.max(1, max)" :aria-label="label"></progress></label>
</template>
<style scoped>
progress {
  width: 100%;
  accent-color: var(--primary);
  height: var(--space-3);
}
</style>
