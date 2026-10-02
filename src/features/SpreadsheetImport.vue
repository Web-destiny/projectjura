<script setup lang="ts">
import { computed, onUnmounted, ref } from 'vue';
import type { DataRow, Field } from '../domain/models';
import { autoMap, mapRows, type Sheet } from '../infrastructure/spreadsheet/engine';
import { LocalProcessingProvider } from '../infrastructure/processing/local-provider';
import { errorMessage, readFile } from '../shared/files';
import Button from '../shared/ui/Button.vue';
import Alert from '../shared/ui/Alert.vue';
import DzhuraIcon from '../shared/ui/DzhuraIcon.vue';
import DzhuraSelect from '../shared/ui/DzhuraSelect.vue';
const props = defineProps<{ fields: Field[] }>();
const emit = defineEmits<{ rows: [DataRow[]] }>();
const provider = new LocalProcessingProvider();
const sheets = ref<Sheet[]>([]);
const selected = ref(0);
const mapping = ref<Record<string, number>>({});
const busy = ref(false);
const error = ref('');
const sheet = computed(() => sheets.value[selected.value]);
const needsMapping = ref(false);
function prepare() {
  mapping.value = autoMap(sheet.value.headers, props.fields);
  needsMapping.value = true;
}
function selectSheet(value: string | number | undefined) {
  selected.value = Number(value);
  prepare();
}
function mapColumn(id: string, value: string | number | undefined) {
  const next = { ...mapping.value };
  if (value === undefined) delete next[id];
  else next[id] = Number(value);
  mapping.value = next;
}
function apply() {
  emit('rows', mapRows(sheet.value, mapping.value, props.fields));
  sheets.value = [];
  needsMapping.value = false;
}
async function load(e: Event) {
  const input = e.target as HTMLInputElement;
  const file = input.files?.[0];
  if (!file) return;
  busy.value = true;
  error.value = '';
  try {
    sheets.value = await provider.run('spreadsheet', { bytes: await readFile(file), name: file.name });
    selected.value = 0;
    prepare();
    if (
      sheets.value.length === 1 &&
      Object.keys(mapping.value).length === props.fields.length &&
      new Set(Object.values(mapping.value)).size === sheet.value.headers.length
    )
      apply();
  } catch (e) {
    error.value = errorMessage(e);
  } finally {
    busy.value = false;
    input.value = '';
  }
}
onUnmounted(() => provider.cancel());
</script>
<template>
  <div class="stack">
    <label class="import-label"
      ><DzhuraIcon name="upload" :size="18" />{{ busy ? 'Читаем таблицу…' : 'Импортировать XLSX / CSV'
      }}<input type="file" accept=".xlsx,.csv" :disabled="busy" @change="load" /></label
    ><Alert v-if="error" kind="error">{{ error }}</Alert>
    <div v-if="needsMapping && sheet" class="card stack">
      <h3>Сопоставьте колонки</h3>
      <p class="muted">Импорт заменит текущие строки. Проверьте соответствия перед применением.</p>
      <DzhuraSelect
        v-if="sheets.length > 1"
        label="Лист"
        :model-value="selected"
        :options="sheets.map((s, i) => ({ label: s.name, value: i }))"
        @update:model-value="selectSheet"
      />
      <div class="mapping">
        <DzhuraSelect
          v-for="f in fields"
          :key="f.id"
          :label="f.name"
          :model-value="mapping[f.id]"
          :options="[
            { label: 'Не импортировать', value: undefined },
            ...sheet.headers.map((h, i) => ({ label: h || `Колонка ${i + 1}`, value: i })),
          ]"
          @update:model-value="mapColumn(f.id, $event)"
        />
      </div>
      <div class="row">
        <Button variant="primary" @click="apply">Импортировать {{ sheet.rows.length }} строк</Button
        ><Button
          @click="
            needsMapping = false;
            sheets = [];
          "
        >
          Отмена
        </Button>
      </div>
    </div>
  </div>
</template>
<style scoped>
.import-label {
  display: inline-flex;
  align-items: center;
  gap: 9px;
  position: relative;
  border: 1px solid var(--border);
  border-radius: 11px;
  padding: var(--space-2) var(--space-4);
  background: linear-gradient(180deg, var(--surface-elevated), var(--surface));
  box-shadow:
    var(--shadow),
    inset 0 1px 0 #fff;
  cursor: pointer;
  width: fit-content;
  font-weight: 600;
  transition:
    transform var(--motion),
    box-shadow var(--motion),
    border-color var(--motion);
}
.import-label:hover {
  transform: translateY(-1px);
  border-color: var(--primary);
  box-shadow: var(--shadow-raised);
}
.import-label:active {
  transform: translateY(1px);
}
.import-label input {
  position: absolute;
  inset: 0;
  opacity: 0;
  width: 100%;
  cursor: pointer;
}
.import-label:focus-within {
  outline: 3px solid var(--primary);
  outline-offset: 3px;
}
.mapping {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: var(--space-4);
}
</style>
