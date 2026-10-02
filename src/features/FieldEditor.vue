<script setup lang="ts">
import { computed, ref } from 'vue';
import type { Field, Occurrence, Paragraph } from '../domain/models';
import { overlaps } from '../domain/fields';
import Button from '../shared/ui/Button.vue';
import Alert from '../shared/ui/Alert.vue';
import DocumentPreview from './DocumentPreview.vue';
import DzhuraSelect from '../shared/ui/DzhuraSelect.vue';
const fieldTypes = [
  { label: 'Текст', value: 'text' },
  { label: 'Многострочный текст', value: 'multiline' },
  { label: 'Дата', value: 'date' },
  { label: 'Число', value: 'number' },
];
const dateFormats = [
  { label: '31.12.2026', value: '' },
  { label: '2026-12-31', value: 'iso' },
  { label: '31 декабря 2026 г.', value: 'long' },
];
const numberFormats = [
  { label: '25 000', value: '' },
  { label: '25000', value: 'plain' },
  { label: '25 000,00', value: 'money' },
];
const props = defineProps<{ fields: Field[]; paragraphs: Paragraph[]; source: Uint8Array }>();
const emit = defineEmits<{ update: [Field[]] }>();
const selected = ref('');
const selection = ref<Occurrence>();
const name = ref('');
const error = ref('');
const view = ref('text');
const field = computed(() => props.fields.find((f) => f.id === selected.value));
function selectText(e: MouseEvent | KeyboardEvent, p: Paragraph) {
  if (!p.editable) return;
  const container = e.currentTarget as HTMLElement;
  const sel = window.getSelection();
  if (!sel?.rangeCount || sel.isCollapsed) return;
  const range = sel.getRangeAt(0);
  if (!container.contains(range.startContainer) || !container.contains(range.endContainer)) {
    error.value = 'Выделите текст внутри одного абзаца.';
    return;
  }
  const before = range.cloneRange();
  before.selectNodeContents(container);
  before.setEnd(range.startContainer, range.startOffset);
  const start = before.toString().length;
  selection.value = {
    part: p.part,
    paragraph: p.paragraph,
    start,
    end: start + range.toString().length,
    text: range.toString(),
  };
  name.value = '';
  error.value = '';
}
function add() {
  const o = selection.value;
  if (!o) return;
  if (/[\n\t]/u.test(o.text)) {
    error.value = 'Выделите текст без табуляции и разрыва строки внутри одного абзаца.';
    return;
  }
  const label = name.value.trim();
  if (!label) {
    error.value = 'Введите название поля.';
    return;
  }
  if (props.fields.some((f) => f.name === label)) {
    error.value = 'Такое поле уже есть. Выберите другое название.';
    return;
  }
  if (props.fields.some((f) => f.occurrences.some((x) => overlaps(x, o)))) {
    error.value = 'Выделение пересекает существующее поле.';
    return;
  }
  const f: Field = {
    id: crypto.randomUUID(),
    name: label,
    type: 'text',
    required: false,
    format: '',
    preview: '',
    occurrences: [o],
  };
  emit('update', [...props.fields, f]);
  selected.value = f.id;
  selection.value = undefined;
  window.getSelection()?.removeAllRanges();
}
function update(key: keyof Field, value: unknown) {
  if (!field.value) return;
  emit(
    'update',
    props.fields.map((f) => (f.id === selected.value ? { ...f, [key]: value } : f)),
  );
}
function rename(e: Event) {
  const value = (e.target as HTMLInputElement).value.trim();
  if (!value || props.fields.some((f) => f.id !== selected.value && f.name === value)) {
    error.value = 'Название должно быть заполнено и уникально.';
    return;
  }
  error.value = '';
  update('name', value);
}
function parts(p: Paragraph) {
  const occurrences = props.fields
    .flatMap((f) =>
      f.occurrences
        .filter((o) => o.part === p.part && o.paragraph === p.paragraph)
        .map((o) => ({ ...o, id: f.id })),
    )
    .sort((a, b) => a.start - b.start);
  const result: { text: string; id: string }[] = [];
  let offset = 0;
  for (const o of occurrences) {
    result.push(
      { text: p.text.slice(offset, o.start), id: '' },
      { text: p.text.slice(o.start, o.end), id: o.id },
    );
    offset = o.end;
  }
  result.push({ text: p.text.slice(offset), id: '' });
  return result;
}
const extra = computed(() => {
  const f = field.value;
  const text = f?.occurrences[0]?.text;
  if (!text) return [];
  const result: Occurrence[] = [];
  for (const p of props.paragraphs.filter((p) => p.editable)) {
    let start = 0;
    while ((start = p.text.indexOf(text, start)) >= 0) {
      const o = { part: p.part, paragraph: p.paragraph, start, end: start + text.length, text };
      if (!props.fields.some((f) => f.occurrences.some((v) => overlaps(v, o)))) result.push(o);
      start += text.length;
    }
  }
  return result;
});
function addExtra() {
  if (field.value) update('occurrences', [...field.value.occurrences, ...extra.value]);
}
</script>
<template>
  <div class="workspace">
    <section>
      <div class="toolbar">
        <Button :variant="view === 'text' ? 'primary' : 'secondary'" @click="view = 'text'">
          Разметка полей </Button
        ><Button :variant="view === 'pages' ? 'primary' : 'secondary'" @click="view = 'pages'">
          Вид документа
        </Button>
      </div>
      <DocumentPreview v-if="view === 'pages'" :bytes="source" /><template v-else>
        <p class="muted">Выделите текст внутри абзаца или ячейки, затем сделайте его полем.</p>
        <div class="paper">
          <template v-for="p in paragraphs" :key="p.part + ':' + p.paragraph">
            <p
              v-if="p.text"
              class="paragraph"
              :class="{ table: p.table, protected: !p.editable }"
              :data-part="p.part"
              :data-paragraph="p.paragraph"
              tabindex="0"
              @mouseup="selectText($event, p)"
              @keyup.shift="selectText($event, p)"
            >
              <template v-for="(piece, i) in parts(p)" :key="i">
                <mark
                  v-if="piece.id"
                  :class="{ chosen: piece.id === selected }"
                  role="button"
                  tabindex="0"
                  :aria-label="`Настроить поле ${fields.find((f) => f.id === piece.id)?.name}`"
                  @keydown.enter="selected = piece.id"
                  @keydown.space.prevent="selected = piece.id"
                  @click="selected = piece.id"
                  >{{ piece.text }}</mark
                ><span v-else>{{ piece.text }}</span>
              </template>
            </p>
          </template>
        </div>
        <small>Точное текстовое представление документа. Серые абзацы защищены от изменения.</small>
      </template>
    </section>
    <aside class="stack field-sidebar" aria-label="Настройка полей">
      <div v-if="selection" class="card stack">
        <strong>Сделать полем</strong><small>«{{ selection.text }}»</small
        ><label
          >Название поля<input
            v-model="name"
            placeholder="Например, ФИО"
            maxlength="200"
            @keydown.enter="add" /></label
        ><Button variant="primary" @click="add">+ Сделать полем</Button
        ><Button variant="ghost" @click="selection = undefined">Отмена</Button>
      </div>
      <Alert v-if="error" kind="error">{{ error }}</Alert>
      <div class="card stack">
        <div class="row between">
          <h3>Поля документа</h3>
          <span class="badge">{{ fields.length }}</span>
        </div>
        <p v-if="!fields.length" class="muted">Поля пока не найдены. Выделите нужное место слева.</p>
        <button
          v-for="f in fields"
          :key="f.id"
          class="field-item"
          :class="{ selected: selected === f.id }"
          :aria-pressed="selected === f.id"
          @click="selected = f.id"
        >
          <span>{{ f.name }}</span
          ><small>{{ f.occurrences.length }} вх.</small>
        </button>
      </div>
      <Transition name="field-panel" mode="out-in">
        <div v-if="field" :key="field.id" class="card stack field-settings">
          <label>Название<input :value="field.name" maxlength="200" @change="rename" /></label>
          <DzhuraSelect
            label="Тип"
            :model-value="field.type"
            :options="fieldTypes"
            @update:model-value="update('type', $event)"
          />
          <small v-if="field.type === 'text'">ИНН, телефон и номер договора оставляйте текстом.</small>
          <DzhuraSelect
            v-if="field.type === 'date'"
            label="Формат даты"
            :model-value="field.format"
            :options="dateFormats"
            @update:model-value="update('format', $event)"
          />
          <DzhuraSelect
            v-if="field.type === 'number'"
            label="Формат числа"
            :model-value="field.format"
            :options="numberFormats"
            @update:model-value="update('format', $event)"
          />
          <label class="inline"
            ><input
              type="checkbox"
              :checked="field.required"
              @change="update('required', ($event.target as HTMLInputElement).checked)"
            />Обязательное поле</label
          ><label
            >Значение для примера<input
              :value="field.preview"
              @input="update('preview', ($event.target as HTMLInputElement).value)" /></label
          ><template v-if="extra.length">
            <small>Такое значение найдено ещё в {{ extra.length }} местах.</small
            ><Button @click="addExtra">Добавить к этому полю</Button> </template
          ><Button
            variant="danger"
            @click="
              emit(
                'update',
                fields.filter((f) => f.id !== selected),
              );
              selected = '';
            "
          >
            Удалить поле
          </Button>
        </div>
      </Transition>
    </aside>
  </div>
</template>
<style scoped>
.toolbar {
  display: inline-flex;
  max-width: 100%;
  gap: 5px;
  padding: 5px;
  border: 1px solid var(--border);
  border-radius: 14px;
  background: var(--surface-alt);
  box-shadow: inset 0 1px 3px #30241a12;
}
.toolbar :deep(.button) {
  border-radius: 9px;
}
.paper {
  background: linear-gradient(155deg, var(--surface-elevated), var(--surface-elevated) 80%, var(--surface));
  padding: var(--space-7);
  box-shadow: var(--shadow-raised);
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  min-height: 550px;
  max-height: 750px;
  overflow: auto;
}
.paragraph {
  white-space: pre-wrap;
  overflow-wrap: anywhere;
  margin-bottom: var(--space-4);
  font-family: Georgia, serif;
  font-size: 17px;
  line-height: 1.8;
}
.table {
  border: 1px solid var(--border);
  padding: var(--space-3);
}
.protected {
  color: var(--muted);
  background: var(--surface-alt);
}
mark {
  background: var(--accent-soft);
  color: var(--primary);
  border-bottom: 2px solid var(--border);
  cursor: pointer;
}
.chosen {
  border-color: var(--primary);
  box-shadow: 0 2px 0 var(--primary);
}
.field-sidebar {
  position: sticky;
  top: var(--space-4);
  max-height: calc(100vh - 2 * var(--space-4));
  overflow: auto;
  padding: var(--space-3);
  border: 1px solid var(--border-strong);
  border-radius: var(--radius-lg);
  background: linear-gradient(150deg, var(--surface-elevated), var(--surface) 130%);
  box-shadow:
    var(--shadow-raised),
    inset 0 1px 0 #fff;
}
.field-sidebar .card {
  background: var(--surface);
  box-shadow:
    0 1px 3px #39291d12,
    inset 0 1px 0 #fff;
}
.field-sidebar .field-settings {
  border-top: 3px solid var(--primary);
  background: var(--surface-elevated);
}
.field-panel-enter-active,
.field-panel-leave-active {
  transition:
    opacity 150ms ease,
    transform 150ms ease;
}
.field-panel-enter-from,
.field-panel-leave-to {
  opacity: 0;
  transform: translateY(8px);
}
.field-item {
  display: flex;
  justify-content: space-between;
  gap: var(--space-2);
  padding: var(--space-3);
  border: 1px solid var(--border);
  border-radius: 11px;
  background: var(--surface-elevated);
  color: var(--text);
  text-align: left;
  transition:
    transform var(--motion),
    box-shadow var(--motion),
    border-color var(--motion);
}
.field-item:hover {
  transform: translateY(-1px);
  box-shadow: var(--shadow);
}
.field-item.selected {
  border-color: var(--primary);
  background: var(--accent-soft);
  box-shadow:
    inset 3px 0 var(--primary),
    0 3px 8px #39291d12;
}
h3 {
  margin: 0;
}
@media (max-width: 800px) {
  .field-sidebar {
    position: static;
    max-height: none;
    overflow: visible;
  }
  .paper {
    padding: var(--space-5);
  }
}
</style>
