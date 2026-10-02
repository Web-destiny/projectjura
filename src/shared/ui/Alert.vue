<script setup lang="ts">
withDefaults(defineProps<{ kind?: 'info' | 'error' | 'success' }>(), { kind: 'info' });
</script>
<template>
  <div class="alert" :class="kind" :role="kind === 'error' ? 'alert' : 'status'">
    <strong class="symbol" aria-hidden="true">{{
      kind === 'error' ? '!' : kind === 'success' ? '✓' : 'i'
    }}</strong>
    <div><slot /></div>
  </div>
</template>
<style scoped>
.alert {
  display: flex;
  gap: var(--space-3);
  padding: var(--space-4);
  border-radius: var(--radius-sm);
  background: var(--surface-alt);
  border: 1px solid var(--border);
  font-size: 14px;
}
.symbol {
  flex-shrink: 0;
}
.error {
  border-color: var(--danger);
  color: var(--danger);
}
.success {
  color: var(--success);
}
</style>
