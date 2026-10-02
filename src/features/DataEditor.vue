<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import type { DataRow, Field } from '../domain/models';
import { validateValue } from '../domain/fields';
import Button from '../shared/ui/Button.vue';
import DzhuraIcon from '../shared/ui/DzhuraIcon.vue';
const props = defineProps<{ fields: Field[]; rows: DataRow[]; fileNames?: string[] }>();
const emit = defineEmits<{ update: [DataRow[]] }>();
const scroll = ref(0);
const viewport = ref<HTMLElement>();
const rowHeight = ref(76);
onMounted(() => {
  rowHeight.value =
    parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--row-height')) || 76;
});
const start = computed(() =>
  Math.min(Math.max(0, props.rows.length - 1), Math.max(0, Math.floor(scroll.value / rowHeight.value) - 3)),
);
const end = computed(() => Math.min(props.rows.length, start.value + 20));
const visible = computed(() => props.rows.slice(start.value, end.value));
function change(row: number, id: string, value: string) {
  const rows = props.rows.slice();
  rows[row] = { ...rows[row], [id]: value };
  emit('update', rows);
}
function paste(e: ClipboardEvent, row: number, col: number) {
  const text = e.clipboardData?.getData('text/plain');
  if (!text || (!text.includes('\t') && !text.includes('\n'))) return;
  e.preventDefault();
  const rows = props.rows.map((r) => ({ ...r }));
  const matrix = text
    .replace(/\r/gu, '')
    .replace(/\n$/u, '')
    .split('\n')
    .map((r) => r.split('\t'));
  matrix.forEach((values, r) => {
    if (props.fileNames && row + r >= rows.length) return;
    rows[row + r] ??= {};
    values.forEach((v, c) => {
      const field = props.fields[col + c];
      if (field) rows[row + r][field.id] = v;
    });
  });
  emit('update', rows);
}
function key(e: KeyboardEvent, r: number, c: number) {
  if (!['ArrowUp', 'ArrowDown'].includes(e.key)) return;
  e.preventDefault();
  const next = r + (e.key === 'ArrowDown' ? 1 : -1);
  if (next < 0 || next >= props.rows.length) return;
  if (viewport.value && (next < start.value || next >= end.value))
    viewport.value.scrollTop = next * rowHeight.value;
  setTimeout(() => viewport.value?.querySelector<HTMLInputElement>(`[data-cell="${next}-${c}"]`)?.focus(), 0);
}
function append() {
  emit('update', [...props.rows, {}]);
}
</script>
<template>
  <div class="stack">
    <div class="row between data-toolbar">
      <span class="muted">{{ rows.length }} строк · одна строка = один документ</span
      ><Button v-if="!fileNames" @click="append">+ Добавить строку</Button>
    </div>
    <div ref="viewport" class="table-scroll" @scroll="scroll = ($event.target as HTMLElement).scrollTop">
      <table>
        <thead>
          <tr>
            <th scope="col">{{ fileNames ? 'Файл' : '№' }}</th>
            <th v-for="f in fields" :key="f.id" scope="col">
              {{ f.name }}<span v-if="f.required" title="Обязательное поле"> *</span>
            </th>
            <th v-if="!fileNames" scope="col"><span class="sr-only">Действия</span></th>
          </tr>
        </thead>
        <tbody>
          <tr v-if="start">
            <td :colspan="fields.length + 2" :style="{ height: `${start * rowHeight}px`, padding: 0 }"></td>
          </tr>
          <tr v-for="(row, offset) in visible" :key="start + offset" class="data-row">
            <th scope="row">{{ fileNames?.[start + offset] || start + offset + 1 }}</th>
            <td v-for="(f, col) in fields" :key="f.id">
              <component
                :is="f.type === 'multiline' ? 'textarea' : 'input'"
                :type="f.type === 'date' ? 'date' : 'text'"
                :inputmode="f.type === 'number' ? 'decimal' : undefined"
                :aria-label="`${f.name}, строка ${start + offset + 1}`"
                :data-cell="`${start + offset}-${col}`"
                :value="row[f.id] || ''"
                :aria-invalid="!!validateValue(f, row[f.id])"
                :title="validateValue(f, row[f.id])"
                :class="{ invalid: validateValue(f, row[f.id]) }"
                @input="change(start + offset, f.id, ($event.target as HTMLInputElement).value)"
                @paste="paste($event, start + offset, col)"
                @keydown="key($event, start + offset, col)"
              ></component
              ><span v-if="validateValue(f, row[f.id])" class="error-text">{{
                validateValue(f, row[f.id])
              }}</span>
            </td>
            <td v-if="!fileNames">
              <div class="row">
                <button
                  class="table-action"
                  :aria-label="`Дублировать строку ${start + offset + 1}`"
                  title="Дублировать"
                  @click="
                    emit('update', [
                      ...rows.slice(0, start + offset + 1),
                      { ...row },
                      ...rows.slice(start + offset + 1),
                    ])
                  "
                >
                  <DzhuraIcon name="copy" :size="18" /></button
                ><button
                  class="table-action"
                  :aria-label="`Удалить строку ${start + offset + 1}`"
                  title="Удалить"
                  @click="
                    emit(
                      'update',
                      rows.filter((_, i) => i !== start + offset),
                    )
                  "
                >
                  <DzhuraIcon name="close" :size="18" />
                </button>
              </div>
            </td>
          </tr>
          <tr v-if="end < rows.length">
            <td
              :colspan="fields.length + 2"
              :style="{ height: `${(rows.length - end) * rowHeight}px`, padding: 0 }"
            ></td>
          </tr>
        </tbody>
      </table>
      <p v-if="!rows.length" class="empty">Добавьте строку или импортируйте таблицу.</p>
    </div>
    <small
      >Вставьте диапазон из Excel через Ctrl+V. Tab — следующая ячейка, ↑ ↓ — переход между строками. Даты в
      CSV: ГГГГ-ММ-ДД.</small
    >
  </div>
</template>
<style scoped>
.table-scroll {
  overflow: auto;
  max-height: 520px;
  border: 1px solid var(--border-strong);
  border-radius: var(--radius);
  background: var(--surface-elevated);
  box-shadow:
    var(--shadow-raised),
    inset 0 1px 0 #fff;
}
.data-toolbar {
  position: sticky;
  top: var(--space-2);
  z-index: 3;
  padding: var(--space-3) var(--space-4);
  border: 1px solid #ffffff24;
  border-radius: var(--radius);
  background: linear-gradient(
    110deg,
    var(--espresso),
    color-mix(in srgb, var(--espresso) 84%, var(--primary))
  );
  box-shadow:
    var(--shadow),
    inset 0 1px 0 #ffffff2a;
}
.data-toolbar .muted {
  color: #fff9ed;
  font-weight: 600;
}
table {
  border-collapse: separate;
  border-spacing: 0;
  width: 100%;
  text-align: left;
  font-size: 15px;
}
th,
td {
  padding: var(--space-2);
  border-bottom: 1px solid color-mix(in srgb, var(--border) 65%, transparent);
  height: var(--row-height);
}
thead th {
  position: sticky;
  top: 0;
  z-index: 1;
  background: linear-gradient(
    180deg,
    var(--surface-alt),
    color-mix(in srgb, var(--surface-alt) 80%, var(--surface))
  );
  font-weight: 600;
  box-shadow: 0 2px 5px #55412a10;
}
tbody th {
  font-weight: 600;
  color: var(--muted);
  font-size: 14px;
  max-width: 180px;
  overflow-wrap: anywhere;
}
tbody tr.data-row {
  animation: row-arrive 180ms ease-out both;
}
tbody tr.data-row:hover {
  background: var(--surface);
}
tbody tr.data-row:focus-within {
  background: color-mix(in srgb, var(--accent-soft) 45%, var(--surface-elevated));
}
tbody td:focus-within {
  box-shadow:
    inset 0 0 0 2px var(--primary),
    inset 0 0 15px var(--accent-soft);
}
td input,
td textarea {
  min-width: 170px;
  width: 100%;
  height: 40px;
  min-height: 40px;
  background: var(--surface-elevated);
}
td .invalid {
  border-color: var(--danger);
  background: #fff5f1;
}
.error-text {
  display: block;
  font-size: 12px;
  line-height: 1.3;
  padding-top: 2px;
}
.table-action {
  display: inline-grid;
  place-items: center;
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  background: var(--surface-elevated);
  color: var(--muted);
  min-width: 34px;
  min-height: 34px;
}
.table-action:hover {
  color: var(--primary);
  background: var(--accent-soft);
  border-color: var(--border);
  transform: translateY(-1px);
}
@keyframes row-arrive {
  from {
    transform: translateY(5px);
  }
  to {
    transform: translateY(0);
  }
}
</style>
