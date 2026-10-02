<script setup lang="ts">
import { computed, onUnmounted, ref, toRaw, watch } from 'vue';
import { snapshot } from '../shared/snapshot';
import { processingLimits } from '../domain/limits';
import { useEditDraft } from '../features/useEditDraft';
import { repository } from '../infrastructure/persistence/db';
import { counted } from '../shared/ru';
import type { DataRow, Field, JobResult, OutputFile, ReplaceRule } from '../domain/models';
import type { Progress } from '../domain/processing';
import { LocalProcessingProvider } from '../infrastructure/processing/local-provider';
import { errorMessage, readFile } from '../shared/files';
import Button from '../shared/ui/Button.vue';
import Alert from '../shared/ui/Alert.vue';
import FileDropzone from '../shared/ui/FileDropzone.vue';
import JobProgress from '../shared/ui/JobProgress.vue';
import DataEditor from '../features/DataEditor.vue';
import SpreadsheetImport from '../features/SpreadsheetImport.vue';
import Result from '../features/JobResult.vue';
import DzhuraIcon from '../shared/ui/DzhuraIcon.vue';
const files = ref<OutputFile[]>([]);
const mode = ref('replace');
const fields = ref<Field[]>([]);
const rows = ref<DataRow[]>([]);
const busy = ref(false);
const error = ref('');
const notice = ref('');
const result = ref<JobResult>();
const scan = ref<{ count: number; documents: number; errors: JobResult['errors'] }>();
const progress = ref<Progress>({ current: 0, total: 1, stage: 'Подготовка' });
const rule = ref<ReplaceRule>({
  find: '',
  replacement: '',
  caseSensitive: false,
  wholeWord: false,
  body: true,
  tables: true,
  headers: true,
});
const provider = new LocalProcessingProvider();
const { editDraft, recovering, restoreEdit, discardEdit } = useEditDraft({
  files,
  mode,
  fields,
  rows,
  rule,
  result,
  notice,
});
const names = computed(() => files.value.map((f) => f.name));
async function action(fn: () => Promise<void>) {
  busy.value = true;
  error.value = '';
  try {
    await fn();
  } catch (e) {
    error.value = errorMessage(e);
  } finally {
    busy.value = false;
  }
}
async function analyze() {
  const union = new Map<string, Field>();
  for (let i = 0; i < files.value.length; i++) {
    progress.value = { current: i, total: files.value.length, stage: 'Проверка структуры' };
    const a = await provider.run('analyze', toRaw(files.value[i].bytes));
    for (const f of a.fields)
      if (!union.has(f.name)) union.set(f.name, { ...f, id: `field-${union.size + 1}` });
  }
  fields.value = [...union.values()];
  rows.value = files.value.map(() => ({}));
}
async function load(selected: File[]) {
  await action(async () => {
    if (
      selected.reduce((n, f) => n + f.size, 0) + files.value.reduce((n, f) => n + f.bytes.length, 0) >
      processingLimits.maxInputBatchBytes
    )
      throw new Error('Пачка превышает безопасный объём 128 МиБ. Обработайте её частями.');
    const incoming: OutputFile[] = [];
    for (const file of selected) {
      if (/\.zip$/iu.test(file.name)) incoming.push(...(await provider.run('unpack', await readFile(file))));
      else if (/\.docx$/iu.test(file.name)) incoming.push({ name: file.name, bytes: await readFile(file) });
      else throw new Error('Поддерживаются только DOCX и ZIP с документами DOCX.');
    }
    const accepted: OutputFile[] = [];
    if (
      incoming.reduce((n, f) => n + f.bytes.length, 0) + files.value.reduce((n, f) => n + f.bytes.length, 0) >
      processingLimits.maxInputBatchBytes
    )
      throw new Error('Распакованная пачка превышает 128 МиБ. Обработайте её частями.');
    const rejected: string[] = [];
    for (const file of incoming) {
      try {
        await provider.run('analyze', file.bytes);
        accepted.push(file);
      } catch (e) {
        if (errorMessage(e).startsWith('Операция отменена')) throw e;
        rejected.push(`${file.name}: ${errorMessage(e)}`);
      }
    }
    if (rejected.length) notice.value = `Пропущено файлов: ${rejected.length}. ${rejected.join('; ')}`;
    files.value = [...files.value, ...accepted];
    result.value = undefined;
    scan.value = undefined;
    if (mode.value === 'structured') await analyze();
  });
}
async function find() {
  await action(async () => {
    const r = await provider.run(
      'replace',
      { files: snapshot(files.value), rule: toRaw(rule.value), dryRun: true },
      (p) => (progress.value = p),
    );
    scan.value = r;
  });
}
async function apply() {
  await action(async () => {
    result.value =
      mode.value === 'replace'
        ? await provider.run(
            'replace',
            { files: snapshot(files.value), rule: toRaw(rule.value), dryRun: false },
            (p) => (progress.value = p),
          )
        : await provider.run(
            'structured',
            {
              files: snapshot(files.value),
              fields: snapshot(fields.value),
              rows: snapshot(rows.value),
            },
            (p) => (progress.value = p),
          );
    if (!result.value.errors.length) await repository.clearEditDraft();
  });
}
function imported(value: DataRow[]) {
  if (value.length !== files.value.length) {
    error.value = `В таблице ${value.length} строк, а документов ${files.value.length}. Для этого режима нужно по одной строке на файл в показанном порядке.`;
    return;
  }
  rows.value = value;
  notice.value = 'Данные сопоставлены по порядку файлов. Проверьте строки перед созданием.';
}
watch(
  rule,
  () => {
    scan.value = undefined;
    result.value = undefined;
  },
  { deep: true },
);
watch(mode, () => {
  result.value = undefined;
  if (!recovering.value && mode.value === 'structured' && files.value.length) void action(analyze);
});
watch(
  rows,
  () => {
    result.value = undefined;
  },
  { deep: true },
);
onUnmounted(() => provider.cancel());
</script>
<template>
  <RouterLink to="/" class="back-link"><DzhuraIcon name="arrow-left" :size="17" />В мастерскую</RouterLink>
  <div class="heading">
    <h1>Изменить готовые документы</h1>
    <p>Обновите данные сразу в нескольких файлах. Оригиналы останутся нетронутыми.</p>
  </div>
  <div class="stack">
    <div v-if="editDraft && !files.length" class="card row between">
      <strong>Продолжить изменение {{ editDraft.files.length }} документов?</strong>
      <div class="row">
        <Button @click="discardEdit">Удалить черновик</Button
        ><Button variant="primary" @click="restoreEdit">Продолжить</Button>
      </div>
    </div>
    <Alert v-if="error" kind="error">{{ error }}</Alert
    ><Alert v-if="notice">{{ notice }}</Alert
    ><JobProgress v-if="busy" :progress="progress" @cancel="provider.cancel()" /><template v-else>
      <FileDropzone
        accept=".docx,.zip"
        multiple
        title="Добавьте один DOCX или целую пачку"
        hint="Несколько DOCX или ZIP, содержащий только DOCX"
        @files="load"
      />
      <div v-if="files.length" class="card stack">
        <div class="row between">
          <strong>Документы · {{ files.length }}</strong
          ><Button
            variant="ghost"
            @click="
              files = [];
              fields = [];
              rows = [];
              scan = undefined;
              result = undefined;
            "
          >
            Очистить список
          </Button>
        </div>
        <div class="file-list">
          <div v-for="(file, i) in files" :key="i" class="row between">
            <span>{{ i + 1 }}. {{ file.name }}</span
            ><Button
              variant="ghost"
              :aria-label="`Убрать ${file.name}`"
              @click="
                files.splice(i, 1);
                rows.splice(i, 1);
                scan = undefined;
                result = undefined;
              "
            >
              ×
            </Button>
          </div>
        </div>
      </div>
      <template v-if="files.length">
        <div class="toolbar">
          <Button :variant="mode === 'replace' ? 'primary' : 'secondary'" @click="mode = 'replace'">
            <DzhuraIcon name="replace" :size="18" />Найти и заменить </Button
          ><Button :variant="mode === 'structured' ? 'primary' : 'secondary'" @click="mode = 'structured'">
            Однотипные документы
          </Button>
        </div>
        <template v-if="mode === 'replace'">
          <div class="card stack">
            <div class="rule-grid">
              <label>Найти<input v-model="rule.find" placeholder="Например, ООО «Ромашка»" /></label
              ><label
                >Заменить на<textarea
                  v-model="rule.replacement"
                  rows="1"
                  placeholder="ООО «Лютик»"
                ></textarea>
              </label>
            </div>
            <details>
              <summary>Дополнительные параметры</summary>
              <div class="stack">
                <label class="inline"
                  ><input v-model="rule.caseSensitive" type="checkbox" />Учитывать регистр</label
                ><label class="inline"
                  ><input v-model="rule.wholeWord" type="checkbox" />Только целое слово или фраза</label
                >
                <div class="row">
                  <label class="inline"><input v-model="rule.body" type="checkbox" />Основной текст</label
                  ><label class="inline"><input v-model="rule.tables" type="checkbox" />Таблицы</label
                  ><label class="inline"><input v-model="rule.headers" type="checkbox" />Колонтитулы</label>
                </div>
              </div>
            </details>
            <div class="row">
              <Button :disabled="!rule.find || !(rule.body || rule.tables || rule.headers)" @click="find">
                Найти совпадения
              </Button>
            </div>
          </div>
          <Alert v-if="scan">
            Найдено {{ counted(scan.count, ['совпадение', 'совпадения', 'совпадений']) }} в
            {{ counted(scan.documents, ['документе', 'документах', 'документах']) }}.<template
              v-if="scan.errors.length"
            >
              Не удалось проверить файлов: {{ scan.errors.length }}. Они будут пропущены с отчётом.
            </template>
          </Alert>
          <div v-if="scan" class="actions">
            <Button variant="primary" :disabled="!scan.count" @click="apply">
              Применить замены и создать копии
            </Button>
          </div> </template
        ><template v-else>
          <Alert>
            Этот режим работает с явными полями вида <code v-pre>{{ ФИО }}</code
            >. Каждому файлу соответствует одна строка. Для документов без полей используйте поиск и замену. </Alert
          ><template v-if="fields.length">
            <SpreadsheetImport :fields="fields" @rows="imported" /><DataEditor
              :fields="fields"
              :rows="rows"
              :file-names="names"
              @update="rows = $event"
            />
            <div class="actions">
              <Button variant="primary" @click="apply">Создать изменённые документы</Button>
            </div>
          </template>
          <p v-else class="empty">Явные плейсхолдеры в документах не найдены.</p>
        </template> </template
      ><Result v-if="result" :result="result" />
    </template>
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
.rule-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: var(--space-5);
}
.file-list {
  max-height: 240px;
  overflow: auto;
  font-size: 14px;
}
.file-list > .row {
  padding: 5px 9px 5px 13px;
  border: 1px solid var(--border);
  border-radius: 10px;
  background: var(--surface);
}
@media (max-width: 650px) {
  .rule-grid {
    grid-template-columns: 1fr;
  }
}
</style>
