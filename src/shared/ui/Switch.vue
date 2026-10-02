<script setup lang="ts">
defineProps<{ label: string; disabled?: boolean }>();
const model = defineModel<boolean>({ default: false });
</script>
<template>
  <button
    type="button"
    role="switch"
    :aria-checked="model"
    :disabled="disabled"
    class="switch-control"
    @click="model = !model"
  >
    <span class="switch-track" :class="{ checked: model }" aria-hidden="true"><span></span></span>{{ label }}
  </button>
</template>
<style scoped>
.switch-control {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  border: 0;
  background: transparent;
  color: var(--text);
}
.switch-track {
  width: 40px;
  padding: 3px;
  background: var(--muted);
  border-radius: var(--radius-lg);
}
.switch-track > span {
  display: block;
  width: 16px;
  height: 16px;
  background: var(--surface);
  border-radius: 50%;
  transition: transform var(--motion);
}
.checked {
  background: var(--primary);
}
.checked > span {
  transform: translateX(18px);
}
</style>
