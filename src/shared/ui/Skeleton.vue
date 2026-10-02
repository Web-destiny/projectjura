<script setup lang="ts">
withDefaults(defineProps<{ lines?: number }>(), { lines: 3 });
</script>
<template>
  <div class="stack" role="status" aria-label="Загрузка">
    <span v-for="i in lines" :key="i" class="skeleton" aria-hidden="true"></span>
  </div>
</template>
<style scoped>
.skeleton {
  height: var(--space-4);
  border-radius: var(--radius-sm);
  background: var(--surface-alt);
}
.skeleton:last-child {
  width: 65%;
}
</style>
