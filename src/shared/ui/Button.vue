<script setup lang="ts">
withDefaults(
  defineProps<{
    variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
    loading?: boolean;
    disabled?: boolean;
    type?: 'button' | 'submit' | 'reset';
  }>(),
  { variant: 'secondary', type: 'button' },
);
</script>
<template>
  <button :type="type" class="button" :class="variant" :disabled="disabled || loading" :aria-busy="loading">
    <span v-if="loading" aria-hidden="true">◌ </span><slot />
  </button>
</template>
<style scoped>
.button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: var(--space-2);
  min-height: var(--control-height);
  padding: var(--space-2) 18px;
  border: 1px solid var(--border);
  border-radius: 11px;
  font-weight: 600;
  background: linear-gradient(180deg, var(--surface-elevated), var(--surface));
  color: var(--text);
  box-shadow:
    0 2px 4px #3324190d,
    inset 0 1px 0 #fff;
}
.button:hover:not(:disabled) {
  background: var(--surface);
  box-shadow: var(--shadow);
  transform: translateY(-1px);
}
.primary {
  background: linear-gradient(180deg, color-mix(in srgb, var(--primary) 88%, white), var(--primary));
  color: #fff;
  border-color: var(--primary);
  box-shadow:
    0 3px 0 color-mix(in srgb, var(--primary) 22%, transparent),
    0 7px 16px color-mix(in srgb, var(--primary) 20%, transparent);
}
.primary:hover:not(:disabled) {
  background: linear-gradient(180deg, var(--primary), var(--primary-hover));
  box-shadow:
    0 4px 0 color-mix(in srgb, var(--primary) 22%, transparent),
    0 11px 22px color-mix(in srgb, var(--primary) 28%, transparent);
  transform: translateY(-2px);
}
.primary:active:not(:disabled),
.button:active:not(:disabled) {
  transform: translateY(1px);
  box-shadow: 0 1px 3px #55412a16;
}
.ghost {
  border-color: transparent;
  background: transparent;
  box-shadow: none;
}
.ghost:hover:not(:disabled) {
  background: var(--surface-alt);
  box-shadow: none;
}
.danger {
  color: var(--danger);
}
.button:disabled {
  box-shadow: none;
}
</style>
