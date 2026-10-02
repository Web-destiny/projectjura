<script setup lang="ts">
import { computed, nextTick, onUnmounted, ref, useId, watch } from 'vue';
import DzhuraIcon from './DzhuraIcon.vue';

type Value = string | number | undefined;
type Option = { label: string; value: Value };
const props = defineProps<{
  label: string;
  modelValue: Value;
  options: Option[];
  disabled?: boolean;
  compact?: boolean;
}>();
const emit = defineEmits<{ 'update:modelValue': [Value] }>();
const id = useId();
const root = ref<HTMLElement>();
const trigger = ref<HTMLButtonElement>();
const list = ref<HTMLElement>();
const open = ref(false);
const above = ref(false);
const active = ref(0);
const selected = computed(() =>
  props.options.findIndex((option) => Object.is(option.value, props.modelValue)),
);
const display = computed(
  () => props.options[selected.value]?.label || props.options[0]?.label || 'Выберите значение',
);

function show() {
  if (props.disabled || !props.options.length) return;
  active.value = Math.max(0, selected.value);
  const bounds = trigger.value?.getBoundingClientRect();
  const listHeight = Math.min(220, props.options.length * 38 + 12);
  above.value =
    !!bounds && window.innerHeight - bounds.bottom < listHeight + 8 && bounds.top > listHeight + 8;
  open.value = true;
  void nextTick(() =>
    list.value
      ?.querySelector<HTMLElement>(`[data-index="${active.value}"]`)
      ?.scrollIntoView({ block: 'nearest' }),
  );
}
function choose(index: number) {
  const option = props.options[index];
  if (!option) return;
  emit('update:modelValue', option.value);
  open.value = false;
  trigger.value?.focus();
}
function keydown(event: KeyboardEvent) {
  if (props.disabled || !props.options.length) return;
  if (['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) {
    event.preventDefault();
    if (!open.value) show();
    else if (event.key === 'Home') active.value = 0;
    else if (event.key === 'End') active.value = props.options.length - 1;
    else
      active.value =
        (active.value + (event.key === 'ArrowDown' ? 1 : -1) + props.options.length) % props.options.length;
    void nextTick(() =>
      list.value
        ?.querySelector<HTMLElement>(`[data-index="${active.value}"]`)
        ?.scrollIntoView({ block: 'nearest' }),
    );
  } else if (event.key === 'Enter' || event.key === ' ') {
    event.preventDefault();
    if (open.value) choose(active.value);
    else show();
  } else if (event.key === 'Escape' && open.value) {
    event.preventDefault();
    open.value = false;
  } else if (event.key === 'Tab') open.value = false;
  else if (event.key.length === 1 && !event.ctrlKey && !event.metaKey && !event.altKey) {
    const found = props.options.findIndex((option) =>
      option.label.toLocaleLowerCase('ru').startsWith(event.key.toLocaleLowerCase('ru')),
    );
    if (found >= 0) {
      event.preventDefault();
      show();
      active.value = found;
    }
  }
}
function outside(event: PointerEvent) {
  if (!root.value?.contains(event.target as Node)) open.value = false;
}
watch(
  () => props.options,
  () => {
    if (!props.options.length) open.value = false;
  },
);
watch(open, (value) => {
  if (value) document.addEventListener('pointerdown', outside);
  else document.removeEventListener('pointerdown', outside);
});
onUnmounted(() => document.removeEventListener('pointerdown', outside));
</script>
<template>
  <div ref="root" class="dzhura-select" :class="{ compact }">
    <span :id="`${id}-label`" class="select-label">{{ label }}</span>
    <button
      ref="trigger"
      type="button"
      class="select-trigger"
      role="combobox"
      aria-haspopup="listbox"
      :aria-label="label"
      :aria-expanded="open"
      :aria-controls="`${id}-list`"
      :aria-activedescendant="open ? `${id}-option-${active}` : undefined"
      :disabled="disabled"
      @click="open ? (open = false) : show()"
      @keydown="keydown"
    >
      <span class="select-value">{{ display }}</span>
      <DzhuraIcon name="chevron-down" :size="16" class="select-chevron" />
    </button>
    <div
      v-show="open"
      :id="`${id}-list`"
      ref="list"
      class="select-list"
      :class="{ above }"
      role="listbox"
      :aria-labelledby="`${id}-label`"
    >
      <div
        v-for="(option, index) in options"
        :id="`${id}-option-${index}`"
        :key="`${index}-${option.label}`"
        class="select-option"
        :class="{ active: index === active, selected: index === selected }"
        role="option"
        :aria-selected="index === selected"
        :data-index="index"
        @pointerenter="active = index"
        @click="choose(index)"
      >
        <span>{{ option.label }}</span
        ><span v-if="index === selected" aria-hidden="true">✓</span>
      </div>
    </div>
  </div>
</template>
<style scoped>
.dzhura-select {
  position: relative;
  display: grid;
  gap: var(--space-1);
  min-width: 0;
}
.select-label {
  font-size: 15px;
  color: var(--text);
}
.select-trigger {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-3);
  width: 100%;
  min-height: var(--control-height);
  padding: 8px 12px;
  border: 1px solid var(--border);
  border-radius: 11px;
  background: linear-gradient(180deg, var(--surface-elevated), var(--surface));
  color: var(--text);
  box-shadow:
    inset 0 1px 0 #fff,
    0 1px 2px #3324190d;
  text-align: left;
}
.select-trigger:hover:not(:disabled),
.select-trigger[aria-expanded='true'] {
  border-color: var(--primary);
  box-shadow: 0 0 0 3px var(--accent-soft);
}
.select-trigger:active:not(:disabled) {
  transform: translateY(1px);
}
.select-value {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.select-chevron {
  flex: 0 0 16px;
  color: var(--primary);
  transition: transform var(--motion);
}
[aria-expanded='true'] .select-chevron {
  transform: rotate(180deg);
}
.select-list {
  position: absolute;
  top: calc(100% + 5px);
  left: 0;
  right: 0;
  z-index: 12;
  max-height: 220px;
  overflow: auto;
  padding: 5px;
  border: 1px solid var(--border-strong);
  border-radius: 12px;
  background: var(--surface-elevated);
  box-shadow:
    var(--shadow-raised),
    inset 0 1px 0 #fff;
  animation: list-in 150ms ease-out both;
}
.select-list.above {
  top: auto;
  bottom: calc(100% + 5px);
}
.select-option {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  min-height: 38px;
  padding: 7px 10px;
  border-radius: 8px;
  color: var(--text);
  font-size: 14px;
}
.select-option.active {
  background: var(--surface-alt);
}
.select-option.selected {
  color: var(--primary);
  font-weight: 650;
}
.select-option > span:last-child {
  color: var(--primary);
}
.compact {
  display: inline-flex;
  align-items: center;
  gap: 8px;
}
.compact .select-label {
  white-space: nowrap;
}
.compact .select-trigger {
  width: auto;
  min-width: 82px;
}
.compact .select-list {
  left: auto;
  min-width: 110px;
}
@keyframes list-in {
  from {
    opacity: 0;
    transform: translateY(-4px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
</style>
