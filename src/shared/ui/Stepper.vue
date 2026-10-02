<script setup lang="ts">
defineProps<{ step: number; max: number; disabled?: boolean }>();
defineEmits<{ change: [number] }>();
const steps = ['Документ', 'Поля', 'Данные', 'Проверка', 'Готово'];
</script>
<template>
  <nav aria-label="Этапы создания" class="steps">
    <button
      v-for="(name, i) in steps"
      :key="name"
      :disabled="disabled || i > max"
      :aria-current="i === step ? 'step' : undefined"
      :class="{ active: i === step, complete: i < step }"
      @click="$emit('change', i)"
    >
      <span>{{ i < step ? '✓' : i + 1 }}</span
      >{{ name }}
    </button>
  </nav>
</template>
<style scoped>
.steps {
  display: grid;
  grid-template-columns: repeat(5, minmax(0, 1fr));
  gap: 6px;
  padding: 7px;
  overflow: auto;
  border: 1px solid var(--border);
  border-radius: 17px;
  background: var(--surface-alt);
  box-shadow:
    inset 0 1px 3px #30241a12,
    0 1px 0 #ffffffb8;
  scrollbar-width: thin;
}
.steps button {
  display: flex;
  justify-content: center;
  gap: 9px;
  align-items: center;
  white-space: nowrap;
  background: transparent;
  border: 1px solid transparent;
  border-radius: 11px;
  padding: 9px 11px;
  color: var(--text);
  font-size: 14px;
  font-weight: 600;
}
.steps button:disabled {
  opacity: 1;
  color: var(--muted);
}
.steps button span {
  border: 1px solid var(--border-strong);
  border-radius: 9px;
  width: 28px;
  height: 28px;
  flex: 0 0 28px;
  display: grid;
  place-items: center;
  background: var(--surface-elevated);
  color: var(--muted);
  font-size: 13px;
}
.steps .active {
  color: #fffaf4;
  background: linear-gradient(
    125deg,
    var(--espresso),
    color-mix(in srgb, var(--espresso) 70%, var(--primary))
  );
  border-color: #ffffff30;
  box-shadow:
    0 4px 10px #2c211c2b,
    inset 0 1px 0 #ffffff35;
}
.steps button.active span {
  background: var(--primary);
  color: #fff;
  border-color: #ffffff55;
  box-shadow:
    0 2px 5px #0003,
    inset 0 1px 0 #ffffff45;
}
.steps .complete {
  background: color-mix(in srgb, var(--surface-elevated) 78%, var(--accent-soft));
  border-color: var(--border);
  box-shadow: 0 1px 3px #30241a0d;
}
.steps button.complete span {
  background: var(--accent-soft);
  color: var(--primary);
  border-color: var(--border);
  font-weight: 700;
}
.steps button:not(:disabled):not(.active):hover {
  background: var(--surface-elevated);
  transform: translateY(-1px);
}
@media (max-width: 760px) {
  .steps {
    grid-template-columns: repeat(5, max-content);
  }
  .steps button {
    min-width: 120px;
  }
}
</style>
